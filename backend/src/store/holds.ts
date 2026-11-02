import { createHash, randomUUID } from 'node:crypto';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import {
  BusyError,
  HoldNotConfirmableError,
  NotFoundError,
  PolicyError,
  ShowNotBookableError,
  SoldOutError,
  ValidationError,
} from '../domain/errors';
import { reminderTime } from '../domain/policy';
import { isClaimable, normalizeSeatIds } from '../domain/seats';
import type { Booking, Hold, HoldStatus, Seat } from '../domain/types';
import { backoff, batchGet, cancellationReasons, ddb, strip } from '../lib/ddb';
import { log } from '../lib/logger';
import { services } from '../services';
import { getBooking } from './bookings';
import { getShow } from './catalog';
import { epochSeconds, index, keys } from './keys';

const MAX_ATTEMPTS = 8;
const IDEMPOTENCY_TTL_SECONDS = 24 * 3600;
const TableName = () => config.tableName;

type TransactItem = NonNullable<ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']>[number];

export async function getHold(holdId: string): Promise<Hold | null> {
  const res = await ddb.send(new GetCommand({ TableName: TableName(), Key: keys.hold(holdId), ConsistentRead: true }));
  return res.Item ? strip<Hold>(res.Item) : null;
}

async function getSeats(showId: string, seatIds: string[]): Promise<Seat[]> {
  const items = await batchGet(seatIds.map((id) => keys.seat(showId, id)));
  return items.map((i) => strip<Seat>(i));
}

const requestHash = (showId: string, seatIds: string[]) =>
  createHash('sha256').update(JSON.stringify({ showId, seatIds })).digest('hex');

async function replayIdempotent(userId: string, idempotencyKey: string, hash: string): Promise<Hold | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TableName(), Key: keys.idempotency(userId, idempotencyKey), ConsistentRead: true }),
  );
  if (!res.Item) return null;
  if (res.Item.requestHash !== hash) {
    throw new PolicyError('IDEMPOTENCY_KEY_REUSED', 'La Idempotency-Key ya se usó con otra petición');
  }
  return getHold(res.Item.holdId as string);
}

export interface CreateHoldInput {
  showId: string;
  seatIds: string[];
  user: { id: string; email: string };
  idempotencyKey: string;
  now?: Date;
}

export interface CreateHoldResult {
  hold: Hold;
  replayed: boolean;
}

