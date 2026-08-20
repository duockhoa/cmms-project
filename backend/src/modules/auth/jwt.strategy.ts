import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma: PrismaService;

  constructor(configService: ConfigService, prisma: PrismaService) {
    const hrmJwtSecret = configService.get<string>('HRM_JWT_SECRET');
    
    super(
      hrmJwtSecret 
        ? {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: hrmJwtSecret,
          }
        : {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
          }
    );
    this.prisma = prisma;
    
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

  async validate(payload: any) {
    // payload represents decoded Keycloak/HRM JWT token
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token payload is invalid or missing subject.');
    }

    // Try to find the user in the CMMS database by email or username
    const dummyDomain = process.env.HRM_DUMMY_EMAIL_DOMAIN || '@local.hrm';
    const emailOrUsername = payload.email || payload.username || `${payload.sub}${dummyDomain}`;
    
    let dbUser = await this.prisma.user.findFirst({
      where: {
        email: emailOrUsername
      },
      include: {
        customRole: true
      }
    });

    // Auto-provision user if they don't exist in CMMS yet
    if (!dbUser) {
      try {
        const defaultRole = process.env.DEFAULT_SYNC_ROLE || 'TECHNICIAN';
        dbUser = await this.prisma.user.create({
          data: {
            email: emailOrUsername,
            name: payload.preferred_username || payload.name || payload.username || `User ${payload.sub}`,
            role: defaultRole, // Configurable via .env
          },
          include: {
            customRole: true
          }
        });
      } catch (err) {
        throw new UnauthorizedException('Lỗi hệ thống: Không thể tạo tài khoản CMMS tự động từ HRM.');
      }
    }

    // Combine roles from legacy 'role' field and new 'customRole'
    const roles = [];
    if (dbUser.role) roles.push(dbUser.role);
    if (dbUser.customRole?.name) roles.push(dbUser.customRole.name);

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      roles: roles,
      scope: payload.scope || '',
    };
  }
}
