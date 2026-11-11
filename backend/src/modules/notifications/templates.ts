import type { Booking } from '../../domain/types';
import type { Email } from '../../providers/mailer';
import { EMAIL_MESSAGES } from './email.messages';

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
<p style="color:#888;font-size:12px">${EMAIL_MESSAGES.brand}</p></body></html>`,
  };
}

const details = (b: Booking) => [
  EMAIL_MESSAGES.movie(b.movieTitle),
  EMAIL_MESSAGES.show(when(b.startsAt), b.roomName),
  EMAIL_MESSAGES.seats(b.seats),
  EMAIL_MESSAGES.amount(money(b.amountCents, b.currency)),
  EMAIL_MESSAGES.reference(b.bookingId),
];

function refundLine(b: Booking): string {
  if (b.refundStatus === 'NONE') return '';
  return b.refundStatus === 'FAILED' ? EMAIL_MESSAGES.refundFailed : EMAIL_MESSAGES.refundDone;
}

export const templates = {
  bookingConfirmed: (b: Booking) => render(EMAIL_MESSAGES.bookingConfirmedSubject(b.movieTitle), details(b)),

  bookingCancelled: (b: Booking) =>
    render(EMAIL_MESSAGES.bookingCancelledSubject(b.movieTitle), [
      b.cancelReason?.startsWith('SHOW_BLOCKED') ? EMAIL_MESSAGES.cancelledByCinema : EMAIL_MESSAGES.cancelledByUser,
      ...details(b),
      refundLine(b),
    ].filter(Boolean)),

  reminder: (b: Booking) => render(EMAIL_MESSAGES.reminderSubject(b.movieTitle, when(b.startsAt)), details(b)),

  paymentRefunded: (d: { amountCents: number; currency: string }) =>
    render(EMAIL_MESSAGES.paymentRefundedSubject, [
      EMAIL_MESSAGES.seatsLost,
      EMAIL_MESSAGES.refunded(money(d.amountCents, d.currency)),
    ]),
};
