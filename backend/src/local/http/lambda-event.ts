import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { HttpEvent } from '../../shared/http/router';

type Headers = Record<string, string>;

const flattenHeaders = (req: IncomingMessage): Headers =>
  Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v ?? '')]));

function claimsFromHeaders(headers: Headers) {
  const userId = headers['x-user-id'];
  if (!userId) return undefined;
  const groups = (headers['x-user-groups'] ?? '').split(',').map((g) => g.trim()).filter(Boolean);
  return {
    sub: userId,
    email: headers['x-user-email'] || `${userId}@bookslot.local`,
    'cognito:groups': `[${groups.join(' ')}]`,
  };
}

export function toLambdaEvent(req: IncomingMessage, url: URL, body: string): HttpEvent {
  const headers = flattenHeaders(req);
  const claims = claimsFromHeaders(headers);

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
