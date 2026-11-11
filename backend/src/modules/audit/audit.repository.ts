import type { AuditEntry } from '../../domain/types';
import { batchPut, queryItems } from '../../shared/dynamo/operations';

export interface AuditRecord extends AuditEntry {
  eventId: string;
}

const toItem = ({ eventId, ...entry }: AuditRecord) => ({
  PK: `${entry.entity}#${entry.entityId}`,
  SK: `AUDIT#${entry.at}#${eventId}`,
  type: 'AUDIT',
  ...entry,
});

export const listAudit = (entity: AuditEntry['entity'], entityId: string) =>
  queryItems<AuditEntry>({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `${entity}#${entityId}`, ':prefix': 'AUDIT#' },
  });

export const writeAudit = (records: AuditRecord[]) => batchPut(records.map(toItem));
