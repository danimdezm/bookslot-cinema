import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { config } from '../config';
import { log } from '../lib/logger';

export const EVENT_SOURCE = 'bookslot';

export type DomainEvent =
  | { type: 'BookingConfirmed'; detail: { bookingId: string } }
  | { type: 'BookingCancelled'; detail: { bookingId: string } }
  | { type: 'PaymentRefunded'; detail: { email: string; amountCents: number; currency: string; reason: string } };

export interface EventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}

class EventBridgePublisher implements EventPublisher {
  private client = new EventBridgeClient({ region: config.region });

  async publish(events: DomainEvent[]) {
    for (let i = 0; i < events.length; i += 10) {
      const res = await this.client.send(
        new PutEventsCommand({
          Entries: events.slice(i, i + 10).map((e) => ({
            EventBusName: config.eventBusName,
            Source: EVENT_SOURCE,
            DetailType: e.type,
            Detail: JSON.stringify(e.detail),
          })),
        }),
      );
      if (res.FailedEntryCount) throw new Error(`EventBridge rechazó ${res.FailedEntryCount} eventos`);
    }
  }
}

class LogPublisher implements EventPublisher {
  async publish(events: DomainEvent[]) {
    events.forEach((e) => log.info('evento (sin bus)', { type: e.type, detail: e.detail }));
  }
}

export const createEventPublisher = (): EventPublisher =>
  config.eventBusName ? new EventBridgePublisher() : new LogPublisher();
