import { AppError, HoldNotConfirmableError, NotFoundError } from '../domain/errors';
import { json, Router } from '../lib/http';
import { log } from '../lib/logger';
import { stripeClient, stripeSecrets } from '../services/payments';
import { confirmPaidHold } from '../store/checkout';

export const stripeRouter = new Router().post('/webhooks/stripe', 'public', async (ctx) => {
  const signature = ctx.header('stripe-signature');
  if (!signature) throw new AppError(400, 'MISSING_SIGNATURE', 'Falta Stripe-Signature');

  const [stripe, { webhookSecret }] = await Promise.all([stripeClient(), stripeSecrets()]);
  let event;
  try {
    event = stripe.webhooks.constructEvent(ctx.rawBody(), signature, webhookSecret);
  } catch {
    throw new AppError(400, 'INVALID_SIGNATURE', 'Firma de Stripe inválida');
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const holdId = intent.metadata?.holdId;
    if (!holdId) return json(200, { received: true, ignored: 'sin holdId' });
    try {
      const booking = await confirmPaidHold(holdId, intent.id);
      log.info('Reserva confirmada por Stripe', { holdId, bookingId: booking.bookingId });
    } catch (err) {
      if (!(err instanceof HoldNotConfirmableError || err instanceof NotFoundError)) throw err;
      log.warn('Pago recibido para hold no confirmable (reembolsado)', { holdId, error: err.message });
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    log.info('Pago fallido', { paymentIntent: event.data.object.id });
  }
  return json(200, { received: true });
});
