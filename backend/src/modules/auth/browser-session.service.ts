import { ForbiddenException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBrowserOrigins } from '../../common/auth/browser-origin';
import { HrmIdentityService } from './hrm-identity.service';

export function browserSessionKey(config: ConfigService): Buffer {
  const secret = config.get<string>('SESSION_ENCRYPTION_KEY') || '';
  if (!/^[a-f0-9]{64}$/i.test(secret)) throw new ServiceUnavailableException('SESSION_ENCRYPTION_KEY phải là khóa ngẫu nhiên 32 byte dạng hex.');
  return Buffer.from(secret, 'hex');
}

@Injectable()
export class BrowserSessionService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private config: ConfigService, private prisma: PrismaService, private identities: HrmIdentityService) {}

  private get secure() { return this.config.get<string>('NODE_ENV') === 'production' || this.config.get<string>('SESSION_COOKIE_SECURE') === 'true'; }
  private get name() { return this.secure ? '__Host-qltb-session' : 'qltb-session'; }
  private get options() { return { httpOnly: true, secure: this.secure, sameSite: 'lax' as const, path: '/' }; }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private csrf(value: string) { return createHmac('sha256', browserSessionKey(this.config)).update('csrf:' + value).digest('hex'); }

  assertOrigin(request: Request) {
    const origin = request.headers.origin;
    if (!origin || !allowedBrowserOrigins().has(origin)) throw new ForbiddenException('Nguồn yêu cầu đăng nhập không được phép.');
    if (!request.is('application/json')) throw new ForbiddenException('Yêu cầu xác thực phải dùng application/json.');
  }

  throttle(request: Request) {
    const now = Date.now();
    const key = request.ip || request.socket?.remoteAddress || 'unknown';
    if (this.attempts.size >= 10000) {
      for (const [address, value] of this.attempts) if (value.until <= now) this.attempts.delete(address);
      if (this.attempts.size >= 10000 && !this.attempts.has(key)) throw new HttpException('Vui lòng thử lại sau.', 429);
    }
    const previous = this.attempts.get(key);
    const attempt = previous && previous.until > now ? previous : { count: 0, until: now + 60000 };
    if (++attempt.count > 30) throw new HttpException('Có quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.', 429);
    this.attempts.set(key, attempt);
  }

  private cookie(request: Request): string {
    const values = (request.headers.cookie || '').split(';').map(value => value.trim())
      .filter(value => value.startsWith(this.name + '=')).map(value => value.slice(this.name.length + 1));
    if (values.length !== 1 || !/^[a-f0-9]{64}$/.test(values[0])) throw new UnauthorizedException('Không có phiên trình duyệt hợp lệ.');
    return values[0];
  }

  private encrypt(refreshToken: string, sessionId: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', browserSessionKey(this.config), nonce);
    cipher.setAAD(Buffer.from(sessionId));
    const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
    return [nonce, cipher.getAuthTag(), ciphertext].map(value => value.toString('base64url')).join('.');
  }

  private decrypt(value: string, sessionId: string) {
    try {
      const [nonce, tag, ciphertext] = value.split('.').map(part => Buffer.from(part, 'base64url'));
      const decipher = createDecipheriv('aes-256-gcm', browserSessionKey(this.config), nonce);
      decipher.setAAD(Buffer.from(sessionId));
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch { throw new UnauthorizedException('Phiên không còn hợp lệ. Vui lòng đăng nhập lại.'); }
  }

  async open(request: Request, response: Response, accessToken: string, refreshToken: string, hrmId: string) {
    const token = randomBytes(32).toString('hex');
    const id = this.hash(token);
    const lifetime = Number(this.config.get<string>('SESSION_MAX_AGE_SECONDS') || 2592000);
    if (!Number.isInteger(lifetime) || lifetime < 60 || lifetime > 2592000) throw new ServiceUnavailableException('SESSION_MAX_AGE_SECONDS phải từ 60 đến 2592000.');
    const expiresAt = new Date(Date.now() + lifetime * 1000);
    await this.prisma.browserSession.create({ data: { id, hrmId, expiresAt, refreshToken: this.encrypt(refreshToken, id) } });
    try {
      const old = this.cookie(request);
      await this.prisma.browserSession.deleteMany({ where: { id: this.hash(old) } });
    } catch (error) { if (!(error instanceof UnauthorizedException)) throw error; }
    response.cookie(this.name, token, { ...this.options, maxAge: lifetime * 1000 });
    return { accessToken, csrfToken: this.csrf(token), hrmId, refreshSession: true };
  }

  async inspect(request: Request) {
    const token = this.cookie(request);
    const session = await this.prisma.browserSession.findUnique({ where: { id: this.hash(token) } });
    if (!session || session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Phiên đã hết hạn.');
    return { csrfToken: this.csrf(token), hrmId: session.hrmId, refreshSession: true };
  }

  private checkedCookie(request: Request) {
    this.assertOrigin(request);
    this.throttle(request);
    const token = this.cookie(request);
    const supplied = request.headers['x-csrf-token'];
    const expected = this.csrf(token);
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new ForbiddenException('Mã CSRF không hợp lệ.');
    }
    return token;
  }

  async refresh(request: Request) {
    const token = this.checkedCookie(request);
    const id = this.hash(token);
    return this.prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${id} FOR UPDATE`;
      const session = await transaction.browserSession.findUnique({ where: { id } });
      if (!session || session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Phiên đã hết hạn.');
      if (request.body?.expectedHrmId !== session.hrmId) throw new UnauthorizedException('Danh tính phiên đã thay đổi.');
      const pair = await this.identities.refreshSession(this.decrypt(session.refreshToken, id), session.hrmId);
      const profile = await this.identities.validateSession(pair.accessToken);
      await this.identities.resolve(profile);
      await transaction.browserSession.update({ where: { id }, data: { refreshToken: this.encrypt(pair.refreshToken, id) } });
      return { accessToken: pair.accessToken, csrfToken: this.csrf(token), hrmId: session.hrmId, refreshSession: true };
    }, { maxWait: 15000, timeout: 20000 });
  }

  async logout(request: Request, response: Response) {
    const token = this.checkedCookie(request);
    const id = this.hash(token);
    const result = await this.prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${id} FOR UPDATE`;
      const session = await transaction.browserSession.findUnique({ where: { id } });
      if (!session) return { revoked: true };
      if (request.body?.expectedHrmId !== session.hrmId) throw new UnauthorizedException('Danh tính phiên đã thay đổi.');
      let revoked = false;
      try { revoked = (await this.identities.logout(this.decrypt(session.refreshToken, id), session.hrmId)).revoked; } catch { revoked = false; }
      await transaction.browserSession.delete({ where: { id } });
      return { revoked };
    }, { maxWait: 15000, timeout: 20000 });
    return result;
  }
}
