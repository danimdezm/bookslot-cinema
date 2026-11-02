import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  HoldNotConfirmableError,
  PolicyError,
  ShowNotBookableError,
  SoldOutError,
} from '../../src/domain/errors';
import type { User } from '../../src/domain/types';
import { startStreamPoller } from '../../src/local/stream-poller';
import { config } from '../../src/config';
import { processStreamRecords } from '../../src/stream';
import { blockShow } from '../../src/store/blocking';
import { cancelBooking, getBooking, listAudit, listUserBookings } from '../../src/store/bookings';
import { getShow, getShowAvailability, getShowSeats } from '../../src/store/catalog';
import { confirmPaidHold } from '../../src/store/checkout';
import { confirmHold, createHold, getHold, releaseHold } from '../../src/store/holds';
import { minutesAgo, published, refunds, seedShow, setupTable, user } from './helpers';

let cleanup: () => Promise<void>;
beforeAll(async () => {
  cleanup = await setupTable();
});
afterAll(() => cleanup());

const admin: User = { id: 'admin-1', email: 'admin@test.local', groups: ['admin'], isAdmin: true };
let keyCounter = 0;
const key = () => `lifecycle-key-${++keyCounter}`;

describe('ciclo de vida de una reserva', () => {
  it('hold → pago → reserva → cancelación con reembolso (idempotente)', async () => {
    const show = await seedShow([{ row: 'A', seats: 4 }], { priceCents: 1000 });
    const u = user('life');
    const { hold } = await createHold({ showId: show.showId, seatIds: ['A01', 'A02'], user: u, idempotencyKey: key() });
    expect(hold.amountCents).toBe(2000);

    const booking = await confirmPaidHold(hold.holdId, 'pi_test_1');
    expect(booking).toMatchObject({ status: 'CONFIRMED', seats: ['A01', 'A02'], paymentId: 'pi_test_1' });
    expect((await confirmHold(hold.holdId)).bookingId).toBe(booking.bookingId);

    const listed = await listUserBookings(u.id);
    expect(listed.items.map((b) => b.bookingId)).toContain(booking.bookingId);

    const cancelled = await cancelBooking(booking.bookingId, { actorId: u.id, isAdmin: false, reason: 'USER_REQUEST' });
    expect(cancelled).toMatchObject({ status: 'CANCELLED', refundStatus: 'REFUNDED' });
    expect(refunds).toContain('pi_test_1');
    expect((await getShowAvailability(show.showId)).show.available).toBe(4);

    const again = await cancelBooking(booking.bookingId, { actorId: u.id, isAdmin: false, reason: 'USER_REQUEST' });
    expect(again.status).toBe('CANCELLED');
  });

  it('un usuario no puede cancelar reservas ajenas', async () => {
    const show = await seedShow([{ row: 'A', seats: 2 }]);
    const { hold } = await createHold({ showId: show.showId, seatIds: ['A01'], user: user('owner'), idempotencyKey: key() });
    const booking = await confirmHold(hold.holdId);
    await expect(
      cancelBooking(booking.bookingId, { actorId: 'user-other', isAdmin: false, reason: 'x' }),
    ).rejects.toThrow('no encontrado');
  });

  it('política: no se cancela a menos de CANCEL_FREE_HOURS; el admin sí puede', async () => {
    const show = await seedShow([{ row: 'A', seats: 2 }], { startsInHours: config.cancelFreeHours / 2 });
    const u = user('late');
    const { hold } = await createHold({ showId: show.showId, seatIds: ['A01'], user: u, idempotencyKey: key() });
    const booking = await confirmHold(hold.holdId, { paymentId: 'pi_late' });

    await expect(
      cancelBooking(booking.bookingId, { actorId: u.id, isAdmin: false, reason: 'USER_REQUEST' }),
    ).rejects.toBeInstanceOf(PolicyError);
    const forced = await cancelBooking(booking.bookingId, { actorId: admin.id, isAdmin: true, force: true, reason: 'ADMIN' });
    expect(forced.status).toBe('CANCELLED');
  });
});

