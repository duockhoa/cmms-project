import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private equipmentStatus: EquipmentStatusService,
  ) {}

  async findAll(query?: { status?: string; priority?: string; search?: string }) {
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

    return this.prisma.$transaction(async (tx) => {
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

      // Log history
      await tx.workflowHistory.create({
        data: {
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: 'PENDING',
          comment: 'Tạo yêu cầu báo hỏng mới',
        },
      });

      return request;
    });
  }

  async approve(id: string, body: { technicianName?: string; note?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { workOrders: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');
      
      // Business Validation: Must be PENDING
      if (request.status !== 'PENDING') {
        throw new ConflictException(`Yêu cầu sửa chữa đã được xử lý (Trạng thái hiện tại: ${request.status})`);
      }

      // Business Validation: Must not already have a WorkOrder
      if (request.workOrders.length > 0) {
        throw new ConflictException('Yêu cầu sửa chữa này đã được liên kết với một Phiếu bảo trì');
      }

      // Create Work Order
      const woCount = await tx.workOrder.count();
      const orderCode = `WO-${(woCount + 1).toString().padStart(4, '0')}`;

      const workOrder = await tx.workOrder.create({
        data: {
          orderCode,
          equipmentId: request.equipmentId,
          requestId: request.id,
          title: `[Sửa chữa] ${request.title}`,
          description: request.description,
          priority: request.priority,
          status: 'ASSIGNED',
          technicianName: body.technicianName || 'Kỹ thuật viên bảo trì',
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
          comment: body.note || 'Duyệt yêu cầu sửa chữa',
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
        },
      });

      return { request: updatedRequest, workOrder };
    });
  }

  async reject(id: string, body: { reason?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.maintenanceRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

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
        include: { workOrders: true },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

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
