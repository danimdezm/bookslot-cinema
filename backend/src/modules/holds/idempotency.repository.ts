import { keys } from '../../shared/dynamo/keys';
import { getItem } from '../../shared/dynamo/operations';

interface IdempotencyRecord {
  requestHash: string;
  holdId: string;
}

export const findIdempotency = (userId: string, key: string) =>
  getItem<IdempotencyRecord>(keys.idempotency(userId, key), true);
