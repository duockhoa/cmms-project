/** Browser hints select a session; only the backend can authenticate its identity. */
const TOKEN_KEYS = ['accessToken', 'access_token', 'token', 'jwt', 'auth_token'];
const REFRESH_KEYS = ['refreshToken', 'refresh_token'];
const BINDING_KEY = 'qltb.auth.session.v2';
const COOKIE_SESSION_KEY = 'qltb.auth.cookie.v1';
const LOGOUT_KEY = 'qltb.auth.logged-out.v1';
let pendingRefresh: { accessToken: string; refreshToken: string } | null = null;
export const AUTH_CHANGED_EVENT = 'qltb:auth-changed';
let revision = 0;
let principalRevision = 0;
let verifiedPrincipal: string | null = null;
const principalListeners = new Set<() => void>();
export const getPrincipalVersion = () => principalRevision;
export function subscribePrincipal(listener: () => void) {
  principalListeners.add(listener);
  return () => { principalListeners.delete(listener); };
}
export function markPrincipalVerified(principal: string | null) {
  if (principal === verifiedPrincipal) return;
  verifiedPrincipal = principal;
  principalRevision++;
  principalListeners.forEach(listener => listener());
}
let lastSnapshot: string | undefined;
let sessionError: string | null = null;
let handoffError: string | null = null;
const listeners = new Set<() => void>();

