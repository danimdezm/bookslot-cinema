import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { log } from '../lib/logger';
import { handleDomainEvent } from '../notify';
import type { DomainEvent } from '../services/events';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];
  for (const record of event.Records) {
    try {
      const envelope = JSON.parse(record.body) as { 'detail-type': DomainEvent['type']; detail: unknown };
      await handleDomainEvent({ type: envelope['detail-type'], detail: envelope.detail } as DomainEvent);
    } catch (err) {
      log.error('Fallo procesando notificación', err, { messageId: record.messageId });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
