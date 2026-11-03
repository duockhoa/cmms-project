import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { isHrmProfileActive, selectHrmIdentity } from './identity-resolution';

@Injectable()
export class HrmIdentityService {
  private static profiles = new Map<string, { profile: any; expires: number }>();
  static invalidateCache() { this.profiles.clear(); }

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  async refreshSession(refreshToken: string, expectedHrmId: string) {
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
      const profile = await this.getProfile(accessToken, true);
      if (String(profile.id) !== expectedHrmId) {
        throw new UnauthorizedException('Refresh token không thuộc người dùng hiện tại. Vui lòng đăng nhập lại.');
      }
      return { accessToken, refreshToken: data.refreshToken || data.refresh_token || refreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Không kết nối được HRM để gia hạn phiên.');
    } finally { clearTimeout(timeout); }
  }

  async getProfile(token: string, force = false) {
    const key = createHash('sha256').update(token).digest('hex');
    const cached = HrmIdentityService.profiles.get(key);
    if (!force && cached && cached.expires > Date.now()) return cached.profile;
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
      if (!selected.user.isActive) throw new UnauthorizedException('Tài khoản QLTB đã ngừng hoạt động.');
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
      if (!concurrent || !concurrent.isActive || (profile.email?.includes('@') && concurrent.email !== profile.email)) {
        throw new ConflictException('Liên kết tài khoản cần được đối soát trước khi đăng nhập.');
      }
      return concurrent;
    }
  }
}
