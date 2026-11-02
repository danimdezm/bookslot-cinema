import type { SeatStatus, ShowStatus } from './show';

export type LiveMessage =
  | { type: 'seats'; showId: string; seats: { seatId: string; status: SeatStatus }[]; available: number }
  | { type: 'show'; showId: string; status: ShowStatus };
