import { ConfigService } from '@nestjs/config';
import { BrowserSessionService } from './browser-session.service';
import { Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as requestHttp from 'supertest';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { HrmIdentityService, HrmRefreshUncertainException, HrmIdentityMismatchException } from './hrm-identity.service';
import { SanitizeResponseInterceptor } from '../../common/interceptors/sanitize-response.interceptor';

describe('HttpOnly browser sessions', () => {
  let service: BrowserSessionService;
  let prisma: any;
  let identities: any;
  let response: any;
  let rows: Map<string, any>;
  let operations: Map<string, any>;
  let tasks: Map<string, any>;
  const newAccess = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  const request = (cookie?: string, csrf?: string, expectedHrmId = 'employee'): any => ({
    headers: { origin: 'https://qltb.dkpharma.io.vn', cookie, 'x-csrf-token': csrf },
    body: { expectedHrmId }, ip: '127.0.0.1', is: () => true,
  });
  beforeEach(() => {
    rows = new Map();
    operations = new Map(); tasks = new Map();
    const matches = (row: any, where: any) => Object.entries(where || {}).every(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return (!value.in || value.in.includes(row[key])) && (!value.lte || row[key] <= value.lte) &&
          (!value.gt || row[key] > value.gt) && (value.lt === undefined || row[key] < value.lt);
      }
      return row[key] === value;
    });
    const delegateFor = (table: Map<string, any>) => {
      const delegate = {
        create: jest.fn(async ({ data }) => {
          if (table.has(data.id)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
          const row = { state: 'ACTIVE', source: 'UNKNOWN', tokenOwnership: 'UNKNOWN', attempts: 0, availableAt: new Date(), ...data };
          table.set(row.id, row); return row;
        }),
        findUnique: jest.fn(async ({ where }) => table.get(where.id) || null),
        findMany: jest.fn(async ({ where, take }) => [...table.values()].filter(row => matches(row, where)).slice(0, take)),
        count: jest.fn(async ({ where }) => [...table.values()].filter(row => matches(row, where)).length),
        deleteMany: jest.fn(async ({ where }) => {
          const found = [...table.values()].filter(row => matches(row, where));
          found.forEach(row => table.delete(row.id)); return { count: found.length };
        }),
        delete: jest.fn(async ({ where }) => { table.delete(where.id); }),
        update: jest.fn(async ({ where, data }) => {
          const row = { ...table.get(where.id) };
          for (const [key, value] of Object.entries(data) as any) row[key] = value?.increment ? row[key] + value.increment : value;
          table.set(where.id, row); return row;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const found = [...table.values()].filter(row => matches(row, where));
          found.forEach(row => table.set(row.id, { ...row, ...data })); return { count: found.length };
        }),
        upsert: jest.fn(async ({ where, create }) => {
          if (!table.has(where.id)) table.set(where.id, { attempts: 0, availableAt: new Date(), ...create });
          return table.get(where.id);
        }),
      };
      return delegate;
    };
    const delegate = delegateFor(rows);
    let queue = Promise.resolve();
    const transaction = { browserSession: delegate, browserAuthOperation: delegateFor(operations), hrmRevocationTask: delegateFor(tasks), $queryRaw: jest.fn() };
    prisma = { ...transaction, $transaction: jest.fn(callback => {
      const pending = queue.then(() => callback(transaction));
      queue = pending.catch(() => undefined);
      return pending;
    }) };
    identities = {
      exchangeRefreshToken: jest.fn().mockResolvedValue({ accessToken: newAccess, refreshToken: 'rotated-secret' }),
      validateRefreshedSession: jest.fn().mockResolvedValue({ id: 'employee' }),
      validateSession: jest.fn().mockResolvedValue({ id: 'employee' }), resolve: jest.fn().mockResolvedValue({ id: 'local' }),
      logout: jest.fn().mockResolvedValue({ revoked: true }),
      applicationOwnsTokens: jest.fn().mockReturnValue(false),
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
    expect(identities.exchangeRefreshToken).not.toHaveBeenCalled();
  });

  it('never refreshes another identity or a locked local account', async () => {
    const session = await open();
    await expect(service.refresh(request(session.cookie, session.csrfToken, 'other'))).rejects.toMatchObject({ status: 401 });
    expect(identities.exchangeRefreshToken).not.toHaveBeenCalled();
    identities.resolve.mockRejectedValue(new Error('locked'));
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toThrow('locked');
    expect([...rows.values()][0].state).toBe('VALIDATION_PENDING');
    identities.resolve.mockResolvedValue({ id: 'local' });
    await service.refresh(request(session.cookie, session.csrfToken));
    expect(identities.exchangeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('coalesces tab refreshes through durable state without replacing the session cookie', async () => {
    const session = await open();
    const results = await Promise.all([service.refresh(request(session.cookie, session.csrfToken)), service.refresh(request(session.cookie, session.csrfToken))]);
    expect(identities.exchangeRefreshToken.mock.calls).toEqual([['refresh-secret']]);
    expect(results.every(result => result.accessToken === newAccess && !('refreshToken' in result))).toBe(true);
    expect(response.cookie).toHaveBeenCalledTimes(1);
  });

  it('ends the local session even when HRM cannot confirm logout', async () => {
    const session = await open();
    identities.logout.mockRejectedValue(new Error('offline'));
    await expect(service.logout(request(session.cookie, session.csrfToken), response)).resolves.toEqual({ localLoggedOut: true, revoked: false, hrmRevocation: 'not_requested_shared' });
    expect([...rows.values()][0]).toMatchObject({ state: 'LOGGED_OUT', refreshToken: '', accessToken: null });
    expect(identities.logout).not.toHaveBeenCalled();
    expect(response.clearCookie).not.toHaveBeenCalled();
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 401 });
  });

  it('does not invalidate a newer session when a response from the previous one arrives', async () => {
    const first = await open();
    await service.open(request(first.cookie), response, 'access-b', 'refresh-b', 'other');
    await expect(service.refresh(request(first.cookie, first.csrfToken))).rejects.toMatchObject({ status: 401 });
    expect([...rows.values()].filter(row => row.state === 'ACTIVE')).toHaveLength(1);
    expect(identities.exchangeRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects a missing encryption key and limits repeated authentication requests', async () => {
    const unconfigured = new BrowserSessionService(new ConfigService({ HRM_JWT_SECRET: '', SESSION_ENCRYPTION_KEY: '' }), prisma, identities);
    await expect(unconfigured.open(request(), response, 'access', 'secret', 'employee')).rejects.toMatchObject({ status: 503 });
    expect(prisma.browserSession.create).not.toHaveBeenCalled();
    for (let attempt = 0; attempt < 30; attempt++) service.throttle(request());
    expect(() => service.throttle(request())).toThrow();
  });

  it('persists rotation across a temporary HRM profile outage and reuses it on retry', async () => {
    const session = await open();
    identities.validateRefreshedSession.mockRejectedValueOnce(new ServiceUnavailableException('offline'));
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 503 });
    expect([...rows.values()][0].state).toBe('VALIDATION_PENDING');
    await expect(service.refresh(request(session.cookie, session.csrfToken))).resolves.toHaveProperty('accessToken', newAccess);
    expect(identities.exchangeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('never repeats an exchange whose result is uncertain', async () => {
    const session = await open();
    identities.exchangeRefreshToken.mockRejectedValue(new HrmRefreshUncertainException());
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 503 });
    expect([...rows.values()][0].state).toBe('REFRESH_UNCERTAIN');
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 401 });
    expect(identities.exchangeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('blocks another exchange when persistence fails after HRM issued a rotated token', async () => {
    const session = await open();
    prisma.browserSession.update.mockRejectedValueOnce(new Error('database failure'));
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toBeInstanceOf(HrmRefreshUncertainException);
    expect([...rows.values()][0].state).toBe('REFRESH_UNCERTAIN');
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 401 });
    expect(identities.exchangeRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('never claims or revokes a rotated token that resolves to a different identity', async () => {
    const session = await open();
    identities.validateRefreshedSession.mockRejectedValue(new HrmIdentityMismatchException());
    await expect(service.refresh(request(session.cookie, session.csrfToken))).rejects.toMatchObject({ status: 401 });
    expect([...rows.values()][0]).toMatchObject({ state: 'INVALID', tokenOwnership: 'UNKNOWN', refreshToken: '' });
    expect(tasks.size).toBe(0);
  });

  it('rejects concurrent replacement of one cookie without leaving two active rows', async () => {
    const session = await open();
    const results = await Promise.allSettled([
      service.open(request(session.cookie), response, 'a', 'r-a', 'employee'),
      service.open(request(session.cookie), response, 'b', 'r-b', 'employee'),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect([...rows.values()].filter(row => row.state === 'ACTIVE')).toHaveLength(1);
    expect([...rows.values()].filter(row => row.state === 'REPLACED')).toHaveLength(1);
  });

  it('replays an identical login operation without creating another HRM pair or row', async () => {
    const req = request(); req.headers['x-auth-operation'] = 'a'.repeat(32);
    const acquire = jest.fn().mockResolvedValue({ accessToken: newAccess, refreshToken: 'private-refresh', profile: { id: 'employee' } });
    const first = await service.authenticate(req, response, 'DIRECT_LOGIN', ['employee', 'private-password'], acquire);
    const second = await service.authenticate(req, response, 'DIRECT_LOGIN', ['employee', 'private-password'], acquire);
    expect(second).toEqual(first);
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(rows.size).toBe(1);
    const stored = JSON.stringify([...operations.values()]);
    expect(stored).not.toContain('private-password');
    expect(stored).not.toContain('private-refresh');
    expect(stored).not.toContain(newAccess);
    await expect(service.authenticate(req, response, 'DIRECT_LOGIN', ['other', 'wrong'], acquire)).rejects.toMatchObject({ status: 409 });
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('does not replay an operation after its session has logged out or changed', async () => {
    const req = request(); req.headers['x-auth-operation'] = 'b'.repeat(32);
    const acquire = jest.fn().mockResolvedValue({ accessToken: newAccess, refreshToken: 'refresh', profile: { id: 'employee' } });
    const session = await service.authenticate(req, response, 'DIRECT_LOGIN', ['employee'], acquire);
    const cookie = response.cookie.mock.calls[0].slice(0, 2).join('=');
    await service.logout(request(cookie, session.csrfToken), response);
    await expect(service.authenticate(req, response, 'DIRECT_LOGIN', ['employee'], acquire)).rejects.toMatchObject({ status: 409 });
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('stores an SSO rotation before verification and recovers the same operation after an outage', async () => {
    const previous = await open();
    const req = request(previous.cookie); req.headers['x-auth-operation'] = 'd'.repeat(32);
    const acquire = jest.fn().mockResolvedValue({ accessToken: newAccess, refreshToken: 'rotated-sso', profile: { id: 'employee' }, validateAfterStore: true });
    identities.validateRefreshedSession.mockRejectedValueOnce(new ServiceUnavailableException('offline'));
    await expect(service.authenticate(req, response, 'LEGACY_SSO', ['handoff'], acquire)).rejects.toMatchObject({ status: 503 });
    expect([...rows.values()].filter(row => row.state === 'ADOPTION_PENDING')).toHaveLength(1);
    expect([...rows.values()].filter(row => row.state === 'ACTIVE')).toHaveLength(1);
    expect(response.cookie).toHaveBeenCalledTimes(1);
    await expect(service.authenticate(req, response, 'LEGACY_SSO', ['handoff'], acquire)).resolves.toHaveProperty('accessToken', newAccess);
    expect(acquire).toHaveBeenCalledTimes(1);
    expect([...rows.values()].filter(row => row.state === 'ACTIVE')).toHaveLength(1);
    expect([...rows.values()].filter(row => row.state === 'REPLACED')).toHaveLength(1);
    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(tasks.size).toBe(0);
  });

  it('retains a durable revocation task while local logout completes', async () => {
    identities.applicationOwnsTokens.mockReturnValue(true);
    identities.logout.mockRejectedValue(new Error('offline'));
    const session = await service.open(request(), response, newAccess, 'owned-refresh', 'employee', 'DIRECT_LOGIN');
    const cookie = response.cookie.mock.calls[0].slice(0, 2).join('=');
    await expect(service.logout(request(cookie, session.csrfToken), response)).resolves.toEqual({ localLoggedOut: true, revoked: false, hrmRevocation: 'pending' });
    expect([...rows.values()][0]).toMatchObject({ state: 'LOGGED_OUT', refreshToken: '' });
    expect(tasks.size).toBe(1);
    expect(JSON.stringify([...tasks.values()])).not.toContain('owned-refresh');
    expect([...tasks.values()][0].attempts).toBe(1);
    identities.logout.mockResolvedValue({ revoked: true });
    const task = [...tasks.values()][0]; task.availableAt = new Date(0);
    expect(await service.processRevocation(task.id)).toBe(true);
    expect(tasks.size).toBe(0);
  });

  it('does not retroactively claim ownership of sessions created in shared mode', async () => {
    const session = await service.open(request(), response, newAccess, 'shared-refresh', 'employee', 'DIRECT_LOGIN');
    identities.applicationOwnsTokens.mockReturnValue(true);
    const cookie = response.cookie.mock.calls[0].slice(0, 2).join('=');
    await service.logout(request(cookie, session.csrfToken), response);
    expect(tasks.size).toBe(0);
    expect(identities.logout).not.toHaveBeenCalled();
  });

  it('audits without writes and deletes only expired rows within a bounded batch', async () => {
    await open(); await open(); await open();
    const values = [...rows.values()];
    values[0].expiresAt = values[1].expiresAt = new Date(0);
    expect(await service.maintain()).toMatchObject({ execute: false, expiredSessions: 2, deletedSessions: 0 });
    expect(rows.size).toBe(3);
    expect(await service.maintain(true, 1, 1)).toMatchObject({ deletedSessions: 1 });
    expect(rows.size).toBe(2);
    await service.maintain(true);
    expect(rows.size).toBe(1);
    expect([...rows.values()][0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('can clean up an expired unknown session without decrypting its legacy token', async () => {
    await open();
    const row = [...rows.values()][0]; row.refreshToken = 'unreadable-legacy'; row.expiresAt = new Date(0);
    expect(await service.maintain(true)).toMatchObject({ deletedSessions: 1 });
    expect(tasks.size).toBe(0);
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
      expect(refresh.body.accessToken).toBe(newAccess);
      expect(refresh.body).not.toHaveProperty('refreshToken');
      await requestHttp(http).post('/auth/logout').set('Origin', 'https://qltb.dkpharma.io.vn')
        .set('Cookie', cookie).set('X-CSRF-Token', session.body.csrfToken).send({ expectedHrmId: 'employee' }).expect(201);
      await requestHttp(http).get('/auth/session').set('Cookie', cookie).expect(401);
    } finally { await app.close(); }
  });
});
