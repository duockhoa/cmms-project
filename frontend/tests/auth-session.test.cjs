const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
const root = path.join(__dirname, '..');
const token = (sub, exp = Math.floor(Date.now() / 1000) + 3600) =>
  `e30.${Buffer.from(JSON.stringify({ sub, exp })).toString('base64url')}.test`;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const flush = () => new Promise(resolve => setImmediate(resolve));
const json = data => new Response(JSON.stringify(data), { status: 200 });

function browser(shared = {}) {
  const values = shared.values || new Map();
  const cookies = shared.cookies || new Map();
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  const window = new EventTarget();
  window.location = { hostname: 'qltb.dkpharma.io.vn', protocol: 'https:', pathname: '/requests', search: '', hash: '' };
  window.history = { replaceState(_state, _title, url) { this.lastUrl = url; } };
  window.setInterval = () => 1;
  window.sessionStorage = localStorage;
  const document = new EventTarget();
  document.visibilityState = 'visible';
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([key, value]) => `${key.split('|')[0]}=${encodeURIComponent(value)}`).join('; '),
    set: raw => {
      const [pair, ...attrs] = raw.split(';').map(value => value.trim());
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const domain = attrs.find(value => value.startsWith('domain=')) || 'host';
      const cookiePath = attrs.find(value => value.startsWith('path=')) || 'path=/';
      const key = `${name}|${domain}|${cookiePath}`;
      if (attrs.includes('max-age=0')) cookies.delete(key);
      else cookies.set(key, decodeURIComponent(pair.slice(index + 1)));
    },
  });
  const common = {
    window, document, localStorage, sessionStorage: localStorage, URLSearchParams, Event,
    console, atob, queueMicrotask, Headers, Response, FormData, AbortController, AbortSignal,
    setTimeout: () => 1, clearTimeout() {}, clearInterval() {},
  };
  function load(relative, imports = {}, extras = {}) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8')
      .replaceAll('import.meta.env', '({ VITE_API_URL: "https://qltb.example.test" })');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
    const exported = {};
    vm.runInNewContext(output, { ...common, ...extras, exports: exported, module: { exports: exported },
      require(name) { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; },
    }, { filename: relative });
    return exported;
  }
  const auth = load('src/utils/authStorage.ts');
  const setCookie = (name, value, host = false) => document.cookie = `${name}=${encodeURIComponent(value)}; path=/${host ? '' : '; domain=.dkpharma.io.vn'}`;
  const setSession = (access, refresh) => {
    cookies.clear();
    setCookie('accessToken', access);
    setCookie('access_token', access);
    if (refresh) { setCookie('refreshToken', refresh); setCookie('refresh_token', refresh); }
  };
  function api(fetcher) {
    return load('src/services/api.ts', { '../utils/authStorage': auth, './catalogCache': { catalogCache: { invalidate() {} } } }, { fetch: fetcher });
  }
  return { auth, load, api, setCookie, setSession, window, document, values, cookies };
}

test('SSO B wins over local legacy A, including expired A', () => {
  const b = browser();
  b.values.set('accessToken', token('A', 1)); b.values.set('refreshToken', 'refresh-A');
  b.setSession(token('B'), 'refresh-B');
  assert.equal(b.auth.getAccessToken(), token('B'));
  assert.equal(b.auth.takeHandoffRefreshToken(token('B')), 'refresh-B');
  assert.equal(b.values.get('refreshToken'), undefined);
  assert.ok(!b.document.cookie.includes('refresh-B'));
});

test('different host/shared cookies or aliases require reauthentication', () => {
  const b = browser();
  b.setSession(token('B'), 'refresh-B');
  b.setCookie('accessToken', token('A'), true);
  assert.equal(b.auth.getAccessToken(), null);
  assert.equal(b.auth.takeHandoffRefreshToken(token('A')), null);
  assert.equal(b.auth.getSessionError(), 'SSO_SESSION_CONFLICT');
});

