import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import type { SeatStatus } from './domain/types';
import { log } from './lib/logger';
import { services } from './services';
import type { DomainEvent } from './services/events';
import { writeAudit, type AuditRecord } from './store/bookings';
import { recountAvailable } from './store/catalog';

type Image = Record<string, unknown>;
const AUDITED = new Set(['BOOKING', 'HOLD', 'SHOW']);

const image = (raw: unknown): Image | undefined =>
  raw ? unmarshall(raw as Record<string, AttributeValue>) : undefined;

export async function processStreamRecords(records: DynamoDBRecord[]): Promise<void> {
  const audit: AuditRecord[] = [];
  const events: DomainEvent[] = [];
  const seatChanges = new Map<string, { seatId: string; status: SeatStatus }[]>();
  const showChanges = new Map<string, string>();

  for (const record of records) {
    const next = image(record.dynamodb?.NewImage);
    const prev = image(record.dynamodb?.OldImage);
    if (!next || next.status === prev?.status) continue;
    const type = next.type as string;

    if (type === 'SEAT') {
      if (!prev) continue;
      const showId = next.showId as string;
      const list = seatChanges.get(showId) ?? [];
      list.push({ seatId: next.seatId as string, status: next.status as SeatStatus });
      seatChanges.set(showId, list);
      continue;
    }
    if (!AUDITED.has(type) || next.SK !== 'META') continue;

    const entityId = (type === 'SHOW' ? next.showId : type === 'HOLD' ? next.holdId : next.bookingId) as string;
    if (type === 'SHOW') showChanges.set(entityId, next.status as string);
    audit.push({
      entity: type as AuditRecord['entity'],
      entityId,
      at: (next.updatedAt ?? next.cancelledAt ?? next.createdAt ?? new Date().toISOString()) as string,
      from: prev?.status as string | undefined,
      to: next.status as string,
      actor: next.lastActor as string | undefined,
      reason: next.lastReason as string | undefined,
      eventId: record.eventID ?? `${entityId}-${String(next.status)}`,
    });

    if (type === 'BOOKING') {
      const bookingId = next.bookingId as string;
      if (!prev) events.push({ type: 'BookingConfirmed', detail: { bookingId } });
      else if (next.status === 'CANCELLED') events.push({ type: 'BookingCancelled', detail: { bookingId } });
    }
  }

  const { events: publisher, realtime } = services();
  if (audit.length) await writeAudit(audit);
  if (events.length) await publisher.publish(events);

  for (const [showId, seats] of seatChanges) {
    const available = await recountAvailable(showId);
    await realtime
      .broadcast(showId, { type: 'seats', showId, seats, available })
      .catch((err) => log.warn('Fallo en broadcast', { showId, error: String(err) }));
  }
  for (const [showId, status] of showChanges) {
    await realtime.broadcast(showId, { type: 'show', showId, status }).catch(() => undefined);
  }
}
