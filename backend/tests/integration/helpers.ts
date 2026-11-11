import { randomUUID } from 'node:crypto';
import { config } from '../../src/shared/config';
import type { RoomRow } from '../../src/domain/types';
import { createTable, deleteTable } from '../../src/local/database/table';
import { setProviders } from '../../src/providers';
import type { DomainEvent } from '../../src/providers/events';
import { MockPayments } from '../../src/providers/payments';
import { NoopRealtime } from '../../src/providers/realtime';
import { NoopScheduler } from '../../src/providers/scheduler';
import { createMovie, createRoom, createShow } from '../../src/modules/catalog/catalog.service';

export const published: DomainEvent[] = [];
export const refunds: string[] = [];

export async function setupTable(): Promise<() => Promise<void>> {
  config.tableName = `test-${randomUUID().slice(0, 8)}`;
  await createTable(config.tableName);

  const payments = new MockPayments();
  setProviders({
    payments: Object.assign(payments, {
      refund: async (paymentId: string) => {
        refunds.push(paymentId);
        return { refundId: `re_${paymentId}` };
      },
    }),
    scheduler: new NoopScheduler(),
    realtime: new NoopRealtime(),
    events: { publish: async (events) => void published.push(...events) },
    mailer: { send: async () => undefined },
  });
  return () => deleteTable(config.tableName);
}

export async function seedShow(rows: RoomRow[], opts: { startsInHours?: number; priceCents?: number } = {}) {
  const movie = await createMovie({ title: `Test ${randomUUID().slice(0, 4)}`, durationMinutes: 100 });
  const room = await createRoom({ name: 'Sala test', rows });
  return createShow({
    movieId: movie.movieId,
    roomId: room.roomId,
    startsAt: new Date(Date.now() + (opts.startsInHours ?? 48) * 3_600_000).toISOString(),
    priceCents: opts.priceCents ?? 900,
  });
}

export const user = (i: number | string) => ({ id: `user-${i}`, email: `user-${i}@test.local` });

export const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