test('SSO handoff without refresh removes old refresh and host aliases', () => {
  const b = browser();
  b.setSession(token('A'), 'refresh-A'); b.setCookie('token', token('A'), true);
  b.auth.getSessionVersion();
  b.auth.saveAuthTokens(token('B'));
  assert.equal(b.auth.getAccessToken(), token('B'));
  assert.equal(b.auth.takeHandoffRefreshToken(token('B')), null);
  assert.equal(b.auth.getVerifiedHrmId(), null);
});

test('absence of central cookies cannot resurrect an old local session', () => {
  const b = browser();
  b.values.set('accessToken', token('A'));
  b.values.set('qltb.auth.session.v2', JSON.stringify({ accessToken: token('A'), refreshToken: 'A', hrmId: 'A' }));
  assert.equal(b.auth.getRawAccessToken(), null);
  assert.equal(b.auth.takeHandoffRefreshToken(token('A')), null);
});

test('each tab detects account switch and logout independently', () => {
  const a = browser();
  const b = browser({ values: a.values, cookies: a.cookies });
  a.setSession(token('A'), 'refresh-A');
  const firstA = a.auth.getSessionVersion(), firstB = b.auth.getSessionVersion();
  a.setSession(token('B'), 'refresh-B');
  assert.ok(a.auth.getSessionVersion() > firstA);
  assert.ok(b.auth.getSessionVersion() > firstB);
  assert.equal(b.auth.getAccessToken(), token('B'));
  a.auth.clearAuthTokens();
  assert.equal(b.auth.getAccessToken(), null);
});

test('unverified sessions cannot submit requests', async () => {
  const b = browser(); b.setSession(token('B'));
  let calls = 0;
  const api = b.api(async () => { calls++; return json({}); });
  await assert.rejects(api.fetchWithAuth('https://qltb.example.test/api/v1/requests', { method: 'POST' }), /SESSION_NOT_VERIFIED/);
  assert.equal(calls, 0);
});

test('request A completing after account B is discarded', async () => {
  const b = browser(); b.setSession(token('A')); b.auth.markSessionVerified(token('A'), 'A');
  const pending = deferred();
  const api = b.api(() => pending.promise);
  const result = api.api.getRequests();
  await flush();
  b.setSession(token('B')); b.auth.getSessionVersion();
  pending.resolve(json([{ id: 'private-A' }]));
  await assert.rejects(result, /SESSION_CHANGED/);
});

test('profile cache is scoped to the session and never returns A for B', async () => {
  const b = browser(); b.setSession(token('A'));
  let calls = 0;
  const api = b.api(async () => { calls++; return json({ authenticated: true, user: { id: b.auth.getRawAccessToken() === token('A') ? 'A' : 'B' } }); });
  assert.equal((await api.api.getMe()).user.id, 'A');
  assert.equal((await api.api.getMe()).user.id, 'A');
  assert.equal(calls, 1);
  b.setSession(token('B')); await flush();
  assert.equal((await api.api.getMe()).user.id, 'B');
  assert.equal(calls, 2);
});

test('late refresh A cannot overwrite a newly opened B session', async () => {
  const b = browser(); b.setSession(token('A'), 'refresh-A'); b.auth.markSessionVerified(token('A'), 'A');
  b.auth.markCookieSession('A');
  const pending = deferred();
  const api = b.api(url => String(url).endsWith('/auth/session') ? Promise.resolve(json({ csrfToken: 'csrf-a', hrmId: 'A' })) : pending.promise);
  const refreshed = api.refreshAccessToken();
  await flush();
  b.setSession(token('B'), 'refresh-B'); b.auth.getSessionVersion();
  pending.resolve(json({ accessToken: token('A-new'), refreshToken: 'refresh-A-new' }));
  assert.equal(await refreshed, null);
  assert.equal(b.auth.getAccessToken(), token('B'));
  assert.equal(b.auth.takeHandoffRefreshToken(token('B')), 'refresh-B');
});

