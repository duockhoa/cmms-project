// The main backend owns JWT verification, HRM application access and local authorization.
export const API_ROOT = (process.env.CMMS_API_URL || 'https://qltb.dkpharma.io.vn/api/v1').replace(/\/$/, '');
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
