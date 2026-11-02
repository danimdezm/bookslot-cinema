export type ShowStatus = 'OPEN' | 'BLOCKED';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface Show {
  showId: string;
  movieId: string;
  movieTitle: string;
  roomId: string;
  roomName: string;
  startsAt: string;
  priceCents: number;
  currency: string;
  capacity: number;
  available: number;
  status: ShowStatus;
  blockedReason?: string;
}

export interface PublicSeat {
  seatId: string;
  row: string;
  number: number;
  status: SeatStatus;
}

export interface ShowAvailability {
  show: Show;
  seats: PublicSeat[];
}
