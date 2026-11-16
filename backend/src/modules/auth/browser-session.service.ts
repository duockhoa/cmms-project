import { ConflictException, ForbiddenException, HttpException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { allowedBrowserOrigins } from '../../common/auth/browser-origin';
import { HrmIdentityService, HrmRefreshUncertainException, HrmIdentityMismatchException } from './hrm-identity.service';

interface AcquiredSession {
  accessToken: string;
  refreshToken: string;
  profile: any;
  validateAfterStore?: boolean;
}

export function browserSessionKey(config: ConfigService): Buffer {
  const secret = (config.get<string>('SESSION_ENCRYPTION_KEY') || '').trim();
  if (/^[a-f0-9]{64}$/i.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  const hrmSecret = (config.get<string>('HRM_JWT_SECRET') || '').trim();
  if (hrmSecret) {
    return createHash('sha256').update(hrmSecret).digest();
  }
  throw new ServiceUnavailableException('SESSION_ENCRYPTION_KEY phải là khóa ngẫu nhiên 32 byte dạng hex.');
}

@Injectable()
export class BrowserSessionService {
  private readonly logger = new Logger(BrowserSessionService.name);
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private config: ConfigService, private prisma: PrismaService, private identities: HrmIdentityService) {}

  private get secure() { return this.config.get<string>('NODE_ENV') === 'production' || this.config.get<string>('SESSION_COOKIE_SECURE') === 'true'; }
  private get name() { return this.secure ? '__Host-qltb-session' : 'qltb-session'; }
  private get options() { return { httpOnly: true, secure: this.secure, sameSite: 'lax' as const, path: '/' }; }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private csrf(value: string) { return createHmac('sha256', browserSessionKey(this.config)).update('csrf:' + value).digest('hex'); }

  assertOrigin(request: Request) {
    let origin = request.headers.origin;
    if (!origin && request.headers.referer) {
      try {
        origin = new URL(request.headers.referer).origin;
      } catch {
        // invalid referer url format
      }
    }
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

  private active(session: any) {
    return session && session.expiresAt.getTime() > Date.now() && ['ACTIVE', 'VALIDATION_PENDING'].includes(session.state || 'ACTIVE');
  }

  private tokenValid(token: string, margin = 10000) {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      return typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() + margin;
    } catch { return false; }
  }

  private oldId(request: Request) {
    try { return this.hash(this.cookie(request)); } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
      return null;
    }
  }

  /** Short-lived, encrypted replay prevents retries from minting more HRM tokens. */
  async authenticate(request: Request, response: Response, source: string, credentials: unknown[],
    acquire: () => Promise<AcquiredSession>) {
    const supplied = request.headers['x-auth-operation'];
    let operationId: string | undefined;
    if (supplied !== undefined) {
      if (typeof supplied !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(supplied)) throw new ForbiddenException('Mã thao tác đăng nhập không hợp lệ.');
      operationId = this.hash(supplied);
      const fingerprint = createHmac('sha256', browserSessionKey(this.config)).update(JSON.stringify([source, credentials])).digest('hex');
      try {
        await this.prisma.browserAuthOperation.create({ data: { id: operationId, fingerprint, expiresAt: new Date(Date.now() + 120000) } });
      } catch (error: any) {
        if (error?.code !== 'P2002') throw error;
        const operation = await this.prisma.browserAuthOperation.findUnique({ where: { id: operationId } });
        if (!operation || operation.expiresAt.getTime() <= Date.now() || operation.fingerprint !== fingerprint || !operation.result) {
          throw new ConflictException('Thao tác đăng nhập đã được nhận. Vui lòng kiểm tra lại phiên trước khi thử tiếp.');
        }
        const session = await this.prisma.browserSession.findUnique({ where: { id: operation.sessionId } });
        if (!this.active(session) && !(session?.state === 'ADOPTION_PENDING' && session.expiresAt.getTime() > Date.now())) throw new ConflictException('Phiên của thao tác này đã thay đổi.');
        const replay = JSON.parse(this.decrypt(operation.result, 'operation:' + operationId));
        const currentAccess = session.accessToken ? this.decrypt(session.accessToken, 'access:' + session.id) : replay.body.accessToken;
        if (!this.tokenValid(currentAccess)) throw new ConflictException('Token của thao tác này đã hết hạn.');
        const currentId = this.oldId(request);
        if (currentId && currentId !== operation.sessionId && currentId !== replay.previousId) throw new ConflictException('Trình duyệt đã chuyển phiên.');
        const replayExpiry = replay.expiresAt ? new Date(replay.expiresAt) : session.expiresAt;
        if (session.state === 'ADOPTION_PENDING') await this.approveCandidate(session.id, session.accessToken, currentAccess, session.hrmId,
          { previousId: replay.previousId, expiresAt: replayExpiry });
        else if (session.state === 'VALIDATION_PENDING') await this.approveCandidate(session.id, session.accessToken, currentAccess, session.hrmId);
        if (operation.state !== 'COMPLETED') await this.prisma.browserAuthOperation.update({ where: { id: operationId }, data: { state: 'COMPLETED' } });
        replay.body.accessToken = currentAccess;
        response.cookie(this.name, replay.token, { ...this.options, maxAge: replayExpiry.getTime() - Date.now() });
        return replay.body;
      }
    }
    let acquired: AcquiredSession | undefined;
    try {
      acquired = await acquire();
      return await this.open(request, response, acquired.accessToken, acquired.refreshToken, String(acquired.profile.id), source, operationId, acquired.validateAfterStore);
    } catch (error) {
      if (operationId) await this.prisma.browserAuthOperation.update({ where: { id: operationId }, data: { state: 'FAILED' } });
      if (acquired) {
        try {
          await this.enqueueRevocation(this.prisma, this.hash('unused:' + operationId + ':' + acquired.refreshToken),
            String(acquired.profile.id), acquired.refreshToken, source, this.identities.applicationOwnsTokens() ? 'APPLICATION' : 'UNKNOWN');
        } catch { this.logger.error('auth_unused_token_cleanup_failed'); }
      }
      throw error;
    }
  }

  async open(request: Request, response: Response, accessToken: string, refreshToken: string, hrmId: string, source = 'UNKNOWN', operationId?: string, validateAfterStore = false) {
    const token = randomBytes(32).toString('hex');
    const id = this.hash(token);
    const lifetime = Number(this.config.get<string>('SESSION_MAX_AGE_SECONDS') || 2592000);
    if (!Number.isInteger(lifetime) || lifetime < 60 || lifetime > 2592000) throw new ServiceUnavailableException('SESSION_MAX_AGE_SECONDS phải từ 60 đến 2592000.');
    const expiresAt = new Date(Date.now() + lifetime * 1000);
    const previousId = this.oldId(request);
    const encryptedAccess = this.encrypt(accessToken, 'access:' + id);
    const body = { accessToken, csrfToken: this.csrf(token), hrmId, refreshSession: true };
    await this.prisma.$transaction(async transaction => {
      if (previousId) {
        await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${previousId} FOR UPDATE`;
        const previous = await transaction.browserSession.findUnique({ where: { id: previousId } });
        if (previous?.state === 'REPLACED') throw new ConflictException('Phiên đã được thay ở một yêu cầu khác. Vui lòng tải lại trang.');
        if (previous && !validateAfterStore) {
          await this.enqueueSessionRevocation(transaction, previous);
          await transaction.browserSession.update({ where: { id: previousId }, data: {
            state: 'REPLACED', refreshToken: '', accessToken: null, expiresAt: new Date(Date.now() + 600000),
          } });
        }
      }
      const tokenOwnership = source === 'LEGACY_SSO' ? 'SHARED'
        : this.identities.applicationOwnsTokens() && ['DIRECT_LOGIN', 'MCP_LOGIN'].includes(source) ? 'APPLICATION' : 'UNKNOWN';
      await transaction.browserSession.create({ data: { id, hrmId, expiresAt: validateAfterStore ? new Date(Math.min(expiresAt.getTime(), Date.now() + 120000)) : expiresAt, source, tokenOwnership,
        refreshToken: this.encrypt(refreshToken, id), accessToken: encryptedAccess,
        state: validateAfterStore ? 'ADOPTION_PENDING' : 'ACTIVE', refreshedAt: validateAfterStore ? new Date() : null } });
      if (operationId) await transaction.browserAuthOperation.update({ where: { id: operationId }, data: {
        state: 'COMPLETED', sessionId: id, result: this.encrypt(JSON.stringify({ token, body, previousId, expiresAt }), 'operation:' + operationId),
      } });
    });
    if (validateAfterStore) await this.approveCandidate(id, encryptedAccess, accessToken, hrmId, { previousId, expiresAt });
    response.cookie(this.name, token, { ...this.options, maxAge: Math.max(0, expiresAt.getTime() - Date.now()) });
    this.logger.log('browser_session_opened');
    return body;
  }

  async inspect(request: Request) {
    const token = this.cookie(request);
    const session = await this.prisma.browserSession.findUnique({ where: { id: this.hash(token) } });
    if (!this.active(session)) throw new UnauthorizedException('Phiên đã hết hạn hoặc đã kết thúc.');
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
    let attempted = false;
    let previousAccess: string | null = null;
    const candidate = await this.prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${id} FOR UPDATE`;
      const session = await transaction.browserSession.findUnique({ where: { id } });
      if (!this.active(session)) throw new UnauthorizedException('Phiên đã hết hạn hoặc cần đăng nhập lại.');
      if (request.body?.expectedHrmId !== session.hrmId) throw new UnauthorizedException('Danh tính phiên đã thay đổi.');
      if (session.accessToken && (session.state === 'VALIDATION_PENDING' || session.refreshedAt?.getTime() > Date.now() - 10000)) {
        const accessToken = this.decrypt(session.accessToken, 'access:' + id);
        if (this.tokenValid(accessToken)) {
          this.logger.log('browser_refresh_reused');
          return { accessToken, encryptedAccess: session.accessToken, hrmId: session.hrmId };
        }
      }
      try {
        previousAccess = session.accessToken;
        attempted = true;
        const pair = await this.identities.exchangeRefreshToken(this.decrypt(session.refreshToken, id));
        const encryptedAccess = this.encrypt(pair.accessToken, 'access:' + id);
        // Commit rotation before profile/application checks. A temporary outage must not discard it.
        await transaction.browserSession.update({ where: { id }, data: {
          refreshToken: this.encrypt(pair.refreshToken, id), accessToken: encryptedAccess,
          state: 'VALIDATION_PENDING', refreshedAt: new Date(),
        } });
        this.logger.log('browser_refresh_exchanged');
        return { accessToken: pair.accessToken, encryptedAccess, hrmId: session.hrmId };
      } catch (error) {
        if (!(error instanceof HrmRefreshUncertainException) && !(error instanceof UnauthorizedException)) throw error;
        await transaction.browserSession.update({ where: { id }, data: { state: 'REFRESH_UNCERTAIN', accessToken: null } });
        return { error };
      }
    }, { maxWait: 15000, timeout: 20000 }).catch(async error => {
      if (!attempted) throw error;
      // If the database failed after HRM rotated, never blindly exchange the old token again.
      try {
        await this.prisma.browserSession.updateMany({ where: { id, accessToken: previousAccess,
          state: { in: ['ACTIVE', 'VALIDATION_PENDING'] } }, data: { state: 'REFRESH_UNCERTAIN', accessToken: null } });
      } catch { this.logger.error('browser_refresh_persistence_uncertain'); }
      throw new HrmRefreshUncertainException();
    });
    if ('error' in candidate) throw candidate.error;
    await this.approveCandidate(id, candidate.encryptedAccess, candidate.accessToken, candidate.hrmId);
    return { accessToken: candidate.accessToken, csrfToken: this.csrf(token), hrmId: candidate.hrmId, refreshSession: true };
  }

  private async approveCandidate(id: string, encryptedAccess: string, accessToken: string, hrmId: string,
    promotion?: { previousId: string | null; expiresAt: Date }) {
    let profile: any;
    try { profile = await this.identities.validateRefreshedSession(accessToken, hrmId); }
    catch (error) {
      if (error instanceof HrmIdentityMismatchException) {
        await this.prisma.browserSession.updateMany({ where: { id, accessToken: encryptedAccess },
          data: { state: 'INVALID', tokenOwnership: 'UNKNOWN', refreshToken: '', accessToken: null } });
      }
      throw error;
    }
    await this.identities.resolve(profile);
    const publish = async (database: any) => {
      if (promotion?.previousId) {
        await database.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${promotion.previousId} FOR UPDATE`;
        const previous = await database.browserSession.findUnique({ where: { id: promotion.previousId } });
        if (previous?.state === 'REPLACED') throw new ConflictException('Phiên đã được thay ở một yêu cầu khác.');
        if (previous) {
          await this.enqueueSessionRevocation(database, previous);
          await database.browserSession.update({ where: { id: previous.id }, data: {
            state: 'REPLACED', refreshToken: '', accessToken: null, expiresAt: new Date(Date.now() + 600000),
          } });
        }
      }
      const result = await database.browserSession.updateMany({ where: { id, accessToken: encryptedAccess,
        state: { in: ['ACTIVE', 'VALIDATION_PENDING', 'ADOPTION_PENDING'] }, expiresAt: { gt: new Date() } },
        data: { state: 'ACTIVE', ...(promotion ? { expiresAt: promotion.expiresAt } : {}) } });
      if (!result.count) throw new UnauthorizedException('Phiên đã thay đổi trong khi gia hạn.');
      return result;
    };
    const committed = promotion ? await this.prisma.$transaction(publish) : await publish(this.prisma);
    if (!committed.count) throw new UnauthorizedException('Phiên đã thay đổi trong khi gia hạn.');
  }

  async accessForOAuth(request: Request): Promise<string | null> {
    const id = this.oldId(request);
    if (!id) return null;
    const session = await this.prisma.browserSession.findUnique({ where: { id } });
    if (!this.active(session) || session.state === 'VALIDATION_PENDING' || !session.accessToken) return null;
    const token = this.decrypt(session.accessToken, 'access:' + id);
    return this.tokenValid(token) ? token : null;
  }

  private async enqueueRevocation(database: any, id: string, hrmId: string, refreshToken: string, source: string, ownership: string) {
    if (ownership !== 'APPLICATION' || !this.identities.applicationOwnsTokens() || !['DIRECT_LOGIN', 'MCP_LOGIN'].includes(source) || !refreshToken) return false;
    await database.hrmRevocationTask.upsert({ where: { id }, update: {}, create: {
      id, hrmId, refreshToken: this.encrypt(refreshToken, 'revocation:' + id),
      expiresAt: new Date(Date.now() + 86400000),
    } });
    return true;
  }

  private ownsSession(session: any) {
    return session.tokenOwnership === 'APPLICATION' && this.identities.applicationOwnsTokens() && ['DIRECT_LOGIN', 'MCP_LOGIN'].includes(session.source);
  }

  private async enqueueSessionRevocation(database: any, session: any) {
    if (!this.ownsSession(session) || !session.refreshToken) return false;
    let refreshToken: string;
    try { refreshToken = this.decrypt(session.refreshToken, session.id); }
    catch { this.logger.warn('session_revocation_token_unreadable'); return false; }
    return this.enqueueRevocation(database, session.id, session.hrmId, refreshToken, session.source, session.tokenOwnership);
  }

  async processRevocation(id: string) {
    if (!this.identities.applicationOwnsTokens()) return false;
    return this.prisma.$transaction(async transaction => {
      // All lifecycle paths lock BrowserSession before HrmRevocationTask.
      await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${id} FOR UPDATE`;
      await transaction.$queryRaw`SELECT id FROM HrmRevocationTask WHERE id = ${id} FOR UPDATE`;
      const task = await transaction.hrmRevocationTask.findUnique({ where: { id } });
      if (!task || task.availableAt.getTime() > Date.now() || task.expiresAt.getTime() <= Date.now() || task.attempts >= 5) return false;
      try {
        const result = await this.identities.logout(this.decrypt(task.refreshToken, 'revocation:' + id), task.hrmId, 'DIRECT_LOGIN');
        if (!result.revoked) return false;
        await transaction.hrmRevocationTask.delete({ where: { id } });
        await transaction.browserSession.updateMany({ where: { id, state: 'LOGGED_OUT' }, data: { state: 'LOGGED_OUT_REVOKED' } });
        this.logger.log('hrm_session_revoked');
        return true;
      } catch {
        await transaction.hrmRevocationTask.update({ where: { id }, data: { attempts: { increment: 1 }, availableAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** task.attempts)) } });
        this.logger.warn('hrm_session_revocation_pending');
        return false;
      }
    }, { maxWait: 5000, timeout: 10000 });
  }

  async logout(request: Request, response: Response) {
    const token = this.checkedCookie(request);
    const id = this.hash(token);
    const queued = await this.prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${id} FOR UPDATE`;
      const session = await transaction.browserSession.findUnique({ where: { id } });
      if (!session) return { queued: false, owned: false, revoked: false };
      if (request.body?.expectedHrmId !== session.hrmId) throw new UnauthorizedException('Danh tính phiên đã thay đổi.');
      if (session.state === 'LOGGED_OUT_REVOKED') return { queued: false, owned: true, revoked: true };
      if (['LOGGED_OUT', 'REPLACED'].includes(session.state)) {
        return { queued: Boolean(await transaction.hrmRevocationTask.findUnique({ where: { id } })), owned: this.ownsSession(session), revoked: false };
      }
      const pending = await this.enqueueSessionRevocation(transaction, session);
      await transaction.browserSession.update({ where: { id }, data: {
        state: 'LOGGED_OUT', refreshToken: '', accessToken: null, expiresAt: new Date(Date.now() + 600000),
      } });
      return { queued: pending, owned: this.ownsSession(session), revoked: false };
    }, { maxWait: 15000, timeout: 20000 });
    let revoked = queued.revoked;
    if (queued.queued) { try { revoked = await this.processRevocation(id); } catch { /* Durable task remains for maintenance. */ } }
    return { localLoggedOut: true, revoked,
      hrmRevocation: revoked ? 'revoked' : queued.queued ? 'pending' : queued.owned ? 'unknown' : 'not_requested_shared' };
  }

  async maintain(execute = false, batchSize = 500, maxBatches = 10) {
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500 || !Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 20) {
      throw new Error('Invalid session maintenance limits');
    }
    const cutoff = new Date();
    const report = { execute, expiredSessions: await this.prisma.browserSession.count({ where: { expiresAt: { lte: cutoff } } }),
      deletedSessions: 0, deletedOperations: 0, deletedTasks: 0, revokedTasks: 0 };
    if (!execute) return report;
    for (let batch = 0; batch < maxBatches; batch++) {
      const rows = await this.prisma.browserSession.findMany({ where: { expiresAt: { lte: cutoff } }, orderBy: { id: 'asc' }, take: batchSize, select: { id: true } });
      if (!rows.length) break;
      await this.prisma.$transaction(async transaction => {
        for (const row of rows) {
          await transaction.$queryRaw`SELECT id FROM BrowserSession WHERE id = ${row.id} FOR UPDATE`;
          const session = await transaction.browserSession.findUnique({ where: { id: row.id } });
          if (!session || session.expiresAt > cutoff) continue;
          await this.enqueueSessionRevocation(transaction, session);
          report.deletedSessions += (await transaction.browserSession.deleteMany({ where: { id: session.id, expiresAt: { lte: cutoff } } })).count;
        }
      }, { timeout: 20000 });
    }
    const operations = await this.prisma.browserAuthOperation.findMany({ where: { expiresAt: { lte: cutoff } }, take: batchSize, select: { id: true } });
    report.deletedOperations = (await this.prisma.browserAuthOperation.deleteMany({ where: { id: { in: operations.map(row => row.id) }, expiresAt: { lte: cutoff } } })).count;
    const abandoned = await this.prisma.hrmRevocationTask.findMany({ where: { expiresAt: { lte: cutoff } }, take: batchSize, select: { id: true } });
    report.deletedTasks = (await this.prisma.hrmRevocationTask.deleteMany({ where: { id: { in: abandoned.map(row => row.id) }, expiresAt: { lte: cutoff } } })).count;
    const tasks = await this.prisma.hrmRevocationTask.findMany({ where: { availableAt: { lte: cutoff }, expiresAt: { gt: cutoff }, attempts: { lt: 5 } }, take: 5, select: { id: true } });
    for (const task of tasks) if (await this.processRevocation(task.id)) report.revokedTasks++;
    this.logger.log(JSON.stringify({ event: 'session_maintenance', ...report }));
    return report;
  }
}
