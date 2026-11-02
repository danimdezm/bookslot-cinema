import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SoldOutError } from '../../src/domain/errors';
import { json, Router, userFromEvent, type HttpEvent } from '../../src/lib/http';

const event = (method: string, path: string, opts: { claims?: Record<string, string>; body?: string } = {}) =>
  ({
    rawPath: path,
    headers: {},
    body: opts.body,
    requestContext: {
      requestId: 'r1',
      http: { method },
      authorizer: opts.claims ? { jwt: { claims: opts.claims, scopes: [] } } : undefined,
    },
  }) as unknown as HttpEvent;

const router = new Router()
  .get('/shows/{showId}', 'public', async ({ params }) => json(200, params))
  .post('/me', 'user', async (ctx) => json(200, ctx.body(z.object({ n: z.number() }))))
  .get('/admin/x', 'admin', async () => json(200, {}))
  .get('/sold', 'public', async () => {
    throw new SoldOutError(['A01']);
  });

describe('Router', () => {
  it('extrae parámetros de ruta', async () => {
    const res = await router.handle(event('GET', '/shows/abc'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body!)).toEqual({ showId: 'abc' });
  });

  it('401 sin usuario, 403 sin grupo admin, 404 ruta desconocida', async () => {
    expect((await router.handle(event('POST', '/me'))).statusCode).toBe(401);
    expect((await router.handle(event('GET', '/admin/x', { claims: { sub: 'u' } }))).statusCode).toBe(403);
    expect((await router.handle(event('GET', '/nope'))).statusCode).toBe(404);
  });

  it('400 si el cuerpo no cumple el esquema', async () => {
    const res = await router.handle(event('POST', '/me', { claims: { sub: 'u' }, body: '{"n":"x"}' }));
    expect(res.statusCode).toBe(400);
  });

  it('traduce errores de dominio', async () => {
    const res = await router.handle(event('GET', '/sold'));
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body!).error).toMatchObject({ code: 'SOLD_OUT', details: { seats: ['A01'] } });
  });
});

describe('userFromEvent', () => {
  it('interpreta el formato de grupos de Cognito en HTTP APIs', () => {
    const user = userFromEvent(event('GET', '/', { claims: { sub: 'u1', email: 'a@b.c', 'cognito:groups': '[admin staff]' } }));
    expect(user).toEqual({ id: 'u1', email: 'a@b.c', groups: ['admin', 'staff'], isAdmin: true });
  });
});
