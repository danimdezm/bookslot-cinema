import { log } from '../lib/logger';
import { sendReminder } from '../notify';
import type { Scheduler } from '../services/scheduler';
import { releaseHold } from '../store/holds';

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export class LocalScheduler implements Scheduler {
  private timers = new Map<string, NodeJS.Timeout>();

  scheduleHoldExpiry(holdId: string, at: Date) {
    return this.schedule(`hold-${holdId}`, new Date(at.getTime() + 1_000), () =>
      releaseHold(holdId, { reason: 'EXPIRED', actor: 'system' }).then(() => undefined),
    );
  }

  cancelHoldExpiry(holdId: string) {
    return this.cancel(`hold-${holdId}`);
  }

  scheduleReminder(bookingId: string, at: Date) {
    return this.schedule(`reminder-${bookingId}`, at, () => sendReminder(bookingId));
  }

  cancelReminder(bookingId: string) {
    return this.cancel(`reminder-${bookingId}`);
  }

  private async schedule(name: string, at: Date, task: () => Promise<void>) {
    await this.cancel(name);
    const delay = Math.max(0, at.getTime() - Date.now());
    if (delay > MAX_TIMEOUT_MS) {
      log.info('Tarea demasiado lejana para el scheduler local, se omite', { name, at: at.toISOString() });
      return;
    }
    const timer = setTimeout(() => {
      this.timers.delete(name);
      task().catch((err) => log.error('Tarea programada fallida', err, { name }));
    }, delay);
    timer.unref();
    this.timers.set(name, timer);
  }

  private async cancel(name: string) {
    clearTimeout(this.timers.get(name));
    this.timers.delete(name);
  }
}