export async function createHold(input: CreateHoldInput): Promise<CreateHoldResult> {
  const { showId, user, idempotencyKey } = input;
  const seatIds = normalizeSeatIds(input.seatIds, config.maxSeatsPerHold);
  const hash = requestHash(showId, seatIds);

  const previous = await replayIdempotent(user.id, idempotencyKey, hash);
  if (previous) return { hold: previous, replayed: true };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const now = input.now ?? new Date();

    const show = await getShow(showId, true);
    if (!show) throw new NotFoundError('Sesión');
    if (show.status !== 'OPEN') throw new ShowNotBookableError('BLOCKED');
    if (show.startsAt <= now.toISOString()) throw new ShowNotBookableError('STARTED');

    const seats = await getSeats(showId, seatIds);
    if (seats.length !== seatIds.length) {
      const found = new Set(seats.map((s) => s.seatId));
      throw new ValidationError('Butacas inexistentes en esta sala', { seats: seatIds.filter((id) => !found.has(id)) });
    }
    const taken = seats.filter((s) => !isClaimable(s, now)).map((s) => s.seatId);
    if (taken.length > 0) {
      const twin = await replayIdempotent(user.id, idempotencyKey, hash);
      if (twin) return { hold: twin, replayed: true };
      throw new SoldOutError(taken);
    }

    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + config.holdTtlMinutes * 60_000);
    const hold: Hold = {
      holdId: randomUUID(),
      showId,
      userId: user.id,
      userEmail: user.email,
      seats: seatIds,
      amountCents: show.priceCents * seatIds.length,
      currency: show.currency,
      status: 'ACTIVE',
      expiresAt: expiresAt.toISOString(),
      createdAt,
    };

    const transactItems: TransactItem[] = [
      {
        Put: {
          TableName: TableName(),
          Item: {
            ...keys.idempotency(user.id, idempotencyKey),
            type: 'IDEMP',
            requestHash: hash,
            holdId: hold.holdId,
            ttl: epochSeconds(now) + IDEMPOTENCY_TTL_SECONDS,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      ...seats.map(
        (seat): TransactItem => ({
          Update: {
            TableName: TableName(),
            Key: keys.seat(showId, seat.seatId),
            UpdateExpression:
              'SET #status = :held, holdId = :holdId, holdExpiresAt = :expiresAt, userId = :userId REMOVE bookingId',
            ConditionExpression:
              seat.status === 'AVAILABLE'
                ? '#status = :available'
                : '#status = :held AND holdId = :prevHoldId AND holdExpiresAt < :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':held': 'HELD',
              ':holdId': hold.holdId,
              ':expiresAt': hold.expiresAt,
              ':userId': user.id,
              ...(seat.status === 'AVAILABLE'
                ? { ':available': 'AVAILABLE' }
                : { ':prevHoldId': seat.holdId, ':now': createdAt }),
            },
          },
        }),
      ),
      {
        Put: {
          TableName: TableName(),
          Item: {
            ...keys.hold(hold.holdId),
            type: 'HOLD',
            ...hold,
            lastActor: user.id,
            ttl: epochSeconds(expiresAt) + 7 * 24 * 3600,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ];

    try {
      await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } catch (err) {
      const reasons = cancellationReasons(err);
      if (!reasons) throw err;
      const winner = await replayIdempotent(user.id, idempotencyKey, hash);
      if (winner) return { hold: winner, replayed: true };
      log.debug('createHold reintento', { attempt, reasons });
      continue;
    }

    await services()
      .scheduler.scheduleHoldExpiry(hold.holdId, expiresAt)
      .catch((e) => log.error('No se pudo programar la expiración (queda la expiración perezosa)', e, { holdId: hold.holdId }));
    return { hold, replayed: false };
  }
  throw new BusyError();
}

export interface ReleaseHoldOptions {
  reason: Extract<HoldStatus, 'EXPIRED' | 'RELEASED'>;
  userId?: string;
  actor: string;
  now?: Date;
}

export async function releaseHold(holdId: string, opts: ReleaseHoldOptions): Promise<Hold> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const now = opts.now ?? new Date();

    const hold = await getHold(holdId);
    if (!hold || (opts.userId && hold.userId !== opts.userId)) throw new NotFoundError('Reserva temporal');
    if (hold.status !== 'ACTIVE') return hold;
    if (opts.reason === 'EXPIRED' && hold.expiresAt > now.toISOString()) return hold;

    const mine = (await getSeats(hold.showId, hold.seats)).filter((s) => s.status === 'HELD' && s.holdId === holdId);

    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: TableName(),
                Key: keys.hold(holdId),
                UpdateExpression: 'SET #status = :to, lastActor = :actor, lastReason = :to, updatedAt = :now',
                ConditionExpression: '#status = :active',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                  ':to': opts.reason,
                  ':active': 'ACTIVE',
                  ':actor': opts.actor,
                  ':now': now.toISOString(),
                },
              },
            },
            ...mine.map(
              (seat): TransactItem => ({
                Update: {
                  TableName: TableName(),
                  Key: keys.seat(hold.showId, seat.seatId),
                  UpdateExpression: 'SET #status = :available REMOVE holdId, holdExpiresAt, userId',
                  ConditionExpression: '#status = :held AND holdId = :holdId',
                  ExpressionAttributeNames: { '#status': 'status' },
                  ExpressionAttributeValues: { ':available': 'AVAILABLE', ':held': 'HELD', ':holdId': holdId },
                },
              }),
            ),
          ],
        }),
      );
    } catch (err) {
      if (!cancellationReasons(err)) throw err;
      continue;
    }

    if (opts.reason === 'RELEASED') {
      await services()
        .scheduler.cancelHoldExpiry(holdId)
        .catch((e) => log.warn('No se pudo borrar el schedule de expiración', { holdId, error: String(e) }));
    }
    return { ...hold, status: opts.reason };
  }
  throw new BusyError();
}

export async function attachPayment(holdId: string, paymentId: string): Promise<void> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TableName(),
        Key: keys.hold(holdId),
        UpdateExpression: 'SET paymentId = :pid',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':pid': paymentId, ':active': 'ACTIVE' },
      }),
    );
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') throw new HoldNotConfirmableError('NOT_ACTIVE');
    throw err;
  }
}

