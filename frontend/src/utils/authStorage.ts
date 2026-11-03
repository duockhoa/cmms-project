/** Browser hints select a session; only the backend can authenticate its identity. */
const TOKEN_KEYS = ['accessToken', 'access_token', 'token', 'jwt', 'auth_token'];
const REFRESH_KEYS = ['refreshToken', 'refresh_token'];
const BINDING_KEY = 'qltb.auth.session.v2';
export const AUTH_CHANGED_EVENT = 'qltb:auth-changed';
let revision = 0;
let lastSnapshot: string | undefined;
let sessionError: string | null = null;
let handoffError: string | null = null;
const listeners = new Set<() => void>();

export function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  return host === 'dkpharma.io.vn' || host.endsWith('.dkpharma.io.vn') ? '.dkpharma.io.vn' : undefined;
}

function cookieValues(name: string): string[] {
  if (typeof document === 'undefined') return [];
  return document.cookie.split(';').flatMap(part => {
    const index = part.indexOf('=');
    if (part.slice(0, index).trim() !== encodeURIComponent(name)) return [];
    try { return [decodeURIComponent(part.slice(index + 1))].filter(Boolean); } catch { return []; }
  });
}
export function getCookie(name: string): string | null {
  const values = [...new Set(cookieValues(name))];
  return values.length === 1 ? values[0] : null;
}
export function setCookie(name: string, value: string, days = 7) {
  const domain = getCookieDomain();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${days * 86400}${domain ? `; domain=${domain}` : ''}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}
