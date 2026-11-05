// OAuth Authorization Codes storage (in-memory, TTL: 5 minutes)
export interface AuthCodeData {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
  clientId: string;
  redirectUri: string;
}
export const oauthCodes = new Map<string, AuthCodeData>();

// Registered OAuth Clients (RFC 7591 Dynamic Client Registration)
export interface OAuthClient {
  clientId: string;
  clientSecret?: string;
  clientName?: string;
  redirectUris?: string[];
}
export const oauthClients = new Map<string, OAuthClient>();

// The main backend owns JWT verification, HRM application access and local authorization.
const API_ROOT = (process.env.CMMS_API_URL || 'https://qltb.dkpharma.io.vn/api/v1').replace(/\/$/, '');
export async function verifyAccessToken(token: string): Promise<any | null> {
  try {
    const response = await fetch(`${API_ROOT}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const body: any = await response.json();
    if (!body.authenticated || !body.user?.isActive || !body.user?.id) return null;
    return { dbUser: { ...body.user, permissions: body.permissions || [] }, tokenPayload: { sub: body.user.id } };
  } catch { return null; }
}
export async function authenticateWithApp(username: string, password: string): Promise<{ accessToken: string; user: any }> {
  const root = (process.env.HRM_API_URL || 'https://hrmserver.dkpharma.io.vn').replace(/\/$/, '');
  const response = await fetch(`${root}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Authentication failed');
  const data: any = await response.json();
  if (typeof data.accessToken !== 'string') throw new Error('Authentication failed');
  const verified = await verifyAccessToken(data.accessToken);
  if (!verified) throw new Error('Application access denied');
  return { accessToken: data.accessToken, user: verified.dbUser };
}
