import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const localOptions = config.dynamoEndpoint
  ? { endpoint: config.dynamoEndpoint, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
  : {};

export const ddbClient = new DynamoDBClient({ region: config.region, ...localOptions });

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export type Key = { PK: string; SK: string };
export type Item = Record<string, unknown>;

export function cancellationReasons(err: unknown): string[] | null {
  if (!(err instanceof Error) || err.name !== 'TransactionCanceledException') return null;
  const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
  return reasons.map((r) => r.Code ?? 'None');
}

export const backoff = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * Math.min(25 * 2 ** attempt, 500)));

export async function batchGet(keys: Key[]): Promise<Item[]> {
  const out: Item[] = [];
  let pending: Key[] = keys;
  for (let attempt = 0; pending.length > 0; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const res = await ddb.send(
      new BatchGetCommand({ RequestItems: { [config.tableName]: { Keys: pending, ConsistentRead: true } } }),
    );
    out.push(...(res.Responses?.[config.tableName] ?? []));
    pending = (res.UnprocessedKeys?.[config.tableName]?.Keys as Key[] | undefined) ?? [];
  }
  return out;
}

export async function batchPut(items: Item[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    let requests = items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
    for (let attempt = 0; requests.length > 0; attempt++) {
      if (attempt > 0) await backoff(attempt);
      const res = await ddb.send(new BatchWriteCommand({ RequestItems: { [config.tableName]: requests } }));
      requests = (res.UnprocessedItems?.[config.tableName] as typeof requests | undefined) ?? [];
    }
  }
}

export async function queryAll(input: Omit<QueryCommandInput, 'TableName'>): Promise<Item[]> {
  const out: Item[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new QueryCommand({ ...input, TableName: config.tableName, ExclusiveStartKey }));
    out.push(...(res.Items ?? []));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}

export function strip<T>(item: Item): T {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, type, ttl, ...rest } = item;
  return rest as T;
}
