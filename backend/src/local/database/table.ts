import { CreateTableCommand, DeleteTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { ddbClient } from '../../shared/dynamo/client';
import { TABLE_INDEXES } from '../constants';

export async function createTable(name: string): Promise<void> {
  await ddbClient.send(
    new CreateTableCommand({
      TableName: name,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: ['PK', 'SK', ...TABLE_INDEXES.flatMap((g) => [`${g}PK`, `${g}SK`])].map((n) => ({
        AttributeName: n,
        AttributeType: 'S',
      })),
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: TABLE_INDEXES.map((g) => ({
        IndexName: g,
        KeySchema: [
          { AttributeName: `${g}PK`, KeyType: 'HASH' },
          { AttributeName: `${g}SK`, KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      })),
      StreamSpecification: { StreamEnabled: true, StreamViewType: 'NEW_AND_OLD_IMAGES' },
    }),
  );
}

async function tableExists(name: string): Promise<boolean> {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if ((err as Error).name === 'ResourceNotFoundException') return false;
    throw err;
  }
}

export async function ensureTable(name: string): Promise<boolean> {
  if (await tableExists(name)) return false;
  await createTable(name);
  return true;
}

export async function deleteTable(name: string): Promise<void> {
  await ddbClient.send(new DeleteTableCommand({ TableName: name }));
}
