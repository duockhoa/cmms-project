import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('.well-known')
export class WellKnownController {
  @Get(['oauth-authorization-server', 'openid-configuration'])
  getDiscovery(@Req() req: Request) {
    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const proto = isLocal ? 'http' : 'https';
    const rootUrl = `${proto}://${host}`;
    const mcpBase = `${rootUrl}/api/v1/mcp`;

    return {
      issuer: rootUrl,
      authorization_endpoint: `${mcpBase}/oauth/authorize`,
      token_endpoint: `${mcpBase}/oauth/token`,
      registration_endpoint: `${mcpBase}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      scopes_supported: ['cmms:read', 'cmms:analytics', 'offline_access'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    };
  }

  @Get('oauth-protected-resource')
  getProtectedResource(@Req() req: Request) {
    const host = req.get('host') || 'localhost:3001';
    const proto = req.get('x-forwarded-proto') || 'https';
    return {
      resource: `${proto}://${host}/api/v1/mcp`,
      authorization_servers: [`${proto}://${host}`],
    };
  }
}
