import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { McpController } from './mcp.controller';
import { WellKnownController } from './well-known.controller';

describe('MCP authorization uses managed QLTB sessions', () => {
  const secret = 'mcp-session-tests-only';
  const accessToken = jwt.sign({ sub: 'employee-code' }, secret, { expiresIn: '1h' });
  const verifier = 'a'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const user = { id: 'local-user', hrmId: 'employee', name: 'Employee', email: 'employee@example.test', isActive: true };
  let controller: McpController;
  let sessions: any;
  let identities: any;
  let prisma: any;
  let response: any;
  let authorization: any;
  const request = (): any => ({ headers: { origin: 'https://qltb.dkpharma.io.vn' },
    get: () => 'qltb.dkpharma.io.vn', ip: '127.0.0.1' });

  beforeEach(() => {
    identities = { validateSession: jest.fn().mockResolvedValue({ id: 'employee' }), resolve: jest.fn().mockResolvedValue(user),
      login: jest.fn().mockResolvedValue({ accessToken, refreshToken: 'never-drop-this', profile: { id: 'employee' } }) };
    sessions = { accessForOAuth: jest.fn().mockResolvedValue(null), inspect: jest.fn().mockRejectedValue(new UnauthorizedException()),
      refresh: jest.fn().mockResolvedValue({ accessToken }), throttle: jest.fn(),
      authenticate: jest.fn(async (_req, _res, _source, _credentials, acquire) => ({ accessToken: (await acquire()).accessToken })) };
    prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    controller = new McpController({} as any, prisma, new ConfigService({ HRM_JWT_SECRET: secret }), identities, sessions);
    response = { setHeader: jest.fn(), send: jest.fn(), redirect: jest.fn(), json: jest.fn() };
    response.status = jest.fn(() => response);
    const client = controller.registerClient({ redirect_uris: ['https://client.example.test/callback'] });
    authorization = { client_id: client.client_id, redirect_uri: client.redirect_uris[0], code_challenge: challenge,
      code_challenge_method: 'S256', decision: 'allow', state: 'state', auth_operation: 'c'.repeat(32) };
  });

  it('uses the managed login service and exchanges the code only once', async () => {
    await controller.handleAuthorizeSubmit(request(), { ...authorization, username: 'employee', password: 'password' }, response);
    expect(sessions.authenticate).toHaveBeenCalledWith(expect.anything(), response, 'MCP_LOGIN',
      ['employee', 'password', authorization.client_id, authorization.redirect_uri], expect.any(Function));
    expect(identities.login).toHaveBeenCalledTimes(1);
    const code = new URL(response.redirect.mock.calls[0][0]).searchParams.get('code');
    await controller.exchangeToken({ grant_type: 'authorization_code', code, code_verifier: verifier,
      client_id: authorization.client_id, redirect_uri: authorization.redirect_uri }, response);
    expect(response.json).toHaveBeenLastCalledWith(expect.objectContaining({ access_token: accessToken }));
    await controller.exchangeToken({ grant_type: 'authorization_code', code }, response);
    expect(response.json).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });

  it('ignores shared token cookies when rendering consent after local logout', async () => {
    const req = request(); req.headers.cookie = 'accessToken=' + accessToken;
    await controller.handleAuthorize(req, authorization.client_id, authorization.redirect_uri, 'state', challenge, 'S256', response);
    expect(identities.validateSession).not.toHaveBeenCalled();
    expect(response.send.mock.calls[0][0]).toContain('name="username"');
  });

  it('refreshes an existing cookie session on consent instead of logging into HRM again', async () => {
    sessions.inspect.mockResolvedValue({ csrfToken: 'csrf', hrmId: 'employee' });
    await controller.handleAuthorize(request(), authorization.client_id, authorization.redirect_uri, 'state', challenge, 'S256', response);
    expect(response.send.mock.calls[0][0]).not.toContain('name="username"');
    await controller.handleAuthorizeSubmit(request(), { ...authorization, session_csrf: 'csrf', session_hrm_id: 'employee' }, response);
    expect(sessions.refresh).toHaveBeenCalledWith(expect.objectContaining({ body: { expectedHrmId: 'employee' },
      headers: expect.objectContaining({ 'x-csrf-token': 'csrf' }) }));
    expect(identities.login).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalled();
  });

  it('rejects consent from an untrusted origin and a switched account', async () => {
    const req = request(); req.headers.origin = 'https://outside.example.test';
    await controller.handleAuthorizeSubmit(req, authorization, response);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(sessions.authenticate).not.toHaveBeenCalled();
    sessions.accessForOAuth.mockResolvedValue(accessToken);
    await controller.handleAuthorizeSubmit(request(), { ...authorization, session_hrm_id: 'other' }, response);
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.redirect).not.toHaveBeenCalled();
  });

  it('advertises only supported grants and PKCE methods', () => {
    const metadata = new WellKnownController().getDiscovery(request());
    expect(metadata.grant_types_supported).toEqual(['authorization_code']);
    expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
    expect(controller.getOAuthDiscovery(request()).grant_types_supported).toEqual(['authorization_code']);
  });
});