test('refresh is not attempted before HRM identity has been verified', async () => {
  const b = browser(); b.setSession(token('B'), 'possibly-A');
  let calls = 0;
  const api = b.api(async () => { calls++; return json({}); });
  assert.equal(await api.refreshAccessToken(), null);
  assert.equal(calls, 0);
});

test('shared permissions store clears A before loading B and discards late A profile', async () => {
  const b = browser(); b.setSession(token('A')); b.auth.getSessionVersion();
  const pending = deferred(); let calls = 0;
  const permissions = b.load('src/hooks/usePermissions.ts', {
    react: { useCallback: callback => callback, useSyncExternalStore: (_subscribe, get) => get() },
    '../utils/authStorage': b.auth,
    '../services/api': { api: { getMe: () => ++calls === 1 ? pending.promise : Promise.resolve({ authenticated: true, user: { id: 'B' }, identity: { provider: 'hrm', subject: 'B' }, permissions: [] }) }, invalidateMeCache() {}, setupSilentRefresh() {} },
  });
  const old = permissions.fetchPermissionsProfile();
  b.setSession(token('B')); b.auth.getSessionVersion(); await flush();
  assert.equal(permissions.usePermissions().user, null);
  assert.equal(permissions.usePermissions().loading, true);
  await permissions.fetchPermissionsProfile();
  pending.resolve({ authenticated: true, user: { id: 'A' }, permissions: ['ALL'] });
  await assert.rejects(old, /SESSION_CHANGED/);
  assert.equal(permissions.usePermissions().user.id, 'B');
  assert.equal(permissions.usePermissions().isAdmin, false);
});

test('catalog results from an old session are not saved after switch', async () => {
  const b = browser(); b.setSession(token('A')); b.auth.getSessionVersion();
  const { catalogCache } = b.load('src/services/catalogCache.ts', { '../utils/authStorage': b.auth });
  const pending = deferred();
  const old = catalogCache.fetchWithCache('users', () => pending.promise);
  b.setSession(token('B')); b.auth.getSessionVersion();
  pending.resolve(['private-A']);
  await assert.rejects(old, /SESSION_CHANGED/);
  const current = await catalogCache.fetchWithCache('users', async () => ['B']);
  assert.deepEqual(current, ['B']);
});

test('URL handoff replaces the session and scrubs every token alias, including camel-case hash keys', () => {
  const b = browser(); b.setSession(token('A'), 'refresh-A');
  b.window.location.search = `?accessToken=${token('B')}&access_token=${token('B')}&redirect=%2Frequests`;
  b.window.location.hash = `#refreshToken=refresh-B`;
  assert.equal(b.auth.extractAndSaveTokensFromUrl(), true);
  assert.equal(b.auth.getAccessToken(), token('B'));
  assert.equal(b.auth.takeHandoffRefreshToken(token('B')), 'refresh-B');
  assert.equal(b.window.history.lastUrl, '/requests?redirect=%2Frequests');
});

test('conflicting or expired URL handoffs cannot fall back to the previous account', () => {
  const b = browser(); b.setSession(token('A'), 'refresh-A');
  b.window.location.search = `?token=${token('B')}&accessToken=${token('C')}`;
  assert.equal(b.auth.extractAndSaveTokensFromUrl(), false);
  assert.equal(b.auth.getAccessToken(), null);
  assert.equal(b.auth.getSessionError(), 'SSO_SESSION_CONFLICT');
  b.window.location.search = `?accessToken=${token('B', 1)}`;
  assert.equal(b.auth.extractAndSaveTokensFromUrl(), false);
  assert.equal(b.auth.getAccessToken(), null);
});

