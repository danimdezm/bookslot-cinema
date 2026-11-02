import './Occupancy.css';

export function Occupancy({ available, capacity }: { available: number; capacity: number }) {
  const taken = capacity - available;
  const pct = capacity ? Math.round((taken / capacity) * 100) : 0;
  return (
    <div className="occupancy" title={`${taken} de ${capacity} vendidas`}>
      <div className="occupancy__bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="occupancy__label">{pct}%</span>
    </div>
  );
}
