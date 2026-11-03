import type { Hold } from '../domain/types';

export interface PaymentProvider {
  createPayment(hold: Hold): Promise<{ paymentId: string }>;
  refund(paymentId: string, amountCents: number, idempotencyKey: string): Promise<{ refundId: string }>;
}

export class MockPayments implements PaymentProvider {
  async createPayment(hold: Hold): Promise<{ paymentId: string }> {
    return { paymentId: `mock_pi_${hold.holdId}` };
  }

  async refund(paymentId: string): Promise<{ refundId: string }> {
    return { refundId: `mock_re_${paymentId}` };
  }
}

export const createPaymentProvider = (): PaymentProvider => new MockPayments();
