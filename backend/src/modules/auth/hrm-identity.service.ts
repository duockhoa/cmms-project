import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { isHrmProfileActive, selectHrmIdentity } from './identity-resolution';
import { hrmApplicationConfig } from './hrm-application.config';

@Injectable()
export class HrmIdentityService {
  private static profiles = new Map<string, { profile: any; expires: number }>();
  private static applications = new Map<string, { expires: number }>();
  private static pending = new Map<string, Promise<any>>();
  static invalidateCache() { this.profiles.clear(); this.applications.clear(); this.pending.clear(); }

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  async validateSession(token: string, force = false) {
    const [profile] = await Promise.all([this.getProfile(token, force), this.assertApplication(token, force)]);
    return profile;
  }

  async assertApplication(token: string, force = false) {
    const application = hrmApplicationConfig(this.config);
    if (!application) {
      return;
    }
    const key = createHash('sha256').update(JSON.stringify([application.id, application.key, token])).digest('hex');
    const cached = HrmIdentityService.applications.get(key);
    if (!force && cached && cached.expires > Date.now()) return;
    const pendingKey = `applications:${key}`;
    if (HrmIdentityService.pending.has(pendingKey)) return HrmIdentityService.pending.get(pendingKey);
    HrmIdentityService.applications.delete(key);
    const pending = (async () => {
      const root = this.config.get<string>('HRM_API_URL') || 'https://hrmserver.dkpharma.io.vn';
      let response: Response;
      try { response = await fetch(`${root.replace(/\/$/, '')}/users/me/applications`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
      }); } catch { throw new ServiceUnavailableException('Chưa kiểm tra được quyền vào ứng dụng từ HRM.'); }
      if (response.status === 401) throw new UnauthorizedException('Phiên HRM đã hết hạn.');
      if (response.status === 403) throw new ForbiddenException('HRM từ chối quyền truy cập ứng dụng.');
      if (!response.ok) throw new ServiceUnavailableException('Không kiểm tra được quyền ứng dụng HRM.');
      const body: any = await response.json();
      const applications = Array.isArray(body) ? body : body?.applications || body?.data?.applications || body?.data;
      if (!Array.isArray(applications)) throw new ServiceUnavailableException('Dữ liệu cấp ứng dụng HRM chưa đúng hợp đồng.');
      const allowed = applications.some(item => {
        const app = item?.application || item;
        return app && String(app.id) === application.id && app.key === application.key &&
          (app.is_active === true || app.is_active === 1) &&
          (item === app || item?.is_active === undefined || item.is_active === true || item.is_active === 1);
      });
      if (!allowed) throw new ForbiddenException('Tài khoản chưa được HRM cấp ứng dụng Quản lý thiết bị đang hoạt động.');
      if (HrmIdentityService.applications.size >= 1000) HrmIdentityService.applications.clear();
      HrmIdentityService.applications.set(key, { expires: Date.now() + 30_000 });
    })();
    HrmIdentityService.pending.set(pendingKey, pending);
    try { await pending; } finally { if (HrmIdentityService.pending.get(pendingKey) === pending) HrmIdentityService.pending.delete(pendingKey); }
  }

  async login(username: string, password: string) {
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) throw new UnauthorizedException('Thiếu thông tin đăng nhập.');
    const root = this.config.get<string>('HRM_API_URL') || 'https://hrmserver.dkpharma.io.vn';
    let response: Response;
    try { response = await fetch(`${root.replace(/\/$/, '')}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(8000),
    }); } catch { throw new ServiceUnavailableException('Không kết nối được HRM.'); }
    if (!response.ok) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
    const data: any = await response.json();
    if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string') throw new ServiceUnavailableException('HRM chưa trả cặp token hợp lệ.');
    const profile = await this.validateSession(data.accessToken, true);
    const user = await this.resolve(profile);
    return { accessToken: data.accessToken, refreshToken: data.refreshToken, profile, user };
  }

  async logout(refreshToken: string, expectedHrmId: string) {
    // An opaque or mixed refresh token must not revoke another employee's session.
    const pair = await this.refreshPair(refreshToken, expectedHrmId, false);
    const root = this.config.get<string>('HRM_API_URL') || 'https://hrmserver.dkpharma.io.vn';
    try {
      const response = await fetch(`${root.replace(/\/$/, '')}/auth/logout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: pair.refreshToken }), signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Chưa xác nhận được việc thu hồi phiên HRM.');
      HrmIdentityService.invalidateCache();
      return { revoked: true };
    } catch { throw new ServiceUnavailableException('Phiên cục bộ sẽ kết thúc nhưng chưa xác nhận được thu hồi phiên HRM.'); }
  }

  async refreshSession(refreshToken: string, expectedHrmId: string) {
    return this.refreshPair(refreshToken, expectedHrmId, true);
  }

  private async refreshPair(refreshToken: string, expectedHrmId: string, requireApplication: boolean) {
    if (typeof refreshToken !== 'string' || !refreshToken || typeof expectedHrmId !== 'string' || !expectedHrmId) {
      throw new UnauthorizedException('Vui lòng đăng nhập lại để xác nhận phiên.');
    }
    const root = this.config.get<string>('HRM_API_URL') || 'https://hrmserver.dkpharma.io.vn';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${root.replace(/\/$/, '')}/auth/refresh-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }), signal: controller.signal,
      });
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new UnauthorizedException('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
      }
      if (!response.ok) throw new ServiceUnavailableException('Chưa gia hạn được phiên HRM.');
      const data: any = await response.json();
      const accessToken = data.accessToken || data.access_token || data.token;
      if (typeof accessToken !== 'string' || !accessToken) throw new UnauthorizedException('HRM không trả về token hợp lệ.');
      const profile = requireApplication
        ? await this.validateSession(accessToken, true)
        : await this.getProfile(accessToken, true);
      if (String(profile.id) !== expectedHrmId) {
        throw new UnauthorizedException('Refresh token không thuộc người dùng hiện tại. Vui lòng đăng nhập lại.');
      }
      return { accessToken, refreshToken: data.refreshToken || data.refresh_token || refreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Không kết nối được HRM để gia hạn phiên.');
    } finally { clearTimeout(timeout); }
  }

  async getProfile(token: string, force = false) {
    const key = createHash('sha256').update(token).digest('hex');
    const cached = HrmIdentityService.profiles.get(key);
    if (!force && cached && cached.expires > Date.now()) return cached.profile;
    const pendingKey = `profile:${key}`;
    const existing = HrmIdentityService.pending.get(pendingKey);
    if (existing) return existing;
    const pending = this.fetchProfile(token, key);
    HrmIdentityService.pending.set(pendingKey, pending);
    try { return await pending; } finally { if (HrmIdentityService.pending.get(pendingKey) === pending) HrmIdentityService.pending.delete(pendingKey); }
  }

  private async fetchProfile(token: string, key: string) {
    HrmIdentityService.profiles.delete(key);
    const root = this.config.get<string>('HRM_API_URL') || 'https://hrmserver.dkpharma.io.vn';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${root.replace(/\/$/, '')}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new UnauthorizedException('Phiên HRM đã kết thúc. Vui lòng đăng nhập lại.');
      }
      if (!response.ok) throw new ServiceUnavailableException('Chưa xác minh được phiên HRM. Vui lòng thử lại.');
      const body: any = await response.json();
      const profile = body?.user || body?.data || body;
      if (!profile || !['string', 'number'].includes(typeof profile.id) || String(profile.id).trim() === '') {
        throw new UnauthorizedException('HRM không trả về định danh người dùng hợp lệ.');
      }
      if (!isHrmProfileActive(profile)) throw new UnauthorizedException('Tài khoản HRM đã ngừng hoạt động.');
      if (HrmIdentityService.profiles.size >= 1000) HrmIdentityService.profiles.clear();
      HrmIdentityService.profiles.set(key, { profile, expires: Date.now() + 30_000 });
      return profile;
    } catch (error) {
      HrmIdentityService.profiles.delete(key);
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Không kết nối được HRM để xác minh người dùng. Vui lòng thử lại.');
    } finally { clearTimeout(timeout); }
  }

  async resolve(profile: any) {
    const hrmId = String(profile.id);
    const linked = await this.prisma.user.findUnique({ where: { hrmId }, include: { customRole: true } });
    if (linked) {
      if (!linked.isActive || linked.accessBlocked || linked.mergedIntoId) throw new UnauthorizedException('Tài khoản QLTB đã bị khóa hoặc đã gộp.');
      if (typeof profile.email === 'string' && profile.email.includes('@') && profile.email.toLowerCase() !== linked.email.toLowerCase()) {
        const emailOwner = await this.prisma.user.findUnique({ where: { email: profile.email }, select: { id: true } });
        if (emailOwner && emailOwner.id !== linked.id) throw new ConflictException('Email HRM đang liên kết với một tài khoản QLTB khác.');
      }
      return linked;
    }
    const emails = [profile.email, `${hrmId}@local.hrm`, ...(profile.username ? [`${profile.username}@local.hrm`] : [])]
      .filter(value => typeof value === 'string' && value.includes('@'));
    const users = await this.prisma.user.findMany({
      where: { OR: [{ hrmId }, { id: hrmId }, ...emails.map(email => ({ email }))] },
      include: { customRole: true },
    });
    const selected = selectHrmIdentity(users, profile);
    if (selected.reason) {
      throw new ConflictException({ code: selected.reason, message: 'Liên kết tài khoản HRM và QLTB cần được đối soát. Vui lòng liên hệ quản trị viên.' });
    }
    if (selected.user) {
      if (!selected.user.isActive || selected.user.accessBlocked || selected.user.mergedIntoId) throw new UnauthorizedException('Tài khoản QLTB đã ngừng hoạt động.');
      return selected.user;
    }
    const adminCodes = [this.config.get<string>('ADMIN_EMPLOYEE_CODE'),
      ...(this.config.get<string>('SUPER_ADMIN_EMPLOYEE_CODES') || '').split(',')].filter(Boolean);
    // These settings contain employee codes, never HRM database primary keys.
    const employeeCode = String(profile.username ?? profile.employeeCode ?? profile.employee_code ?? '');
    const admin = adminCodes.some(code => code.trim() === employeeCode);
    try {
      return await this.prisma.user.create({
        data: {
          hrmId, dataSource: 'HRM', lastHrmSyncedAt: new Date(),
          email: profile.email?.includes('@') ? profile.email : `${hrmId}@local.hrm`,
          name: profile.name || profile.username || `HRM ${hrmId}`,
          department: profile.department || null, specialty: profile.position || null, avatar: profile.avatar || null,
          role: admin ? 'ADMIN' : (this.config.get<string>('DEFAULT_SYNC_ROLE') || 'USER'),
        }, include: { customRole: true },
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      // Only the same external key can recover a concurrent first login.
      const concurrent = await this.prisma.user.findUnique({ where: { hrmId }, include: { customRole: true } });
      if (!concurrent || !concurrent.isActive || concurrent.accessBlocked || concurrent.mergedIntoId || (profile.email?.includes('@') && concurrent.email !== profile.email)) {
        throw new ConflictException('Liên kết tài khoản cần được đối soát trước khi đăng nhập.');
      }
      return concurrent;
    }
  }
}
