import './KpiGrid.css';

export function KpiGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div key={k.label} className="kpi">
          <span>{k.label}</span>
          <strong className="tabular">{k.value}</strong>
        </div>
      ))}
    </div>
  );
}