export function getCookieDomain(): string | undefined {
  // Không đặt domain cấp gốc .dkpharma.io.vn để cookie là Host-Only (chỉ qltb.dkpharma.io.vn nhìn thấy),
  // tránh ghi đè cookie accessToken của các app nội bộ khác cùng domain.
  return undefined;
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
function deleteCookie(name: string) {
  const paths = new Set(['/']);
  const parts = window.location.pathname.split('/').filter(Boolean);
  for (let i = 1; i <= parts.length; i++) {
    paths.add('/' + parts.slice(0, i).join('/'));
    paths.add('/' + parts.slice(0, i).join('/') + '/');
  }
  // Only remove QLTB host cookies. Domain cookies belong to the shared HRM portal.
  for (const path of paths) document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0; SameSite=Lax`;
}
export function removeCookie(name: string) { deleteCookie(name); }

export function cleanupLegacyDomainCookies() {
  if (typeof document === 'undefined') return;
  const legacyNames = ['access_token', 'refresh_token'];
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const domains = [
    '',
    '.dkpharma.io.vn',
    'dkpharma.io.vn',
    ...(hostname.includes('.')
      ? ['.' + hostname.split('.').slice(-3).join('.'), '.' + hostname.split('.').slice(-2).join('.')]
      : []),
  ];
  const paths = ['/', typeof window !== 'undefined' ? window.location.pathname : '/'];
  for (const name of legacyNames) {
    for (const d of domains) {
      for (const p of paths) {
        document.cookie = `${encodeURIComponent(name)}=; path=${p}; max-age=0${d ? `; domain=${d}` : ''}; SameSite=Lax`;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  cleanupLegacyDomainCookies();
}
export function isLocallyLoggedOut(): boolean { return Boolean(localStorage.getItem(LOGOUT_KEY)); }

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
  return !decoded || typeof decoded.exp !== 'number' || decoded.exp * 1000 <= Date.now() + 10000;
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
function readSession(): { accessToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null };
  const previous = binding();
  let accessToken: string | null = null;
  sessionError = handoffError;
  const loggedOut = isLocallyLoggedOut();
  if (!loggedOut && !sessionError && previous?.managed === true) {
    // Keep the expired token's verified binding so the backend can restore this session.
    // Cookie changes from another application must never silently replace a managed session.
    accessToken = previous.accessToken;
  } else if (!loggedOut && !sessionError) {
    // One-time compatibility bootstrap from shared HRM cookies.
    // 1. Ưu tiên đọc cookie 'accessToken' chuẩn của HRM (camelCase)
    const hrmAccess = cookieValues('accessToken').find(t => !isJwtExpired(t));
    const hrmRefresh = cookieValues('refreshToken')[0];

    if (hrmAccess) {
      accessToken = hrmAccess;
      if (hrmRefresh) pendingRefresh = { accessToken, refreshToken: hrmRefresh };
      cleanupLegacyDomainCookies();
    } else {
      // Fallback nếu có token hợp lệ khác
      const accessValues = [...new Set(TOKEN_KEYS.flatMap(cookieValues))].filter(t => !isJwtExpired(t));
      const refreshValues = [...new Set(REFRESH_KEYS.flatMap(cookieValues))];
      if (accessValues.length >= 1) {
        accessToken = accessValues[0];
        if (refreshValues[0]) pendingRefresh = { accessToken, refreshToken: refreshValues[0] };
        cleanupLegacyDomainCookies();
      }
    }
  }
  if (pendingRefresh?.accessToken !== accessToken) pendingRefresh = null;
  const generation = previous?.managed ? previous.generation : undefined;
  const snapshot = JSON.stringify([accessToken, sessionError, loggedOut, generation]);
  if (lastSnapshot !== snapshot) {
    const sameAccess = previous?.accessToken === accessToken;
    localStorage.setItem(BINDING_KEY, JSON.stringify({ accessToken, managed: true, generation,
      ...(sameAccess ? { hrmId: previous?.hrmId, verified: previous?.verified } : {}),
    }));
    const changed = lastSnapshot !== undefined;
    lastSnapshot = snapshot;
    if (changed) notify();
  }
  TOKEN_KEYS.forEach(key => localStorage.removeItem(key));
  REFRESH_KEYS.forEach(key => localStorage.removeItem(key));
  if (previous?.refreshToken && lastSnapshot === snapshot) {
    const { refreshToken: discarded, ...safe } = binding() || {};
    localStorage.setItem(BINDING_KEY, JSON.stringify(safe));
  }
  return { accessToken };
}
export function getRawAccessToken() { return readSession().accessToken; }
export function getAccessToken(): string | null {
  const token = getRawAccessToken();
  return token && !isJwtExpired(token) ? token : null;
}
export function takeHandoffRefreshToken(accessToken: string): string | null {
  readSession();
  const refreshToken = pendingRefresh?.accessToken === accessToken ? pendingRefresh.refreshToken : null;
  pendingRefresh = null;
  return refreshToken;
}
export function markCookieSession(hrmId: string) {
  localStorage.setItem(COOKIE_SESSION_KEY, JSON.stringify({ hrmId }));
}
export function hasRefreshSession(): boolean {
  readSession();
  try {
    const session = JSON.parse(localStorage.getItem(COOKIE_SESSION_KEY) || 'null');
    return Boolean(session?.hrmId && session.hrmId === binding()?.hrmId);
  } catch { return false; }
}
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
  localStorage.removeItem(LOGOUT_KEY);
  // New sessions keep one access-token binding and no JavaScript token cookies.
  [...TOKEN_KEYS, ...REFRESH_KEYS].forEach(removeCookie);
  pendingRefresh = refreshToken ? { accessToken, refreshToken } : null;
  localStorage.setItem(BINDING_KEY, JSON.stringify({ accessToken, managed: true, generation: crypto.randomUUID(), hrmId: verifiedHrmId || null, verified: Boolean(verifiedHrmId) }));
  readSession();
}
export function clearAuthTokens() {
  markPrincipalVerified(null);
  pendingRefresh = null;
  localStorage.setItem(LOGOUT_KEY, 'true');
  localStorage.removeItem(COOKIE_SESSION_KEY);
  [...TOKEN_KEYS, ...REFRESH_KEYS].forEach(removeCookie);
  localStorage.setItem(BINDING_KEY, JSON.stringify({ accessToken: null, managed: true }));
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
