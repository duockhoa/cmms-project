import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwksUri = configService.get<string>('KEYCLOAK_JWKS_URI');
    const issuer = configService.get<string>('KEYCLOAK_ISSUER');
    const audience = configService.get<string>('KEYCLOAK_AUDIENCE');

    if (!jwksUri || !issuer || !audience) {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: Keycloak environment variables (KEYCLOAK_JWKS_URI, KEYCLOAK_ISSUER, KEYCLOAK_AUDIENCE) are missing!',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: audience,
      issuer: issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUri,
      }),
    });
  }

  async validate(payload: any) {
    // payload represents decoded Keycloak JWT token
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token payload is invalid or missing subject.');
    }

    // Extract roles and username from keycloak token
    // Keycloak typically puts client roles under resource_access.<client-id>.roles
    // or realm roles under realm_access.roles
    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[payload.azp]?.roles || [];
    const roles = Array.from(new Set([...realmRoles, ...clientRoles]));

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.preferred_username || payload.name,
      roles: roles,
      scope: payload.scope || '',
    };
  }
}
