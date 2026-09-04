/**
 * Authentication Storage & Single Sign-On (SSO) Helper
 * Manages tokens across localStorage and shared root domain cookies (*.dkpharma.io.vn).
 */

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Backward compatibility keys
const ALT_TOKEN_KEYS = ['access_token', 'token', 'jwt', 'auth_token'];
const ALT_REFRESH_KEYS = ['refresh_token'];

/**
 * Calculates the top-level cookie domain for cross-subdomain SSO.
 * e.g., "qltb.dkpharma.io.vn" -> ".dkpharma.io.vn"
 */
export function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;

  // Local development or raw IP addresses
  if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return undefined;
  }

  // DK Pharma ecosystem
  if (hostname.endsWith('dkpharma.io.vn')) {
    return '.dkpharma.io.vn';
  }

  // Generic multi-level domain fallback
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return '.' + parts.slice(-2).join('.');
  }

  return undefined;
}

/**
 * Read a cookie by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Write a cookie to the shared domain
 */
export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const domainPart = domain ? `; domain=${domain}` : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}${domainPart}; SameSite=Lax${secure}`;
}

/**
 * Delete a cookie across both root domain and current host
 */
export function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const domainPart = domain ? `; domain=${domain}` : '';
  // Clear with parent domain
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0${domainPart}; SameSite=Lax`;
  // Clear with current host (in case host-only cookie was set)
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Retrieves the current active access token.
 * Searches localStorage, then shared domain cookies.
 * Synchronizes between storage layers automatically.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check primary localStorage
  let token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;

  // 2. Check alternative localStorage keys
  for (const altKey of ALT_TOKEN_KEYS) {
    token = localStorage.getItem(altKey);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return token;
    }
  }

  // 3. Check shared domain cookies
  token = getCookie(TOKEN_KEY);
  if (!token) {
    for (const altKey of ALT_TOKEN_KEYS) {
      token = getCookie(altKey);
      if (token) break;
    }
  }

  // If found in cookie, synchronize into localStorage
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  }

  return null;
}

/**
 * Retrieves the refresh token from localStorage or shared domain cookies.
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) return refreshToken;

  for (const altKey of ALT_REFRESH_KEYS) {
    refreshToken = localStorage.getItem(altKey);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      return refreshToken;
    }
  }

  refreshToken = getCookie(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    for (const altKey of ALT_REFRESH_KEYS) {
      refreshToken = getCookie(altKey);
      if (refreshToken) break;
    }
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return refreshToken;
  }

  return null;
}

/**
 * Persists auth tokens to both localStorage AND shared root domain cookies.
 */
export function saveAuthTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;

  // Save access token
  localStorage.setItem(TOKEN_KEY, accessToken);
  setCookie(TOKEN_KEY, accessToken, 7);
  // Also set access_token cookie for apps expecting snake_case
  setCookie('access_token', accessToken, 7);

  // Save refresh token if provided
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setCookie(REFRESH_TOKEN_KEY, refreshToken, 30);
    setCookie('refresh_token', refreshToken, 30);
  }
}

/**
 * Clears all auth tokens from localStorage and shared cookies.
 */
export function clearAuthTokens() {
  if (typeof window === 'undefined') return;

  const allKeys = [TOKEN_KEY, REFRESH_TOKEN_KEY, ...ALT_TOKEN_KEYS, ...ALT_REFRESH_KEYS];

  allKeys.forEach((key) => {
    localStorage.removeItem(key);
    removeCookie(key);
  });
}

/**
 * Intercepts and captures tokens from URL search params or hash fragment (e.g. from Central Portal SSO redirection).
 * Cleans the URL query/hash to prevent token exposure in browser history.
 * Returns true if a valid token was found and stored.
 */
export function extractAndSaveTokensFromUrl(): boolean {
  if (typeof window === 'undefined') return false;

  let foundToken: string | null = null;
  let foundRefreshToken: string | null = null;

  // Check URL search parameters (?token=... or ?accessToken=...)
  const searchParams = new URLSearchParams(window.location.search);
  const searchTokenKeys = ['token', 'accessToken', 'access_token', 'jwt', 'auth_token', 'sso_token'];
  const searchRefreshKeys = ['refreshToken', 'refresh_token'];

  for (const key of searchTokenKeys) {
    const val = searchParams.get(key);
    if (val) {
      foundToken = val;
      searchParams.delete(key);
      break;
    }
  }

  for (const key of searchRefreshKeys) {
    const val = searchParams.get(key);
    if (val) {
      foundRefreshToken = val;
      searchParams.delete(key);
      break;
    }
  }

  // Check URL hash fragment (#token=... or #accessToken=...)
  if (!foundToken && window.location.hash.length > 1) {
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(rawHash.includes('?') ? rawHash.split('?')[1] : rawHash);

    for (const key of searchTokenKeys) {
      const val = hashParams.get(key);
      if (val) {
        foundToken = val;
        break;
      }
    }
    for (const key of searchRefreshKeys) {
      const val = hashParams.get(key);
      if (val) {
        foundRefreshToken = val;
        break;
      }
    }
  }

  if (foundToken) {
    saveAuthTokens(foundToken, foundRefreshToken);

    // Clean URL query parameters without refreshing the page
    const newSearch = searchParams.toString();
    const cleanUrl =
      window.location.pathname +
      (newSearch ? `?${newSearch}` : '') +
      (window.location.hash.includes('token') ? '' : window.location.hash);

    window.history.replaceState({}, document.title, cleanUrl);
    return true;
  }

  return false;
}
