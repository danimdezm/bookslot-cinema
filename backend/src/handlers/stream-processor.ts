import type { DynamoDBStreamEvent } from 'aws-lambda';
import { processStreamRecords } from '../stream';

export const handler = async (event: DynamoDBStreamEvent) => {
  await processStreamRecords(event.Records);
};
