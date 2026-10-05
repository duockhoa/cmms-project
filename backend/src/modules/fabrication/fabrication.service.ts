import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFabricationDto } from './dto/create-fabrication.dto';
import { UpdateFabricationDto } from './dto/update-fabrication.dto';
import { CreateProgressLogDto } from './dto/create-progress-log.dto';
import { StartWorkSessionDto, StopWorkSessionDto } from './dto/work-session.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvents } from '../notifications/events/notification-events.constants';
import {
  FabricationAssignedEvent,
  FabricationUpdatedEvent,
} from '../notifications/events/fabrication.events';

@Injectable()
export class FabricationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async generateOrderCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.fabricationOrder.count();
    const nextSeq = String(count + 1).padStart(4, '0');
    let candidate = `GC-${year}-${nextSeq}`;

    let exists = await this.prisma.fabricationOrder.findUnique({ where: { orderCode: candidate } });
    let inc = 1;
    while (exists) {
      const altSeq = String(count + 1 + inc).padStart(4, '0');
      candidate = `GC-${year}-${altSeq}`;
      exists = await this.prisma.fabricationOrder.findUnique({ where: { orderCode: candidate } });
      inc++;
    }

    return candidate;
  }

  async create(dto: CreateFabricationDto, user?: any) {
    const orderCode = await this.generateOrderCode();

    // Calculate initial materials and total cost
    let totalCost = 0;
    const materialsData = (dto.materials || []).map((m) => {
      const lineTotal = (m.quantity || 1) * (m.unitPrice || 0);
      totalCost += lineTotal;
      return {
        materialName: m.materialName,
        quantity: m.quantity || 1,
        unit: m.unit,
        unitPrice: m.unitPrice || 0,
        totalPrice: lineTotal,
        inventoryItemId: m.inventoryItemId || null,
      };
    });

    const order = await this.prisma.fabricationOrder.create({
      data: {
        orderCode,
        title: dto.title,
        category: (dto.category as any) || 'FABRICATION',
        priority: dto.priority || 'MEDIUM',
        status: 'ASSIGNED',
        description: dto.description,
        specifications: dto.specifications || null,
        location: dto.location || null,
        targetDepartment: dto.targetDepartment || null,
        equipmentId: dto.equipmentId || null,
        assignedTechnicianId: dto.assignedTechnicianId || null,
        supporterIds: dto.supporterIds ? JSON.stringify(dto.supporterIds) : null,
        creatorId: user?.id || null,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        estimatedHours: dto.estimatedHours || 0,
        actualHours: 0,
        drawings: dto.drawings ? JSON.stringify(dto.drawings) : null,
        totalCost,
        materials: {
          create: materialsData,
        },
      },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });

    // Record audit trail in WorkflowHistory
    try {
      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'FabricationOrder',
          entityId: order.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: order.status,
          actedById: user?.id || null,
          performedById: user?.id || null,
          comment: `Khởi tạo phiếu công việc [${order.orderCode}]: ${order.title}`,
          metadata: JSON.stringify({
            orderCode: order.orderCode,
            category: order.category,
            priority: order.priority,
            targetDepartment: order.targetDepartment,
          }),
        },
      });
    } catch (e) {
      console.error('Failed to log audit trail on create fabrication order:', e);
    }

    // Emit domain event for notification and email handling
    if (order.assignedTechnicianId) {
      this.eventEmitter.emit(
        NotificationEvents.FABRICATION_ASSIGNED,
        new FabricationAssignedEvent(order),
      );
    }

    return order;
  }

  async findAll(
    params?: {
      status?: string;
      category?: string;
      search?: string;
      technicianId?: string;
    },
    user?: any,
  ) {
    const where: any = {};

    if (params?.status && params.status !== 'ALL' && params.status.trim()) {
      where.status = params.status.trim();
    }

    if (params?.category && params.category !== 'ALL' && params.category.trim()) {
      where.category = params.category.trim();
    }

    if (params?.technicianId && params.technicianId.trim()) {
      where.assignedTechnicianId = params.technicianId.trim();
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderCode: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
        { targetDepartment: { contains: q } },
      ];
    }

    const items = await this.prisma.fabricationOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });

    const role = user?.role ? String(user.role).toUpperCase() : '';
    const roles: string[] = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : [];
    const isManagerOrAdmin =
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'MANAGER' ||
      roles.some((r) => r.includes('ADMIN') || r.includes('MANAGER') || r.includes('QUẢN LÝ') || r.includes('TRƯỞNG'));

    // Nếu không phải là Quản lý / Admin (nhân viên thường), chỉ trả về các phiếu mình được phân công
    if (!isManagerOrAdmin && user?.id) {
      const uid = String(user.id);
      return items.filter((item) => {
        if (item.assignedTechnicianId === uid) return true;
        try {
          const sup = item.supporterIds
            ? (typeof item.supporterIds === 'string' ? JSON.parse(item.supporterIds) : item.supporterIds)
            : [];
          if (Array.isArray(sup) && sup.map(String).includes(uid)) return true;
        } catch {}
        return false;
      });
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.fabricationOrder.findUnique({
      where: { id },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
        progressLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, specialty: true },
            },
          },
          orderBy: { loggedAt: 'desc' },
        },
        workSessions: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, specialty: true },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy công việc gia công/chế tạo với mã ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateFabricationDto, user?: any) {
    const existing = await this.findOne(id);

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.specifications !== undefined) updateData.specifications = dto.specifications;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.targetDepartment !== undefined) updateData.targetDepartment = dto.targetDepartment;
    if (dto.equipmentId !== undefined) updateData.equipmentId = dto.equipmentId || null;
    if (dto.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = dto.assignedTechnicianId || null;
    if (dto.supporterIds !== undefined) updateData.supporterIds = dto.supporterIds ? JSON.stringify(dto.supporterIds) : null;
    if (dto.plannedStartDate !== undefined) updateData.plannedStartDate = dto.plannedStartDate ? new Date(dto.plannedStartDate) : null;
    if (dto.plannedEndDate !== undefined) updateData.plannedEndDate = dto.plannedEndDate ? new Date(dto.plannedEndDate) : null;
    if (dto.actualStartDate !== undefined) updateData.actualStartDate = dto.actualStartDate ? new Date(dto.actualStartDate) : null;
    if (dto.actualEndDate !== undefined) updateData.actualEndDate = dto.actualEndDate ? new Date(dto.actualEndDate) : null;
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = dto.estimatedHours;
    if (dto.actualHours !== undefined) updateData.actualHours = dto.actualHours;
    if (dto.drawings !== undefined) updateData.drawings = dto.drawings ? JSON.stringify(dto.drawings) : null;
    if (dto.resultImages !== undefined) updateData.resultImages = dto.resultImages ? JSON.stringify(dto.resultImages) : null;
    if (dto.resultNotes !== undefined) updateData.resultNotes = dto.resultNotes;
    if (dto.acceptanceRating !== undefined) updateData.acceptanceRating = dto.acceptanceRating;

    // Status transition helpers
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'IN_PROGRESS') {
        if (!existing.actualStartDate && !dto.actualStartDate) {
          updateData.actualStartDate = new Date();
        }
        updateData.acceptedAt = null;
        updateData.acceptedById = null;
      }
      if (dto.status === 'COMPLETED') {
        if (!existing.actualEndDate && !dto.actualEndDate) {
          updateData.actualEndDate = new Date();
        }
        if (dto.actualHours === undefined && (!existing.actualHours || existing.actualHours === 0)) {
          const start = updateData.actualStartDate || existing.actualStartDate;
          const end = updateData.actualEndDate || existing.actualEndDate || new Date();
          if (start && end) {
            const diffMs = new Date(end).getTime() - new Date(start).getTime();
            if (diffMs > 0) {
              updateData.actualHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }
          }
        }
      }
      if (dto.status === 'CLOSED') {
        updateData.acceptedAt = new Date();
        updateData.acceptedById = user?.id || null;
        updateData.acceptedByName = dto.acceptedByName || user?.name || 'Quản lý';
      }
    }

    // Material update if specified
    if (dto.materials && Array.isArray(dto.materials)) {
      // Re-create materials
      await this.prisma.fabricationMaterial.deleteMany({ where: { orderId: id } });
      let totalCost = 0;
      const materialsData = dto.materials.map((m) => {
        const lineTotal = (m.quantity || 1) * (m.unitPrice || 0);
        totalCost += lineTotal;
        return {
          orderId: id,
          materialName: m.materialName,
          quantity: m.quantity || 1,
          unit: m.unit,
          unitPrice: m.unitPrice || 0,
          totalPrice: lineTotal,
          inventoryItemId: m.inventoryItemId || null,
        };
      });
      await this.prisma.fabricationMaterial.createMany({ data: materialsData });
      updateData.totalCost = totalCost;
    }

    // Tự động chốt tất cả phiên bấm giờ đang mở khi phiếu tạm dừng / hoàn thành / đóng / hủy
    if (dto.status && ['ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'].includes(dto.status)) {
      const openSessions = await this.prisma.fabricationWorkSession.findMany({
        where: { orderId: id, status: 'ACTIVE' },
      });
      for (const s of openSessions) {
        try {
          await this.stopWorkSession(
            id,
            s.id,
            { autoStopReason: 'AUTO_CLOSED', notes: 'Hệ thống tự động chốt phiên do phiếu đổi trạng thái' },
            { id: s.userId, role: 'ADMIN' },
          );
        } catch (e) {
          console.error('Failed to auto-close fabrication session:', e);
        }
      }
    }

    // actualHours luôn = tổng giờ công của từng người (bấm giờ tự động / nhật ký), không để số nhập tay hay số tính theo đồng hồ treo tường ghi đè
    if (dto.actualHours !== undefined || dto.status !== undefined) {
      const sumAgg = await this.prisma.fabricationProgressLog.aggregate({
        where: { orderId: id },
        _sum: { hoursSpent: true },
      });
      const loggedHours = sumAgg._sum.hoursSpent || 0;
      if (loggedHours > 0) {
        updateData.actualHours = Number(loggedHours.toFixed(2));
      }
    }

    const updated = await this.prisma.fabricationOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });

    let auditAction = 'UPDATE';
    let auditComment = 'Cập nhật tiến độ & thông tin phiếu';
    let auditReason: string | null = null;
    let auditMetadata: any = {};

    // Record audit trail in WorkflowHistory
    try {

      if (dto.assignedTechnicianId && dto.assignedTechnicianId !== existing.assignedTechnicianId) {
        auditAction = 'REASSIGN';
        const newTech = await this.prisma.user.findUnique({
          where: { id: dto.assignedTechnicianId },
          select: { name: true },
        });
        const oldTechName = existing.assignedTechnician?.name || 'Chưa phân công';
        const newTechName = newTech?.name || 'Kỹ thuật viên mới';
        auditComment = `Điều chuyển người phụ trách: ${oldTechName} ➔ ${newTechName}`;
        auditReason = dto.reason || dto.note || null;
      } else if (dto.status !== undefined && dto.status !== existing.status) {
        if (dto.status === 'IN_PROGRESS' && existing.status === 'ASSIGNED') {
          auditAction = 'START_WORK';
          auditComment = 'Bắt đầu làm việc (Bật tính giờ công thực tế)';
        } else if (dto.status === 'ON_HOLD') {
          auditAction = 'PAUSE_WORK';
          auditComment = 'Tạm dừng công việc';
          auditReason = dto.reason || dto.note || 'Tạm dừng theo yêu cầu';
        } else if (dto.status === 'IN_PROGRESS' && existing.status === 'ON_HOLD') {
          auditAction = 'RESUME_WORK';
          auditComment = 'Tiếp tục thực hiện công việc sau khi tạm dừng';
        } else if (dto.status === 'IN_PROGRESS' && dto.acceptanceRating === 'REWORK') {
          auditAction = 'REJECT_REWORK';
          auditComment = 'Nghiệm thu KHÔNG ĐẠT - Yêu cầu kỹ thuật viên sửa chữa lại';
          auditReason = dto.reason || dto.note || 'Không đạt tiêu chuẩn nghiệm thu';
        } else if (dto.status === 'IN_PROGRESS' && existing.status === 'CLOSED') {
          auditAction = 'REOPEN';
          auditComment = 'Mở lại phiếu công việc sau khi đã hoàn tất';
        } else if (dto.status === 'COMPLETED') {
          auditAction = 'COMPLETE_WORK';
          const hrs = updateData.actualHours !== undefined ? updateData.actualHours : (existing.actualHours || 0);
          auditComment = `Báo cáo hoàn thành công việc (Chốt giờ công thực tế: ${hrs} giờ)`;
          auditMetadata.actualHours = hrs;
        } else if (dto.status === 'CLOSED') {
          auditAction = 'ACCEPT_HANDOVER';
          const rating = dto.acceptanceRating || existing.acceptanceRating || 'GOOD';
          const recipient = updateData.acceptedByName || 'Đại diện tiếp nhận';
          auditComment = `Đạt nghiệm thu & Bàn giao sản phẩm cho: ${recipient} (Đánh giá: ${rating})`;
          auditReason = dto.reason || dto.note || dto.resultNotes || null;
          auditMetadata.rating = rating;
          auditMetadata.acceptedByName = recipient;
        }
      } else if (dto.acceptanceRating === 'REWORK' && dto.status === 'IN_PROGRESS') {
        auditAction = 'REJECT_REWORK';
        auditComment = 'Nghiệm thu KHÔNG ĐẠT - Yêu cầu kỹ thuật viên sửa chữa lại';
        auditReason = dto.reason || dto.note || 'Không đạt tiêu chuẩn nghiệm thu';
      } else if (dto.materials && Array.isArray(dto.materials)) {
        auditComment = `Cập nhật danh mục vật tư sử dụng (${dto.materials.length} loại vật tư)`;
      } else if (dto.resultImages && Array.isArray(dto.resultImages)) {
        auditComment = `Cập nhật hình ảnh kết quả (${dto.resultImages.length} ảnh)`;
      }

      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'FabricationOrder',
          entityId: id,
          action: auditAction,
          fromStatus: existing.status,
          toStatus: updated.status,
          actedById: user?.id || null,
          performedById: user?.id || null,
          comment: auditComment,
          reason: auditReason,
          metadata: Object.keys(auditMetadata).length > 0 ? JSON.stringify(auditMetadata) : null,
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit trail on update fabrication order:', auditErr);
    }

    // Emit domain event for update notifications and DK Pharma emails
    this.eventEmitter.emit(
      NotificationEvents.FABRICATION_UPDATED,
      new FabricationUpdatedEvent(updated, existing, dto, auditAction, auditReason, user),
    );

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.fabricationMaterial.deleteMany({ where: { orderId: id } });
    await this.prisma.attachment.deleteMany({
      where: { entityType: 'FabricationOrder', entityId: id },
    });
    try {
      await this.prisma.workflowHistory.deleteMany({
        where: { entityType: 'FabricationOrder', entityId: id },
      });
    } catch (e) {}
    return this.prisma.fabricationOrder.delete({
      where: { id },
    });
  }

  async getHistory(id: string) {
    return this.prisma.workflowHistory.findMany({
      where: {
        entityType: 'FabricationOrder',
        entityId: id,
      },
      include: {
        actedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(user?: any) {
    const role = user?.role ? String(user.role).toUpperCase() : '';
    const roles: string[] = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r).toUpperCase()) : [];
    const isManagerOrAdmin =
      role === 'ADMIN' ||
      role === 'SUPER_ADMIN' ||
      role === 'MANAGER' ||
      roles.some((r) => r.includes('ADMIN') || r.includes('MANAGER') || r.includes('QUẢN LÝ') || r.includes('TRƯỞNG'));

    // Nếu là nhân viên thường, thống kê chỉ tính trên các phiếu mà nhân viên đó được phân công
    if (!isManagerOrAdmin && user?.id) {
      const userOrders = await this.findAll({}, user);
      return {
        total: userOrders.length,
        assigned: userOrders.filter((x) => x.status === 'ASSIGNED').length,
        inProgress: userOrders.filter((x) => x.status === 'IN_PROGRESS').length,
        completed: userOrders.filter((x) => x.status === 'COMPLETED').length,
        closed: userOrders.filter((x) => x.status === 'CLOSED').length,
      };
    }

    const [total, assigned, inProgress, completed, closed] = await Promise.all([
      this.prisma.fabricationOrder.count(),
      this.prisma.fabricationOrder.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'COMPLETED' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'CLOSED' } }),
    ]);

    return {
      total,
      assigned,
      inProgress,
      completed,
      closed,
    };
  }

  async getProgressLogs(orderId: string) {
    return this.prisma.fabricationProgressLog.findMany({
      where: { orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, specialty: true },
        },
      },
      orderBy: { loggedAt: 'desc' },
    });
  }

  async createProgressLog(orderId: string, dto: CreateProgressLogDto, user: any) {
    const order = await this.prisma.fabricationOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy công việc gia công/chế tạo với mã ${orderId}`);
    }

    const isAdminUser = user?.role === 'ADMIN' || (Array.isArray(user?.roles) && user.roles.includes('ADMIN'));
    // Giờ công chỉ do bấm giờ tự động ghi nhận; chỉ Admin mới được nhập tay (hiệu chỉnh)
    const hoursSpent = isAdminUser ? (Number(dto.hoursSpent) || 0) : 0;
    let progressPercent = dto.progressPercent !== undefined && dto.progressPercent !== null ? Number(dto.progressPercent) : null;
    const progressText = dto.progressText ? dto.progressText.trim() : null;

    // Tự động trích xuất số % từ text nếu người dùng chỉ gõ chữ
    if (progressPercent === null && progressText) {
      const match = progressText.match(/(\d{1,3})\s*%/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val >= 0 && val <= 100) progressPercent = val;
      }
    }

    const log = await this.prisma.fabricationProgressLog.create({
      data: {
        orderId,
        userId: user?.id,
        userName: user?.name || 'Kỹ thuật viên',
        userCode: user?.email || null,
        taskContent: dto.taskContent.trim(),
        hoursSpent,
        progressPercent,
        progressText: progressText || (progressPercent !== null ? `${progressPercent}%` : null),
        notes: dto.notes ? dto.notes.trim() : null,
        photos: dto.photos ? (typeof dto.photos === 'string' ? dto.photos : JSON.stringify(dto.photos)) : null,
        loggedAt: dto.workDate ? new Date(dto.workDate) : new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, specialty: true },
        },
      },
    });

    // Tự động cộng dồn giờ công thực tế vào phiếu nếu có khai báo giờ
    if (hoursSpent > 0) {
      await this.prisma.fabricationOrder.update({
        where: { id: orderId },
        data: {
          actualHours: { increment: hoursSpent },
        },
      });
    }

    // Ghi nhận vào WorkflowHistory (Audit trail)
    try {
      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'FabricationOrder',
          entityId: orderId,
          action: 'LOG_PROGRESS',
          fromStatus: order.status,
          toStatus: order.status,
          actedById: user?.id || null,
          performedById: user?.id || null,
          comment: `[Nhật ký tiến độ] ${log.userName}${dto.hoursSpent ? ` (+${dto.hoursSpent}h)` : ''}: ${dto.taskContent}`,
          metadata: JSON.stringify({
            logId: log.id,
            hoursSpent,
            progressPercent,
            loggedAt: log.loggedAt,
          }),
        },
      });
    } catch (e) {
      console.error('Failed to log audit for fabrication progress log:', e);
    }

    return log;
  }

  async deleteProgressLog(orderId: string, logId: string, user: any) {
    const log = await this.prisma.fabricationProgressLog.findUnique({
      where: { id: logId },
    });

    if (!log || log.orderId !== orderId) {
      throw new NotFoundException('Không tìm thấy bản ghi nhật ký tiến độ này');
    }

    const isOwner = log.userId === user?.id;
    const isAdmin = user?.role === 'ADMIN' || (Array.isArray(user?.roles) && user.roles.includes('ADMIN'));

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn chỉ có thể xóa bản ghi do chính bạn tạo ra');
    }

    // Giảm trừ giờ công đã cộng nếu có
    if (log.hoursSpent > 0) {
      const order = await this.prisma.fabricationOrder.findUnique({ where: { id: orderId } });
      if (order) {
        const newActualHours = Math.max(0, (order.actualHours || 0) - log.hoursSpent);
        await this.prisma.fabricationOrder.update({
          where: { id: orderId },
          data: { actualHours: Number(newActualHours.toFixed(2)) },
        });
      }
    }

    return this.prisma.fabricationProgressLog.delete({
      where: { id: logId },
    });
  }

  // ================= WORK SESSIONS (BẤM GIỜ TỰ ĐỘNG) =================

  // Giờ hành chính: 07:30-11:30 và 13:00-17:00, T2-T7 (ngoài khung này không tính giờ công)
  private static readonly WORK_BLOCKS: Array<[number, number]> = [
    [7 * 60 + 30, 11 * 60 + 30],
    [13 * 60, 17 * 60],
  ];

  private workingMinutesBetween(start: Date, end: Date): number {
    if (end <= start) return 0;
    let total = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= end.getTime()) {
      if (cursor.getDay() !== 0) {
        for (const [from, to] of FabricationService.WORK_BLOCKS) {
          const blockStart = new Date(cursor);
          blockStart.setHours(0, from, 0, 0);
          const blockEnd = new Date(cursor);
          blockEnd.setHours(0, to, 0, 0);
          const s = Math.max(blockStart.getTime(), start.getTime());
          const e = Math.min(blockEnd.getTime(), end.getTime());
          if (e > s) total += (e - s) / 60000;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return Math.round(total);
  }

  // Tự động đồng bộ phiên tính giờ ngầm với danh sách người phụ trách khi phiếu đang IN_PROGRESS:
  // mở phiên cho người chưa có, chốt phiên của người không còn phụ trách
  private async syncSessionsWithAssignees(orderId: string) {
    const order = await this.prisma.fabricationOrder.findUnique({ where: { id: orderId } });
    if (!order || order.status !== 'IN_PROGRESS') return;

    const ids = new Set<string>();
    if (order.assignedTechnicianId) ids.add(order.assignedTechnicianId);
    try {
      const sup = order.supporterIds ? JSON.parse(order.supporterIds as any) : [];
      if (Array.isArray(sup)) sup.forEach((x: any) => x && ids.add(String(x)));
    } catch {}

    const active = await this.prisma.fabricationWorkSession.findMany({
      where: { orderId, status: 'ACTIVE' },
    });
    const activeUserIds = new Set(active.map((s) => s.userId));

    // Chốt phiên của người không còn nằm trong danh sách phụ trách
    for (const s of active) {
      if (!ids.has(s.userId)) {
        try {
          await this.stopWorkSession(orderId, s.id, { autoStopReason: 'AUTO_CLOSED' }, { id: s.userId, role: 'ADMIN' });
        } catch (e) {
          console.error('Failed to close session of removed assignee:', e);
        }
      }
    }

    // Mở phiên cho người phụ trách chưa có phiên
    for (const uid of ids) {
      if (activeUserIds.has(uid)) continue;
      const u = await this.prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, name: true, email: true },
      });
      if (!u) continue;
      await this.prisma.fabricationWorkSession.create({
        data: {
          orderId,
          userId: u.id,
          userName: u.name || 'Kỹ thuật viên',
          userEmail: u.email || null,
          startedAt: new Date(),
          status: 'ACTIVE',
        },
      });
    }
  }

  async getActiveSession(orderId: string, user: any) {
    const mySession = user?.id
      ? await this.prisma.fabricationWorkSession.findFirst({
          where: {
            orderId,
            userId: user.id,
            status: 'ACTIVE',
          },
        })
      : null;

    const activeSessions = await this.prisma.fabricationWorkSession.findMany({
      where: {
        orderId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, specialty: true },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    return {
      mySession,
      activeSessions,
    };
  }

  async startWorkSession(orderId: string, dto: StartWorkSessionDto, user: any) {
    if (!user?.id) {
      throw new BadRequestException('Bạn cần đăng nhập để bắt đầu phiên làm việc');
    }

    const order = await this.prisma.fabricationOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy công việc gia công/chế tạo với mã ${orderId}`);
    }

    if (order.status === 'CLOSED' || order.status === 'CANCELLED') {
      throw new BadRequestException(`Không thể bắt đầu phiên làm việc trên phiếu đã ${order.status === 'CLOSED' ? 'đóng' : 'hủy'}`);
    }

    if (order.status === 'COMPLETED') {
      throw new BadRequestException('Phiếu đã báo cáo hoàn thành và đang chờ nghiệm thu. Nếu cần làm thêm, hãy yêu cầu sửa lại phiếu.');
    }

    // Kiểm tra xem người này đã có phiên ACTIVE trên phiếu này chưa
    const existingActive = await this.prisma.fabricationWorkSession.findFirst({
      where: {
        orderId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      return existingActive;
    }

    // Cảnh báo / chuyển phiếu: người dùng đang có phiên chạy ở phiếu khác
    const otherActive = await this.prisma.fabricationWorkSession.findFirst({
      where: { userId: user.id, status: 'ACTIVE', orderId: { not: orderId } },
      include: { order: { select: { id: true, orderCode: true, title: true } } },
    });
    if (otherActive) {
      if (!dto?.autoSwitch) {
        throw new BadRequestException({
          code: 'ACTIVE_SESSION_ELSEWHERE',
          message: `Bạn đang có phiên làm việc ở phiếu ${otherActive.order?.orderCode || ''}. Kết thúc phiên đó để chuyển sang phiếu này?`,
          otherOrderId: otherActive.orderId,
          otherOrderCode: otherActive.order?.orderCode,
        });
      }
      await this.stopWorkSession(
        otherActive.orderId,
        otherActive.id,
        { autoStopReason: 'AUTO_CLOSED', notes: `Tự động kết thúc khi chuyển sang phiếu ${orderId}` },
        user,
      );
    }

    // Nếu phiếu chưa có ngày bắt đầu thực tế, tự động điền ngay thời điểm này
    const orderUpdate: any = {};
    if (!order.actualStartDate) {
      orderUpdate.actualStartDate = new Date();
    }
    if (order.status === 'ASSIGNED' || order.status === 'ON_HOLD') {
      orderUpdate.status = 'IN_PROGRESS';
    }
    if (Object.keys(orderUpdate).length > 0) {
      await this.prisma.fabricationOrder.update({
        where: { id: orderId },
        data: orderUpdate,
      });
    }

    const session = await this.prisma.fabricationWorkSession.create({
      data: {
        orderId,
        userId: user.id,
        userName: user.name || 'Kỹ thuật viên',
        userEmail: user.email || null,
        startedAt: new Date(),
        status: 'ACTIVE',
        notes: dto?.notes ? dto.notes.trim() : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, specialty: true },
        },
      },
    });

    return session;
  }

  async stopWorkSession(orderId: string, sessionId: string, dto: StopWorkSessionDto, user: any, endedAtOverride?: Date) {
    const session = await this.prisma.fabricationWorkSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.orderId !== orderId) {
      throw new NotFoundException('Không tìm thấy phiên làm việc này');
    }

    if (session.status !== 'ACTIVE') {
      return session; // Đã dừng trước đó
    }

    const isOwner = session.userId === user?.id;
    const isAdmin = user?.role === 'ADMIN' || (Array.isArray(user?.roles) && user.roles.includes('ADMIN'));
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn chỉ có thể kết thúc phiên làm việc của chính mình');
    }

    const endedAt = endedAtOverride || new Date();
    // Chỉ tính trong giờ hành chính, tự động, không ai phải nhập
    const durationMinutes = this.workingMinutesBetween(new Date(session.startedAt), endedAt);
    // Quy đổi số giờ chuẩn (làm tròn 2 chữ số thập phân)
    const durationHours = Number((durationMinutes / 60).toFixed(2));

    const updatedSession = await this.prisma.fabricationWorkSession.update({
      where: { id: sessionId },
      data: {
        endedAt,
        durationMinutes,
        durationHours,
        status: dto.autoStopReason || 'COMPLETED',
        notes: dto.notes ? dto.notes.trim() : session.notes,
        taskContent: dto.taskContent ? dto.taskContent.trim() : null,
        photos: dto.photos ? (typeof dto.photos === 'string' ? dto.photos : JSON.stringify(dto.photos)) : null,
      },
    });

    // Không tạo dòng nhật ký nếu phiên không phát sinh giờ hành chính nào VÀ không có nội dung phần việc
    if (durationMinutes <= 0 && !dto.taskContent?.trim()) {
      return updatedSession;
    }

    // Tự động đồng bộ tạo bản ghi vào Nhật ký tiến độ (FabricationProgressLog)
    const fmt = (d: Date) => d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const startStr = fmt(new Date(session.startedAt));
    const endStr = fmt(endedAt);
    const content = dto.taskContent?.trim()
      ? dto.taskContent.trim()
      : `Thời gian thực hiện tự động ghi nhận (${startStr} → ${endStr} • ${durationMinutes} phút giờ hành chính)`;

    let sessionProgressPercent = dto.progressPercent ?? null;
    const sessionProgressText = dto.progressText ? dto.progressText.trim() : null;
    if (sessionProgressPercent === null && sessionProgressText) {
      const match = sessionProgressText.match(/(\d{1,3})\s*%/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val >= 0 && val <= 100) sessionProgressPercent = val;
      }
    }

    await this.prisma.fabricationProgressLog.create({
      data: {
        orderId,
        userId: session.userId,
        userName: session.userName,
        userCode: session.userEmail,
        taskContent: content,
        hoursSpent: durationHours,
        progressPercent: sessionProgressPercent,
        progressText: sessionProgressText || (sessionProgressPercent !== null ? `${sessionProgressPercent}%` : null),
        notes: dto.notes || null,
        photos: dto.photos ? (typeof dto.photos === 'string' ? dto.photos : JSON.stringify(dto.photos)) : null,
        loggedAt: endedAt,
      },
    });

    // Tự động cộng dồn giờ công vào tổng giờ công toàn phiếu (actualHours) nếu có phát sinh
    if (durationHours > 0) {
      await this.prisma.fabricationOrder.update({
        where: { id: orderId },
        data: {
          actualHours: { increment: durationHours },
        },
      });
    }

    return updatedSession;
  }

  async getWorkSessions(orderId: string) {
    const sessions = await this.prisma.fabricationWorkSession.findMany({
      where: { orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, specialty: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Tổng hợp thời gian thực tế của từng người
    const userSummaryMap: Record<string, { userId: string; userName: string; totalMinutes: number; totalHours: number; count: number; active: boolean }> = {};
    let totalMinutesAll = 0;
    let totalHoursAll = 0;

    for (const s of sessions) {
      if (!userSummaryMap[s.userId]) {
        userSummaryMap[s.userId] = {
          userId: s.userId,
          userName: s.userName,
          totalMinutes: 0,
          totalHours: 0,
          count: 0,
          active: false,
        };
      }
      if (s.status === 'ACTIVE') {
        userSummaryMap[s.userId].active = true;
      } else {
        userSummaryMap[s.userId].totalMinutes += s.durationMinutes;
        userSummaryMap[s.userId].totalHours = Number((userSummaryMap[s.userId].totalHours + s.durationHours).toFixed(2));
        userSummaryMap[s.userId].count += 1;

        totalMinutesAll += s.durationMinutes;
        totalHoursAll = Number((totalHoursAll + s.durationHours).toFixed(2));
      }
    }

    return {
      sessions,
      userSummary: Object.values(userSummaryMap),
      totalMinutes: totalMinutesAll,
      totalHours: totalHoursAll,
    };
  }
}
