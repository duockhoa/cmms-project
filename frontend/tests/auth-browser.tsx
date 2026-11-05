import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

// Isolated browser fixture: never calls production HRM or the project database.
let owner = 'A';
let release: (() => void) | null = null;
let pause = false;
const jwt = (id: string, sequence: number) => `e30.${btoa(JSON.stringify({ sub: id, sequence, exp: Math.floor(Date.now() / 1000) + 3600 }))}.test`;
window.fetch = async (input) => {
  if (!String(input).endsWith('/api/v1/auth/me')) throw new Error(`Unexpected network request: ${input}`);
  if (pause) await new Promise<void>(resolve => { release = resolve; });
  return new Response(JSON.stringify({ authenticated: true, identity: { provider: 'hrm', subject: owner }, user: { id: owner, name: owner, role: 'USER' }, permissions: ['requests:view'] }), { status: 200 });
};
const auth = await import('../src/utils/authStorage');
(window as any).authFixture = auth;
auth.clearAuthTokens();
auth.saveAuthTokens(jwt('A', 1));
const { RequireAuth } = await import('../src/App');
const { ProtectedRoute } = await import('../src/components/common/ProtectedRoute');
const { invalidatePermissionsCache, fetchPermissionsProfile } = await import('../src/hooks/usePermissions');
auth.startSessionMonitor();
let mounts = 0;
function Draft() {
  const [value, setValue] = useState('');
  const [mount] = useState(() => ++mounts);
  return <div data-mount={mount}><input id="draft" value={value} onChange={event => setValue(event.target.value)} /></div>;
}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/requests']}><RequireAuth><ProtectedRoute permission="requests:view"><Draft /></ProtectedRoute></RequireAuth></MemoryRouter>);
const tick = () => new Promise(resolve => setTimeout(resolve, 40));
const waitFor = async (condition: () => boolean) => {
  for (let count = 0; count < 100; count++) { if (condition()) return; await tick(); }
  throw new Error('Timed out waiting for browser state');
};
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const input = () => document.querySelector<HTMLInputElement>('#draft')!;
const write = (value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value);
  input().dispatchEvent(new Event('input', { bubbles: true }));
};
async function run() {
  await waitFor(() => Boolean(input()) && auth.isSessionVerified());
  write('unsaved work'); await tick();
  const original = input();
  pause = true;
  window.dispatchEvent(new Event('focus'));
  await waitFor(() => Boolean(release));
  assert(input() === original && input().value === 'unsaved work', 'Focus destroyed the draft');
  assert(input().matches(':disabled') && !auth.isSessionVerified(), 'Writes must be blocked during revalidation');
  pause = false; release!(); release = null;
  await waitFor(() => auth.isSessionVerified() && !input().matches(':disabled'));
  assert(input() === original, 'Focus remounted the form');

  auth.saveAuthTokens(jwt('A', 2), null, 'A');
  await waitFor(() => auth.isSessionVerified() && !input().matches(':disabled'));
  await tick();
  assert(input() === original && input().value === 'unsaved work', 'Same-user refresh destroyed the draft');

  pause = true;
  auth.saveAuthTokens(jwt('B', 1));
  await waitFor(() => Boolean(release));
  assert(input() === original && input().closest('fieldset')?.hidden, 'Previous owner must be hidden pending verification');
  owner = 'B'; pause = false; release!(); release = null;
  await waitFor(() => Boolean(input()) && input() !== original && auth.isSessionVerified());
  assert(input().value === '', 'Account switch retained previous draft');

  write('B draft'); await tick();
  const second = input();
  invalidatePermissionsCache(true);
  await fetchPermissionsProfile(); await tick();
  assert(input() === second && input().value === 'B draft', 'Repeated permission check remounted the form');
  auth.clearAuthTokens(); await tick();
  assert(!document.querySelector('#draft'), 'Logout retained the previous form');
  return { passed: true, checks: ['focus preserves draft', 'revalidation blocks writes', 'same-user refresh preserves draft', 'unverified account hidden', 'different account resets draft', 'recheck preserves draft', 'logout clears form'], mounts };
}
(window as any).authBrowserResult = run().catch(error => ({ passed: false, error: error.stack || error.message }));
