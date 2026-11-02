import { Link } from 'react-router-dom';
import { money, time } from '@/lib/format';
import type { Show } from '@/types';
import './ShowTile.css';

function availabilityLabel(show: Show) {
  if (show.status === 'BLOCKED') return { text: 'No disponible', tone: 'danger' };
  if (show.available === 0) return { text: 'Agotada', tone: 'muted' };
  if (show.available / show.capacity < 0.15) return { text: `¡Últimas ${show.available}!`, tone: 'warn' };
  return { text: `${show.available} libres`, tone: 'ok' };
}

export function ShowTile({ show }: { show: Show }) {
  const label = availabilityLabel(show);
  const disabled = show.status === 'BLOCKED' || show.available === 0;
  const fill = Math.round(((show.capacity - show.available) / show.capacity) * 100);
  const content = (
    <>
      <span className="show-tile__time tabular">{time(show.startsAt)}</span>
      <span className="show-tile__room">{show.roomName}</span>
      <span className="show-tile__bar" aria-hidden>
        <span style={{ width: `${fill}%` }} />
      </span>
      <span className="show-tile__foot">
        <span className={`show-tile__avail show-tile__avail--${label.tone}`}>{label.text}</span>
        <span className="tabular">{money(show.priceCents, show.currency)}</span>
      </span>
    </>
  );
  return disabled ? (
    <div className="show-tile show-tile--disabled" aria-disabled>
      {content}
    </div>
  ) : (
    <Link className="show-tile" to={`/shows/${show.showId}`}>
      {content}
    </Link>
  );
}
