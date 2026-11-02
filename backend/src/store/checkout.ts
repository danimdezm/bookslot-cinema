import { HoldNotConfirmableError, NotFoundError } from '../domain/errors';
import type { Booking } from '../domain/types';
import { log } from '../lib/logger';
import { services } from '../services';
import { attachPayment, confirmHold, getHold } from './holds';

export async function startPayment(holdId: string, userId: string, now = new Date()) {
  const hold = await getHold(holdId);
  if (!hold || hold.userId !== userId) throw new NotFoundError('Reserva temporal');
  if (hold.status !== 'ACTIVE' || hold.expiresAt <= now.toISOString()) {
    throw new HoldNotConfirmableError(hold.status === 'ACTIVE' ? 'EXPIRED' : hold.status);
  }
  const { payments } = services();
  const intent = await payments.createPayment(hold);
  await attachPayment(holdId, intent.paymentId);
  return {
    provider: payments.name,
    paymentId: intent.paymentId,
    clientSecret: intent.clientSecret,
    amountCents: hold.amountCents,
    currency: hold.currency,
    expiresAt: hold.expiresAt,
  };
}

export async function confirmPaidHold(holdId: string, paymentId: string): Promise<Booking> {
  try {
    return await confirmHold(holdId, { paymentId });
  } catch (err) {
    if (!(err instanceof HoldNotConfirmableError)) throw err;
    const hold = await getHold(holdId);
    if (!hold || hold.status === 'CONFIRMED') throw err;
    const { payments, events } = services();
    await payments.refund(paymentId, hold.amountCents, `hold-failed-${holdId}`);
    log.warn('Pago reembolsado: hold no confirmable', { holdId, reason: err.reason });
    await events.publish([
      {
        type: 'PaymentRefunded',
        detail: { email: hold.userEmail, amountCents: hold.amountCents, currency: hold.currency, reason: err.reason },
      },
    ]);
    throw err;
  }
}
