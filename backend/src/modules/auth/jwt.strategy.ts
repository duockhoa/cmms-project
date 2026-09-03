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
            jwtFromRequest: ExtractJwt.fromExtractors([
              ExtractJwt.fromAuthHeaderAsBearerToken(),
              (request: any) => request?.query?.token as string,
            ]),
            ignoreExpiration: false,
            secretOrKey: hrmJwtSecret,
            passReqToCallback: true,
          }
        : {
            jwtFromRequest: ExtractJwt.fromExtractors([
              ExtractJwt.fromAuthHeaderAsBearerToken(),
              (request: any) => request?.query?.token as string,
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

  async validate(req: any, payload: any) {
    // payload represents decoded Keycloak/HRM JWT token
    const sub = payload?.sub || payload?.id || payload?.userId || payload?._id || payload?.username;
    if (!payload || !sub) {
      console.error('JwtStrategy validation failed: Payload missing subject identifier.', payload);
      throw new UnauthorizedException('Token payload is invalid or missing subject.');
    }

    // Try to find the user in the CMMS database by email or username
    const dummyDomain = process.env.HRM_DUMMY_EMAIL_DOMAIN || '@local.hrm';
    const emailOrUsername = payload.email || payload.username || `${sub}${dummyDomain}`;
    
    let dbUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          ...(payload.username ? [{ email: `${payload.username}@local.hrm` }, { name: payload.username }] : []),
          ...(sub ? [{ email: `${sub}@local.hrm` }] : []),
        ]
      },
      include: {
        customRole: true
      }
    });

    let department = dbUser?.department || null;
    let name = dbUser?.name || payload.preferred_username || payload.name || payload.username || `User ${sub}`;
    let specialty = dbUser?.specialty || null;
    
    // Nếu user chưa tồn tại hoặc thiếu department trong DB, thử lấy trực tiếp từ HRM để đồng bộ
    if (!dbUser || dbUser.department === null) {
      try {
        let token = req.headers?.authorization;
        if (!token && req.query?.token) {
          token = `Bearer ${req.query.token}`;
        }
        if (token) {
          const hrmApiUrl = process.env.HRM_API_URL || 'https://hrm.example.com';
          const res = await fetch(`${hrmApiUrl}/users/me`, {
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
            }
          });
          if (res.ok) {
            const hrmUser: any = await res.json();
            if (hrmUser) {
              department = hrmUser.department || department;
              name = hrmUser.name || name;
              specialty = hrmUser.position || specialty;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile from HRM during validation:', error);
      }
    }

    const adminCodes = [
      process.env.ADMIN_EMPLOYEE_CODE,
      ...(process.env.SUPER_ADMIN_EMPLOYEE_CODES ? process.env.SUPER_ADMIN_EMPLOYEE_CODES.split(',') : [])
    ].filter(Boolean).map(c => c!.trim().toLowerCase());

    const isSuperAdmin = adminCodes.some(code => 
      (payload.username && payload.username.toString().toLowerCase() === code) ||
      (sub && sub.toString().toLowerCase() === code) ||
      (emailOrUsername && emailOrUsername.toString().toLowerCase().includes(code)) ||
      (name && name.toString().toLowerCase().includes(code))
    );
    const defaultRole = isSuperAdmin ? 'ADMIN' : (process.env.DEFAULT_SYNC_ROLE || 'USER');

    // Auto-provision user if they don't exist in CMMS yet
    if (!dbUser) {
      try {
        dbUser = await this.prisma.user.create({
          data: {
            email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@local.hrm`,
            name: name,
            role: defaultRole,
            department: department,
            specialty: specialty,
          },
          include: {
            customRole: true
          }
        });
      } catch (err: any) {
        console.warn('Prisma auto-provision conflict or error, retrying lookup:', err?.message || err);
        // Fallback for race condition: another request just created this user
        dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: emailOrUsername },
              { email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@local.hrm` },
              ...(payload.username ? [{ email: `${payload.username}@local.hrm` }, { name: payload.username }] : []),
            ]
          },
          include: {
            customRole: true
          }
        });

        if (!dbUser) {
          console.error('Prisma auto-provision fatal error:', err);
          throw new UnauthorizedException(`Lỗi hệ thống: Không thể tạo tài khoản CMMS tự động từ HRM (${err?.message || err}).`);
        }
      }
    } else {
      // Check if we need to update info or upgrade to ADMIN
      const needsUpdate = (department && dbUser.department !== department) || 
                          (specialty && dbUser.specialty !== specialty) || 
                          (name && dbUser.name !== name) ||
                          (isSuperAdmin && dbUser.role !== 'ADMIN');
      if (needsUpdate) {
        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: {
            department: department || dbUser.department,
            specialty: specialty || dbUser.specialty,
            name: name || dbUser.name,
            role: isSuperAdmin ? 'ADMIN' : dbUser.role, // Upgrade to admin if matched
          },
          include: { customRole: true }
        });
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
      department: dbUser.department,
    };
  }
}
