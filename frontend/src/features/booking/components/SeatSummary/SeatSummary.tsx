import { InlineSpinner } from '@/components/common/Spinner';
import { money, plural, time } from '@/lib/format';
import type { Movie, Show } from '@/types';
import { ShowInfo } from '../ShowInfo';
import './SeatSummary.css';
import { Button } from '@/components/ui/button';

interface SeatSummaryProps {
  show: Show;
  movie?: Movie;
  freeSeats: number;
  selection: string[];
  submitting: boolean;
  disabled: boolean;
  onRemove(seatId: string): void;
  onReserve(): void;
}

export function SeatSummary({ show, movie, freeSeats, selection, submitting, disabled, onRemove, onReserve }: SeatSummaryProps) {
  const total = selection.length * show.priceCents;
  return (
    <aside className="summary">
      <div className="card summary__card">
        <ShowInfo movie={movie} title={show.movieTitle}>
          <span className="muted">
            {time(show.startsAt)} · {show.roomName}
          </span>
          <span className="muted">{plural(freeSeats, 'butaca libre', 'butacas libres')}</span>
        </ShowInfo>

        <div className="summary__seats">
          <span className="summary__label">Tus butacas</span>
          {selection.length ? (
            <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
              {selection.map((id) => (
                <button key={id} className="chip chip--removable" onClick={() => onRemove(id)} aria-label={`Quitar ${id}`}>
                  {id} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted summary__hint">Toca las butacas libres en el mapa.</p>
          )}
        </div>

        <div className="summary__total">
          <div>
            <span className="summary__label">Total</span>
            <small className="muted">
              {selection.length} × {money(show.priceCents, show.currency)}
            </small>
          </div>
          <strong className="tabular">{money(total, show.currency)}</strong>
        </div>

        <Button size="lg" className="w-full" disabled={!selection.length || submitting || disabled} onClick={onReserve}>
          {submitting && <InlineSpinner />}
          {submitting
            ? 'Reservando…'
            : selection.length
              ? `Reservar ${plural(selection.length, 'butaca', 'butacas')}`
              : 'Selecciona butacas'}
        </Button>
        <p className="summary__note muted">Te guardamos las butacas 10 minutos mientras pagas.</p>
      </div>
    </aside>
  );
}
