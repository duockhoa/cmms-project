import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './server.js';
import { checkDbConnection } from './db.js';
import { verifyAccessToken, authenticateWithApp, oauthCodes, oauthClients } from './auth.js';

const app = express();
const allowedOrigins = new Set((process.env.CORS_ORIGIN || 'https://qltb.dkpharma.io.vn,https://app.dkpharma.io.vn').split(',').map(value => value.trim()));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use((req, res, next) => {
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return res.status(403).json({ error: 'origin_denied' });
  next();
});
function safeRedirect(value: any) {
  try { const url = new URL(value); return !url.hash && !url.username && !url.password && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))); } catch { return false; }
}
function validAuthorization(body: any) {
  return typeof body.client_id === 'string' && oauthClients.get(body.client_id)?.redirectUris?.includes(body.redirect_uri) && safeRedirect(body.redirect_uri) &&
    body.code_challenge_method === 'S256' && typeof body.code_challenge === 'string' && /^[A-Za-z0-9_-]{43}$/.test(body.code_challenge);
}
const htmlEscape = (value: any) => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
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

// RFC 7591 Dynamic Client Registration (ChatGPT có thể tự động đăng ký Client ID)
app.post('/oauth/register', (req, res) => {
  if (!Array.isArray(req.body.redirect_uris) || !req.body.redirect_uris.length || req.body.redirect_uris.length > 10 || req.body.redirect_uris.some((uri: any) => !safeRedirect(uri))) return res.status(400).json({ error: 'invalid_redirect_uri' });
  if (oauthClients.size >= 1000) return res.status(429).json({ error: 'registration_limit' });
  const clientId = 'cmms-' + crypto.randomBytes(8).toString('hex');
  const clientSecret = 'secret-' + crypto.randomBytes(16).toString('hex');
  
  oauthClients.set(clientId, {
    clientId,
    clientSecret,
    clientName: req.body.client_name || 'ChatGPT Plugin',
    redirectUris: req.body.redirect_uris || [],
  });

  console.log(`[OAUTH] Auto-registered new client: ${clientId}`);

  res.status(201).json({
    client_id: clientId,
    client_secret: clientSecret,
    client_name: req.body.client_name || 'ChatGPT Plugin',
    redirect_uris: req.body.redirect_uris || [],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
  });
});

