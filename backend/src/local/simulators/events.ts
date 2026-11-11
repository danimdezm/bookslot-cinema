import { handleDomainEvent } from '../../modules/notifications/notifications.service';
import type { EventPublisher } from '../../providers/events';
import { log } from '../../shared/logger';
import { LOCAL_MESSAGES } from '../messages';

export const localEvents: EventPublisher = {
  async publish(events) {
    for (const event of events) {
      handleDomainEvent(event).catch((err) => log.error(LOCAL_MESSAGES.notificationFailed, err, { type: event.type }));
    }
  },
};
