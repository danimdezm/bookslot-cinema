import { createHash, randomUUID } from 'node:crypto';
import {
  HoldNotConfirmableError,
  NotFoundError,
  PolicyError,
  ShowNotBookableError,
  SoldOutError,
  ValidationError,
} from '../../domain/errors';
import { reminderTime } from '../../domain/policy';
import { isClaimable, normalizeSeatIds } from '../../domain/seats';
import type { Booking, Hold, HoldStatus, Seat, Show } from '../../domain/types';
import { providers } from '../../providers';
import { config } from '../../shared/config';
import { MINUTE_MS } from '../../shared/constants';
import { RETRY, withRetries } from '../../shared/dynamo/retry';
import { log } from '../../shared/logger';
import { findBooking } from '../bookings/bookings.service';
import { getShow } from '../catalog/catalog.service';
import { findSeats } from '../catalog/seats.repository';
import * as repo from './holds.repository';
import { findIdempotency } from './idempotency.repository';
import type { Idempotency } from './holds.transactions';
import { ENTITY_NAMES, ERROR_MESSAGES } from '../../shared/messages/errors';
import { LOG_MESSAGES } from '../../shared/messages/logs';

type HoldUser = { id: string; email: string };

export async function getHold(holdId: string, ownerId?: string): Promise<Hold> {
  const hold = await repo.findHold(holdId);
  if (!hold || (ownerId && hold.userId !== ownerId)) throw new NotFoundError(ENTITY_NAMES.hold);
  return hold;
}

const requestHash = (showId: string, seatIds: string[]) =>
  createHash('sha256').update(JSON.stringify({ showId, seatIds })).digest('hex');

async function findReplay({ userId, key, hash }: Idempotency): Promise<CreateHoldResult | null> {
  const saved = await findIdempotency(userId, key);
  if (!saved) return null;
  if (saved.requestHash !== hash) {
    throw new PolicyError('IDEMPOTENCY_KEY_REUSED', ERROR_MESSAGES.idempotencyKeyReused);
  }
  const hold = await repo.findHold(saved.holdId);
  return hold ? { hold, replayed: true } : null;
}

async function getBookableShow(showId: string, now: Date): Promise<Show> {
  const show = await getShow(showId, true);
  if (show.status !== 'OPEN') throw new ShowNotBookableError('BLOCKED');
  if (show.startsAt <= now.toISOString()) throw new ShowNotBookableError('STARTED');
  return show;
}

async function getExistingSeats(showId: string, seatIds: string[]): Promise<Seat[]> {
  const seats = await findSeats(showId, seatIds);
  if (seats.length !== seatIds.length) {
    const found = new Set(seats.map((s) => s.seatId));
    throw new ValidationError(ERROR_MESSAGES.unknownSeats, { seats: seatIds.filter((id) => !found.has(id)) });
  }
  return seats;
}

const buildHold = (show: Show, seatIds: string[], user: HoldUser, now: Date): Hold => ({
  holdId: randomUUID(),
  showId: show.showId,
  userId: user.id,
  userEmail: user.email,
  seats: seatIds,
  amountCents: show.priceCents * seatIds.length,
  currency: show.currency,
  status: 'ACTIVE',
  expiresAt: new Date(now.getTime() + config.holdTtlMinutes * MINUTE_MS).toISOString(),
  createdAt: now.toISOString(),
});

interface CreateHoldInput {
  showId: string;
  seatIds: string[];
  user: HoldUser;
  idempotencyKey: string;
  now?: Date;
}

interface CreateHoldResult {
  hold: Hold;
  replayed: boolean;
}

export async function createHold(input: CreateHoldInput): Promise<CreateHoldResult> {
  const { showId, user } = input;
  const seatIds = normalizeSeatIds(input.seatIds, config.maxSeatsPerHold);
  const idempotency: Idempotency = { userId: user.id, key: input.idempotencyKey, hash: requestHash(showId, seatIds) };

  const previous = await findReplay(idempotency);
  if (previous) return previous;

  return withRetries(async (attempt) => {
    const now = input.now ?? new Date();
    const show = await getBookableShow(showId, now);
    const seats = await getExistingSeats(showId, seatIds);

    const taken = seats.filter((s) => !isClaimable(s, now)).map((s) => s.seatId);
    if (taken.length > 0) {
      const twin = await findReplay(idempotency);
      if (twin) return twin;
      throw new SoldOutError(taken);
    }

    const hold = buildHold(show, seatIds, user, now);
    const reasons = await repo.saveHold(hold, seats, idempotency);
    if (reasons) {
      const winner = await findReplay(idempotency);
      if (winner) return winner;
      log.debug(LOG_MESSAGES.holdRetry, { attempt, reasons });
      return RETRY;
    }

    await providers()
      .scheduler.scheduleHoldExpiry(hold.holdId, new Date(hold.expiresAt))
      .catch((e) => log.error(LOG_MESSAGES.holdExpiryNotScheduled, e, { holdId: hold.holdId }));
    return { hold, replayed: false };
  });
}

interface ReleaseHoldOptions {
  reason: Extract<HoldStatus, 'EXPIRED' | 'RELEASED'>;
  userId?: string;
  actor: string;
  now?: Date;
}

