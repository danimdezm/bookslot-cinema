import type { Booking, RefundStatus } from '../../domain/types';
import { index, keys } from '../../shared/dynamo/keys';
import type { TransactItem } from '../../shared/dynamo/operations';

export interface Cancellation {
  at: string;
  reason: string;
  actorId: string;
  refundStatus: RefundStatus;
}

const toItem = (booking: Booking) => ({
  ...keys.booking(booking.bookingId),
  type: 'BOOKING',
  GSI1PK: index.userBookings(booking.userId),
  GSI1SK: `${booking.startsAt}#${booking.bookingId}`,
  GSI3PK: index.showBookings(booking.showId),
  GSI3SK: `BOOKING#${booking.bookingId}`,
  ...booking,
  lastActor: booking.userId,
});

export const putBooking = (booking: Booking): TransactItem => ({
  Put: { Item: toItem(booking), ConditionExpression: 'attribute_not_exists(PK)' },
});

export const markBookingCancelled = (bookingId: string, cancellation: Cancellation): TransactItem => ({
  Update: {
    Key: keys.booking(bookingId),
    UpdateExpression:
      'SET #status = :cancelled, cancelledAt = :now, cancelReason = :reason, refundStatus = :refund, lastActor = :actor, lastReason = :reason',
    ConditionExpression: '#status = :confirmed',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':cancelled': 'CANCELLED',
      ':confirmed': 'CONFIRMED',
      ':now': cancellation.at,
      ':reason': cancellation.reason,
      ':refund': cancellation.refundStatus,
      ':actor': cancellation.actorId,
    },
  },
});

export const freeBookedSeat = (showId: string, seatId: string, bookingId: string): TransactItem => ({
  Update: {
    Key: keys.seat(showId, seatId),
    UpdateExpression: 'SET #status = :available REMOVE bookingId, userId',
    ConditionExpression: '#status = :booked AND bookingId = :bookingId',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':available': 'AVAILABLE', ':booked': 'BOOKED', ':bookingId': bookingId },
  },
});
