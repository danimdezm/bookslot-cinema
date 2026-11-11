import type { Booking, Hold, HoldStatus, Seat } from '../../domain/types';
import { HOLD_TTL_SECONDS, IDEMPOTENCY_TTL_SECONDS } from '../../shared/constants';
import { epochSeconds, keys } from '../../shared/dynamo/keys';
import type { TransactItem } from '../../shared/dynamo/operations';

export interface Idempotency {
  userId: string;
  key: string;
  hash: string;
}

export const putIdempotencyKey = (idempotency: Idempotency, holdId: string, now: Date): TransactItem => ({
  Put: {
    Item: {
      ...keys.idempotency(idempotency.userId, idempotency.key),
      type: 'IDEMP',
      requestHash: idempotency.hash,
      holdId,
      ttl: epochSeconds(now) + IDEMPOTENCY_TTL_SECONDS,
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  },
});

export function holdSeat(seat: Seat, hold: Hold): TransactItem {
  const free = seat.status === 'AVAILABLE';
  return {
    Update: {
        Key: keys.seat(hold.showId, seat.seatId),
      UpdateExpression:
        'SET #status = :held, holdId = :holdId, holdExpiresAt = :expiresAt, userId = :userId REMOVE bookingId',
      ConditionExpression: free
        ? '#status = :available'
        : '#status = :held AND holdId = :prevHoldId AND holdExpiresAt < :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':held': 'HELD',
        ':holdId': hold.holdId,
        ':expiresAt': hold.expiresAt,
        ':userId': hold.userId,
        ...(free ? { ':available': 'AVAILABLE' } : { ':prevHoldId': seat.holdId, ':now': hold.createdAt }),
      },
    },
  };
}

export const putHold = (hold: Hold): TransactItem => ({
  Put: {
    Item: {
      ...keys.hold(hold.holdId),
      type: 'HOLD',
      ...hold,
      lastActor: hold.userId,
      ttl: epochSeconds(new Date(hold.expiresAt)) + HOLD_TTL_SECONDS,
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  },
});

export const closeHold = (
  holdId: string,
  status: Extract<HoldStatus, 'EXPIRED' | 'RELEASED'>,
  actor: string,
  now: Date,
): TransactItem => ({
  Update: {
    Key: keys.hold(holdId),
    UpdateExpression: 'SET #status = :to, lastActor = :actor, lastReason = :to, updatedAt = :now',
    ConditionExpression: '#status = :active',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':to': status, ':active': 'ACTIVE', ':actor': actor, ':now': now.toISOString() },
  },
});

export const releaseSeat = (showId: string, seatId: string, holdId: string): TransactItem => ({
  Update: {
    Key: keys.seat(showId, seatId),
    UpdateExpression: 'SET #status = :available REMOVE holdId, holdExpiresAt, userId',
    ConditionExpression: '#status = :held AND holdId = :holdId',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':available': 'AVAILABLE', ':held': 'HELD', ':holdId': holdId },
  },
});

export const markHoldConfirmed = (holdId: string, booking: Booking, now: Date): TransactItem => ({
  Update: {
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
});

export const checkShowOpen = (showId: string): TransactItem => ({
  ConditionCheck: {
    Key: keys.show(showId),
    ConditionExpression: '#status = :open',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':open': 'OPEN' },
  },
});

export const bookSeat = (showId: string, seatId: string, holdId: string, bookingId: string): TransactItem => ({
  Update: {
    Key: keys.seat(showId, seatId),
    UpdateExpression: 'SET #status = :booked, bookingId = :bookingId REMOVE holdId, holdExpiresAt',
    ConditionExpression: '#status = :held AND holdId = :holdId',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':booked': 'BOOKED', ':held': 'HELD', ':holdId': holdId, ':bookingId': bookingId },
  },
});