async function markHoldFailed(holdId: string, reason: string) {
  await ddb
    .send(
      new UpdateCommand({
        TableName: TableName(),
        Key: keys.hold(holdId),
        UpdateExpression: 'SET #status = :failed, failureReason = :reason, lastReason = :reason, updatedAt = :now',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':failed': 'FAILED',
          ':active': 'ACTIVE',
          ':reason': reason,
          ':now': new Date().toISOString(),
        },
      }),
    )
    .catch((err) => {
      if ((err as Error).name !== 'ConditionalCheckFailedException') throw err;
    });
}

export async function confirmHold(holdId: string, opts: { paymentId?: string; now?: Date } = {}): Promise<Booking> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const now = opts.now ?? new Date();

    const hold = await getHold(holdId);
    if (!hold) throw new NotFoundError('Reserva temporal');
    if (hold.status === 'CONFIRMED' && hold.bookingId) {
      const existing = await getBooking(hold.bookingId);
      if (existing) return existing;
    }
    if (hold.status !== 'ACTIVE') throw new HoldNotConfirmableError(hold.failureReason ?? hold.status);

    const show = await getShow(hold.showId, true);
    if (!show) throw new NotFoundError('Sesión');

    const booking: Booking = {
      bookingId: randomUUID(),
      holdId,
      showId: hold.showId,
      userId: hold.userId,
      userEmail: hold.userEmail,
      seats: hold.seats,
      amountCents: hold.amountCents,
      currency: hold.currency,
      status: 'CONFIRMED',
      movieTitle: show.movieTitle,
      roomName: show.roomName,
      startsAt: show.startsAt,
      createdAt: now.toISOString(),
      paymentId: opts.paymentId ?? hold.paymentId,
      refundStatus: 'NONE',
    };

    const transactItems: TransactItem[] = [
      {
        Update: {
          TableName: TableName(),
          Key: keys.hold(holdId),
          UpdateExpression:
            'SET #status = :confirmed, bookingId = :bookingId, paymentId = :pid, lastActor = :actor, updatedAt = :now',
          ConditionExpression: '#status = :active',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':confirmed': 'CONFIRMED',
            ':active': 'ACTIVE',
            ':bookingId': booking.bookingId,
            ':pid': booking.paymentId ?? null,
            ':actor': 'payment',
            ':now': now.toISOString(),
          },
        },
      },
      {
        ConditionCheck: {
          TableName: TableName(),
          Key: keys.show(hold.showId),
          ConditionExpression: '#status = :open',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':open': 'OPEN' },
        },
      },
      ...hold.seats.map(
        (seatId): TransactItem => ({
          Update: {
            TableName: TableName(),
            Key: keys.seat(hold.showId, seatId),
            UpdateExpression: 'SET #status = :booked, bookingId = :bookingId REMOVE holdId, holdExpiresAt',
            ConditionExpression: '#status = :held AND holdId = :holdId',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':booked': 'BOOKED',
              ':held': 'HELD',
              ':holdId': holdId,
              ':bookingId': booking.bookingId,
            },
          },
        }),
      ),
      {
        Put: {
          TableName: TableName(),
          Item: {
            ...keys.booking(booking.bookingId),
            type: 'BOOKING',
            GSI1PK: index.userBookings(booking.userId),
            GSI1SK: `${booking.startsAt}#${booking.bookingId}`,
            GSI3PK: index.showBookings(booking.showId),
            GSI3SK: `BOOKING#${booking.bookingId}`,
            ...booking,
            lastActor: booking.userId,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ];

    try {
      await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
    } catch (err) {
      const reasons = cancellationReasons(err);
      if (!reasons) throw err;
      if (reasons.includes('TransactionConflict') || reasons[0] === 'ConditionalCheckFailed') continue;
      const reason = reasons[1] === 'ConditionalCheckFailed' ? 'SHOW_BLOCKED' : 'SEATS_LOST';
      await markHoldFailed(holdId, reason);
      throw new HoldNotConfirmableError(reason);
    }

    const { scheduler } = services();
    const remindAt = reminderTime(booking.startsAt, now, config.reminderHoursBefore);
    await Promise.all([
      scheduler.cancelHoldExpiry(holdId),
      remindAt ? scheduler.scheduleReminder(booking.bookingId, remindAt) : undefined,
    ]).catch((e) => log.error('Fallo gestionando schedules tras confirmar', e, { holdId }));
    return booking;
  }
  throw new BusyError();
}
