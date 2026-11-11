import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBRecord } from 'aws-lambda';
import type { SeatStatus } from '../../domain/types';
import { providers } from '../../providers';
import type { DomainEvent } from '../../providers/events';
import { log } from '../../shared/logger';
import { LOG_MESSAGES } from '../../shared/messages/logs';
import { writeAudit, type AuditRecord } from '../audit/audit.repository';
import { recountAvailable } from '../catalog/catalog.service';

type Image = Record<string, unknown>;
type SeatChange = { seatId: string; status: SeatStatus };

interface Changes {
  audit: AuditRecord[];
  events: DomainEvent[];
  seats: Map<string, SeatChange[]>;
  shows: Map<string, string>;
}

const ENTITY_ID = { SHOW: 'showId', HOLD: 'holdId', BOOKING: 'bookingId' } as const;
type AuditedType = keyof typeof ENTITY_ID;

const image = (raw: unknown): Image | undefined =>
  raw ? unmarshall(raw as Record<string, AttributeValue>) : undefined;

const auditRecord = (type: AuditedType, entityId: string, next: Image, prev: Image | undefined, eventId?: string): AuditRecord => ({
  entity: type,
  entityId,
  at: (next.updatedAt ?? next.cancelledAt ?? next.createdAt ?? new Date().toISOString()) as string,
  from: prev?.status as string | undefined,
  to: next.status as string,
  actor: next.lastActor as string | undefined,
  reason: next.lastReason as string | undefined,
  eventId: eventId ?? `${entityId}-${String(next.status)}`,
});

function bookingEvent(next: Image, prev: Image | undefined): DomainEvent | undefined {
  const bookingId = next.bookingId as string;
  if (!prev) return { type: 'BookingConfirmed', detail: { bookingId } };
  if (next.status === 'CANCELLED') return { type: 'BookingCancelled', detail: { bookingId } };
  return undefined;
}

function classifyRecords(records: DynamoDBRecord[]): Changes {
  const changes: Changes = { audit: [], events: [], seats: new Map(), shows: new Map() };

  for (const record of records) {
    const next = image(record.dynamodb?.NewImage);
    const prev = image(record.dynamodb?.OldImage);
    if (!next || next.status === prev?.status) continue;
    const type = next.type as string;

    if (type === 'SEAT') {
      if (!prev) continue;
      const showId = next.showId as string;
      const list = changes.seats.get(showId) ?? [];
      list.push({ seatId: next.seatId as string, status: next.status as SeatStatus });
      changes.seats.set(showId, list);
      continue;
    }
    if (!(type in ENTITY_ID) || next.SK !== 'META') continue;

    const audited = type as AuditedType;
    const entityId = next[ENTITY_ID[audited]] as string;
    changes.audit.push(auditRecord(audited, entityId, next, prev, record.eventID));
    if (audited === 'SHOW') changes.shows.set(entityId, next.status as string);
    if (audited === 'BOOKING') {
      const event = bookingEvent(next, prev);
      if (event) changes.events.push(event);
    }
  }
  return changes;
}

export async function processStreamRecords(records: DynamoDBRecord[]): Promise<void> {
  const { audit, events, seats, shows } = classifyRecords(records);
  const { events: publisher, realtime } = providers();

  if (audit.length) await writeAudit(audit);
  if (events.length) await publisher.publish(events);

  for (const [showId, changed] of seats) {
    const available = await recountAvailable(showId);
    await realtime
      .broadcast(showId, { type: 'seats', showId, seats: changed, available })
      .catch((err) => log.warn(LOG_MESSAGES.broadcastFailed, { showId, error: String(err) }));
  }
  for (const [showId, status] of shows) {
    await realtime.broadcast(showId, { type: 'show', showId, status }).catch(() => undefined);
  }
}
