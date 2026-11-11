import { SEAT_ID_PATTERN } from '../shared/constants';
import { ERROR_MESSAGES } from '../shared/messages/errors';
import { ValidationError } from './errors';
import type { RoomRow, Seat } from './types';

export const seatId = (row: string, number: number) => `${row}${String(number).padStart(2, '0')}`;

export function parseSeatId(id: string): { row: string; number: number } {
  const match = SEAT_ID_PATTERN.exec(id);
  if (!match) throw new ValidationError(ERROR_MESSAGES.invalidSeatId(id));
  return { row: match[1]!, number: Number(match[2]) };
}

export function seatsForRows(rows: RoomRow[]): { seatId: string; row: string; number: number }[] {
  return rows.flatMap(({ row, seats }) =>
    Array.from({ length: seats }, (_, i) => ({ seatId: seatId(row, i + 1), row, number: i + 1 })),
  );
}

export function normalizeSeatIds(ids: string[], max: number): string[] {
  const unique = [...new Set(ids.map((s) => s.trim().toUpperCase()))];
  if (unique.length === 0) throw new ValidationError(ERROR_MESSAGES.noSeatsSelected);
  if (unique.length > max) throw new ValidationError(ERROR_MESSAGES.tooManySeats(max));
  unique.forEach(parseSeatId);
  return unique.sort();
}

export const isClaimable = (seat: Pick<Seat, 'status' | 'holdExpiresAt'>, now: Date) =>
  seat.status === 'AVAILABLE' ||
  (seat.status === 'HELD' && seat.holdExpiresAt !== undefined && seat.holdExpiresAt < now.toISOString());
