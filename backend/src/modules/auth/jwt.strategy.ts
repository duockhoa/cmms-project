import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const cookieExtractor = (request: any): string | null => {
  if (request?.cookies?.accessToken) return request.cookies.accessToken;
  if (request?.cookies?.access_token) return request.cookies.access_token;
  if (request?.cookies?.token) return request.cookies.token;
  if (request?.headers?.cookie) {
    const match = (request.headers.cookie as string).match(/(?:^|;\s*)(?:accessToken|access_token|token)=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

interface CachedUserAuth {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    roles: string[];
    scope: string;
    department: string | null;
  };
  cachedAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma: PrismaService;
  // In-memory cache to eliminate repeated DB queries and external network round-trips
  private static authCache = new Map<string, CachedUserAuth>();
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Helper to invalidate cache when a user profile or role is updated
   */
  public static invalidateCache(userIdOrSub?: string) {
    if (!userIdOrSub) {
      JwtStrategy.authCache.clear();
      return;
    }
    const cleanId = String(userIdOrSub).replace(/^0+/, '');
    for (const [key, entry] of JwtStrategy.authCache.entries()) {
      if (entry.user.id === userIdOrSub || entry.user.id === cleanId || key.includes(userIdOrSub)) {
        JwtStrategy.authCache.delete(key);
      }
    }
  }

  constructor(configService: ConfigService, prisma: PrismaService) {
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

    const cacheKey = `${sub}_${payload.exp || ''}`;
    const cached = JwtStrategy.authCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < JwtStrategy.CACHE_TTL_MS) {
      return cached.user;
    }

    // Try to find the user in the CMMS database by id, sub, email or username
    const dummyDomain = process.env.HRM_DUMMY_EMAIL_DOMAIN || '@local.hrm';
    const emailOrUsername = payload.email || payload.username || `${sub}${dummyDomain}`;
    const subStr = String(sub);
    const subCleanId = subStr.replace(/^0+/, '');
    const usernameStr = payload.username ? String(payload.username) : null;
    const usernameCleanId = usernameStr ? usernameStr.replace(/^0+/, '') : null;

    const orConditions: any[] = [
      { id: subStr },
      ...(subCleanId ? [{ id: subCleanId }] : []),
      ...(usernameStr ? [{ id: usernameStr }] : []),
      ...(usernameCleanId ? [{ id: usernameCleanId }] : []),
      { email: emailOrUsername },
      ...(payload.email ? [{ email: payload.email }] : []),
      ...(payload.username ? [{ email: `${payload.username}@local.hrm` }, { name: payload.username }] : []),
      { email: `${subStr}@local.hrm` },
      ...(subCleanId ? [{ email: `${subCleanId}@local.hrm` }] : []),
    ];
    if (payload.name) {
      orConditions.push({ name: payload.name });
    }

    let dbUser = await this.prisma.user.findFirst({
      where: { OR: orConditions },
      include: {
        customRole: true
      }
    });

    let department = dbUser?.department || null;
    let name = dbUser?.name || payload.preferred_username || payload.name || payload.username || `User ${sub}`;
    let specialty = dbUser?.specialty || null;
    let avatar = dbUser?.avatar || payload.avatar || null;
    
    // CHỈ gọi HRM khi tài khoản HOÀN TOÀN CHƯA CÓ TRONG DB (Auto-provision lần đầu)
    // Tuyệt đối không gọi HRM trên mỗi request thông thường khi avatar == null
    if (!dbUser) {
      try {
        let token = req.headers?.authorization;
        if (!token && req.query?.token) {
          token = `Bearer ${req.query.token}`;
        }
        if (token) {
          const hrmApiUrl = process.env.HRM_API_URL || 'https://hrmserver.dkpharma.io.vn';
          // Đặt timeout 3s để không bao giờ làm treo hệ thống nếu HRM phản hồi chậm
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const res = await fetch(`${hrmApiUrl}/users/me`, {
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));

          if (res.ok) {
            const hrmUser: any = await res.json();
            if (hrmUser) {
              department = hrmUser.department || department;
              name = hrmUser.name || name;
              specialty = hrmUser.position || specialty;
              avatar = hrmUser.avatar || avatar;

              // Thử tìm lại bằng ID chính xác từ HRM nếu có
              const hrmOr: any[] = [];
              if (hrmUser.id) {
                hrmOr.push({ id: String(hrmUser.id) });
                hrmOr.push({ id: String(hrmUser.id).replace(/^0+/, '') });
              }
              if (hrmUser.email && hrmUser.email.includes('@')) {
                hrmOr.push({ email: hrmUser.email });
              }
              if (hrmUser.name) {
                hrmOr.push({ name: hrmUser.name });
              }
              if (hrmOr.length > 0) {
                dbUser = await this.prisma.user.findFirst({
                  where: { OR: hrmOr },
                  include: { customRole: true }
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn('HRM profile sync timeout or skipped for new user:', error);
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
      (name && name.toString().toLowerCase().includes(code)) ||
      (dbUser?.email && dbUser.email.toLowerCase().includes(code))
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
            avatar: avatar,
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
      const needsUpdate = (isSuperAdmin && dbUser.role !== 'ADMIN');
      if (needsUpdate) {
        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: {
            role: 'ADMIN',
          },
          include: { customRole: true }
        });
      }
    }

    // Combine roles from legacy 'role' field and new 'customRole'
    const roles = [];
    if (dbUser.role) roles.push(dbUser.role);
    if (dbUser.customRole?.name) roles.push(dbUser.customRole.name);

    const validatedUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      roles: roles,
      scope: payload.scope || '',
      department: dbUser.department,
    };

    // Cache the result for subsequent requests
    JwtStrategy.authCache.set(cacheKey, {
      user: validatedUser,
      cachedAt: Date.now(),
    });

    return validatedUser;
  }
}
