export type HoldStatus = 'ACTIVE' | 'CONFIRMED' | 'EXPIRED' | 'RELEASED' | 'FAILED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type RefundStatus = 'NONE' | 'PENDING' | 'REFUNDED' | 'FAILED';

export interface Hold {
  holdId: string;
  showId: string;
  seats: string[];
  amountCents: number;
  currency: string;
  status: HoldStatus;
  expiresAt: string;
  createdAt: string;
  bookingId?: string;
}

export interface Payment {
  paymentId: string;
  amountCents: number;
  currency: string;
  expiresAt: string;
}

export interface Booking {
  bookingId: string;
  holdId: string;
  showId: string;
  userEmail: string;
  seats: string[];
  amountCents: number;
  currency: string;
  status: BookingStatus;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  createdAt: string;
  refundStatus: RefundStatus;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface AuditEntry {
  entity: 'BOOKING' | 'HOLD' | 'SHOW';
  entityId: string;
  at: string;
  from?: string | null;
  to: string;
  actor?: string | null;
  reason?: string | null;
}
