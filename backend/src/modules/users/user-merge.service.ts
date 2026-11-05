import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hasPermission } from '../../common/utils/rbac.helper';
import { ConfirmUserMergeDto, PreviewUserMergeDto } from './dto/merge-users.dto';
import { mergedUserIds, userMergeReferences, MergeReference } from './user-merge.references';

type Change = MergeReference & { recordId: string; from: any; to: any; version?: number };
const snapshot = (value: unknown): any => JSON.parse(JSON.stringify(value));
const delegateName = (model: string) => model[0].toLowerCase() + model.slice(1);

@Injectable()
export class UserMergeService {
  constructor(private prisma: PrismaService) {}

  private async authorize(database: any, actorId: string) {
    const actor = await database.user.findUnique({ where: { id: actorId }, include: { customRole: true } });
    if (!hasPermission(actor, 'settings:users') || !hasPermission(actor, 'settings:merge_users')) {
      throw new ForbiddenException('Cần quyền quản lý người dùng và quyền gộp tài khoản thủ công.');
    }
  }

  private async inspect(database: any, sourceId: string, targetId: string, actorId: string) {
    if (sourceId === targetId) throw new BadRequestException('Phải chọn hai tài khoản khác nhau.');
    const source = await database.user.findUnique({ where: { id: sourceId } });
    const target = await database.user.findUnique({ where: { id: targetId } });
    if (!source || !target) throw new NotFoundException('Tài khoản nguồn hoặc đích không tồn tại.');
    const blockers: string[] = [];
    if (source.id === actorId) blockers.push('Không thể gộp chính tài khoản đang thực hiện thao tác.');
    if (source.mergedIntoId || target.mergedIntoId) blockers.push('Một tài khoản đã được gộp; hãy chọn tài khoản đích còn hiệu lực.');
    if (source.hrmId) blockers.push('Tài khoản nguồn đã có ID HRM. Hãy giữ tài khoản có liên kết HRM làm đích; không gộp hai danh tính HRM.');
    if (!target.isActive || target.accessBlocked || target.hrmIsActive === false) blockers.push('Tài khoản đích phải đang hoạt động và không bị khóa.');
    if (source.dataSource === 'HRM' && !target.hrmId) blockers.push('Tài khoản HRM cũ phải được gộp vào tài khoản đích đã xác minh liên kết HRM.');
    if (await database.user.count({ where: { mergedIntoId: sourceId } })) blockers.push('Tài khoản nguồn đang là đích của lần gộp trước; cần đối soát chuỗi liên kết trước khi gộp tiếp.');
    for (const [model, status] of [['workOrderWorkSession', 'IN_PROGRESS'], ['fabricationWorkSession', 'ACTIVE']]) {
      if (await database[model].count({ where: { userId: { in: [sourceId, targetId] }, status } })) {
        blockers.push('Hai tài khoản còn phiên làm việc đang mở; cần kết thúc phiên trước khi gộp.');
        break;
      }
    }
    const archivedEmail = `merged-${createHash('sha256').update(sourceId).digest('hex').slice(0, 32)}@users.invalid`;
    const emailOwner = await database.user.findUnique({ where: { email: archivedEmail } });
    if (emailOwner && emailOwner.id !== sourceId) blockers.push('Email lưu trữ của tài khoản nguồn đã bị chiếm; cần đối soát trước.');
    const changes: Change[] = [];
    if (!blockers.length) {
      for (const reference of userMergeReferences()) {
        const delegate = database[delegateName(reference.model)];
        const select = { id: true, [reference.field]: true, ...(reference.versioned ? { version: true } : {}) };
        let cursor: string | undefined;
        do {
          const rows = await delegate.findMany({
            where: { [reference.field]: reference.json ? { not: Prisma.DbNull } : sourceId },
            select, orderBy: { id: 'asc' }, take: 500,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          for (const row of rows) {
            const next = reference.json ? mergedUserIds(row[reference.field], sourceId, targetId) : targetId;
            if (next === null) continue;
            changes.push({ ...reference, recordId: row.id, from: row[reference.field], to: next,
              ...(reference.versioned ? { version: row.version } : {}),
            });
            if (changes.length > 5000) throw new ConflictException('Tác động vượt 5.000 liên kết; cần quy trình gộp dữ liệu riêng.');
          }
          cursor = rows.length === 500 ? rows[rows.length - 1].id : undefined;
        } while (cursor);
      }
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(snapshot({ source, target, changes }))).digest('hex');
    return { source, target, blockers, changes, fingerprint, archivedEmail };
  }

  async preview(dto: PreviewUserMergeDto, actorId: string) {
    return this.prisma.$transaction(async transaction => {
      await this.authorize(transaction, actorId);
      const review = await this.inspect(transaction, dto.sourceUserId, dto.targetUserId, actorId);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const preview = review.blockers.length ? null : await transaction.userMergePreview.create({ data: {
        sourceUserId: dto.sourceUserId, targetUserId: dto.targetUserId, actorUserId: actorId,
        fingerprint: review.fingerprint, expiresAt,
      } });
      const impact = new Map<string, { model: string; field: string; count: number; sampleIds: string[] }>();
      for (const change of review.changes) {
        const key = `${change.model}.${change.field}`;
        const item = impact.get(key) || { model: change.model, field: change.field, count: 0, sampleIds: [] };
        item.count++;
        if (item.sampleIds.length < 5) item.sampleIds.push(change.recordId);
        impact.set(key, item);
      }
      return {
        previewId: preview?.id || null, expiresAt: preview ? expiresAt : null,
        source: snapshot(review.source), target: snapshot(review.target), blockers: review.blockers,
        archivedEmail: review.archivedEmail, impact: [...impact.values()],
        totalReferences: review.changes.length,
        totalRecords: new Set(review.changes.map(change => `${change.model}:${change.recordId}`)).size,
        policy: 'Giữ quyền và liên kết HRM của đích. Chuyển các liên kết đã liệt kê; giữ tên snapshot lịch sử. Nguồn bị khóa và lưu vết, không bị xóa.',
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }

  async confirm(dto: ConfirmUserMergeDto, actorId: string) {
    if (dto.confirmed !== true || dto.reason.trim().length < 10 || dto.evidence.trim().length < 10) {
      throw new BadRequestException('Cần xác nhận cùng người, lý do và bằng chứng đối soát ít nhất 10 ký tự.');
    }
    return this.prisma.$transaction(async transaction => {
      await this.authorize(transaction, actorId);
      await transaction.$queryRaw`SELECT id FROM UserMergePreview WHERE id = ${dto.previewId} FOR UPDATE`;
      const preview = await transaction.userMergePreview.findUnique({ where: { id: dto.previewId } });
      if (!preview || preview.actorUserId !== actorId) throw new NotFoundException('Không tìm thấy bản xem trước của bạn.');
      if (preview.consumedAt || preview.expiresAt.getTime() <= Date.now()) throw new ConflictException('Bản xem trước đã dùng hoặc hết hạn; hãy xem trước lại.');
      const ids = [preview.sourceUserId, preview.targetUserId].sort();
      await transaction.$queryRaw`SELECT id FROM User WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
      const review = await this.inspect(transaction, preview.sourceUserId, preview.targetUserId, actorId);
      if (review.blockers.length || review.fingerprint !== preview.fingerprint) {
        throw new ConflictException(review.blockers.join(' ') || 'Dữ liệu đã thay đổi từ lúc xem trước; hãy xem trước lại.');
      }
      const groups = new Map<string, Change[]>();
      for (const change of review.changes) {
        const key = `${change.model}:${change.recordId}`;
        groups.set(key, [...(groups.get(key) || []), change]);
      }
      for (const changes of groups.values()) {
        const first = changes[0];
        const where: any = { id: first.recordId };
        const data: any = {};
        for (const change of changes) {
          where[change.field] = change.json ? { equals: change.from } : change.from;
          data[change.field] = change.to;
        }
        if (first.versioned) { where.version = first.version; data.version = { increment: 1 }; }
        const result = await (transaction as any)[delegateName(first.model)].updateMany({ where, data });
        if (result.count !== 1) throw new ConflictException('Một phiếu đã thay đổi trong lúc gộp. Vui lòng xem trước lại.');
      }
      const sourceResult = await transaction.user.updateMany({
        where: { id: review.source.id, version: review.source.version, mergedIntoId: null },
        data: { isActive: false, accessBlocked: true, mergedIntoId: review.target.id, mergedAt: new Date(),
          email: review.archivedEmail, version: { increment: 1 } },
      });
      if (sourceResult.count !== 1) throw new ConflictException('Tài khoản nguồn đã thay đổi.');
      await transaction.user.update({ where: { id: review.target.id }, data: { version: { increment: 1 } } });
      const audit = await transaction.userMergeAudit.create({ data: {
        previewId: preview.id, sourceUserId: review.source.id, targetUserId: review.target.id, actorUserId: actorId,
        reason: dto.reason.trim(), evidence: dto.evidence.trim(), sourceSnapshot: snapshot(review.source),
        targetSnapshot: snapshot(review.target), changes: snapshot(review.changes),
      } });
      await transaction.userMergePreview.update({ where: { id: preview.id }, data: { consumedAt: new Date() } });
      return { auditId: audit.id, sourceUserId: review.source.id, targetUserId: review.target.id,
        totalRecords: groups.size, totalReferences: review.changes.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 40000 });
  }

  async history(userId: string, actorId: string) {
    await this.authorize(this.prisma, actorId);
    return this.prisma.userMergeAudit.findMany({
      where: { OR: [{ sourceUserId: userId }, { targetUserId: userId }] }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, sourceUserId: true, targetUserId: true, actorUserId: true, reason: true, evidence: true,
        sourceSnapshot: true, targetSnapshot: true, createdAt: true },
    });
  }

  async audit(auditId: string, actorId: string) {
    await this.authorize(this.prisma, actorId);
    const audit = await this.prisma.userMergeAudit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Không tìm thấy hồ sơ gộp.');
    return audit;
  }
}
