import { createEventPublisher, type EventPublisher } from './events';
import { createMailer, type Mailer } from './mailer';
import { createPaymentProvider, type PaymentProvider } from './payments';
import { createRealtime, type Realtime } from './realtime';
import { createScheduler, type Scheduler } from './scheduler';

interface Providers {
  payments: PaymentProvider;
  mailer: Mailer;
  scheduler: Scheduler;
  events: EventPublisher;
  realtime: Realtime;
}

let current: Providers | undefined;

export function providers(): Providers {
  current ??= {
    payments: createPaymentProvider(),
    mailer: createMailer(),
    scheduler: createScheduler(),
    events: createEventPublisher(),
    realtime: createRealtime(),
  };
  return current;
}

export function setProviders(overrides: Partial<Providers>) {
  current = { ...providers(), ...overrides };
}
