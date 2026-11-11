import { DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import {
  DescribeStreamCommand,
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
} from '@aws-sdk/client-dynamodb-streams';
import type { DynamoDBRecord } from 'aws-lambda';
import { config } from '../../shared/config';
import { ddbClient } from '../../shared/dynamo/client';
import { log } from '../../shared/logger';
import { STREAM_POLL_INTERVAL_MS } from '../constants';
import { LOCAL_MESSAGES } from '../messages';

type OnRecords = (records: DynamoDBRecord[]) => Promise<void>;
type Iterators = Map<string, string | null>;

const streamsClient = () =>
  new DynamoDBStreamsClient({
    region: config.region,
    endpoint: config.dynamoEndpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });

async function getStreamArn(tableName: string): Promise<string> {
  const table = await ddbClient.send(new DescribeTableCommand({ TableName: tableName }));
  const streamArn = table.Table?.LatestStreamArn;
  if (!streamArn) throw new Error(LOCAL_MESSAGES.noStream(tableName));
  return streamArn;
}

async function addNewShards(client: DynamoDBStreamsClient, streamArn: string, iterators: Iterators, fromLatest: boolean) {
  const { StreamDescription } = await client.send(new DescribeStreamCommand({ StreamArn: streamArn }));
  for (const shard of StreamDescription?.Shards ?? []) {
    const shardId = shard.ShardId!;
    if (iterators.has(shardId)) continue;
    const { ShardIterator } = await client.send(
      new GetShardIteratorCommand({
        StreamArn: streamArn,
        ShardId: shardId,
        ShardIteratorType: fromLatest ? 'LATEST' : 'TRIM_HORIZON',
      }),
    );
    iterators.set(shardId, ShardIterator ?? null);
  }
}

async function readShards(client: DynamoDBStreamsClient, iterators: Iterators, onRecords: OnRecords) {
  for (const [shardId, iterator] of iterators) {
    if (!iterator) continue;
    const res = await client.send(new GetRecordsCommand({ ShardIterator: iterator, Limit: 1000 }));
    iterators.set(shardId, res.NextShardIterator ?? null);
    if (res.Records?.length) await onRecords(res.Records as unknown as DynamoDBRecord[]);
  }
}

export async function startStreamPoller(
  tableName: string,
  onRecords: OnRecords,
  intervalMs = STREAM_POLL_INTERVAL_MS,
): Promise<() => void> {
  const streamArn = await getStreamArn(tableName);
  const client = streamsClient();
  const iterators: Iterators = new Map();
  let firstTick = true;
  let stopped = false;

  const tick = async () => {
    await addNewShards(client, streamArn, iterators, firstTick);
    firstTick = false;
    await readShards(client, iterators, onRecords);
  };

  void (async () => {
    while (!stopped) {
      await tick().catch((err) => log.error(LOCAL_MESSAGES.streamPollerFailed, err));
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  })();

  return () => {
    stopped = true;
  };
}
