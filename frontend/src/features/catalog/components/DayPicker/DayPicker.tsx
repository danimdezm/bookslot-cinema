import { dayLabel } from '@/lib/format';
import type { Show } from '@/types';
import './DayPicker.css';

interface DayPickerProps {
  days: [string, Show[]][];
  value: string | undefined;
  onChange(day: string): void;
}

export function DayPicker({ days, value, onChange }: DayPickerProps) {
  return (
    <div className="day-picker" role="tablist" aria-label="Día">
      {days.map(([key, shows]) => {
        const label = dayLabel(shows[0]!.startsAt);
        return (
          <button key={key} role="tab" aria-selected={key === value} className="day-picker__day" onClick={() => onChange(key)}>
            <span>{label.top}</span>
            <strong>{label.bottom}</strong>
            <small>{shows.length} ses.</small>
          </button>
        );
      })}
    </div>
  );
}
