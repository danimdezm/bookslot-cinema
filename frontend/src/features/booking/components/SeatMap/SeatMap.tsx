import { useMemo } from 'react';
import type { PublicSeat } from '@/types';
import './SeatMap.css';

interface SeatMapProps {
  seats: PublicSeat[];
  selected: Set<string>;
  flashing: Set<string>;
  lost: Set<string>;
  disabled?: boolean;
  onToggle(seatId: string): void;
}

export function SeatMap({ seats, selected, flashing, lost, disabled, onToggle }: SeatMapProps) {
  const { rows, widest, aisleAfter } = useMemo(() => {
    const byRow = new Map<string, PublicSeat[]>();
    for (const seat of seats) {
      const list = byRow.get(seat.row) ?? [];
      list.push(seat);
      byRow.set(seat.row, list);
    }
    const rows = [...byRow.entries()]
      .sort(([a], [b]) => a.length - b.length || a.localeCompare(b))
      .map(([row, list]) => ({ row, seats: list.sort((a, b) => a.number - b.number) }));
    const widest = Math.max(0, ...rows.map((r) => r.seats.length));
    return { rows, widest, aisleAfter: widest >= 8 ? Math.ceil(widest / 2) : 0 };
  }, [seats]);

  return (
    <div className="seatmap">
      <div className="screen" aria-hidden>
        <div className="screen__arc" />
        <span>Pantalla</span>
      </div>

      <div className="seatmap__scroll" style={{ '--cols': widest + (aisleAfter ? 1 : 0) } as React.CSSProperties}>
        <div className="seatmap__grid" role="grid" aria-label="Mapa de butacas">
          {rows.map(({ row, seats: rowSeats }) => (
            <div className="seat-row" role="row" key={row}>
              <span className="seat-row__label" aria-hidden>
                {row}
              </span>
              <div className="seat-row__seats">
                {rowSeats.map((seat) => {
                  const isSelected = selected.has(seat.seatId);
                  const state = isSelected ? 'selected' : seat.status.toLowerCase();
                  const unavailable = seat.status !== 'AVAILABLE' && !isSelected;
                  return (
                    <button
                      key={seat.seatId}
                      role="gridcell"
                      className={[
                        'seat',
                        `seat--${state}`,
                        flashing.has(seat.seatId) ? 'seat--flash' : '',
                        lost.has(seat.seatId) ? 'seat--lost' : '',
                        aisleAfter && seat.number === aisleAfter ? 'seat--aisle' : '',
                      ].join(' ')}
                      disabled={disabled || unavailable}
                      aria-pressed={isSelected}
                      aria-label={`Fila ${row}, butaca ${seat.number}${unavailable ? ', ocupada' : ''}`}
                      title={`Fila ${row} · Butaca ${seat.number}`}
                      onClick={() => onToggle(seat.seatId)}
                    >
                      <span>{seat.number}</span>
                    </button>
                  );
                })}
              </div>
              <span className="seat-row__label" aria-hidden>
                {row}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ul className="legend" aria-label="Leyenda">
        <li>
          <i className="seat seat--available" /> Libre
        </li>
        <li>
          <i className="seat seat--selected" /> Tu selección
        </li>
        <li>
          <i className="seat seat--held" /> Reservándose
        </li>
        <li>
          <i className="seat seat--booked" /> Ocupada
        </li>
      </ul>
    </div>
  );
}
