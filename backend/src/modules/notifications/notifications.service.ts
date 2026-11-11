import { providers } from '../../providers';
import type { DomainEvent } from '../../providers/events';
import { log } from '../../shared/logger';
import { LOG_MESSAGES } from '../../shared/messages/logs';
import { findBooking } from '../bookings/bookings.service';
import { templates } from './templates';

export async function handleDomainEvent(event: DomainEvent): Promise<void> {
  const { mailer } = providers();
  switch (event.type) {
    case 'BookingConfirmed':
    case 'BookingCancelled': {
      const booking = await findBooking(event.detail.bookingId);
      if (!booking) {
        log.warn(LOG_MESSAGES.bookingNotFoundForNotification, event.detail);
        return;
      }
      const template = event.type === 'BookingConfirmed' ? templates.bookingConfirmed : templates.bookingCancelled;
      await mailer.send({ to: booking.userEmail, ...template(booking) });
      return;
    }
    case 'PaymentRefunded':
      await mailer.send({ to: event.detail.email, ...templates.paymentRefunded(event.detail) });
      return;
  }
}

export async function sendReminder(bookingId: string): Promise<void> {
  const booking = await findBooking(bookingId);
  if (booking?.status !== 'CONFIRMED') return;
  await providers().mailer.send({ to: booking.userEmail, ...templates.reminder(booking) });
}
