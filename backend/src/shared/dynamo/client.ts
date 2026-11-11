import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const localOptions = config.dynamoEndpoint
  ? { endpoint: config.dynamoEndpoint, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
  : {};

export const ddbClient = new DynamoDBClient({ region: config.region, ...localOptions });

export const ddb = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
