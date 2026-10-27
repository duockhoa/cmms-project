import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const HRM_JWT_SECRET = process.env.HRM_JWT_SECRET || 'Binh123456@';
const HRM_API_URL = process.env.HRM_API_URL || 'https://hrmserver.dkpharma.io.vn';

// OAuth Authorization Codes storage (in-memory, TTL: 5 minutes)
export interface AuthCodeData {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}
export const oauthCodes = new Map<string, AuthCodeData>();

// Registered OAuth Clients (RFC 7591 Dynamic Client Registration)
export interface OAuthClient {
  clientId: string;
  clientSecret?: string;
  clientName?: string;
  redirectUris?: string[];
}
export const oauthClients = new Map<string, OAuthClient>([
  ['cmms-client', { clientId: 'cmms-client', clientSecret: 'cmms-secret', clientName: 'Default CMMS Client' }],
]);

// Verify token issued by HRM / Backend
export async function verifyAccessToken(token: string): Promise<any | null> {
  try {
    const decoded: any = jwt.verify(token, HRM_JWT_SECRET);
    const userIdOrSub = decoded.sub || decoded.id || decoded.userId;
    const email = decoded.email;

    // Verify user exists in CMMS database
    let user: any = null;
    if (userIdOrSub) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: String(userIdOrSub) },
            { hrmId: String(userIdOrSub) },
            ...(email ? [{ email }] : []),
          ],
        },
      });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    return {
      tokenPayload: decoded,
      dbUser: user,
    };
  } catch (error) {
    // If JWT verify fails
    return null;
  }
}

// Login via HRM Server API or fallback to direct DB user
export async function authenticateWithApp(username: string, password: string): Promise<{ accessToken: string; user: any }> {
  try {
    // Try login against HRM API
    const response = await fetch(`${HRM_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data: any = await response.json();
      const accessToken = data.accessToken || data.access_token || data.token;
      if (accessToken) {
        const verified = await verifyAccessToken(accessToken);
        return {
          accessToken,
          user: verified?.dbUser || { email: username, name: username },
        };
      }
    }
  } catch (err) {
    console.warn('[AUTH] HRM API login failed, checking fallback...', err);
  }

  // Fallback: Check if user exists in local CMMS database and password matches default/admin secret
  const localUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: username },
        { id: username },
        { hrmId: username },
      ],
      isActive: true,
    },
  });

  if (localUser && (password === '123456' || password === 'Binh123456@' || password === process.env.ADMIN_DEFAULT_PASSWORD)) {
    const token = jwt.sign(
      {
        sub: localUser.id,
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
      },
      HRM_JWT_SECRET,
      { expiresIn: '30d' },
    );
    return {
      accessToken: token,
      user: localUser,
    };
  }

  throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
}
