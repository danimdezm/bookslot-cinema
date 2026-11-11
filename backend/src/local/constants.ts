export const PORT = Number(process.env.PORT ?? 3000);

export const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-user-id,x-user-email,x-user-groups',
};

export const TABLE_INDEXES = ['GSI1', 'GSI2', 'GSI3'];

export const STREAM_POLL_INTERVAL_MS = 250;
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;
