import { NotFoundError, PolicyError } from '../../domain/errors';
import { cancellationDecision } from '../../domain/policy';
import type { Booking } from '../../domain/types';
import { providers } from '../../providers';
import { config } from '../../shared/config';
import { RETRY, withRetries } from '../../shared/dynamo/retry';
import { log } from '../../shared/logger';
import { ENTITY_NAMES, ERROR_MESSAGES } from '../../shared/messages/errors';
import { LOG_MESSAGES } from '../../shared/messages/logs';
import * as repo from './bookings.repository';

export const { listUserBookings, listShowBookings } = repo;
export const findBooking = repo.findBooking;

export async function getBooking(bookingId: string, ownerId?: string): Promise<Booking> {
  const booking = await repo.findBooking(bookingId);
  if (!booking || (ownerId && booking.userId !== ownerId)) throw new NotFoundError(ENTITY_NAMES.booking);
  return booking;
}

interface CancelOptions {
  actorId: string;
  isAdmin: boolean;
  reason: string;
  force?: boolean;
  now?: Date;
}

function assertCancellable(booking: Booking, now: Date) {
  const decision = cancellationDecision(booking.startsAt, now, config.cancelFreeHours);
  if (decision.allowed) return;
  throw new PolicyError(
    'CANCELLATION_WINDOW_CLOSED',
    ERROR_MESSAGES.cancellationWindowClosed(config.cancelFreeHours),
    { freeUntil: decision.freeUntil },
  );
}

const needsRefund = (booking: Booking) => Boolean(booking.paymentId) && booking.amountCents > 0;

async function refundBooking(booking: Booking): Promise<Booking> {
  const { bookingId } = booking;
  try {
    const { refundId } = await providers().payments.refund(booking.paymentId!, booking.amountCents, `cancel-${bookingId}`);
    await repo.setRefundStatus(bookingId, 'REFUNDED', refundId);
    return { ...booking, refundStatus: 'REFUNDED', refundId };
  } catch (err) {
    log.error(LOG_MESSAGES.refundFailed, err, { bookingId });
    await repo.setRefundStatus(bookingId, 'FAILED');
    return { ...booking, refundStatus: 'FAILED' };
  }
}

export async function cancelBooking(bookingId: string, opts: CancelOptions): Promise<Booking> {
  const result = await withRetries(async () => {
    const now = opts.now ?? new Date();
    const booking = await getBooking(bookingId, opts.isAdmin ? undefined : opts.actorId);
    if (booking.status === 'CANCELLED') return { booking, alreadyCancelled: true };
    if (!opts.force) assertCancellable(booking, now);

    const cancellation: repo.Cancellation = {
      at: now.toISOString(),
      reason: opts.reason,
      actorId: opts.actorId,
      refundStatus: needsRefund(booking) ? 'PENDING' : 'NONE',
    };
    const reasons = await repo.saveCancellation(booking, cancellation);
    if (reasons) {
      if (reasons.includes('TransactionConflict') || reasons[0] === 'ConditionalCheckFailed') return RETRY;
      log.error(LOG_MESSAGES.unexpectedSeatState, undefined, { bookingId, reasons });
      throw new Error(ERROR_MESSAGES.cancellationFailed(bookingId));
    }
    const cancelled: Booking = {
      ...booking,
      status: 'CANCELLED',
      cancelledAt: cancellation.at,
      cancelReason: cancellation.reason,
      refundStatus: cancellation.refundStatus,
    };
    return { booking: cancelled, alreadyCancelled: false };
  });
  if (result.alreadyCancelled) return result.booking;

  await providers()
    .scheduler.cancelReminder(bookingId)
    .catch((e) => log.warn(LOG_MESSAGES.reminderNotCancelled, { bookingId, error: String(e) }));
  return needsRefund(result.booking) ? refundBooking(result.booking) : result.booking;
}
