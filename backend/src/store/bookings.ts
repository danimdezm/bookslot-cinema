import { GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { BusyError, NotFoundError, PolicyError } from '../domain/errors';
import { cancellationDecision } from '../domain/policy';
import type { AuditEntry, Booking, BookingStatus, RefundStatus } from '../domain/types';
import { backoff, batchPut, cancellationReasons, ddb, queryAll, strip } from '../lib/ddb';
import { log } from '../lib/logger';
import { services } from '../services';
import { index, keys } from './keys';

const MAX_ATTEMPTS = 8;
const TableName = () => config.tableName;

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TableName(), Key: keys.booking(bookingId), ConsistentRead: true }),
  );
  return res.Item ? strip<Booking>(res.Item) : null;
}

export interface BookingFilters {
  status?: BookingStatus;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

const encodeCursor = (key: Record<string, unknown> | undefined) =>
  key ? Buffer.from(JSON.stringify(key)).toString('base64url') : undefined;
const decodeCursor = (cursor: string | undefined) =>
  cursor ? (JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Record<string, unknown>) : undefined;

export async function listUserBookings(userId: string, filters: BookingFilters = {}) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :from AND :to',
      ...(filters.status && {
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
      }),
      ExpressionAttributeValues: {
        ':pk': index.userBookings(userId),
        ':from': filters.from ?? '0000',
        ':to': `${filters.to ?? '9999'}~`,
        ...(filters.status && { ':status': filters.status }),
      },
      ScanIndexForward: false,
      Limit: filters.limit ?? 20,
      ExclusiveStartKey: decodeCursor(filters.cursor),
    }),
  );
  return {
    items: (res.Items ?? []).map((i) => strip<Booking>(i)),
    nextCursor: encodeCursor(res.LastEvaluatedKey),
  };
}

export async function listShowBookings(showId: string, status?: BookingStatus): Promise<Booking[]> {
  const items = await queryAll({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :prefix)',
    ExpressionAttributeValues: { ':pk': index.showBookings(showId), ':prefix': 'BOOKING#' },
  });
  const bookings = items.map((i) => strip<Booking>(i));
  return status ? bookings.filter((b) => b.status === status) : bookings;
}

export interface CancelOptions {
  actorId: string;
  isAdmin: boolean;
  reason: string;
  force?: boolean;
  now?: Date;
}

export async function cancelBooking(bookingId: string, opts: CancelOptions): Promise<Booking> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const now = opts.now ?? new Date();

    const booking = await getBooking(bookingId);
    if (!booking || (!opts.isAdmin && booking.userId !== opts.actorId)) throw new NotFoundError('Reserva');
    if (booking.status === 'CANCELLED') return booking;

    const decision = cancellationDecision(booking.startsAt, now, config.cancelFreeHours);
    if (!opts.force && !decision.allowed) {
      throw new PolicyError(
        'CANCELLATION_WINDOW_CLOSED',
        `Solo se puede cancelar hasta ${config.cancelFreeHours} h antes de la sesión`,
        { freeUntil: decision.freeUntil },
      );
    }
    const refund = Boolean(booking.paymentId) && booking.amountCents > 0;
    const refundStatus: RefundStatus = refund ? 'PENDING' : 'NONE';

    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: TableName(),
                Key: keys.booking(bookingId),
                UpdateExpression:
                  'SET #status = :cancelled, cancelledAt = :now, cancelReason = :reason, refundStatus = :refund, lastActor = :actor, lastReason = :reason',
                ConditionExpression: '#status = :confirmed',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                  ':cancelled': 'CANCELLED',
                  ':confirmed': 'CONFIRMED',
                  ':now': now.toISOString(),
                  ':reason': opts.reason,
                  ':refund': refundStatus,
                  ':actor': opts.actorId,
                },
              },
            },
            ...booking.seats.map((seatId) => ({
              Update: {
                TableName: TableName(),
                Key: keys.seat(booking.showId, seatId),
                UpdateExpression: 'SET #status = :available REMOVE bookingId, userId',
                ConditionExpression: '#status = :booked AND bookingId = :bookingId',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':available': 'AVAILABLE', ':booked': 'BOOKED', ':bookingId': bookingId },
              },
            })),
          ],
        }),
      );
    } catch (err) {
      const reasons = cancellationReasons(err);
      if (!reasons) throw err;
      if (reasons.includes('TransactionConflict') || reasons[0] === 'ConditionalCheckFailed') continue;
      log.error('Butacas de la reserva en estado inesperado', undefined, { bookingId, reasons });
      throw err;
    }

    const { scheduler, payments } = services();
    await scheduler
      .cancelReminder(bookingId)
      .catch((e) => log.warn('No se pudo borrar el recordatorio', { bookingId, error: String(e) }));

    const cancelled: Booking = {
      ...booking,
      status: 'CANCELLED',
      cancelledAt: now.toISOString(),
      cancelReason: opts.reason,
      refundStatus,
    };
    if (!refund) return cancelled;

    try {
      const { refundId } = await payments.refund(booking.paymentId!, booking.amountCents, `cancel-${bookingId}`);
      await setRefundStatus(bookingId, 'REFUNDED', refundId);
      return { ...cancelled, refundStatus: 'REFUNDED', refundId };
    } catch (err) {
      log.error('Fallo en el reembolso', err, { bookingId });
      await setRefundStatus(bookingId, 'FAILED');
      return { ...cancelled, refundStatus: 'FAILED' };
    }
  }
  throw new BusyError();
}

async function setRefundStatus(bookingId: string, status: RefundStatus, refundId?: string) {
  await ddb.send(
    new UpdateCommand({
      TableName: TableName(),
      Key: keys.booking(bookingId),
      UpdateExpression: 'SET refundStatus = :status, refundId = :refundId',
      ExpressionAttributeValues: { ':status': status, ':refundId': refundId ?? null },
    }),
  );
}

export interface AuditRecord extends AuditEntry {
  eventId: string;
}

export async function writeAudit(records: AuditRecord[]): Promise<void> {
  await batchPut(
    records.map(({ eventId, ...entry }) => ({
      PK: `${entry.entity}#${entry.entityId}`,
      SK: `AUDIT#${entry.at}#${eventId}`,
      type: 'AUDIT',
      ...entry,
    })),
  );
}

export async function listAudit(entity: AuditEntry['entity'], entityId: string): Promise<AuditEntry[]> {
  const items = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `${entity}#${entityId}`, ':prefix': 'AUDIT#' },
  });
  return items.map((i) => strip<AuditEntry>(i));
}
