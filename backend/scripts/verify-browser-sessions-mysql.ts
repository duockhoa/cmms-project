import 'reflect-metadata';
import * as assert from 'assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { BrowserSessionService } from '../src/modules/auth/browser-session.service';

/** Only creates and drops its own random database on loopback. No application rows are read/reset. */
async function main() {
  if (process.argv.slice(2).join(' ') !== '--isolated-local-test') throw new Error('Use --isolated-local-test');
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) throw new Error('DATABASE_URL is required');
  const parsed = new URL(originalUrl);
  if (parsed.protocol !== 'mysql:' || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) throw new Error('This test requires loopback MySQL');
  const databaseName = 'codex_auth_test_' + Date.now() + '_' + randomBytes(6).toString('hex');
  const safeName = /^codex_auth_test_[0-9]+_[a-f0-9]{12}$/;
  if (!safeName.test(databaseName)) throw new Error('Invalid isolated test database');
  parsed.searchParams.set('connection_limit', '5');
  parsed.searchParams.set('connect_timeout', '5');
  const admin = new PrismaClient({ datasources: { db: { url: parsed.toString() } } });
  let first: PrismaService | undefined;
  let second: PrismaService | undefined;
  let created = false;
  Logger.overrideLogger(false);
  try {
    await admin.$executeRawUnsafe('CREATE DATABASE `' + databaseName + '`');
    created = true;
    parsed.pathname = '/' + databaseName;
    process.env.DATABASE_URL = parsed.toString();
    first = new PrismaService(); second = new PrismaService();
    for (const migration of ['20261104120000_add_browser_sessions', '20261116100000_session_lifecycle']) {
      const sql = readFileSync(join(__dirname, '../prisma/migrations', migration, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await first.$executeRawUnsafe(statement);
    }
    let exchanges = 0;
    let failValidation = false;
    let owned = false;
    let revokeFails = false;
    let revocations = 0;
    const accessToken = `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
    const identities: any = {
      applicationOwnsTokens: () => owned,
      exchangeRefreshToken: async () => {
        exchanges++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { accessToken, refreshToken: 'rotated-' + exchanges };
      },
      validateRefreshedSession: async () => {
        if (failValidation) throw new ServiceUnavailableException('simulated profile outage');
        return { id: 'employee' };
      },
      resolve: async () => ({ id: 'local' }),
      logout: async () => { revocations++; if (revokeFails) throw new Error('simulated outage'); return { revoked: true }; },
    };
    const config = new ConfigService({ NODE_ENV: 'production', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32) });
    const a = new BrowserSessionService(config, first, identities);
    const b = new BrowserSessionService(config, second, identities);
    const req = (cookie?: string, csrf?: string): any => ({
      headers: { cookie, origin: 'https://qltb.dkpharma.io.vn', 'x-csrf-token': csrf },
      body: { expectedHrmId: 'employee' }, ip: '127.0.0.1', is: () => true,
    });
    const response = () => {
      const saved: string[] = [];
      return { saved, cookie: (name: string, value: string) => { saved.push(name + '=' + value); } } as any;
    };
    const out = response();
    const session = await a.open(req(), out, accessToken, 'original-refresh', 'employee');
    const cookie = out.saved[0];
    const id = createHash('sha256').update(cookie.split('=')[1]).digest('hex');
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => (index % 2 ? a : b).refresh(req(cookie, session.csrfToken))));
    assert.equal(exchanges, 1);
    assert.ok(results.every(result => result.accessToken === accessToken));
    assert.equal(await first.browserSession.count({ where: { state: 'ACTIVE' } }), 1);

    await first.browserSession.update({ where: { id }, data: { refreshedAt: new Date(0) } });
    failValidation = true;
    await assert.rejects(a.refresh(req(cookie, session.csrfToken)));
    assert.equal((await first.browserSession.findUnique({ where: { id } }))?.state, 'VALIDATION_PENDING');
    failValidation = false;
    await b.refresh(req(cookie, session.csrfToken));
    assert.equal(exchanges, 2);

    const operation = req(); operation.headers['x-auth-operation'] = randomUUID();
    const loginOut = response();
    let logins = 0;
    const acquire = async () => { logins++; return { accessToken, refreshToken: 'login-refresh', profile: { id: 'employee' } }; };
    const loggedIn = await a.authenticate(operation, loginOut, 'DIRECT_LOGIN', ['employee', 'dummy-password'], acquire);
    await b.authenticate(operation, loginOut, 'DIRECT_LOGIN', ['employee', 'dummy-password'], acquire);
    assert.equal(logins, 1);
    assert.equal(loginOut.saved[0], loginOut.saved[1]);
    const encrypted = JSON.stringify(await first.browserAuthOperation.findMany());
    assert.ok(!encrypted.includes(accessToken) && !encrypted.includes('dummy-password') && !encrypted.includes('login-refresh'));

    const oldCookie = loginOut.saved[0];
    const replacements = await Promise.allSettled([
      a.open(req(oldCookie), response(), accessToken, 'replacement-a', 'employee'),
      b.open(req(oldCookie), response(), accessToken, 'replacement-b', 'employee'),
    ]);
    assert.equal(replacements.filter(value => value.status === 'fulfilled').length, 1);
    assert.equal(await first.browserSession.count({ where: { state: 'ACTIVE' } }), 2);

    await a.logout(req(cookie, session.csrfToken), response());
    await assert.rejects(b.refresh(req(cookie, session.csrfToken)));
    assert.equal(revocations, 0);

    owned = true; revokeFails = true;
    const ownedOut = response();
    const ownedSession = await a.open(req(), ownedOut, accessToken, 'owned-refresh', 'employee', 'DIRECT_LOGIN');
    assert.equal((await a.logout(req(ownedOut.saved[0], ownedSession.csrfToken), response())).hrmRevocation, 'pending');
    const task = await first.hrmRevocationTask.findFirstOrThrow();
    assert.ok(!task.refreshToken.includes('owned-refresh'));
    await first.hrmRevocationTask.update({ where: { id: task.id }, data: { availableAt: new Date(0) } });
    revokeFails = false;
    await Promise.all([a.processRevocation(task.id), b.processRevocation(task.id), a.logout(req(ownedOut.saved[0], ownedSession.csrfToken), response())]);
    assert.equal(await first.hrmRevocationTask.count(), 0);
    assert.equal(revocations, 2); // One failed logout, then exactly one successful retry.

    const ssoOut = response();
    const sso = await a.open(req(), ssoOut, accessToken, 'shared-sso', 'employee', 'LEGACY_SSO');
    await a.logout(req(ssoOut.saved[0], sso.csrfToken), response());
    assert.equal(revocations, 2);

    const count = await first.browserSession.count();
    await first.browserSession.update({ where: { id }, data: { expiresAt: new Date(0) } });
    assert.equal((await a.maintain()).expiredSessions, 1);
    assert.equal(await first.browserSession.count(), count);
    assert.equal((await a.maintain(true, 1, 1)).deletedSessions, 1);
    assert.equal(await first.browserSession.count(), count - 1);
    assert.equal(await first.browserSession.count({ where: { state: 'ACTIVE' } }), 1);
    const adoptionRequest = req(); adoptionRequest.headers['x-auth-operation'] = randomUUID();
    const adoptionOut = response();
    let adoptions = 0;
    const acquireSso = async () => { adoptions++; return { accessToken, refreshToken: 'rotated-sso', profile: { id: 'employee' }, validateAfterStore: true }; };
    failValidation = true;
    await assert.rejects(a.authenticate(adoptionRequest, adoptionOut, 'LEGACY_SSO', ['handoff'], acquireSso));
    assert.equal(adoptionOut.saved.length, 0);
    assert.equal(await first.browserSession.count({ where: { state: 'ADOPTION_PENDING' } }), 1);
    failValidation = false;
    await b.authenticate(adoptionRequest, adoptionOut, 'LEGACY_SSO', ['handoff'], acquireSso);
    assert.equal(adoptions, 1);
    assert.equal(adoptionOut.saved.length, 1);
    assert.equal(await first.browserSession.count({ where: { state: 'ADOPTION_PENDING' } }), 0);
    console.log(JSON.stringify({ passed: true, mysql: true, checks: [
      'migration applies on isolated MySQL', '10 refreshes across two workers share one exchange',
      'rotation survives profile outage', 'login operation replays without another token pair',
      'concurrent replacement leaves one successor', 'logout prevents refresh',
      'owned revocation retries with concurrent logout', 'shared SSO never revoked', 'cleanup respects expiry and batch limit',
      'SSO rotation persists before validation and replays without another exchange',
    ] }, null, 2));
  } finally {
    process.env.DATABASE_URL = originalUrl;
    await first?.$disconnect(); await second?.$disconnect();
    // Only the exact random database successfully created by this invocation may be dropped.
    if (created && safeName.test(databaseName)) await admin.$executeRawUnsafe('DROP DATABASE `' + databaseName + '`');
    await admin.$disconnect();
  }
}
main().catch((error) => { console.error('Isolated MySQL session test failed:', error.code || error.name); process.exitCode = 1; });
