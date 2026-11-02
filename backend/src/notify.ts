import type { Booking } from './domain/types';
import { log } from './lib/logger';
import { services } from './services';
import type { DomainEvent } from './services/events';
import type { Email } from './services/mailer';
import { getBooking } from './store/bookings';

type Template = Omit<Email, 'to'>;

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(
    new Date(iso),
  );

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function render(title: string, lines: string[]): Template {
  return {
    subject: title,
    text: [title, '', ...lines].join('\n'),
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
<h2>${escape(title)}</h2>${lines.map((l) => `<p>${escape(l)}</p>`).join('')}
<p style="color:#888;font-size:12px">BookSlot Cinema</p></body></html>`,
  };
}

const details = (b: Booking) => [
  `Película: ${b.movieTitle}`,
  `Sesión: ${when(b.startsAt)} · ${b.roomName}`,
  `Butacas: ${b.seats.join(', ')}`,
  `Importe: ${money(b.amountCents, b.currency)}`,
  `Referencia: ${b.bookingId}`,
];

export const templates = {
  bookingConfirmed: (b: Booking) => render(`Reserva confirmada: ${b.movieTitle}`, details(b)),

  bookingCancelled: (b: Booking) =>
    render(`Reserva cancelada: ${b.movieTitle}`, [
      b.cancelReason?.startsWith('SHOW_BLOCKED')
        ? 'La sesión ha sido cancelada por el cine. Sentimos las molestias.'
        : 'Tu reserva se ha cancelado.',
      ...details(b),
      b.refundStatus === 'NONE' ? '' : `Reembolso: ${b.refundStatus === 'FAILED' ? 'en revisión' : 'tramitado'}`,
    ].filter(Boolean)),

  reminder: (b: Booking) => render(`Recordatorio: ${b.movieTitle} ${when(b.startsAt)}`, details(b)),

  paymentRefunded: (d: { amountCents: number; currency: string }) =>
    render('No hemos podido completar tu reserva', [
      'Las butacas dejaron de estar disponibles antes de confirmar el pago.',
      `Te hemos devuelto ${money(d.amountCents, d.currency)}.`,
    ]),
};

export async function handleDomainEvent(event: DomainEvent): Promise<void> {
  const { mailer } = services();
  switch (event.type) {
    case 'BookingConfirmed':
    case 'BookingCancelled': {
      const booking = await getBooking(event.detail.bookingId);
      if (!booking) {
        log.warn('Reserva no encontrada para notificar', event.detail);
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
  const booking = await getBooking(bookingId);
  if (booking?.status !== 'CONFIRMED') return;
  await services().mailer.send({ to: booking.userEmail, ...templates.reminder(booking) });
}