describe('expiración de holds', () => {
  it('liberar antes de tiempo no hace nada; tras expirar devuelve las butacas', async () => {
    const show = await seedShow([{ row: 'E', seats: 2 }]);
    const { hold } = await createHold({ showId: show.showId, seatIds: ['E01'], user: user('exp'), idempotencyKey: key() });

    expect((await releaseHold(hold.holdId, { reason: 'EXPIRED', actor: 'system' })).status).toBe('ACTIVE');
    const later = new Date(new Date(hold.expiresAt).getTime() + 1_000);
    expect((await releaseHold(hold.holdId, { reason: 'EXPIRED', actor: 'system', now: later })).status).toBe('EXPIRED');
    expect((await getShowSeats(show.showId)).find((s) => s.seatId === 'E01')?.status).toBe('AVAILABLE');
  });

  it('un hold caducado se reclama (expiración perezosa) y su pago tardío se reembolsa', async () => {
    const show = await seedShow([{ row: 'F', seats: 2 }], { priceCents: 700 });
    const slow = user('slow');
    const { hold: stale } = await createHold({
      showId: show.showId,
      seatIds: ['F01'],
      user: slow,
      idempotencyKey: key(),
      now: minutesAgo(config.holdTtlMinutes + 1),
    });

    const { hold: fresh } = await createHold({ showId: show.showId, seatIds: ['F01'], user: user('fast'), idempotencyKey: key() });
    expect(fresh.status).toBe('ACTIVE');
    await expect(
      createHold({ showId: show.showId, seatIds: ['F01'], user: user('third'), idempotencyKey: key() }),
    ).rejects.toBeInstanceOf(SoldOutError);

    await expect(confirmPaidHold(stale.holdId, 'pi_slow')).rejects.toBeInstanceOf(HoldNotConfirmableError);
    expect((await getHold(stale.holdId))?.status).toBe('FAILED');
    expect(refunds).toContain('pi_slow');
    expect(published).toContainEqual(expect.objectContaining({ type: 'PaymentRefunded' }));

    await releaseHold(stale.holdId, { reason: 'EXPIRED', actor: 'system' });
    expect((await getShowSeats(show.showId)).find((s) => s.seatId === 'F01')?.holdId).toBe(fresh.holdId);
  });
});

describe('bloqueo de sesiones', () => {
  it('cancela y reembolsa reservas, rechaza holds nuevos y confirmaciones pendientes', async () => {
    const show = await seedShow([{ row: 'G', seats: 4 }]);
    const { hold: paid } = await createHold({ showId: show.showId, seatIds: ['G01'], user: user('b1'), idempotencyKey: key() });
    const booking = await confirmHold(paid.holdId, { paymentId: 'pi_blocked' });
    const { hold: pending } = await createHold({ showId: show.showId, seatIds: ['G02'], user: user('b2'), idempotencyKey: key() });

    const result = await blockShow(show.showId, admin, 'Mantenimiento');
    expect(result.cancelledBookings).toBe(1);
    expect(await getBooking(booking.bookingId)).toMatchObject({ status: 'CANCELLED', refundStatus: 'REFUNDED' });

    await expect(
      createHold({ showId: show.showId, seatIds: ['G03'], user: user('b3'), idempotencyKey: key() }),
    ).rejects.toBeInstanceOf(ShowNotBookableError);
    await expect(confirmHold(pending.holdId)).rejects.toMatchObject({ reason: 'SHOW_BLOCKED' });
  });
});

describe('stream processor (DynamoDB Streams local)', () => {
  it('audita cambios de estado, emite eventos y recalcula plazas', async () => {
    const stop = await startStreamPoller(config.tableName, processStreamRecords, 100);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const show = await seedShow([{ row: 'H', seats: 3 }]);
      const u = user('stream');
      const { hold } = await createHold({ showId: show.showId, seatIds: ['H01'], user: u, idempotencyKey: key() });
      const booking = await confirmHold(hold.holdId, { paymentId: 'pi_stream' });
      await cancelBooking(booking.bookingId, { actorId: u.id, isAdmin: false, reason: 'USER_REQUEST' });

      await expect
        .poll(async () => (await listAudit('BOOKING', booking.bookingId)).map((a) => `${a.from ?? '∅'}→${a.to}`), {
          timeout: 10_000,
          interval: 200,
        })
        .toEqual(['∅→CONFIRMED', 'CONFIRMED→CANCELLED']);
      expect((await listAudit('HOLD', hold.holdId)).map((a) => a.to)).toEqual(['ACTIVE', 'CONFIRMED']);
      expect(published).toContainEqual({ type: 'BookingConfirmed', detail: { bookingId: booking.bookingId } });
      expect(published).toContainEqual({ type: 'BookingCancelled', detail: { bookingId: booking.bookingId } });
      await expect.poll(async () => (await getShow(show.showId))?.available, { timeout: 5_000 }).toBe(3);
    } finally {
      stop();
    }
  });
});
