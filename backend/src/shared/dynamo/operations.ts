import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type QueryCommandInput,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';
import { ddb } from './client';
import { backoff } from './retry';

export type Key = { PK: string; SK: string };
export type Item = Record<string, unknown>;
type Query = Omit<QueryCommandInput, 'TableName' | 'Limit' | 'ExclusiveStartKey'>;

type SdkTransactItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number];
export type TransactItem = { [Op in keyof SdkTransactItem]?: Omit<NonNullable<SdkTransactItem[Op]>, 'TableName'> };

export interface Update {
  key: Key;
  update: string;
  condition?: string;
  names?: Record<string, string>;
  values: Record<string, unknown>;
}

const isConditionFailure = (err: unknown) => (err as Error).name === 'ConditionalCheckFailedException';

function strip<T>(item: Item): T {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, GSI3PK, GSI3SK, type, ttl, ...rest } = item;
  return rest as T;
}

export async function getItem<T>(key: Key, consistent = false): Promise<T | null> {
  const res = await ddb.send(new GetCommand({ TableName: config.tableName, Key: key, ConsistentRead: consistent }));
  return res.Item ? strip<T>(res.Item) : null;
}

export async function putNew(item: Item): Promise<void> {
  await ddb.send(
    new PutCommand({ TableName: config.tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }),
  );
}

export async function updateItem<T>({ key, update, condition, names, values }: Update): Promise<T | null> {
  try {
    const res = await ddb.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: key,
        UpdateExpression: update,
        ConditionExpression: condition,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return strip<T>(res.Attributes as Item);
  } catch (err) {
    if (condition && isConditionFailure(err)) return null;
    throw err;
  }
}

export async function deleteItem(key: Key): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: config.tableName, Key: key }));
}

export async function queryItems<T>(query: Query): Promise<T[]> {
  const out: T[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new QueryCommand({ ...query, TableName: config.tableName, ExclusiveStartKey }));
    out.push(...(res.Items ?? []).map((item) => strip<T>(item)));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}

const encodeCursor = (key: Record<string, unknown> | undefined) =>
  key ? Buffer.from(JSON.stringify(key)).toString('base64url') : undefined;
const decodeCursor = (cursor: string | undefined) =>
  cursor ? (JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Record<string, unknown>) : undefined;

export async function queryPage<T>(query: Query, limit: number, cursor?: string) {
  const res = await ddb.send(
    new QueryCommand({ ...query, TableName: config.tableName, Limit: limit, ExclusiveStartKey: decodeCursor(cursor) }),
  );
  return {
    items: (res.Items ?? []).map((item) => strip<T>(item)),
    nextCursor: encodeCursor(res.LastEvaluatedKey),
  };
}

export async function batchGet<T>(keys: Key[]): Promise<T[]> {
  const out: T[] = [];
  let pending: Key[] = keys;
  for (let attempt = 0; pending.length > 0; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const res = await ddb.send(
      new BatchGetCommand({ RequestItems: { [config.tableName]: { Keys: pending, ConsistentRead: true } } }),
    );
    out.push(...(res.Responses?.[config.tableName] ?? []).map((item) => strip<T>(item)));
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

const withTable = (item: TransactItem) =>
  Object.fromEntries(
    Object.entries(item).map(([op, params]) => [op, { TableName: config.tableName, ...params }]),
  ) as SdkTransactItem;

export async function transact(items: TransactItem[]): Promise<string[] | null> {
  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: items.map(withTable) }));
    return null;
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'TransactionCanceledException') throw err;
    const reasons = (err as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
    return reasons.map((r) => r.Code ?? 'None');
  }
}
