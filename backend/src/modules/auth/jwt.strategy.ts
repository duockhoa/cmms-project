import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HrmIdentityService } from './hrm-identity.service';

const cookieExtractor = (request: any): string | null => {
  const values = new Set<string>();
  try {
    for (const part of (request?.headers?.cookie || '').split(';')) {
      const index = part.indexOf('=');
      if (['accessToken', 'access_token', 'token', 'jwt', 'auth_token'].includes(part.slice(0, index).trim())) {
        values.add(decodeURIComponent(part.slice(index + 1)));
      }
    }
    if (!request?.headers?.cookie) {
      for (const key of ['accessToken', 'access_token', 'token']) if (request?.cookies?.[key]) values.add(request.cookies[key]);
    }
  } catch { return null; }
  return values.size === 1 ? [...values][0] : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly hrmMode: boolean;

  public static invalidateCache(_userIdOrSub?: string) {
    // Local permissions/status are read on every request. They do not invalidate HRM identity caches.
  }

  constructor(configService: ConfigService, private prisma: PrismaService, private identities: HrmIdentityService) {
    const hrmJwtSecret = configService.get<string>('HRM_JWT_SECRET');
    
    super(
      hrmJwtSecret 
        ? {
            jwtFromRequest: ExtractJwt.fromExtractors([
              ExtractJwt.fromAuthHeaderAsBearerToken(),
              (request: any) => request?.query?.token as string,
              (request: any) => request?.query?.accessToken as string,
              cookieExtractor,
            ]),
            ignoreExpiration: false,
            secretOrKey: hrmJwtSecret,
            passReqToCallback: true,
          }
        : {
            jwtFromRequest: ExtractJwt.fromExtractors([
              ExtractJwt.fromAuthHeaderAsBearerToken(),
              (request: any) => request?.query?.token as string,
              (request: any) => request?.query?.accessToken as string,
              cookieExtractor,
            ]),
            ignoreExpiration: false,
            audience: configService.get<string>('KEYCLOAK_AUDIENCE'),
            issuer: configService.get<string>('KEYCLOAK_ISSUER'),
            algorithms: ['RS256'],
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
              jwksUri: configService.get<string>('KEYCLOAK_JWKS_URI'),
            }),
            passReqToCallback: true,
          }
    );
    this.hrmMode = Boolean(hrmJwtSecret);
    
    if (!hrmJwtSecret) {
      const jwksUri = configService.get<string>('KEYCLOAK_JWKS_URI');
      const issuer = configService.get<string>('KEYCLOAK_ISSUER');
      const audience = configService.get<string>('KEYCLOAK_AUDIENCE');
      if (!jwksUri || !issuer || !audience) {
        throw new Error(
          'CRITICAL CONFIGURATION ERROR: You must define HRM_JWT_SECRET or Keycloak environment variables.',
        );
      }
    }
  }

  async validate(req: any, payload: any) {
    let dbUser: any;
    let identity: any;
    let verifiedProfile: any;
    if (this.hrmMode) {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req) || req?.query?.token || req?.query?.accessToken || cookieExtractor(req);
      if (!token) throw new UnauthorizedException('Thiếu phiên đăng nhập.');
      // /users/me resolves the HRM primary key; token sub may be an employee code.
      const force = /\/auth\/(me|session)(?:\?|$)/.test(req.originalUrl || req.url || '');
      const profile = await this.identities.validateSession(token, force);
      verifiedProfile = profile;
      dbUser = await this.identities.resolve(profile);
      identity = { provider: 'hrm', subject: String(profile.id) };
    } else {
      // Keycloak subjects must not be matched against HRM employee ids or names.
      const subject = payload?.sub;
      if (!subject || typeof subject !== 'string') throw new UnauthorizedException('Token thiếu định danh.');
      dbUser = await this.prisma.user.findUnique({ where: { id: subject }, include: { customRole: true } });
      if (!dbUser || dbUser.dataSource === 'HRM') throw new UnauthorizedException('Tài khoản Keycloak chưa được liên kết với QLTB.');
      identity = { provider: payload.iss, subject };
    }
    if (!dbUser.isActive || dbUser.accessBlocked || dbUser.mergedIntoId) throw new UnauthorizedException('Tài khoản QLTB đã ngừng hoạt động.');
    return {
      id: dbUser.id, email: verifiedProfile?.email || dbUser.email, name: verifiedProfile?.name || dbUser.name, hrmId: dbUser.hrmId,
      avatar: verifiedProfile ? (verifiedProfile.avatar || null) : dbUser.avatar,
      position: verifiedProfile?.position || dbUser.specialty,
      role: dbUser.customRole?.isActive === false ? 'USER' : dbUser.role,
      roles: dbUser.customRole?.isActive === false ? ['USER'] : [dbUser.role, dbUser.customRole?.name].filter(Boolean),
      scope: payload.scope || '', department: dbUser.department,
      isActive: dbUser.isActive, accessBlocked: dbUser.accessBlocked || false,
      managedDepartments: dbUser.managedDepartments || null,
      roleId: dbUser.roleId || null, customRole: dbUser.customRole || null,
      customPermissions: dbUser.customPermissions || null, identity,
      localUser: dbUser,
    };
  }
}
