export type ShowStatus = 'OPEN' | 'BLOCKED';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';
export type HoldStatus = 'ACTIVE' | 'CONFIRMED' | 'EXPIRED' | 'RELEASED' | 'FAILED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type RefundStatus = 'NONE' | 'PENDING' | 'REFUNDED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  groups: string[];
  isAdmin: boolean;
}

export interface Movie {
  movieId: string;
  title: string;
  durationMinutes: number;
  rating?: string;
  description?: string;
  posterUrl?: string;
  createdAt: string;
}

export interface RoomRow {
  row: string;
  seats: number;
}

export interface Room {
  roomId: string;
  name: string;
  rows: RoomRow[];
  capacity: number;
  createdAt: string;
}

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
  createdAt: string;
}

export interface Seat {
  showId: string;
  seatId: string;
  row: string;
  number: number;
  status: SeatStatus;
  holdId?: string;
  holdExpiresAt?: string;
  bookingId?: string;
  userId?: string;
}

export interface Hold {
  holdId: string;
  showId: string;
  userId: string;
  userEmail: string;
  seats: string[];
  amountCents: number;
  currency: string;
  status: HoldStatus;
  expiresAt: string;
  createdAt: string;
  paymentId?: string;
  bookingId?: string;
  failureReason?: string;
}

export interface Booking {
  bookingId: string;
  holdId: string;
  showId: string;
  userId: string;
  userEmail: string;
  seats: string[];
  amountCents: number;
  currency: string;
  status: BookingStatus;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  createdAt: string;
  paymentId?: string;
  refundStatus: RefundStatus;
  refundId?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface AuditEntry {
  entity: 'BOOKING' | 'HOLD' | 'SHOW';
  entityId: string;
  at: string;
  from?: string;
  to: string;
  actor?: string;
  reason?: string;
}
