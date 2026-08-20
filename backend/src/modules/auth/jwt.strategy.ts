import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const hrmJwtSecret = configService.get<string>('HRM_JWT_SECRET');
    const jwksUri = configService.get<string>('KEYCLOAK_JWKS_URI');
    const issuer = configService.get<string>('KEYCLOAK_ISSUER');
    const audience = configService.get<string>('KEYCLOAK_AUDIENCE');

    if (hrmJwtSecret) {
      // Use standard HRM JWT Secret
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: hrmJwtSecret,
      });
    } else {
      // Fallback to Keycloak JWKS
      if (!jwksUri || !issuer || !audience) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: You must define HRM_JWT_SECRET or Keycloak environment variables.',
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
    // HRM roles might just be a flat array or a single string
    const hrmRoles = Array.isArray(payload.roles) ? payload.roles : (payload.role ? [payload.role] : []);
    
    const roles = Array.from(new Set([...realmRoles, ...clientRoles, ...hrmRoles]));

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.preferred_username || payload.name,
      roles: roles,
      scope: payload.scope || '',
    };
  }
}
