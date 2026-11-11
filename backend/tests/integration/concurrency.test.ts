import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PolicyError, SoldOutError } from '../../src/domain/errors';
import { seatId } from '../../src/domain/seats';
import { listShowSeats } from '../../src/modules/catalog/seats.repository';
import { findHold } from '../../src/modules/holds/holds.repository';
import { confirmHold, createHold } from '../../src/modules/holds/holds.service';
import { seedShow, setupTable, user } from './helpers';

let cleanup: () => Promise<void>;
beforeAll(async () => {
  cleanup = await setupTable();
});
afterAll(() => cleanup());

const settle = <T>(promises: Promise<T>[]) => Promise.allSettled(promises);

describe('concurrencia', () => {
  it('N=200 peticiones simultáneas sobre M=50 butacas → exactamente 50 confirmadas y 150 agotadas', async () => {
    const M = 50;
    const N = 200;
    const show = await seedShow([{ row: 'A', seats: M }]);

    const results = await settle(
      Array.from({ length: N }, (_, i) =>
        createHold({
          showId: show.showId,
          seatIds: [seatId('A', (i % M) + 1)],
          user: user(i),
          idempotencyKey: `key-${i}-concurrency`,
        }),
      ),
    );

    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(M);
    expect(rejected).toHaveLength(N - M);
    for (const r of rejected) expect((r as PromiseRejectedResult).reason).toBeInstanceOf(SoldOutError);

    const seats = await listShowSeats(show.showId);
    const winners = new Map(ok.map((r) => [(r as PromiseFulfilledResult<{ hold: { holdId: string; seats: string[] } }>).value.hold.holdId, r]));
    expect(seats.every((s) => s.status === 'HELD' && winners.has(s.holdId!))).toBe(true);
    expect(new Set(seats.map((s) => s.holdId)).size).toBe(M);

    const bookings = await settle([...winners.keys()].map((holdId) => confirmHold(holdId)));
    expect(bookings.filter((b) => b.status === 'fulfilled')).toHaveLength(M);
    expect((await listShowSeats(show.showId)).every((s) => s.status === 'BOOKED')).toBe(true);
  });

  it('holds de varias butacas solapadas: ninguna butaca en dos holds y todo-o-nada', async () => {
    const show = await seedShow([{ row: 'B', seats: 30 }]);
    const requests = Array.from({ length: 80 }, (_, i) => {
      const start = (i * 7) % 28;
      return [start + 1, start + 2, start + 3].map((n) => seatId('B', n));
    });

    const results = await settle(
      requests.map((seats, i) =>
        createHold({ showId: show.showId, seatIds: seats, user: user(`m${i}`), idempotencyKey: `multi-${i}-seats` }),
      ),
    );

    const held = new Map<string, string>();
    for (const r of results) {
      if (r.status === 'rejected') {
        expect(r.reason).toBeInstanceOf(SoldOutError);
        continue;
      }
      for (const s of r.value.hold.seats) {
        expect(held.has(s), `butaca ${s} en dos holds`).toBe(false);
        held.set(s, r.value.hold.holdId);
      }
    }
    for (const seat of await listShowSeats(show.showId)) {
      expect(seat.holdId).toBe(held.get(seat.seatId));
      expect(seat.status).toBe(held.has(seat.seatId) ? 'HELD' : 'AVAILABLE');
    }
  });
});

describe('idempotencia', () => {
  it('20 reintentos concurrentes con la misma Idempotency-Key → un único hold', async () => {
    const show = await seedShow([{ row: 'C', seats: 10 }]);
    const input = { showId: show.showId, seatIds: ['C01', 'C02'], user: user('idem'), idempotencyKey: 'same-key-123' };

    const results = await Promise.all(Array.from({ length: 20 }, () => createHold(input)));

    expect(new Set(results.map((r) => r.hold.holdId)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect((await findHold(results[0]!.hold.holdId))?.status).toBe('ACTIVE');
  });

  it('reutilizar la clave con otra petición → 422', async () => {
    const show = await seedShow([{ row: 'D', seats: 5 }]);
    const base = { showId: show.showId, user: user('reuse'), idempotencyKey: 'reused-key-1' };
    await createHold({ ...base, seatIds: ['D01'] });
    await expect(createHold({ ...base, seatIds: ['D02'] })).rejects.toBeInstanceOf(PolicyError);
  });
});
