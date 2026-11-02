import { Link } from 'react-router-dom';
import { BookingBadge } from '@/components/common/StatusBadge';
import { money, time } from '@/lib/format';
import type { Booking } from '@/types';
import './BookingRow.css';
import { Button } from '@/components/ui/button';

const fmtPart = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', ...opts }).format(new Date(iso)).replace('.', '');

export function BookingRow({ booking, onCancel }: { booking: Booking; onCancel(b: Booking): void }) {
  const upcoming = booking.status === 'CONFIRMED' && new Date(booking.startsAt) > new Date();
  return (
    <article className={`booking-row ${booking.status === 'CANCELLED' ? 'booking-row--void' : ''}`}>
      <div className="booking-row__date">
        <span>{fmtPart(booking.startsAt, { weekday: 'short' })}</span>
        <strong className="display">{fmtPart(booking.startsAt, { day: 'numeric' })}</strong>
        <span>{fmtPart(booking.startsAt, { month: 'short' })}</span>
      </div>
      <div className="booking-row__info">
        <h3>{booking.movieTitle}</h3>
        <p className="muted">
          <span className="tabular">{time(booking.startsAt)}</span> · {booking.roomName} · Butacas {booking.seats.join(', ')}
        </p>
        <BookingBadge status={booking.status} refund={booking.refundStatus} />
      </div>
      <div className="booking-row__side">
        <strong className="tabular">{money(booking.amountCents, booking.currency)}</strong>
        <div className="row" style={{ '--gap': '6px', justifyContent: 'flex-end' } as React.CSSProperties}>
          {upcoming && (
            <Button variant="ghost" size="sm" onClick={() => onCancel(booking)}>
              Cancelar
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/bookings/${booking.bookingId}`}>Ver entrada</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
