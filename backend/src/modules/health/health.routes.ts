import { config } from '../../shared/config';
import { json, Router } from '../../shared/http/router';

export const healthRouter = new Router()
  .get('/health', 'public', async () => json(200, { status: 'ok', env: config.appEnv }))
  .get('/me', 'user', async ({ user }) => json(200, user));
