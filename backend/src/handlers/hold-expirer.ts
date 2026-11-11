import { releaseHold } from '../modules/holds/holds.service';

export const handler = async (event: { holdId: string }) => {
  const hold = await releaseHold(event.holdId, { reason: 'EXPIRED', actor: 'system' });
  return { holdId: hold.holdId, status: hold.status };
};
