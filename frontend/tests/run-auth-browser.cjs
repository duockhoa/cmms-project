const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

async function run() {
  const { createServer } = await import('vite');
  const react = (await import('@vitejs/plugin-react')).default;
  const backend = path.resolve(__dirname, '../../backend');
  require(path.join(backend, 'node_modules/reflect-metadata'));
  require(path.join(backend, 'node_modules/ts-node')).register({ project: path.join(backend, 'tsconfig.json') });
  const express = require(path.join(backend, 'node_modules/express'));
  const { BrowserSessionService } = require(path.join(backend, 'src/modules/auth/browser-session.service.ts'));
  const settings = { NODE_ENV: 'test', SESSION_ENCRYPTION_KEY: 'ab'.repeat(32) };
  const sessions = new Map();
  const cookieService = new BrowserSessionService({ get: key => settings[key] }, { browserSession: {
    create: async ({ data }) => { sessions.set(data.id, data); return data; },
    findUnique: async ({ where }) => sessions.get(where.id),
    deleteMany: async ({ where }) => ({ count: Number(sessions.delete(where.id)) }),
  } }, {});
  const cookieApp = express();
  cookieApp.get('/tests/http-only', async (request, response, next) => {
    try { response.json(await cookieService.open(request, response, 'test-access', 'never-readable-refresh', 'browser-test')); } catch (error) { next(error); }
  });
  cookieApp.get('/tests/http-only/probe', async (request, response, next) => {
    try { response.json(await cookieService.inspect(request)); } catch (error) { next(error); }
  });
  const candidates = [
    process.env.AUTH_TEST_BROWSER,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  let executable;
  for (const candidate of candidates) {
    if (await fs.access(candidate).then(() => true, () => false)) { executable = candidate; break; }
  }
  assert.ok(executable, 'Set AUTH_TEST_BROWSER to the Chrome or Edge executable');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'cmms-auth-browser-'));
  let server, browser, socket, timeout;
  const errors = [];
  try {
    server = await createServer({
      configFile: false, root: path.resolve(__dirname, '..'), plugins: [react(), {
        name: 'isolated-auth-cookie-test', configureServer(viteServer) { viteServer.middlewares.use(cookieApp); },
      }],
      server: { host: '127.0.0.1', port: 0, open: false, strictPort: false },
    });
    await server.listen();
    const address = server.httpServer.address();
    const base = 'http://127.0.0.1:' + address.port;
    browser = spawn(executable, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--user-data-dir=' + profile, 'about:blank',
    ], { windowsHide: true, stdio: 'ignore' });
    let launchError;
    browser.on('error', error => { launchError = error; });
    let debugPort;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError;
      if (browser.exitCode !== null) throw new Error('Browser exited before debugger startup');
      const active = await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '');
      if (active) { debugPort = Number(active.split('\n')[0]); break; }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(debugPort, 'Browser debugger did not start');
    const tabs = await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json();
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      if (message.id) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) request?.reject(new Error(message.error.message));
        else request?.resolve(message);
      }
    };
    const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const requestId = ++sequence;
      pending.set(requestId, { resolve, reject });
      socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
    });
    const timedOut = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Browser test timed out')), 30000);
    });
    const checks = async () => {
      await call('Runtime.enable');
      await call('Page.navigate', { url: base + '/tests/auth-browser.html' });
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await call('Runtime.evaluate', {
        expression: '(async () => { for (let attempt = 0; attempt < 200; attempt++) { if (window.authBrowserResult) return await window.authBrowserResult; await new Promise(resolve => setTimeout(resolve, 50)); } return { passed: false, error: "Fixture did not load" }; })()',
        awaitPromise: true, returnByValue: true,
      });
      const value = result.result?.result?.value;
      assert.equal(value?.passed, true);
      const target = await call('Target.createTarget', { url: base + '/tests/auth-observer.html' });
      const attached = await call('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
      const observerSession = attached.result.sessionId;
      await call('Runtime.enable', {}, observerSession);
      const evaluate = async (expression, sessionId) => {
        const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
        assert.equal(result.result?.exceptionDetails, undefined);
        return result.result?.result?.value;
      };
      const ready = await evaluate('(async () => { for (let attempt = 0; attempt < 100; attempt++) { if (window.authObserver) return true; await new Promise(resolve => setTimeout(resolve, 50)); } return false; })()', observerSession);
      assert.equal(ready, true, 'Second tab did not load');
      const token = owner => 'e30.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.test';
      const firstToken = token('tab-A');
      const secondToken = token('tab-B');
      await evaluate('window.authFixture.saveAuthTokens(' + JSON.stringify(firstToken) + ')');
      assert.equal(await evaluate('window.authObserver.getRawAccessToken()', observerSession), firstToken);
      await evaluate('window.authFixture.saveAuthTokens(' + JSON.stringify(secondToken) + ')');
      assert.equal(await evaluate('window.authObserver.getRawAccessToken()', observerSession), secondToken);
      await evaluate('window.authFixture.clearAuthTokens()');
      assert.equal(await evaluate('window.authObserver.getRawAccessToken()', observerSession), null);
      await call('Target.closeTarget', { targetId: target.result.targetId });
      value.checks.push('second tab observes account switch', 'second tab observes logout');
      await call('Page.navigate', { url: base + '/tests/http-only' });
      await new Promise(resolve => setTimeout(resolve, 500));
      assert.equal(await evaluate('document.cookie.includes("qltb-session")'), false);
      assert.equal(await evaluate('(async () => { const response = await fetch("/tests/http-only/probe"); return response.ok && (await response.json()).hrmId === "browser-test"; })()'), true);
      const cookies = await call('Network.getCookies', { urls: [base] });
      assert.equal(cookies.result.cookies.find(cookie => cookie.name === 'qltb-session')?.httpOnly, true);
      assert.equal(await evaluate('JSON.stringify(localStorage).includes("never-readable-refresh")'), false);
      value.checks.push('HttpOnly cookie hidden from JavaScript', 'browser sends HttpOnly cookie to backend');
      await call('Page.navigate', { url: base + '/tests/user-merge-browser.html' });
      await new Promise(resolve => setTimeout(resolve, 500));
      const merge = await evaluate('(async () => { for (let attempt = 0; attempt < 200; attempt++) { if (window.userMergeBrowserResult) return await window.userMergeBrowserResult; await new Promise(resolve => setTimeout(resolve, 50)); } return { passed: false, error: "Merge fixture did not load" }; })()');
      console.log(JSON.stringify({ userMerge: merge }, null, 2));
      assert.equal(merge?.passed, true);
      console.log(JSON.stringify({ ...value, browserErrors: errors }, null, 2));
      assert.deepEqual(errors, []);
    };
    await Promise.race([checks(), timedOut]);
  } finally {
    clearTimeout(timeout);
    socket?.close();
    if (browser && browser.exitCode === null) {
      await new Promise(resolve => {
        browser.once('exit', resolve);
        browser.kill();
        setTimeout(resolve, 2000).unref();
      });
    }
    await server?.close();
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
