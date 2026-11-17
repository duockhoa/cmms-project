/**
 * Dynamic browser origin resolution.
 * Automatically derives and allows the corporate root domain from environment/system URLs,
 * allowing all corporate subdomains (e.g. *.dkpharma.io.vn) dynamically without hardcoding.
 */

function extractRootDomain(hostname: string): string {
  const host = hostname.toLowerCase();
  const parts = host.split('.');
  if (parts.length < 2) return host;
  const multiTlds = ['io.vn', 'com.vn', 'edu.vn', 'gov.vn', 'org.vn', 'net.vn'];
  const isMulti = multiTlds.some(tld => host.endsWith('.' + tld));
  const sliceCount = isMulti ? 3 : 2;
  return parts.slice(-sliceCount).join('.');
}

export function getAllowedRootDomains(): Set<string> {
  const rootDomains = new Set<string>();

  // 1. Explicit domain configuration from environment
  const explicit = [
    process.env.SHARED_DOMAIN,
    process.env.SHARED_ROOT_DOMAIN,
    process.env.CORS_ALLOWED_DOMAINS,
    process.env.BASE_DOMAIN,
  ].filter(Boolean);

  for (const item of explicit) {
    for (const d of item!.split(',')) {
      const clean = d.trim().replace(/^https?:\/\//, '').replace(/^\*\.?/, '').replace(/^\./, '').split('/')[0];
      if (clean) rootDomains.add(clean.toLowerCase());
    }
  }

  // 2. Automatically derive root domains from configured URLs
  const candidateUrls = [
    process.env.CORS_ORIGIN,
    process.env.APP_FRONTEND_URL,
    process.env.HRM_API_URL,
  ].filter(Boolean).join(',');

  for (const item of candidateUrls.split(',')) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    // Support wildcard entries like *.dkpharma.io.vn or https://*.dkpharma.io.vn
    if (trimmed.includes('*.')) {
      const clean = trimmed.replace(/^https?:\/\//, '').replace(/^\*\.?/, '').replace(/^\./, '').split('/')[0];
      if (clean) rootDomains.add(clean.toLowerCase());
      continue;
    }
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const host = parsed.hostname.toLowerCase();
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        rootDomains.add(extractRootDomain(host));
      }
    } catch {
      // Ignore invalid URL formatting
    }
  }

  // Default fallback if no domain could be derived
  if (rootDomains.size === 0) {
    rootDomains.add('dkpharma.io.vn');
  }

  return rootDomains;
}

function getExactAllowedOrigins(): Set<string> {
  const configured = [process.env.CORS_ORIGIN, process.env.APP_FRONTEND_URL].filter(Boolean).join(',');
  const defaults = ['https://qltb.dkpharma.io.vn', 'https://app.dkpharma.io.vn', 'https://hrm.dkpharma.io.vn', 'https://hsl.dkpharma.io.vn'];
  if (process.env.NODE_ENV !== 'production') defaults.push('http://localhost:5173', 'http://localhost:5174');
  return new Set(
    [...defaults, ...configured.split(',')]
      .map(value => value.trim().replace(/\/$/, ''))
      .filter(value => /^https?:\/\/[^/]+$/.test(value) && !value.includes('*'))
  );
}

export function isAllowedBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  const exactOrigins = getExactAllowedOrigins();
  if (exactOrigins.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    const isDev = process.env.NODE_ENV !== 'production';

    // Allow localhost in non-production
    if (isDev && (host === 'localhost' || host === '127.0.0.1')) {
      return true;
    }

    // Production origins must use HTTPS
    if (!isDev && parsed.protocol !== 'https:') {
      return false;
    }

    // Check against allowed root domains (matches *.rootDomain or rootDomain itself)
    const rootDomains = getAllowedRootDomains();
    for (const root of rootDomains) {
      if (host === root || host.endsWith('.' + root)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Returns a Set of allowed browser origins whose .has(origin) dynamically supports
 * wildcard matching across all corporate subdomains without hardcoding.
 */
export function allowedBrowserOrigins(): Set<string> {
  const exactSet = getExactAllowedOrigins();
  const setProxy = new Set(exactSet);
  setProxy.has = (origin: string) => isAllowedBrowserOrigin(origin);
  return setProxy;
}

export function browserOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
  callback(null, !origin || isAllowedBrowserOrigin(origin));
}
