import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ZodError, type ZodType } from 'zod';
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from '../../domain/errors';
import type { User } from '../../domain/types';
import { log } from '../logger';
import { ERROR_MESSAGES } from '../messages/errors';
import { LOG_MESSAGES } from '../messages/logs';

export type HttpEvent = APIGatewayProxyEventV2WithJWTAuthorizer;
type HttpResult = APIGatewayProxyStructuredResultV2;
type Access = 'public' | 'user' | 'admin';

interface Context {
  event: HttpEvent;
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  header(name: string): string | undefined;
  user: User;
  body<T>(schema: ZodType<T>): T;
  rawBody(): string;
}

type Handler = (ctx: Context) => Promise<HttpResult>;

interface Route {
  method: string;
  path: string;
  pattern: RegExp;
  paramNames: string[];
  access: Access;
  handler: Handler;
}

export const json = (statusCode: number, body: unknown, headers: Record<string, string> = {}): HttpResult => ({
  statusCode,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});


export function userFromEvent(event: HttpEvent): User | undefined {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims?.sub) return undefined;
  const rawGroups = claims['cognito:groups'];
  const groups = Array.isArray(rawGroups)
    ? rawGroups.map(String)
    : String(rawGroups ?? '')
        .replace(/^\[|\]$/g, '')
        .split(/[\s,]+/)
        .filter(Boolean);
  return {
    id: String(claims.sub),
    email: String(claims.email ?? ''),
    groups,
    isAdmin: groups.includes('admin'),
  };
}

function toResult(err: unknown, requestId: string): HttpResult {
  if (err instanceof ZodError) {
    return json(400, { error: { code: 'VALIDATION_ERROR', message: ERROR_MESSAGES.invalidRequest, details: err.issues } });
  }
  if (err instanceof AppError) {
    return json(err.status, { error: { code: err.code, message: err.message, details: err.details } });
  }
  log.error(LOG_MESSAGES.unhandledError, err, { requestId });
  return json(500, { error: { code: 'INTERNAL', message: ERROR_MESSAGES.internal, requestId } });
}

export class Router {
  private routes: Route[] = [];

  get(path: string, access: Access, handler: Handler) {
    return this.add('GET', path, access, handler);
  }
  post(path: string, access: Access, handler: Handler) {
    return this.add('POST', path, access, handler);
  }
  delete(path: string, access: Access, handler: Handler) {
    return this.add('DELETE', path, access, handler);
  }

  private add(method: string, path: string, access: Access, handler: Handler) {
    const paramNames: string[] = [];
    const source = path.replace(/\{(\w+)\}/g, (_, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({ method, path, pattern: new RegExp(`^${source}$`), paramNames, access, handler });
    return this;
  }

  use(other: Router) {
    this.routes.push(...other.routes);
    return this;
  }

  definitions() {
    return this.routes.map(({ method, path, access }) => ({ method, path, access }));
  }

  matches(method: string, path: string): boolean {
    return this.routes.some((r) => r.method === method && r.pattern.test(path));
  }

  handle = async (event: HttpEvent): Promise<HttpResult> => {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.rawPath;
    const requestId = event.requestContext.requestId;

    let route: Route | undefined;
    let groups: string[] = [];
    for (const r of this.routes) {
      const match = r.method === method ? r.pattern.exec(path) : null;
      if (match) {
        route = r;
        groups = match.slice(1);
        break;
      }
    }
    if (!route) return json(404, { error: { code: 'ROUTE_NOT_FOUND', message: `${method} ${path}` } });
    const params = Object.fromEntries(route.paramNames.map((n, i) => [n, decodeURIComponent(groups[i] ?? '')]));

    try {
      const user = userFromEvent(event);
      if (route.access !== 'public' && !user) throw new UnauthorizedError();
      if (route.access === 'admin' && !user?.isAdmin) throw new ForbiddenError();

      const raw = event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : (event.body ?? '');
      const ctx: Context = {
        event,
        params,
        query: event.queryStringParameters ?? {},
        header: (name) => event.headers?.[name.toLowerCase()],
        user: user as User,
        rawBody: () => raw,
        body: (schema) => {
          let parsed: unknown;
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            throw new ValidationError(ERROR_MESSAGES.invalidJson);
          }
          return schema.parse(parsed);
        },
      };
      return await route.handler(ctx);
    } catch (err) {
      return toResult(err, requestId);
    }
  };
}
