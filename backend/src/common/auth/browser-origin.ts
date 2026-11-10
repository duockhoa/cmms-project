/** Exact origins only; no reflected origin or wildcard with credentialed requests. */
export function allowedBrowserOrigins(): Set<string> {
  const configured = [process.env.CORS_ORIGIN, process.env.APP_FRONTEND_URL].filter(Boolean).join(',');
  const defaults = ['https://qltb.dkpharma.io.vn', 'https://app.dkpharma.io.vn', 'https://hrm.dkpharma.io.vn'];
  if (process.env.NODE_ENV !== 'production') defaults.push('http://localhost:5173', 'http://localhost:5174');
  return new Set([...defaults, ...configured.split(',')].map(value => value.trim().replace(/\/$/, '')).filter(value => /^https?:\/\/[^/]+$/.test(value)));
}
export function browserOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
  callback(null, !origin || allowedBrowserOrigins().has(origin));
}
