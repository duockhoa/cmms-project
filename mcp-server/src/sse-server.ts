import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './server.js';
import { checkDbConnection } from './db.js';
import { verifyAccessToken, API_ROOT } from './auth.js';

const app = express();
const allowedOrigins = new Set((process.env.CORS_ORIGIN || 'https://qltb.dkpharma.io.vn,https://app.dkpharma.io.vn').split(',').map(value => value.trim()));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use((req, res, next) => {
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return res.status(403).json({ error: 'origin_denied' });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.MCP_SSE_PORT ? parseInt(process.env.MCP_SSE_PORT, 10) : 3002;

const connections = new Map<string, { transport: SSEServerTransport; userId: string }>();

// ==========================================
// 1. HEALTH CHECK & INFO
// ==========================================
app.get(['/', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    server: 'cmms-mcp-server',
    port: PORT,
    authRequired: true,
    authType: 'OAuth2 / Bearer Token',
    endpoints: {
      sse: '/sse',
      mcp: '/mcp',
      messages: '/messages',
      oauthAuthorize: '/oauth/authorize',
      oauthToken: '/oauth/token',
    },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. OAUTH 2.0 FLOW CHO CHATGPT (Chuẩn MCP v2 / RFC 8414 / RFC 7636 PKCE)
// ==========================================

// The backend owns OAuth clients, consent and HRM sessions for both MCP transports.
// Browser consent runs on its origin, where the QLTB HttpOnly cookie is available.
async function proxyOAuth(path: string, req: express.Request, res: express.Response) {
  try {
    const response = await fetch(API_ROOT + '/mcp/oauth/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      body: JSON.stringify(req.body), signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(response.status).type('application/json').send(await response.text());
  } catch { res.status(503).json({ error: 'authorization_server_unavailable' }); }
}
app.post('/oauth/register', (req, res) => { void proxyOAuth('register', req, res); });
app.post('/oauth/token', (req, res) => { void proxyOAuth('token', req, res); });
app.get('/oauth/authorize', (req, res) => {
  const destination = new URL(API_ROOT + '/mcp/oauth/authorize');
  for (const key of ['client_id', 'redirect_uri', 'state', 'response_type', 'scope', 'code_challenge', 'code_challenge_method']) {
    if (typeof req.query[key] === 'string') destination.searchParams.set(key, req.query[key] as string);
  }
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(destination.toString());
});
app.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'], (_req, res) => {
  const issuer = API_ROOT + '/mcp';
  res.json({ issuer, authorization_endpoint: issuer + '/oauth/authorize', token_endpoint: issuer + '/oauth/token',
    registration_endpoint: issuer + '/oauth/register', response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'], code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'] });
});

// Helper: Trích xuất và xác thực token nếu có
async function extractUserFromRequest(req: express.Request): Promise<any | null> {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token) {
    token = String(req.query.token);
  } else if (req.query.access_token) {
    token = String(req.query.access_token);
  }

  if (!token) return null;
  const verified = await verifyAccessToken(token);
  return verified ? (verified.dbUser || verified.tokenPayload) : null;
}

// ==========================================
// 4. MCP ENDPOINTS (Handshake allowed, secured tools)
// ==========================================
const handleSseConnection = async (req: express.Request, res: express.Response) => {
  const user = await extractUserFromRequest(req);
  if (!user?.permissions?.includes('ALL')) return res.status(403).json({ error: 'administrator_access_required' });
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : String(req.query.token || req.query.access_token || '');
  const transport = new SSEServerTransport('/messages', res);
  connections.set(transport.sessionId, { transport, userId: user.id });
  const server = createMcpServer(async () => (await verifyAccessToken(token))?.dbUser);
  await server.connect(transport);
  req.on('close', () => { connections.delete(transport.sessionId); });
};

app.get('/sse', handleSseConnection);
app.get('/mcp', handleSseConnection);

// POST endpoint cho JSON-RPC messages
app.post(['/messages', '/mcp/messages'], async (req, res) => {
  const user = await extractUserFromRequest(req);
  const connection = connections.get(String(req.query.sessionId || ''));
  if (!connection || !user?.permissions?.includes('ALL') || connection.userId !== user.id) return res.status(403).json({ error: 'invalid_session_owner' });
  await connection.transport.handlePostMessage(req, res);
});

// ==========================================
// 5. START SERVER
// ==========================================
async function start() {
  const dbOk = await checkDbConnection();
  if (!dbOk) {
    console.error('[SSE ERROR] Database connection failed. Cannot start server.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 CMMS MCP SSE Server (Secured with Auth) is running at http://localhost:${PORT}`);
    console.log(`📡 SSE Stream: http://localhost:${PORT}/sse (Requires Bearer token)`);
    console.log(`🔑 OAuth Authorize: http://localhost:${PORT}/oauth/authorize`);
    console.log(`🎟 OAuth Token: http://localhost:${PORT}/oauth/token`);
  });
}

start().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
