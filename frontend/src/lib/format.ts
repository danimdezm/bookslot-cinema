const TZ = 'Europe/Madrid';

export const money = (cents: number, currency = 'eur') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', { timeZone: TZ, ...opts });

export const time = (iso: string) => fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const dateLong = (iso: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
export const dateTime = (iso: string) => fmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const dayKey = (iso: string) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

export function dayLabel(iso: string): { top: string; bottom: string } {
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString());
  const bottom = fmt({ day: 'numeric', month: 'short' }).format(new Date(iso)).replace('.', '');
  if (key === today) return { top: 'Hoy', bottom };
  if (key === tomorrow) return { top: 'Mañana', bottom };
  const weekday = fmt({ weekday: 'short' }).format(new Date(iso)).replace('.', '');
  return { top: weekday[0]!.toUpperCase() + weekday.slice(1), bottom };
}

export const duration = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const rowLetters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
