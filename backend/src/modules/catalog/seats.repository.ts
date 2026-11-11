import type { Seat, SeatStatus } from '../../domain/types';
import { keys } from '../../shared/dynamo/keys';
import { batchGet, batchPut, queryItems } from '../../shared/dynamo/operations';

type NewSeat = Pick<Seat, 'seatId' | 'row' | 'number'>;

const toItem = (showId: string, seat: NewSeat) => ({
  ...keys.seat(showId, seat.seatId),
  type: 'SEAT',
  showId,
  seatId: seat.seatId,
  row: seat.row,
  number: seat.number,
  status: 'AVAILABLE' satisfies SeatStatus,
});

export const findSeats = (showId: string, seatIds: string[]) =>
  batchGet<Seat>(seatIds.map((seatId) => keys.seat(showId, seatId)));

export const listShowSeats = (showId: string) =>
  queryItems<Seat>({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :seat)',
    ExpressionAttributeValues: { ':pk': keys.show(showId).PK, ':seat': 'SEAT#' },
  });

export const saveSeats = (showId: string, seats: NewSeat[]) => batchPut(seats.map((seat) => toItem(showId, seat)));
