import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { handleDomainEvent } from '../modules/notifications/notifications.service';
import type { DomainEvent } from '../providers/events';
import { log } from '../shared/logger';
import { LOG_MESSAGES } from '../shared/messages/logs';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  for (const record of event.Records) {
    try {
      const envelope = JSON.parse(record.body) as { 'detail-type': DomainEvent['type']; detail: unknown };
      await handleDomainEvent({ type: envelope['detail-type'], detail: envelope.detail } as DomainEvent);
    } catch (err) {
      log.error(LOG_MESSAGES.notificationFailed, err, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
