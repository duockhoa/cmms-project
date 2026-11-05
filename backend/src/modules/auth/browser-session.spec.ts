import { ConfigService } from '@nestjs/config';
import { BrowserSessionService } from './browser-session.service';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as requestHttp from 'supertest';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { HrmIdentityService } from './hrm-identity.service';
import { SanitizeResponseInterceptor } from '../../common/interceptors/sanitize-response.interceptor';

describe('HttpOnly browser sessions', () => {
  let service: BrowserSessionService;
  let prisma: any;
  let identities: any;
  let response: any;
  let rows: Map<string, any>;
  const request = (cookie?: string, csrf?: string, expectedHrmId = 'employee'): any => ({
    headers: { origin: 'https://qltb.dkpharma.io.vn', cookie, 'x-csrf-token': csrf },
    body: { expectedHrmId }, ip: '127.0.0.1', is: () => true,
  });
  beforeEach(() => {
    rows = new Map();
    const delegate = {
      create: jest.fn(async ({ data }) => { rows.set(data.id, data); return data; }),
      findUnique: jest.fn(async ({ where }) => rows.get(where.id) || null),
      deleteMany: jest.fn(async ({ where }) => ({ count: Number(rows.delete(where.id)) })),
      delete: jest.fn(async ({ where }) => { rows.delete(where.id); }),
      update: jest.fn(async ({ where, data }) => { const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row; }),
    };
    let queue = Promise.resolve();
    const transaction = { browserSession: delegate, $queryRaw: jest.fn() };
    prisma = { browserSession: delegate, $transaction: jest.fn(callback => {
      const pending = queue.then(() => callback(transaction));
      queue = pending.catch(() => undefined);
      return pending;
    }) };
    identities = {
      refreshSession: jest.fn().mockResolvedValue({ accessToken: 'new-access', refreshToken: 'rotated-secret' }),
      validateSession: jest.fn().mockResolvedValue({ id: 'employee' }), resolve: jest.fn().mockResolvedValue({ id: 'local' }),
      logout: jest.fn().mockResolvedValue({ revoked: true }),
    };
    response = { cookie: jest.fn(), clearCookie: jest.fn() };
    service = new BrowserSessionService(new ConfigService({ NODE_ENV: 'production', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32) }), prisma, identities);
  });
  async function open() {
    const session = await service.open(request(), response, 'access', 'refresh-secret', 'employee');
    const [name, value] = response.cookie.mock.calls[0];
    return { ...session, cookie: `${name}=${value}` };
  }

  it('sets a host-only HttpOnly Secure cookie and stores only encrypted refresh data', async () => {
    const session = await open();
    expect(session).not.toHaveProperty('refreshToken');
    expect(response.cookie).toHaveBeenCalledWith('__Host-qltb-session', expect.stringMatching(/^[a-f0-9]{64}$/), expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
    expect(response.cookie.mock.calls[0][2]).not.toHaveProperty('domain');
    expect(JSON.stringify([...rows.values()])).not.toContain('refresh-secret');
    expect(session.cookie).not.toContain('refresh-secret');
    expect(await service.inspect(request(session.cookie))).toEqual({ csrfToken: session.csrfToken, hrmId: 'employee', refreshSession: true });
  });

  it('rejects missing, duplicate and expired cookies', async () => {
    const session = await open();
    await expect(service.inspect(request())).rejects.toMatchObject({ status: 401 });
    await expect(service.inspect(request(session.cookie + '; ' + session.cookie))).rejects.toMatchObject({ status: 401 });
    for (const row of rows.values()) row.expiresAt = new Date(0);
    await expect(service.inspect(request(session.cookie))).rejects.toMatchObject({ status: 401 });
  });

  it('requires an allowed Origin, JSON content and a matching CSRF header before refresh', async () => {
    const session = await open();
    for (const mutation of [
      (req: any) => { req.headers.origin = 'https://attacker.test'; },
      (req: any) => { delete req.headers.origin; },
      (req: any) => { req.headers['x-csrf-token'] = 'incorrect'; },
      (req: any) => { req.headers['x-csrf-token'] = 'é'.repeat(64); },
      (req: any) => { req.is = () => false; },
    ]) {
      const req = request(session.cookie, session.csrfToken);
      mutation(req);
      await expect(service.refresh(req)).rejects.toMatchObject({ status: 403 });
    }
    expect(identities.refreshSession).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('never refreshes another identity or a locked local account', async () => {
    const session = await open();
    await expect(service.refresh(request(session.cookie, session.csrfToken, 'other'))).rejects.toMatchObject({ status: 401 });
    expect(identities.refreshSession).not.toHaveBeenCalled();
    identities.resolve.mockRejectedValue(new Error('locked'));
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toThrow('locked');
    expect(prisma.browserSession.update).not.toHaveBeenCalled();
  });

  it('uses the rotated server token for sequential tab refreshes without replacing the session cookie', async () => {
    const session = await open();
    const results = await Promise.all([service.refresh(request(session.cookie, session.csrfToken)), service.refresh(request(session.cookie, session.csrfToken))]);
    expect(identities.refreshSession.mock.calls).toEqual([['refresh-secret', 'employee'], ['rotated-secret', 'employee']]);
    expect(results.every(result => result.accessToken === 'new-access' && !('refreshToken' in result))).toBe(true);
    expect(response.cookie).toHaveBeenCalledTimes(1);
  });

  it('ends the local session even when HRM cannot confirm logout', async () => {
    const session = await open();
    identities.logout.mockRejectedValue(new Error('offline'));
    await expect(service.logout(request(session.cookie, session.csrfToken), response)).resolves.toEqual({ revoked: false });
    expect(rows.size).toBe(0);
    expect(response.clearCookie).not.toHaveBeenCalled();
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 401 });
  });

  it('does not invalidate a newer session when a response from the previous one arrives', async () => {
    const first = await open();
    await service.open(request(first.cookie), response, 'access-b', 'refresh-b', 'other');
    await expect(service.refresh(request(first.cookie, first.csrfToken))).rejects.toMatchObject({ status: 401 });
    expect(rows.size).toBe(1);
    expect(identities.refreshSession).not.toHaveBeenCalled();
  });

  it('rejects a missing encryption key and limits repeated authentication requests', async () => {
    const unconfigured = new BrowserSessionService(new ConfigService({}), prisma, identities);
    await expect(unconfigured.open(request(), response, 'access', 'secret', 'employee')).rejects.toMatchObject({ status: 503 });
    expect(prisma.browserSession.create).not.toHaveBeenCalled();
    for (let attempt = 0; attempt < 30; attempt++) service.throttle(request());
    expect(() => service.throttle(request())).toThrow();
  });

  it('transports only an opaque HttpOnly cookie through the real login, bootstrap, refresh and logout HTTP routes', async () => {
    identities.login = jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh-secret', profile: { id: 'employee' } });
    @Module({
      controllers: [AuthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: HrmIdentityService, useValue: identities },
        { provide: BrowserSessionService, useValue: service },
      ],
    })
    class HttpModule {}
    const app = await NestFactory.create(HttpModule, { logger: false });
    app.useGlobalInterceptors(new SanitizeResponseInterceptor());
    await app.init();
    try {
      const http = app.getHttpServer();
      await requestHttp(http).post('/auth/login').send({ username: 'user', password: 'secret' }).expect(403);
      expect(identities.login).not.toHaveBeenCalled();
      const login = await requestHttp(http).post('/auth/login').set('Origin', 'https://qltb.dkpharma.io.vn').send({ username: 'user', password: 'secret' }).expect(201);
      expect(login.body).not.toHaveProperty('refreshToken');
      expect(JSON.stringify(login.body)).not.toContain('refresh-secret');
      const cookieHeader = login.headers['set-cookie'][0];
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('SameSite=Lax');
      const cookie = cookieHeader.split(';')[0];
      const session = await requestHttp(http).get('/auth/session').set('Cookie', cookie).expect(200);
      expect(session.headers['cache-control']).toBe('no-store');
      await requestHttp(http).post('/auth/refresh').set('Origin', 'https://qltb.dkpharma.io.vn').set('Cookie', cookie).send({ expectedHrmId: 'employee' }).expect(403);
      const refresh = await requestHttp(http).post('/auth/refresh').set('Origin', 'https://qltb.dkpharma.io.vn')
        .set('Cookie', cookie).set('X-CSRF-Token', session.body.csrfToken).send({ expectedHrmId: 'employee' }).expect(201);
      expect(refresh.body.accessToken).toBe('new-access');
      expect(refresh.body).not.toHaveProperty('refreshToken');
      await requestHttp(http).post('/auth/logout').set('Origin', 'https://qltb.dkpharma.io.vn')
        .set('Cookie', cookie).set('X-CSRF-Token', session.body.csrfToken).send({ expectedHrmId: 'employee' }).expect(201);
      await requestHttp(http).get('/auth/session').set('Cookie', cookie).expect(401);
    } finally { await app.close(); }
  });
});
