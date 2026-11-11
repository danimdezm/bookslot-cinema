import { BusyError } from '../../domain/errors';
import { MAX_TRANSACTION_ATTEMPTS } from '../constants';

export const RETRY = Symbol('retry');

export const backoff = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * Math.min(25 * 2 ** attempt, 500)));

export async function withRetries<T>(fn: (attempt: number) => Promise<T | typeof RETRY>): Promise<T> {
  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const result = await fn(attempt);
    if (result !== RETRY) return result;
  }
  throw new BusyError();
}