export async function releaseHold(holdId: string, opts: ReleaseHoldOptions): Promise<Hold> {
  return withRetries(async () => {
    const now = opts.now ?? new Date();
    const hold = await getHold(holdId, opts.userId);
    if (hold.status !== 'ACTIVE') return hold;
    if (opts.reason === 'EXPIRED' && hold.expiresAt > now.toISOString()) return hold;

    const seats = await findSeats(hold.showId, hold.seats);
    const mine = seats.filter((s) => s.status === 'HELD' && s.holdId === holdId).map((s) => s.seatId);
    const reasons = await repo.saveRelease(hold, mine, opts.reason, opts.actor, now);
    if (reasons) return RETRY;

    if (opts.reason === 'RELEASED') {
      await providers()
        .scheduler.cancelHoldExpiry(holdId)
        .catch((e) => log.warn(LOG_MESSAGES.holdExpiryNotCancelled, { holdId, error: String(e) }));
    }
    return { ...hold, status: opts.reason };
  });
}

export async function startPayment(holdId: string, userId: string, now = new Date()) {
  const hold = await getHold(holdId, userId);
  if (hold.status !== 'ACTIVE' || hold.expiresAt <= now.toISOString()) {
    throw new HoldNotConfirmableError(hold.status === 'ACTIVE' ? 'EXPIRED' : hold.status);
  }
  const intent = await providers().payments.createPayment(hold);
  const attached = await repo.attachPayment(holdId, intent.paymentId);
  if (!attached) throw new HoldNotConfirmableError('NOT_ACTIVE');
  return {
    paymentId: intent.paymentId,
    amountCents: hold.amountCents,
    currency: hold.currency,
    expiresAt: hold.expiresAt,
  };
}

const buildBooking = (hold: Hold, show: Show, paymentId: string | undefined, now: Date): Booking => ({
  bookingId: randomUUID(),
  holdId: hold.holdId,
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
  paymentId: paymentId ?? hold.paymentId,
  refundStatus: 'NONE',
});

async function updateSchedules(booking: Booking, now: Date) {
  const { scheduler } = providers();
  const remindAt = reminderTime(booking.startsAt, now, config.reminderHoursBefore);
  await Promise.all([
    scheduler.cancelHoldExpiry(booking.holdId),
    remindAt ? scheduler.scheduleReminder(booking.bookingId, remindAt) : undefined,
  ]).catch((e) => log.error(LOG_MESSAGES.schedulesAfterConfirmFailed, e, { holdId: booking.holdId }));
}

export async function confirmHold(holdId: string, opts: { paymentId?: string; now?: Date } = {}): Promise<Booking> {
  return withRetries(async () => {
    const now = opts.now ?? new Date();
    const hold = await getHold(holdId);
    if (hold.status === 'CONFIRMED' && hold.bookingId) {
      const existing = await findBooking(hold.bookingId);
      if (existing) return existing;
    }
    if (hold.status !== 'ACTIVE') throw new HoldNotConfirmableError(hold.failureReason ?? hold.status);

    const show = await getShow(hold.showId, true);
    const booking = buildBooking(hold, show, opts.paymentId, now);
    const reasons = await repo.saveConfirmation(hold, booking, now);
    if (reasons) {
      const holdChanged = reasons[repo.CONFIRMATION_HOLD] === 'ConditionalCheckFailed';
      if (reasons.includes('TransactionConflict') || holdChanged) return RETRY;
      const reason = reasons[repo.CONFIRMATION_SHOW] === 'ConditionalCheckFailed' ? 'SHOW_BLOCKED' : 'SEATS_LOST';
      await repo.markHoldFailed(holdId, reason);
      throw new HoldNotConfirmableError(reason);
    }

    await updateSchedules(booking, now);
    return booking;
  });
}

async function refundFailedHold(hold: Hold, paymentId: string, reason: string) {
  const { payments, events } = providers();
  await payments.refund(paymentId, hold.amountCents, `hold-failed-${hold.holdId}`);
  log.warn(LOG_MESSAGES.paymentRefunded, { holdId: hold.holdId, reason });
  await events.publish([
    {
      type: 'PaymentRefunded',
      detail: { email: hold.userEmail, amountCents: hold.amountCents, currency: hold.currency, reason },
    },
  ]);
}

export async function confirmPaidHold(holdId: string, paymentId: string): Promise<Booking> {
  try {
    return await confirmHold(holdId, { paymentId });
  } catch (err) {
    if (!(err instanceof HoldNotConfirmableError)) throw err;
    const hold = await repo.findHold(holdId);
    if (hold && hold.status !== 'CONFIRMED') await refundFailedHold(hold, paymentId, err.reason);
    throw err;
  }
}

export async function payAndConfirm(holdId: string, userId: string) {
  const hold = await getHold(holdId, userId);
  if (hold.status === 'CONFIRMED') return { booking: await findBooking(hold.bookingId!), created: false };
  const paymentId = hold.paymentId ?? (await startPayment(holdId, userId)).paymentId;
  return { booking: await confirmPaidHold(holdId, paymentId), created: true };
}