function deleteCookie(name: string, shared: boolean) {
  const domain = shared ? getCookieDomain() : undefined;
  const paths = new Set(['/']);
  const parts = window.location.pathname.split('/').filter(Boolean);
  for (let i = 1; i <= parts.length; i++) {
    paths.add('/' + parts.slice(0, i).join('/'));
    paths.add('/' + parts.slice(0, i).join('/') + '/');
  }
  for (const path of paths) document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0${domain ? `; domain=${domain}` : ''}; SameSite=Lax`;
}
export function removeCookie(name: string) { deleteCookie(name, true); deleteCookie(name, false); }

function claims(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(Array.from(json, char => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  } catch { return null; }
}
export function getTokenExpiry(token: string): number | null {
  const exp = claims(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}
export function isJwtExpired(token: string): boolean {
  const decoded = claims(token);
  return !decoded || (typeof decoded.exp === 'number' && decoded.exp * 1000 <= Date.now() + 10000);
}
function binding(): any {
  try { return JSON.parse(localStorage.getItem(BINDING_KEY) || 'null'); } catch { return null; }
}
function notify() {
  revision++;
  queueMicrotask(() => {
    listeners.forEach(listener => listener());
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  });
}
function readSession(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  const previous = binding();
  const accessValues = [...new Set(TOKEN_KEYS.flatMap(cookieValues))];
  const refreshValues = [...new Set(REFRESH_KEYS.flatMap(cookieValues))];
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  sessionError = handoffError;
  if (accessValues.length) {
    // Different aliases/host cookies cannot establish which session is current.
    if (accessValues.length !== 1 || refreshValues.length > 1) {
      sessionError = 'SSO_SESSION_CONFLICT';
    } else {
      accessToken = accessValues[0];
      refreshToken = refreshValues[0] || null;
    }
  } else if (!getCookieDomain() && previous?.accessToken) {
    // Local development only. Shared-domain deployments never resurrect local legacy tokens.
    accessToken = previous.accessToken;
    refreshToken = previous.refreshToken || null;
  }
  const snapshot = JSON.stringify([accessToken, refreshToken, sessionError]);
  if (lastSnapshot !== snapshot) {
    const sameAccess = previous?.accessToken === accessToken;
    localStorage.setItem(BINDING_KEY, JSON.stringify({ accessToken, refreshToken,
      ...(sameAccess ? { hrmId: previous?.hrmId, verified: previous?.verified } : {}),
    }));
    TOKEN_KEYS.forEach(key => localStorage.removeItem(key));
    REFRESH_KEYS.forEach(key => localStorage.removeItem(key));
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    const changed = lastSnapshot !== undefined;
    lastSnapshot = snapshot;
    if (changed) notify();
  }
  return { accessToken, refreshToken };
}
export function getRawAccessToken() { return readSession().accessToken; }
export function getAccessToken(): string | null {
  const token = getRawAccessToken();
  return token && !isJwtExpired(token) ? token : null;
}
export function getRefreshToken() { return readSession().refreshToken; }
export function getSessionVersion() { readSession(); return revision; }
export function getSessionError() { readSession(); return sessionError; }
export function getVerifiedHrmId(): string | null {
  const token = getRawAccessToken();
  const saved = binding();
  return token && saved?.accessToken === token ? saved.hrmId || null : null;
}
export function markSessionVerified(token: string, hrmId?: string) {
  if (token !== getRawAccessToken()) throw new Error('SESSION_CHANGED');
  const saved = binding();
  localStorage.setItem(BINDING_KEY, JSON.stringify({ ...saved, hrmId: hrmId || null, verified: true }));
}
export function isSessionVerified() {
  const token = getAccessToken();
  const saved = binding();
  return Boolean(token && saved?.accessToken === token && saved?.verified);
}
export function markSessionUnverified() {
  const saved = binding();
  if (saved) localStorage.setItem(BINDING_KEY, JSON.stringify({ ...saved, verified: false }));
}
export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function saveAuthTokens(accessToken: string, refreshToken?: string | null, verifiedHrmId?: string | null) {
  handoffError = null;
  // Clear both host-only and shared aliases before publishing one consistent pair.
  [...TOKEN_KEYS, ...REFRESH_KEYS].forEach(removeCookie);
  setCookie('accessToken', accessToken);
  setCookie('access_token', accessToken);
  if (refreshToken) {
    setCookie('refreshToken', refreshToken, 30);
    setCookie('refresh_token', refreshToken, 30);
  }
  localStorage.setItem(BINDING_KEY, JSON.stringify({ accessToken, refreshToken: refreshToken || null, hrmId: verifiedHrmId || null, verified: Boolean(verifiedHrmId) }));
  readSession();
}
export function clearAuthTokens() {
  [...TOKEN_KEYS, ...REFRESH_KEYS].forEach(removeCookie);
  localStorage.removeItem(BINDING_KEY);
  readSession();
}
export function startSessionMonitor() {
  readSession();
  const check = () => { readSession(); };
  const visible = () => { if (document.visibilityState === 'visible') check(); };
  window.addEventListener('storage', check);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', visible);
  const timer = window.setInterval(check, 1000);
  return () => {
    clearInterval(timer);
    window.removeEventListener('storage', check);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', visible);
  };
}

export function extractAndSaveTokensFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const accessKeys = [...TOKEN_KEYS, 'sso_token'];
  const allKeys = [...accessKeys, ...REFRESH_KEYS];
  const query = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash.replace(/^#/, '');
  const hashPath = rawHash.includes('?') ? rawHash.slice(0, rawHash.indexOf('?')) : '';
  const hash = new URLSearchParams(rawHash.includes('?') ? rawHash.slice(rawHash.indexOf('?') + 1) : rawHash);
  const access = new Set<string>();
  const refresh = new Set<string>();
  let found = false;
  for (const params of [query, hash]) {
    for (const key of allKeys) {
      for (const value of params.getAll(key)) {
        if (value) (accessKeys.includes(key) ? access : refresh).add(value);
        found = true;
      }
      params.delete(key);
    }
  }
  if (!found) return false;
  const remainingHash = hash.toString();
  const cleanHash = hashPath ? '#' + hashPath + (remainingHash ? '?' + remainingHash : '') : (remainingHash ? '#' + remainingHash : '');
  const cleanUrl = window.location.pathname + (query.size ? '?' + query.toString() : '') + cleanHash;
  window.history.replaceState({}, document.title, cleanUrl);
  if (access.size !== 1 || refresh.size > 1 || isJwtExpired([...access][0])) {
    clearAuthTokens();
    handoffError = 'SSO_SESSION_CONFLICT';
    readSession();
    return false;
  }
  saveAuthTokens([...access][0], [...refresh][0] || null);
  return true;
}
