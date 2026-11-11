import type { DynamoDBStreamEvent } from 'aws-lambda';
import { processStreamRecords } from '../modules/realtime/stream.service';

export const handler = async (event: DynamoDBStreamEvent) => {
  await processStreamRecords(event.Records);
};
