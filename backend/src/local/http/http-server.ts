import { createServer, type IncomingMessage } from 'node:http';
import { CORS_HEADERS } from '../constants';
import { toLambdaEvent } from './lambda-event';
import { LOCAL_MESSAGES } from '../messages';
import { routers } from './routes';

const NOT_FOUND = { statusCode: 404, headers: {}, body: JSON.stringify({ error: { code: 'ROUTE_NOT_FOUND' } }) };

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

export const httpServer = createServer(async (req, res) => {
  const started = Date.now();
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end();
    return;
  }

  const body = await readBody(req);
  const router = routers.find((r) => r.matches(method, url.pathname));
  const result = router ? await router.handle(toLambdaEvent(req, url, body)) : NOT_FOUND;

  res.writeHead(result.statusCode ?? 200, { ...CORS_HEADERS, ...(result.headers as Record<string, string>) });
  res.end(result.body ?? '');
  if (!process.env.QUIET) console.log(LOCAL_MESSAGES.request(method, url.pathname, result.statusCode, Date.now() - started));
});
