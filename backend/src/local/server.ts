import './env';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { adminRouter } from '../api/admin';
import { bookingRouter } from '../api/booking';
import { catalogRouter } from '../api/catalog';
import { healthRouter } from '../api/health';
import { stripeRouter } from '../api/stripe';
import { config } from '../config';
import type { HttpEvent } from '../lib/http';
import { log } from '../lib/logger';
import { handleDomainEvent } from '../notify';
import { services, setServices } from '../services';
import type { EventPublisher } from '../services/events';
import type { Realtime } from '../services/realtime';
import { processStreamRecords } from '../stream';
import { LocalScheduler } from './scheduler';
import { startStreamPoller } from './stream-poller';
import { ensureTable } from './table';

const PORT = Number(process.env.PORT ?? 3000);
const routers = [healthRouter, catalogRouter, bookingRouter, adminRouter, stripeRouter];

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers':
    'authorization,content-type,idempotency-key,stripe-signature,x-user-id,x-user-email,x-user-groups',
};

const subscribers = new Map<string, Set<WebSocket>>();

const realtime: Realtime = {
  async broadcast(showId, message) {
    const data = JSON.stringify(message);
    for (const ws of subscribers.get(showId) ?? []) if (ws.readyState === ws.OPEN) ws.send(data);
  },
};

const events: EventPublisher = {
  async publish(list) {
    for (const event of list) {
      handleDomainEvent(event).catch((err) => log.error('Notificación local fallida', err, { type: event.type }));
    }
  },
};

setServices({ scheduler: new LocalScheduler(), events, realtime });

function toEvent(req: IncomingMessage, url: URL, body: string): HttpEvent {
  const headers = Object.fromEntries(
    Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v ?? '')]),
  );
  const userId = headers['x-user-id'];
  const groups = (headers['x-user-groups'] ?? '').split(',').map((g) => g.trim()).filter(Boolean);
  const claims = userId
    ? { sub: userId, email: headers['x-user-email'] || `${userId}@bookslot.local`, 'cognito:groups': `[${groups.join(' ')}]` }
    : undefined;

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    queryStringParameters: url.searchParams.size ? Object.fromEntries(url.searchParams) : undefined,
    body: body || undefined,
    isBase64Encoded: false,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: req.method ?? 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: req.socket.remoteAddress ?? '',
        userAgent: headers['user-agent'] ?? '',
      },
      requestId: randomUUID(),
      routeKey: '$default',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      authorizer: claims ? { principalId: '', integrationLatency: 0, jwt: { claims, scopes: [] } } : undefined,
    },
  } as unknown as HttpEvent;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (method === 'OPTIONS') {
    res.writeHead(204, CORS).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString();

  const router = routers.find((r) => r.matches(method, url.pathname));
  const result = router
    ? await router.handle(toEvent(req, url, body))
    : { statusCode: 404, headers: {}, body: JSON.stringify({ error: { code: 'ROUTE_NOT_FOUND' } }) };

  res.writeHead(result.statusCode ?? 200, { ...CORS, ...(result.headers as Record<string, string>) });
  res.end(result.body ?? '');
  if (!process.env.QUIET) console.log(`${method} ${url.pathname} → ${result.statusCode} (${Date.now() - started} ms)`);
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  const showId = new URL(req.url ?? '', 'http://localhost').searchParams.get('showId');
  if (!showId) return ws.close(1008, 'showId requerido');
  const set = subscribers.get(showId) ?? new Set();
  set.add(ws);
  subscribers.set(showId, set);
  ws.on('close', () => set.delete(ws));
});

if (await ensureTable(config.tableName)) log.info('Tabla creada', { table: config.tableName });
await startStreamPoller(config.tableName, processStreamRecords);

server.listen(PORT, () => {
  const routes = routers.flatMap((r) => r.definitions());
  console.log(`\nBookSlot API local → http://localhost:${PORT}  (WebSocket ws://localhost:${PORT}/ws?showId=...)`);
  console.log(`Tabla ${config.tableName} @ ${config.dynamoEndpoint} · pagos: ${services().payments.name} · mailer: ${config.mailer}`);
  console.log('Auth local: cabeceras X-User-Id, X-User-Email, X-User-Groups (admin)\n');
  for (const r of routes) console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(38)} ${r.access}`);
  console.log('');
});
