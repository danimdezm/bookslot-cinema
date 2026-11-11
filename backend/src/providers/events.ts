import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { config } from '../shared/config';
import { EVENT_SOURCE } from '../shared/constants';
import { log } from '../shared/logger';
import { ERROR_MESSAGES } from '../shared/messages/errors';
import { LOG_MESSAGES } from '../shared/messages/logs';

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
      if (res.FailedEntryCount) throw new Error(ERROR_MESSAGES.eventsRejected(res.FailedEntryCount));
    }
  }
}

class LogPublisher implements EventPublisher {
  async publish(events: DomainEvent[]) {
    events.forEach((e) => log.info(LOG_MESSAGES.eventWithoutBus, { type: e.type, detail: e.detail }));
  }
}

export const createEventPublisher = (): EventPublisher =>
  config.eventBusName ? new EventBridgePublisher() : new LogPublisher();
