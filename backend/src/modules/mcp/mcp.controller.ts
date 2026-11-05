import { HrmIdentityService } from '../auth/hrm-identity.service';
import { Controller, Get, Post, Req, Res, Body, Query, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { McpService } from './mcp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

interface AuthCodeData {
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

// Process-local OAuth stores; restarting requires clients to authorize again.
const globalOAuthCodes = new Map<string, AuthCodeData>();
const globalOAuthSessions = new Map<string, { redirectUri: string; state?: string; codeChallenge?: string; codeChallengeMethod?: string; expiresAt: number; clientId: string }>();
const globalOAuthClients = new Map<string, any>();

@Controller('mcp')
export class McpController {
  private sseTransports = new Map<string, { transport: SSEServerTransport; actor: any }>();

  constructor(
    private readonly mcpService: McpService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly identities: HrmIdentityService,
  ) {}

  private safeRedirect(uri: any) {
    try { const url = new URL(uri); return !url.hash && !url.username && !url.password &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))); } catch { return false; }
  }
  private async verifiedUser(token: string) {
    const secret = this.configService.get<string>('HRM_JWT_SECRET');
    if (!secret) throw new UnauthorizedException('HRM verifier is not configured');
    let payload: any;
    try { payload = jwt.verify(token, secret, { algorithms: ['HS256'] }); } catch { throw new UnauthorizedException('Invalid token'); }
    if (typeof payload.exp !== 'number') throw new UnauthorizedException('Token has no expiry');
    const profile = await this.identities.validateSession(token, true);
    return this.identities.resolve(profile);
  }
  private tokenLifetime(token: string) {
    const payload: any = jwt.decode(token);
    return Math.max(0, Number(payload?.exp || 0) - Math.floor(Date.now() / 1000));
  }

  // ==========================================
  // 1. HEALTH / DISCOVERY
  // ==========================================
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      mode: 'native-nestjs-mcp-v2',
      transports: ['sse', 'streamable-http', 'direct-jsonrpc'],
      version: '2.0.0',
      activeSseSessions: this.sseTransports.size,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('.well-known/oauth-authorization-server')
  getOAuthDiscovery(@Req() req: Request) {
    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';
    const baseUrl = `${proto}://${host}/api/v1/mcp`;

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      scopes_supported: ['cmms:read', 'cmms:analytics'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    };
  }

  // ==========================================
  // 2. OAUTH 2.0 FLOW CHO CHATGPT
  // ==========================================
  @Post('oauth/register')
  @HttpCode(HttpStatus.CREATED)
  registerClient(@Body() body: any) {
    const clientId = 'cmms-' + crypto.randomBytes(8).toString('hex');
    const clientSecret = 'secret-' + crypto.randomBytes(16).toString('hex');
    const redirectUris = body.redirect_uris;
    if (!Array.isArray(redirectUris) || !redirectUris.length || redirectUris.length > 10 || redirectUris.some(uri => !this.safeRedirect(uri))) {
      throw new UnauthorizedException('Invalid registered redirect URI');
    }

    globalOAuthClients.set(clientId, {
      clientId,
      clientSecret,
      clientName: body.client_name || 'ChatGPT Plugin',
      redirectUris,
    });

    return {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      client_name: body.client_name || 'ChatGPT Plugin',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    };
  }

  @Get('oauth/authorize')
  async handleAuthorize(
    @Req() req: Request,
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Query('code_challenge') codeChallenge: string,
    @Query('code_challenge_method') codeChallengeMethod: string,
    @Res() res: Response,
  ) {


    const client = globalOAuthClients.get(clientId);
    if (!client?.redirectUris?.includes(redirectUri) || !this.safeRedirect(redirectUri) ||
        codeChallengeMethod !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge || '')) {
      return res.status(400).json({ error: 'invalid_request' });
    }
    // 1. Kiểm tra xem người dùng đã đăng nhập app từ trước chưa
    let token: string | null = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)(?:accessToken|access_token|token)=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (token) {
      let decoded: any = null;
      try { const user = await this.verifiedUser(token); decoded = { sub: user.id, email: user.email, name: user.name }; }
      catch { return res.status(401).json({ error: 'invalid_token' }); }

      if (decoded) {
        const code = crypto.randomBytes(24).toString('hex');
        globalOAuthCodes.set(code, {
          userId: decoded.sub || decoded.id || 'user',
          email: decoded.email || 'user',
          name: decoded.name || 'User',
          accessToken: token,
          clientId, redirectUri, codeChallenge,
          codeChallengeMethod,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });

        const url = new URL(redirectUri);
        url.searchParams.set('code', code);
        if (state) url.searchParams.set('state', state);
        return res.redirect(url.toString());
      }
    }

    // 2. Người dùng CHƯA ĐĂNG NHẬP -> Lưu phiên và chuyển hướng về trang /login của app
    const sessionId = crypto.randomBytes(16).toString('hex');
    globalOAuthSessions.set(sessionId, {
      redirectUri,
      clientId,
      state,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 phút
    });

    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';

    const callbackUrl = `${proto}://${host}/api/v1/mcp/oauth/callback?session_id=${sessionId}`;
    const appLoginUrl = `${proto}://${host}/login?redirect=${encodeURIComponent(callbackUrl)}`;
    return res.redirect(appLoginUrl);
  }

  @Get('oauth/callback')
  async handleOAuthCallback(
    @Req() req: Request,
    @Query('session_id') sessionId: string,
    @Query('token') queryToken: string,
    @Res() res: Response,
  ) {
    const session = globalOAuthSessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      return res.status(400).send('Phiên đăng nhập đã hết hạn. Vui lòng thử lại từ ChatGPT.');
    }

    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';


    let token = queryToken;
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)(?:accessToken|access_token|token)=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) {
      const callbackUrl = `${proto}://${host}/api/v1/mcp/oauth/callback?session_id=${sessionId}`;
      return res.redirect(`${proto}://${host}/login?redirect=${encodeURIComponent(callbackUrl)}`);
    }

    let decoded: any;
    try { const user = await this.verifiedUser(token); decoded = { sub: user.id, email: user.email, name: user.name }; }
    catch { return res.status(401).json({ error: 'invalid_token' }); }

    const code = crypto.randomBytes(24).toString('hex');
    globalOAuthCodes.set(code, {
      userId: decoded?.sub || decoded?.id || 'user',
      email: decoded?.email || 'user',
      name: decoded?.name || 'User',
      accessToken: token,
      clientId: session.clientId, redirectUri: session.redirectUri,
      codeChallenge: session.codeChallenge,
      codeChallengeMethod: session.codeChallengeMethod,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    globalOAuthSessions.delete(sessionId);

    const url = new URL(session.redirectUri);
    url.searchParams.set('code', code);
    if (session.state) url.searchParams.set('state', session.state);
    return res.redirect(url.toString());
  }

  @Post('oauth/token')
  async exchangeToken(@Body() body: any, @Res() res: Response) {
    const { grant_type, code, code_verifier, refresh_token } = body;

    if (grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });

    // B. Xử lý authorization_code
    if (!code || !globalOAuthCodes.has(code)) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code không hợp lệ' });
    }

    const codeData = globalOAuthCodes.get(code)!;
    if (Date.now() > codeData.expiresAt) {
      globalOAuthCodes.delete(code);
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code đã hết hạn' });
    }

    if (body.client_id !== codeData.clientId || body.redirect_uri !== codeData.redirectUri ||
        typeof code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier) ||
        crypto.createHash('sha256').update(code_verifier).digest('base64url') !== codeData.codeChallenge) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    globalOAuthCodes.delete(code);

    try { await this.verifiedUser(codeData.accessToken); }
    catch { return res.status(401).json({ error: 'invalid_token' }); }

    return res.json({
      access_token: codeData.accessToken,
      token_type: 'Bearer',
      expires_in: this.tokenLifetime(codeData.accessToken),
      scope: 'cmms:read cmms:analytics',
    });
  }

  // ==========================================
  // 3. MCP CORE DISCOVERY & TOOLS EXECUTION
  // ==========================================

  // 3.1. Nhận JSON-RPC POST trực tiếp (Action Discovery & Tool Calls)
  @Post()
  async handlePostRoot(@Req() req: Request, @Res() res: Response) {
    return this.handleDirectJsonRpc(req, res);
  }

  @Post('sse')
  async handlePostSse(@Req() req: Request, @Res() res: Response) {
    return this.handleDirectJsonRpc(req, res);
  }

  private async handleDirectJsonRpc(req: Request, res: Response) {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON-RPC request body' });
    }

    const isSseAccept = req.headers.accept?.includes('text/event-stream');
    let hasResponded = false;

    const sendResponse = (msg: any) => {
      if (hasResponded) return;
      hasResponded = true;

      if (isSseAccept) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
        res.end();
      } else {
        res.json(msg);
      }
    };

    try {
      const server = this.mcpService.createServerInstance((req as any).user);
      const transport: Transport = {
        start: async () => {},
        close: async () => {},
        send: async (msg: any) => {
          if (body.id === undefined || msg.id === body.id) {
            sendResponse(msg);
          }
        },
      };

      await server.connect(transport);

      // Nếu phương thức không phải initialize, thực hiện handshake nội bộ trước
      if (body.method !== 'initialize' && transport.onmessage) {
        await transport.onmessage({
          jsonrpc: '2.0',
          id: 'sys-init',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'chatgpt-client', version: '1.0' },
          },
        });
        await transport.onmessage({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        });
      }

      if (transport.onmessage) {
        await transport.onmessage(body);
      }

      // Timeout dự phòng sau 8 giây nếu tool chưa gửi phản hồi
      setTimeout(() => {
        if (!hasResponded) {
          sendResponse({
            jsonrpc: '2.0',
            id: body.id ?? null,
            error: { code: -32000, message: 'Tool execution timed out' },
          });
        }
      }, 8000);
    } catch (err: any) {
      console.error('[MCP v2] Error in handleDirectJsonRpc:', err);
      if (!hasResponded) {
        sendResponse({
          jsonrpc: '2.0',
          id: body.id ?? null,
          error: { code: -32603, message: err?.message || 'Internal JSON-RPC Error' },
        });
      }
    }
  }

  // 3.2. SSE Stream cho ChatGPT (GET /api/v1/mcp & GET /api/v1/mcp/sse)
  @Get()
  async handleSseRoot(@Req() req: Request, @Res() res: Response) {
    return this.handleSse(req, res);
  }

  @Get('sse')
  async handleSse(@Req() req: Request, @Res() res: Response) {
    console.log(`[MCP v2] Client connected to SSE stream via ${req.originalUrl}`);
    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';

    // Vô hiệu hóa buffering của Nginx
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    const messagesUrl = `${proto}://${host}/api/v1/mcp/messages`;
    const transport = new SSEServerTransport(messagesUrl, res);
    const actor = { ...(req as any).user };
    this.sseTransports.set(transport.sessionId, { transport, actor });

    const server = this.mcpService.createServerInstance(actor);
    await server.connect(transport);

    req.on('close', () => {
      console.log(`[MCP v2] Client disconnected (session: ${transport.sessionId})`);
      this.sseTransports.delete(transport.sessionId);
    });
  }

  // 3.3. Nhận Messages của SSE Transport (POST /api/v1/mcp/messages)
  @Post('messages')
  async handleMessages(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.query.sessionId as string;
    const connection = sessionId ? this.sseTransports.get(sessionId) : undefined;
    if (sessionId && (!connection || connection.actor.id !== (req as any).user?.id)) {
      return res.status(403).json({ error: 'invalid_session_owner' });
    }
    if (connection) {
      for (const key of Object.keys(connection.actor)) delete connection.actor[key];
      Object.assign(connection.actor, (req as any).user);
      const transport = connection.transport;
      await transport.handlePostMessage(req, res);
    } else {
      // Fallback thông minh: nếu phiên SSE bị gián đoạn, vẫn xử lý JSON-RPC trực tiếp
      return this.handleDirectJsonRpc(req, res);
    }
  }
}
