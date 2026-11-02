import { createEventPublisher, type EventPublisher } from './events';
import { createMailer, type Mailer } from './mailer';
import { createPaymentProvider, type PaymentProvider } from './payments';
import { createRealtime, type Realtime } from './realtime';
import { createScheduler, type Scheduler } from './scheduler';

export interface Services {
  payments: PaymentProvider;
  mailer: Mailer;
  scheduler: Scheduler;
  events: EventPublisher;
  realtime: Realtime;
}

let current: Services | undefined;

export function services(): Services {
  current ??= {
    payments: createPaymentProvider(),
    mailer: createMailer(),
    scheduler: createScheduler(),
    events: createEventPublisher(),
    realtime: createRealtime(),
  };
  return current;
}

export function setServices(overrides: Partial<Services>) {
  current = { ...services(), ...overrides };
}
