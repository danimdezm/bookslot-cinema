import { ValidationError } from './errors';
import type { RoomRow, Seat } from './types';

const SEAT_ID = /^([A-Z]{1,2})(\d{2,3})$/;

export const seatId = (row: string, number: number) => `${row}${String(number).padStart(2, '0')}`;

export function parseSeatId(id: string): { row: string; number: number } {
  const match = SEAT_ID.exec(id);
  if (!match) throw new ValidationError(`Identificador de butaca inválido: ${id}`);
  return { row: match[1]!, number: Number(match[2]) };
}

export function seatsForRows(rows: RoomRow[]): { seatId: string; row: string; number: number }[] {
  return rows.flatMap(({ row, seats }) =>
    Array.from({ length: seats }, (_, i) => ({ seatId: seatId(row, i + 1), row, number: i + 1 })),
  );
}

export function normalizeSeatIds(ids: string[], max: number): string[] {
  const unique = [...new Set(ids.map((s) => s.trim().toUpperCase()))];
  if (unique.length === 0) throw new ValidationError('Selecciona al menos una butaca');
  if (unique.length > max) throw new ValidationError(`Máximo ${max} butacas por reserva`);
  unique.forEach(parseSeatId);
  return unique.sort();
}

export const isClaimable = (seat: Pick<Seat, 'status' | 'holdExpiresAt'>, now: Date) =>
  seat.status === 'AVAILABLE' ||
  (seat.status === 'HELD' && seat.holdExpiresAt !== undefined && seat.holdExpiresAt < now.toISOString());
