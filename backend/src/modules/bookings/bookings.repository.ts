import type { Booking, BookingStatus, RefundStatus } from '../../domain/types';
import { DEFAULT_PAGE_SIZE } from '../../shared/constants';
import { index, keys } from '../../shared/dynamo/keys';
import { getItem, queryItems, queryPage, transact, updateItem } from '../../shared/dynamo/operations';
import * as tx from './bookings.transactions';

export type { Cancellation } from './bookings.transactions';

interface BookingFilters {
  status?: BookingStatus;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export const findBooking = (bookingId: string) => getItem<Booking>(keys.booking(bookingId), true);

export const listUserBookings = (userId: string, filters: BookingFilters = {}) =>
  queryPage<Booking>(
    {
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
    },
    filters.limit ?? DEFAULT_PAGE_SIZE,
    filters.cursor,
  );

export async function listShowBookings(showId: string, status?: BookingStatus): Promise<Booking[]> {
  const bookings = await queryItems<Booking>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :prefix)',
    ExpressionAttributeValues: { ':pk': index.showBookings(showId), ':prefix': 'BOOKING#' },
  });
  return status ? bookings.filter((b) => b.status === status) : bookings;
}

export const saveCancellation = (booking: Booking, cancellation: tx.Cancellation) =>
  transact([
    tx.markBookingCancelled(booking.bookingId, cancellation),
    ...booking.seats.map((seatId) => tx.freeBookedSeat(booking.showId, seatId, booking.bookingId)),
  ]);

export const setRefundStatus = (bookingId: string, status: RefundStatus, refundId?: string) =>
  updateItem<Booking>({
    key: keys.booking(bookingId),
    update: 'SET refundStatus = :status, refundId = :refundId',
    values: { ':status': status, ':refundId': refundId ?? null },
  });
