import { CreateScheduleCommand, DeleteScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import { config } from '../shared/config';
import { log } from '../shared/logger';
import { LOG_MESSAGES } from '../shared/messages/logs';

export interface Scheduler {
  scheduleHoldExpiry(holdId: string, at: Date): Promise<void>;
  cancelHoldExpiry(holdId: string): Promise<void>;
  scheduleReminder(bookingId: string, at: Date): Promise<void>;
  cancelReminder(bookingId: string): Promise<void>;
}

const holdName = (holdId: string) => `hold-${holdId}`;
const reminderName = (bookingId: string) => `reminder-${bookingId}`;

class EventBridgeScheduler implements Scheduler {
  private client = new SchedulerClient({ region: config.region });

  scheduleHoldExpiry(holdId: string, at: Date) {
    const when = new Date(at.getTime() + 5_000);
    return this.create(holdName(holdId), when, config.holdExpirerArn, { holdId });
  }

  cancelHoldExpiry(holdId: string) {
    return this.remove(holdName(holdId));
  }

  scheduleReminder(bookingId: string, at: Date) {
    return this.create(reminderName(bookingId), at, config.reminderArn, { bookingId });
  }

  cancelReminder(bookingId: string) {
    return this.remove(reminderName(bookingId));
  }

  private async create(name: string, at: Date, targetArn: string | undefined, input: object) {
    if (!targetArn || !config.schedulerRoleArn) {
      log.warn(LOG_MESSAGES.schedulerNotConfigured, { name });
      return;
    }
    try {
      await this.client.send(
        new CreateScheduleCommand({
          Name: name,
          GroupName: config.schedulerGroup,
          ScheduleExpression: `at(${at.toISOString().slice(0, 19)})`,
          ScheduleExpressionTimezone: 'UTC',
          FlexibleTimeWindow: { Mode: 'OFF' },
          ActionAfterCompletion: 'DELETE',
          Target: {
            Arn: targetArn,
            RoleArn: config.schedulerRoleArn,
            Input: JSON.stringify(input),
            RetryPolicy: { MaximumRetryAttempts: 10 },
          },
        }),
      );
    } catch (err) {
      if ((err as Error).name !== 'ConflictException') throw err;
    }
  }

  private async remove(name: string) {
    try {
      await this.client.send(new DeleteScheduleCommand({ Name: name, GroupName: config.schedulerGroup }));
    } catch (err) {
      if ((err as Error).name !== 'ResourceNotFoundException') throw err;
    }
  }
}

export class NoopScheduler implements Scheduler {
  async scheduleHoldExpiry() {}
  async cancelHoldExpiry() {}
  async scheduleReminder() {}
  async cancelReminder() {}
}

export const createScheduler = (): Scheduler => new EventBridgeScheduler();
