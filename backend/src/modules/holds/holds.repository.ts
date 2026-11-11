import type { Booking, Hold, HoldStatus, Seat } from '../../domain/types';
import { keys } from '../../shared/dynamo/keys';
import { getItem, transact, updateItem } from '../../shared/dynamo/operations';
import { putBooking } from '../bookings/bookings.transactions';
import * as tx from './holds.transactions';

export const CONFIRMATION_HOLD = 0;
export const CONFIRMATION_SHOW = 1;

export const findHold = (holdId: string) => getItem<Hold>(keys.hold(holdId), true);

export const saveHold = (hold: Hold, seats: Seat[], idempotency: tx.Idempotency) =>
  transact([
    tx.putIdempotencyKey(idempotency, hold.holdId, new Date(hold.createdAt)),
    ...seats.map((seat) => tx.holdSeat(seat, hold)),
    tx.putHold(hold),
  ]);

export const saveRelease = (
  hold: Hold,
  seatIds: string[],
  status: Extract<HoldStatus, 'EXPIRED' | 'RELEASED'>,
  actor: string,
  now: Date,
) =>
  transact([
    tx.closeHold(hold.holdId, status, actor, now),
    ...seatIds.map((seatId) => tx.releaseSeat(hold.showId, seatId, hold.holdId)),
  ]);

export const saveConfirmation = (hold: Hold, booking: Booking, now: Date) =>
  transact([
    tx.markHoldConfirmed(hold.holdId, booking, now),
    tx.checkShowOpen(hold.showId),
    ...hold.seats.map((seatId) => tx.bookSeat(hold.showId, seatId, hold.holdId, booking.bookingId)),
    putBooking(booking),
  ]);

const updateActiveHold = async (holdId: string, update: string, values: Record<string, unknown>) => {
  const updated = await updateItem<Hold>({
    key: keys.hold(holdId),
    update,
    condition: '#status = :active',
    names: { '#status': 'status' },
    values: { ...values, ':active': 'ACTIVE' },
  });
  return updated !== null;
};

export const attachPayment = (holdId: string, paymentId: string) =>
  updateActiveHold(holdId, 'SET paymentId = :pid', { ':pid': paymentId });

export const markHoldFailed = (holdId: string, reason: string) =>
  updateActiveHold(holdId, 'SET #status = :failed, failureReason = :reason, lastReason = :reason, updatedAt = :now', {
    ':failed': 'FAILED',
    ':reason': reason,
    ':now': new Date().toISOString(),
  });
