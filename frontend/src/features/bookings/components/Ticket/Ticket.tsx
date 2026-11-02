import { BookingBadge } from '@/components/common/StatusBadge';
import { posterTheme } from '@/components/common/Poster';
import { capitalize, dateLong, money, time } from '@/lib/format';
import type { Booking } from '@/types';
import { Barcode } from './Barcode';
import './Ticket.css';

export function Ticket({ booking }: { booking: Booking }) {
  const { style } = posterTheme(booking.movieTitle);
  const cancelled = booking.status === 'CANCELLED';
  return (
    <article className={`ticket ${cancelled ? 'ticket--void' : ''}`} style={style}>
      <div className="ticket__main">
        <div className="ticket__glow" aria-hidden />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow">BookSlot Cinema · Entrada</span>
          <BookingBadge status={booking.status} refund={booking.refundStatus} />
        </div>
        <h2 className="display ticket__title">{booking.movieTitle}</h2>
        <dl className="ticket__fields">
          <div>
            <dt>Fecha</dt>
            <dd>{capitalize(dateLong(booking.startsAt))}</dd>
          </div>
          <div>
            <dt>Hora</dt>
            <dd className="tabular">{time(booking.startsAt)}</dd>
          </div>
          <div>
            <dt>Sala</dt>
            <dd>{booking.roomName}</dd>
          </div>
          <div>
            <dt>Butacas</dt>
            <dd>{booking.seats.join(' · ')}</dd>
          </div>
          <div>
            <dt>Importe</dt>
            <dd className="tabular">{money(booking.amountCents, booking.currency)}</dd>
          </div>
        </dl>
      </div>
      <div className="ticket__stub">
        <span className="ticket__admit">Admite {booking.seats.length}</span>
        <Barcode code={booking.bookingId} />
        <code className="ticket__code">{booking.bookingId.slice(0, 8).toUpperCase()}</code>
      </div>
    </article>
  );
}