// Trang giao diện đăng nhập khi ChatGPT chuyển hướng sang
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type, scope, code_challenge, code_challenge_method } = req.query;

  // Render trang đăng nhập HTML
  if (response_type !== 'code' || !validAuthorization(req.query)) return res.status(400).json({ error: 'invalid_request' });
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đăng nhập CMMS - Cấp quyền AI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; background: #0369a1; color: #e0f2fe; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: #f8fafc; font-size: 14px; outline: none; transition: border 0.2s; }
    input:focus { border-color: #38bdf8; ring: 2px solid #0284c7; }
    .btn { width: 100%; padding: 12px; background: #0284c7; border: none; border-radius: 8px; color: #ffffff; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
    .btn:hover { background: #0369a1; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">
      <span>⚙️</span> CMMS AI Authentication
    </div>
    <h1>Đăng nhập hệ thống</h1>
    <p>Đăng nhập bằng tài khoản nội bộ để cấp quyền cho ChatGPT truy xuất dữ liệu thiết bị và bảo trì.</p>
    
    <form action="/oauth/authorize/submit" method="POST">
      <input type="hidden" name="redirect_uri" value="${htmlEscape(redirect_uri)}">
      <input type="hidden" name="state" value="${htmlEscape(state)}">
      <input type="hidden" name="client_id" value="${htmlEscape(client_id)}">
      <input type="hidden" name="code_challenge" value="${htmlEscape(code_challenge)}">
      <input type="hidden" name="code_challenge_method" value="${htmlEscape(code_challenge_method)}">
      
      <div class="form-group">
        <label>Tên đăng nhập / Mã NV / Email</label>
        <input type="text" name="username" placeholder="VD: 0947 hoặc user@dkpharma.vn" required autofocus>
      </div>

      <div class="form-group">
        <label>Mật khẩu</label>
        <input type="password" name="password" placeholder="••••••••" required>
      </div>

      <button type="submit" class="btn">Đăng nhập & Cấp quyền cho ChatGPT</button>
    </form>

    <div class="footer">
      Bảo mật bởi hệ thống xác thực nội bộ DK Pharma CMMS
    </div>
  </div>
</body>
</html>
  `;
  res.send(html);
});

// Xử lý submit form đăng nhập từ người dùng
app.post('/oauth/authorize/submit', async (req, res) => {
  const { username, password, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.body;
  if (!validAuthorization(req.body)) return res.status(400).json({ error: 'invalid_request' });

  try {
    const authResult = await authenticateWithApp(username, password);

    // Sinh mã code ngắn hạn (5 phút)
    const code = crypto.randomBytes(24).toString('hex');
    oauthCodes.set(code, {
      userId: authResult.user.id || username,
      email: authResult.user.email || username,
      name: authResult.user.name || username,
      accessToken: authResult.accessToken,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      expiresAt: Date.now() + 5 * 60 * 1000,
      clientId: client_id, redirectUri: redirect_uri,
    });

    if (redirect_uri) {
      const url = new URL(redirect_uri as string);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state as string);
      return res.redirect(url.toString());
    }

    res.json({
      success: true,
      code,
      message: 'Xác thực thành công. Bạn có thể quay lại ChatGPT.',
    });
  } catch (error: any) {
    res.status(401).send(`
      <body style="background:#0f172a;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
        <h2 style="color:#f87171;">Đăng nhập thất bại</h2>
        <p>${htmlEscape(error.message) || 'Sai tài khoản hoặc mật khẩu'}</p>
        <br>
        <a href="javascript:history.back()" style="color:#38bdf8;">Thử lại</a>
      </body>
    `);
  }
});

// Endpoint ChatGPT gọi để đổi `code` lấy `access_token`
app.post('/oauth/token', express.urlencoded({ extended: true }), async (req, res) => {
  const { code, grant_type, code_verifier, client_id, redirect_uri } = req.body;
  res.setHeader('Cache-Control', 'no-store');
  if (grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });

  if (!code || !oauthCodes.has(code)) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Code không hợp lệ hoặc đã hết hạn' });
  }

  const codeData = oauthCodes.get(code)!;
  if (codeData.clientId !== client_id || codeData.redirectUri !== redirect_uri || typeof code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)) return res.status(400).json({ error: 'invalid_grant' });
  if (Date.now() > codeData.expiresAt) {
    oauthCodes.delete(code);
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Code đã hết hạn' });
  }

  // Xác thực PKCE nếu client có gửi code_challenge trước đó
  if (codeData.codeChallenge && !code_verifier) return res.status(400).json({ error: 'invalid_grant' });
  if (codeData.codeChallenge && code_verifier) {
    let calculatedChallenge = code_verifier;
    if (codeData.codeChallengeMethod === 'S256') {
      calculatedChallenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    }
    if (calculatedChallenge !== codeData.codeChallenge) {
      console.warn('[OAUTH] PKCE Verification failed');
      return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE code_verifier không khớp' });
    }
  }

  // Remove code sau khi đã đổi (single use)
  oauthCodes.delete(code);

  const verified = await verifyAccessToken(codeData.accessToken);
  if (!verified) return res.status(401).json({ error: 'invalid_grant' });
  const claims = JSON.parse(Buffer.from(codeData.accessToken.split('.')[1], 'base64url').toString());
  return res.json({
    access_token: codeData.accessToken,
    token_type: 'Bearer',
    expires_in: Math.max(0, Number(claims.exp || 0) - Math.floor(Date.now() / 1000)), // actual token lifetime; previously 30 ngày
    scope: 'cmms:read cmms:analytics',
  });
});

// ==========================================
// 3. OAUTH METADATA DISCOVERY (RFC 8414 / MCP v2)
// ==========================================
app.get(['/.well-known/oauth-authorization-server', '/.well-known/openid-configuration'], (req, res) => {
  const host = req.get('host') || 'localhost:3002';
  const proto = req.get('x-forwarded-proto') || 'https';
  const baseUrl = `${proto}://${host}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
  });
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
