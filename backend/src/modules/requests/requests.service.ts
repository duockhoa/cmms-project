import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private equipmentStatus: EquipmentStatusService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query?: { status?: string; priority?: string; search?: string; page?: string; limit?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.priority) where.priority = query.priority;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { requestCode: { contains: query.search } },
        { reporterName: { contains: query.search } },
      ];
    }

    if (query?.page || query?.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.maintenanceRequest.count({ where }),
        this.prisma.maintenanceRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            equipment: true,
            workOrders: true,
          },
        })
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    return this.prisma.maintenanceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: true,
        workOrders: true,
      },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { equipment: true, workOrders: true },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');
    return request;
  }

  async create(data: any) {
    // Business Validation: Equipment must exist
    const equipment = await this.prisma.equipment.findUnique({ where: { id: data.equipmentId } });
    if (!equipment) throw new BadRequestException('Thiết bị không tồn tại');

    const request = await this.prisma.$transaction(async (tx) => {
      const count = await tx.maintenanceRequest.count();
      const requestCode = `REQ-${(count + 1).toString().padStart(4, '0')}`;

      const request = await tx.maintenanceRequest.create({
        data: {
          requestCode,
          equipmentId: data.equipmentId,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          reporterName: data.reporterName || 'Nhân viên vận hành',
          department: data.department || 'Phân xưởng sản xuất',
          images: data.images ? JSON.stringify(data.images) : null,
        },
        include: { equipment: true },
      });

      // Recalculate equipment status
      await this.equipmentStatus.calculateAndSetStatus(data.equipmentId, tx);

      // Resolve location and responsible technician
      const location = await tx.location.findFirst({
        where: { name: equipment.location },
        include: { responsibleTech: true },
      });

      let comment = 'Tạo yêu cầu báo hỏng mới';
      if (location) {
        const managerName = 'Quản đốc ' + location.name;
        const techName = location.responsibleTech ? location.responsibleTech.name : 'Chưa gán kỹ thuật viên';
        comment += `. Đã gửi thông báo tới ${managerName} và Kỹ thuật viên phụ trách: ${techName}`;
        console.log(`[NOTIFICATION] Sự cố ${requestCode} tại ${location.name}: Đã gửi thông báo cho ${managerName} và Kỹ thuật viên phụ trách: ${techName}.`);
      }

      // Log history
      await tx.workflowHistory.create({
        data: {
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: 'PENDING',
          comment,
        },
      });

      return request;
    });

    // Create Database Notifications OUTSIDE transaction to avoid locking/timeouts!
    try {
      const location = await this.prisma.location.findFirst({
        where: { name: equipment.location },
      });
      if (location) {
        // Notify managers of this department
        await this.notifications.createNotification(
          null,
          'MANAGER',
          location.name,
          `Sự cố mới: ${request.requestCode}`,
          `Thiết bị ${equipment.name} gặp sự cố: ${request.title}. Vui lòng đánh giá phương án xử lý.`,
        );

        // Notify responsible technician of this location
        if (location.responsibleTechId) {
          await this.notifications.createNotification(
            location.responsibleTechId,
            null,
            null,
            `Sự cố mới: ${request.requestCode}`,
            `Phân xưởng ${location.name} báo sự cố thiết bị ${equipment.name}: ${request.title}.`,
          );
        }
      }
    } catch (err) {
      console.error('Failed to send request creation notifications:', err);
    }

    return request;
  }

  async approve(id: string, body: { technicianName?: string; note?: string; handlerTeam?: string }, actorId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { 
          workOrders: true,
          equipment: true,
        },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      // Authorization Check
      if (actorId) {
        const actor = await tx.user.findUnique({ where: { id: actorId } });
        if (actor) {
          const location = await tx.location.findFirst({
            where: { name: request.equipment.location },
          });
          const isAuthorized = 
            actor.role === 'ADMIN' || 
            actor.role === 'MANAGER' || 
            (actor.role === 'TECHNICIAN' && location && location.responsibleTechId === actor.id);

          if (!isAuthorized) {
            throw new BadRequestException('Bạn không có quyền phê duyệt yêu cầu sửa chữa cho vị trí/nhà xưởng này.');
          }
        }
      }
      
      // Business Validation: Must be PENDING
      if (request.status !== 'PENDING') {
        throw new ConflictException(`Yêu cầu sửa chữa đã được xử lý (Trạng thái hiện tại: ${request.status})`);
      }

      // Business Validation: Must not already have a WorkOrder
      if (request.workOrders.length > 0) {
        throw new ConflictException('Yêu cầu sửa chữa này đã được liên kết với một Phiếu bảo trì');
      }

      // Determine technician/handler name based on decision
      let assignedTech = body.technicianName || 'Kỹ thuật viên bảo trì';
      let titlePrefix = '[Sửa chữa]';
      if (body.handlerTeam === 'CO_DIEN') {
        assignedTech = 'Bộ phận Cơ điện';
        titlePrefix = '[Cơ điện xử lý]';
      }

      // Create Work Order
      const woCount = await tx.workOrder.count();
      const orderCode = `WO-${(woCount + 1).toString().padStart(4, '0')}`;

      const workOrder = await tx.workOrder.create({
        data: {
          orderCode,
          equipmentId: request.equipmentId,
          requestId: request.id,
          title: `${titlePrefix} ${request.title}`,
          description: request.description,
          priority: request.priority,
          status: 'ASSIGNED',
          technicianName: assignedTech,
          actualStartDate: null,
        },
      });

      // Update Request status
      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      // Recalculate Equipment status
      await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);

      // Log histories
      await tx.workflowHistory.create({
        data: {
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          action: 'APPROVE',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          comment: body.note || (body.handlerTeam === 'CO_DIEN' ? 'Duyệt yêu cầu - Chuyển Bộ phận Cơ điện xử lý' : 'Duyệt yêu cầu - Xưởng tự xử lý'),
          actedById: actorId || null,
        },
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: workOrder.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: 'ASSIGNED',
          comment: `Khởi tạo từ yêu cầu sửa chữa ${request.requestCode}`,
          actedById: actorId || null,
        },
      });

      return { request: updatedRequest, workOrder };
    });

    // Create Database Notifications OUTSIDE transaction to avoid locking/timeouts!
    try {
      const request = await this.prisma.maintenanceRequest.findUnique({
        where: { id },
        include: { equipment: true },
      });
      const orderCode = result.workOrder.orderCode;
      const assignedTech = result.workOrder.technicianName;

      if (body.handlerTeam === 'CO_DIEN') {
        // Transferred to Electromechanical department
        await this.notifications.createNotification(
          null,
          null,
          'Bộ phận Cơ điện',
          `Phiếu bảo trì chuyển Cơ điện: ${orderCode}`,
          `Yêu cầu sửa chữa ${request.requestCode} đã chuyển đến bộ phận Cơ điện.`,
        );
      } else {
        // Assigned to a specific technician in the workshop
        const technician = await this.prisma.user.findFirst({
          where: { name: assignedTech },
        });
        if (technician) {
          await this.notifications.createNotification(
            technician.id,
            null,
            null,
            `Phiếu bảo trì mới được phân công: ${orderCode}`,
            `Bạn được giao xử lý phiếu bảo trì ${orderCode} cho thiết bị ${request.equipment.name}.`,
          );
        }
      }
    } catch (err) {
      console.error('Failed to send approval notifications:', err);
    }

    return result;
  }

  async reject(id: string, body: { reason?: string }, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { equipment: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      // Authorization Check
      if (actorId) {
        const actor = await tx.user.findUnique({ where: { id: actorId } });
        if (actor) {
          const location = await tx.location.findFirst({
            where: { name: request.equipment.location },
          });
          const isAuthorized = 
            actor.role === 'ADMIN' || 
            actor.role === 'MANAGER' || 
            (actor.role === 'TECHNICIAN' && location && location.responsibleTechId === actor.id);

          if (!isAuthorized) {
            throw new BadRequestException('Bạn không có quyền từ chối yêu cầu sửa chữa cho vị trí/nhà xưởng này.');
          }
        }
      }

      if (request.status !== 'PENDING') {
        throw new ConflictException(`Yêu cầu sửa chữa đã được xử lý (Trạng thái hiện tại: ${request.status})`);
      }

      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedReason: body.reason || 'Yêu cầu chưa đủ điều kiện hoặc thông tin trùng lặp',
        },
      });

      // Recalculate Equipment status
      await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);

      // Log history
      await tx.workflowHistory.create({
        data: {
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          action: 'REJECT',
          fromStatus: 'PENDING',
          toStatus: 'REJECTED',
          reason: body.reason,
          comment: 'Từ chối yêu cầu sửa chữa',
          actedById: actorId || null,
        },
      });

      return updatedRequest;
    });
  }

  // ─── HELPER: Validate actedById ───
  private async validateActedBy(tx: any, actedById?: string) {
    if (!actedById || typeof actedById !== 'string' || actedById.trim() === '') {
      throw new BadRequestException('Người thực hiện (actedById) là bắt buộc.');
    }
    const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
    if (!user) {
      throw new BadRequestException(`Người thực hiện (actedById) không tồn tại: ${actedById}`);
    }
    if (!user.isActive) {
      throw new BadRequestException(`Người thực hiện (actedById) đã ngừng hoạt động: ${actedById}`);
    }
  }

  // ─── RETURN REQUEST ───
  async returnRequest(id: string, body: { reason: string; expectedVersion: number }, actorId: string) {
    if (!body.reason || body.reason.trim() === '') {
      throw new BadRequestException('Lý do trả lại (reason) là bắt buộc.');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { 
          workOrders: true,
          equipment: true,
        },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      // Authorization Check
      if (actorId) {
        const actor = await tx.user.findUnique({ where: { id: actorId } });
        if (actor) {
          const location = await tx.location.findFirst({
            where: { name: request.equipment.location },
          });
          const isAuthorized = 
            actor.role === 'ADMIN' || 
            actor.role === 'MANAGER' || 
            (actor.role === 'TECHNICIAN' && location && location.responsibleTechId === actor.id);

          if (!isAuthorized) {
            throw new BadRequestException('Bạn không có quyền trả lại yêu cầu sửa chữa cho vị trí/nhà xưởng này.');
          }
        }
      }

      if (request.status !== 'PENDING') {
        throw new BadRequestException(`Chỉ được trả lại yêu cầu ở trạng thái PENDING. Trạng thái hiện tại: ${request.status}`);
      }

      if (request.version !== body.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
      }

      // WO linkage check by real data
      if (request.workOrders.length > 0) {
        throw new ConflictException('Không thể trả lại yêu cầu đã sinh Work Order.');
      }

      // Validate actorId
      await this.validateActedBy(tx, actorId);

      try {
        const updated = await tx.maintenanceRequest.update({
          where: { id, version: body.expectedVersion },
          data: {
            status: 'RETURNED',
            returnedReason: body.reason.trim(),
            version: { increment: 1 },
          },
          include: { equipment: true, workOrders: true },
        });

        await tx.workflowHistory.create({
          data: {
            entityType: 'MaintenanceRequest',
            entityId: id,
            action: 'RETURN',
            fromStatus: 'PENDING',
            toStatus: 'RETURNED',
            reason: body.reason.trim(),
            comment: 'Trả lại yêu cầu để bổ sung thông tin',
            actedById: actorId || null,
            requestVersionBefore: body.expectedVersion,
            requestVersionAfter: body.expectedVersion + 1,
          },
        });

        return updated;
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  // ─── RESUBMIT REQUEST ───
  private static RESUBMIT_WHITELIST = ['title', 'description', 'priority', 'reporterName', 'department', 'images'];

  async resubmitRequest(id: string, body: { expectedVersion: number; comment?: string; updatedFields?: Record<string, any> }, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { workOrders: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      if (request.status !== 'RETURNED') {
        throw new BadRequestException(`Chỉ được tái gửi yêu cầu ở trạng thái RETURNED. Trạng thái hiện tại: ${request.status}`);
      }

      if (request.version !== body.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
      }

      // WO linkage check by real data
      if (request.workOrders.length > 0) {
        throw new ConflictException('Không thể tái gửi yêu cầu đã sinh Work Order.');
      }

      // Validate actorId
      await this.validateActedBy(tx, actorId);

      // Filter only whitelisted fields
      const updateData: any = {
        status: 'PENDING',
        returnedReason: null, // Clear returned reason
        version: { increment: 1 },
      };

      if (body.updatedFields) {
        for (const [key, value] of Object.entries(body.updatedFields)) {
          if (RequestsService.RESUBMIT_WHITELIST.includes(key)) {
            updateData[key] = value;
          }
        }
      }

      try {
        const updated = await tx.maintenanceRequest.update({
          where: { id, version: body.expectedVersion },
          data: updateData,
          include: { equipment: true, workOrders: true },
        });

        await tx.workflowHistory.create({
          data: {
            entityType: 'MaintenanceRequest',
            entityId: id,
            action: 'RESUBMIT',
            fromStatus: 'RETURNED',
            toStatus: 'PENDING',
            comment: body.comment || 'Tái gửi yêu cầu sau khi bổ sung thông tin',
            actedById: actorId || null,
            requestVersionBefore: body.expectedVersion,
            requestVersionAfter: body.expectedVersion + 1,
          },
        });

        return updated;
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  // ─── CANCEL RETURNED REQUEST ───
  async cancelRequest(id: string, body: { reason: string; expectedVersion: number }, actorId: string) {
    if (!body.reason || body.reason.trim() === '') {
      throw new BadRequestException('Lý do hủy (reason) là bắt buộc.');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { workOrders: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      if (request.status !== 'RETURNED') {
        throw new BadRequestException(`Chỉ được hủy yêu cầu ở trạng thái RETURNED (trong phạm vi Pha 3.5). Trạng thái hiện tại: ${request.status}`);
      }

      if (request.version !== body.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
      }

      // WO linkage check by real data
      if (request.workOrders.length > 0) {
        throw new ConflictException('Không thể hủy yêu cầu đã sinh Work Order.');
      }

      // Validate actorId
      await this.validateActedBy(tx, actorId);

      try {
        const updated = await tx.maintenanceRequest.update({
          where: { id, version: body.expectedVersion },
          data: {
            status: 'CANCELLED',
            cancelledReason: body.reason.trim(),
            cancelledAt: new Date(),
            cancelledById: actorId || null,
            version: { increment: 1 },
          },
          include: { equipment: true, workOrders: true },
        });

        await tx.workflowHistory.create({
          data: {
            entityType: 'MaintenanceRequest',
            entityId: id,
            action: 'CANCEL',
            fromStatus: 'RETURNED',
            toStatus: 'CANCELLED',
            reason: body.reason.trim(),
            comment: 'Hủy yêu cầu sửa chữa',
            actedById: actorId || null,
            requestVersionBefore: body.expectedVersion,
            requestVersionAfter: body.expectedVersion + 1,
          },
        });

        return updated;
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  // ─── WORKFLOW HISTORY ───
  async getHistory(requestId: string) {
    return this.prisma.workflowHistory.findMany({
      where: {
        entityType: 'MaintenanceRequest',
        entityId: requestId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
