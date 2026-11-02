import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/domain/errors';
import { cancellationDecision, reminderTime } from '../../src/domain/policy';
import { isClaimable, normalizeSeatIds, parseSeatId, seatId, seatsForRows } from '../../src/domain/seats';

describe('seats', () => {
  it('genera ids con relleno para ordenar como la sala', () => {
    expect(seatId('F', 7)).toBe('F07');
    expect(seatsForRows([{ row: 'A', seats: 3 }]).map((s) => s.seatId)).toEqual(['A01', 'A02', 'A03']);
  });

  it('normaliza: deduplica, mayúsculas y orden', () => {
    expect(normalizeSeatIds(['b02', 'A01', 'B02 '], 10)).toEqual(['A01', 'B02']);
  });

  it('rechaza vacío, exceso e ids inválidos', () => {
    expect(() => normalizeSeatIds([], 10)).toThrow(ValidationError);
    expect(() => normalizeSeatIds(['A01', 'A02', 'A03'], 2)).toThrow(ValidationError);
    expect(() => parseSeatId('1A')).toThrow(ValidationError);
  });

  it('un hold caducado se puede reclamar; uno vigente no', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');
    expect(isClaimable({ status: 'AVAILABLE' }, now)).toBe(true);
    expect(isClaimable({ status: 'HELD', holdExpiresAt: '2026-01-01T11:59:59.000Z' }, now)).toBe(true);
    expect(isClaimable({ status: 'HELD', holdExpiresAt: '2026-01-01T12:05:00.000Z' }, now)).toBe(false);
    expect(isClaimable({ status: 'BOOKED' }, now)).toBe(false);
  });
});

describe('política de cancelación', () => {
  const startsAt = '2026-01-01T20:00:00.000Z';

  it('gratis hasta N horas antes', () => {
    expect(cancellationDecision(startsAt, new Date('2026-01-01T17:59:00Z'), 2).allowed).toBe(true);
    expect(cancellationDecision(startsAt, new Date('2026-01-01T18:01:00Z'), 2)).toEqual({
      allowed: false,
      freeUntil: '2026-01-01T18:00:00.000Z',
    });
  });

  it('recordatorio solo si aún no ha pasado', () => {
    expect(reminderTime(startsAt, new Date('2025-12-31T10:00:00Z'), 24)?.toISOString()).toBe('2025-12-31T20:00:00.000Z');
    expect(reminderTime(startsAt, new Date('2026-01-01T10:00:00Z'), 24)).toBeNull();
  });
});