test('HRM outage retains the draft owner internally but blocks actions until reverified', async () => {
  const b = browser(); b.setSession(token('B'));
  let offline = false;
  const permissions = b.load('src/hooks/usePermissions.ts', {
    react: { useCallback: callback => callback, useSyncExternalStore: (_subscribe, get) => get() },
    '../utils/authStorage': b.auth,
    '../services/api': { api: { getMe: async () => {
      if (offline) throw new Error('HRM unavailable');
      return { authenticated: true, user: { id: 'B' }, identity: { provider: 'hrm', subject: 'B' }, permissions: ['ALL'] };
    } }, invalidateMeCache() {}, setupSilentRefresh() {} },
  });
  await permissions.fetchPermissionsProfile();
  assert.equal(permissions.usePermissions().isAdmin, true);
  offline = true;
  permissions.invalidatePermissionsCache();
  await assert.rejects(permissions.fetchPermissionsProfile(), /HRM unavailable/);
  assert.equal(permissions.usePermissions().user.id, 'B');
  assert.equal(permissions.usePermissions().error, 'HRM unavailable');
  assert.equal(b.auth.isSessionVerified(), false);
});

test('successful refresh keeps the verified owner without exposing or storing a refresh token', async () => {
  const b = browser(); b.setSession(token('B'), 'refresh-B'); b.auth.markSessionVerified(token('B'), '1125');
  b.auth.markCookieSession('1125');
  const refreshedToken = token('B', Math.floor(Date.now() / 1000) + 7200);
  let sent;
  let headers;
  const api = b.api(async (url, options) => {
    if (String(url).endsWith('/auth/session')) return json({ csrfToken: 'csrf-b', hrmId: '1125' });
    sent = JSON.parse(options.body);
    headers = options.headers;
    assert.equal(options.credentials, 'include');
    return json({ accessToken: refreshedToken });
  });
  assert.equal(await api.refreshAccessToken(), refreshedToken);
  assert.deepEqual(sent, { expectedHrmId: '1125' });
  assert.equal(headers['X-CSRF-Token'], 'csrf-b');
  assert.equal(b.auth.hasRefreshSession(), true);
  assert.equal(b.auth.takeHandoffRefreshToken(refreshedToken), null);
  assert.ok(![...b.values.values()].some(value => value.includes('refresh-B')));
  assert.equal(b.auth.getVerifiedHrmId(), '1125');
});

test('legacy SSO refresh is consumed once by the backend and removed from all browser storage', async () => {
  const b = browser(); b.setSession(token('B'), 'handoff-refresh');
  const calls = [];
  const api = b.api(async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith('/auth/me')) return json({ authenticated: true, identity: { provider: 'hrm', subject: 'B' }, user: { id: 'B' } });
    assert.equal(String(url).endsWith('/auth/session'), true);
    assert.equal(options.credentials, 'include');
    assert.equal(JSON.parse(options.body).refreshToken, 'handoff-refresh');
    return json({ csrfToken: 'csrf-b', hrmId: 'B', refreshSession: true });
  });
  await api.api.getMe();
  b.auth.markSessionVerified(token('B'), 'B');
  assert.equal(b.auth.hasRefreshSession(), true);
  assert.equal(b.auth.takeHandoffRefreshToken(token('B')), null);
  assert.ok(!b.document.cookie.includes('handoff-refresh'));
  assert.ok(![...b.values.values()].some(value => value.includes('handoff-refresh')));
  await api.api.getMe();
  assert.equal(calls.length, 2);
});

test('a different cookie-session owner cannot refresh the current account', async () => {
  const b = browser(); b.setSession(token('B')); b.auth.markSessionVerified(token('B'), 'B'); b.auth.markCookieSession('B');
  let refreshCalls = 0;
  const api = b.api(async url => {
    if (String(url).endsWith('/auth/session')) return json({ csrfToken: 'csrf-a', hrmId: 'A' });
    refreshCalls++;
    return json({ accessToken: token('A') });
  });
  assert.equal(await api.refreshAccessToken(), null);
  assert.equal(refreshCalls, 0);
  assert.equal(b.auth.getRawAccessToken(), token('B'));
});
