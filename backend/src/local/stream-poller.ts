import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DescribeStreamCommand,
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
} from '@aws-sdk/client-dynamodb-streams';
import type { DynamoDBRecord } from 'aws-lambda';
import { config } from '../config';
import { ddbClient } from '../lib/ddb';
import { log } from '../lib/logger';

export async function startStreamPoller(
  tableName: string,
  onRecords: (records: DynamoDBRecord[]) => Promise<void>,
  intervalMs = 250,
): Promise<() => void> {
  const table = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
  const streamArn = table.Table?.LatestStreamArn;
  if (!streamArn) throw new Error(`La tabla ${tableName} no tiene stream`);

  const client = new DynamoDBStreamsClient({
    region: config.region,
    endpoint: config.dynamoEndpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });

  const iterators = new Map<string, string | null>();
  let initial = true;
  let stopped = false;

  const tick = async () => {
    const { StreamDescription } = await client.send(new DescribeStreamCommand({ StreamArn: streamArn }));
    for (const shard of StreamDescription?.Shards ?? []) {
      const shardId = shard.ShardId!;
      if (iterators.has(shardId)) continue;
      const { ShardIterator } = await client.send(
        new GetShardIteratorCommand({
          StreamArn: streamArn,
          ShardId: shardId,
          ShardIteratorType: initial ? 'LATEST' : 'TRIM_HORIZON',
        }),
      );
      iterators.set(shardId, ShardIterator ?? null);
    }
    initial = false;

    for (const [shardId, iterator] of iterators) {
      if (!iterator) continue;
      const res = await client.send(new GetRecordsCommand({ ShardIterator: iterator, Limit: 1000 }));
      iterators.set(shardId, res.NextShardIterator ?? null);
      if (res.Records?.length) await onRecords(res.Records as unknown as DynamoDBRecord[]);
    }
  };

  void (async () => {
    while (!stopped) {
      try {
        await tick();
      } catch (err) {
        log.error('Stream poller', err);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  })();

  return () => {
    stopped = true;
  };
}
