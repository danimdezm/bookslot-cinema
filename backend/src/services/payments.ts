import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';
import { config } from '../config';
import type { Hold } from '../domain/types';

export interface PaymentIntent {
  paymentId: string;
  clientSecret: string | null;
}

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe';
  createPayment(hold: Hold): Promise<PaymentIntent>;
  refund(paymentId: string, amountCents: number, idempotencyKey: string): Promise<{ refundId: string }>;
}

export class MockPayments implements PaymentProvider {
  readonly name = 'mock' as const;

  async createPayment(hold: Hold): Promise<PaymentIntent> {
    return { paymentId: `mock_pi_${hold.holdId}`, clientSecret: null };
  }

  async refund(paymentId: string): Promise<{ refundId: string }> {
    return { refundId: `mock_re_${paymentId}` };
  }
}

interface StripeSecrets {
  secretKey: string;
  webhookSecret: string;
}

let secrets: Promise<StripeSecrets> | undefined;

export function stripeSecrets(): Promise<StripeSecrets> {
  secrets ??= (async () => {
    if (config.stripeSecretArn) {
      const client = new SecretsManagerClient({ region: config.region });
      const res = await client.send(new GetSecretValueCommand({ SecretId: config.stripeSecretArn }));
      return JSON.parse(res.SecretString ?? '{}') as StripeSecrets;
    }
    return {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    };
  })();
  return secrets;
}

let stripe: Stripe | undefined;

export async function stripeClient(): Promise<Stripe> {
  if (!stripe) {
    const { secretKey } = await stripeSecrets();
    if (!secretKey) throw new Error('Falta la clave secreta de Stripe');
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export class StripePayments implements PaymentProvider {
  readonly name = 'stripe' as const;

  async createPayment(hold: Hold): Promise<PaymentIntent> {
    const client = await stripeClient();
    const intent = await client.paymentIntents.create(
      {
        amount: hold.amountCents,
        currency: hold.currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: hold.userEmail,
        description: `BookSlot · ${hold.seats.length} entrada(s)`,
        metadata: { holdId: hold.holdId, showId: hold.showId, userId: hold.userId },
      },
      { idempotencyKey: `hold-${hold.holdId}` },
    );
    return { paymentId: intent.id, clientSecret: intent.client_secret };
  }

  async refund(paymentId: string, amountCents: number, idempotencyKey: string): Promise<{ refundId: string }> {
    const client = await stripeClient();
    const refund = await client.refunds.create({ payment_intent: paymentId, amount: amountCents }, { idempotencyKey });
    return { refundId: refund.id };
  }
}

export const createPaymentProvider = (): PaymentProvider =>
  config.paymentProvider === 'stripe' ? new StripePayments() : new MockPayments();
