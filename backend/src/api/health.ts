import { config } from '../config';
import { json, Router } from '../lib/http';

export const healthRouter = new Router()
  .get('/health', 'public', async () => json(200, { status: 'ok', env: config.appEnv }))
  .get('/me', 'user', async ({ user }) => json(200, user));
