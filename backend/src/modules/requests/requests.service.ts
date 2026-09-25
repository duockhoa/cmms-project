import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';
import { HandlingRoute } from '@prisma/client';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { canManageDepartmentRequest, hasPermission, isGlobalAdmin } from '../../common/utils/rbac.helper';

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
            functionalUnit: { include: { libraryItem: true } },
            reporter: true,
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
        functionalUnit: { include: { libraryItem: true } },
        reporter: true,
        workOrders: true,
      },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { 
        equipment: true, 
        functionalUnit: { include: { libraryItem: true } },
        reporter: true,
        workOrders: true 
      },
    });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

    // Tự động chuyển sang CLOSED nếu WorkOrder đã nghiệm thu/đóng mà request chưa CLOSED
    const hasCompletedWo = request.workOrders.some((w) => ['VERIFIED', 'CLOSED'].includes(w.status));
    if (hasCompletedWo && request.status !== 'CLOSED') {
      try {
        await this.prisma.maintenanceRequest.update({
          where: { id },
          data: { status: 'CLOSED' },
        });
        request.status = 'CLOSED';
      } catch (_) {}
    }

    return request;
  }

  async create(data: any, actorId?: string) {
    let eqIdentifier = (data.equipmentCode || data.equipmentId || '')
      .toString()
      .replace(/^cmms-equipment:/i, '')
      .replace(/^equipment:/i, '')
      .trim();

    if (eqIdentifier.includes('$')) {
      eqIdentifier = eqIdentifier.split('$')[0].trim();
    }

    if (!eqIdentifier) {
      throw new BadRequestException('Vui lòng cung cấp mã hoặc ID thiết bị (equipmentCode hoặc equipmentId)');
    }

    // Business Validation: Equipment can be looked up by id, code, or accountingCode
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [
          { id: eqIdentifier },
          { code: eqIdentifier },
          { accountingCode: eqIdentifier },
          { code: eqIdentifier.toUpperCase() },
          { code: eqIdentifier.toLowerCase() },
        ],
      },
    });
    if (!equipment) {
      throw new BadRequestException(`Không tìm thấy thiết bị với mã hoặc ID [${eqIdentifier}] trên hệ thống.`);
    }

    // Business Validation: Functional Unit must exist and belong to equipment (if provided)
    if (data.functionalUnitId) {
      const fu = await this.prisma.equipmentFunctionalUnit.findUnique({
        where: { id: data.functionalUnitId },
      });
      if (!fu) {
        throw new BadRequestException('Cụm chức năng (functionalUnitId) không tồn tại trên hệ thống.');
      }
      if (fu.equipmentId !== equipment.id) {
        throw new BadRequestException('Cụm chức năng không thuộc thiết bị đã chọn.');
      }
    }

    // Lấy thông tin người báo cáo từ tài khoản đăng nhập (actorId hoặc data.reporterId)
    const effectiveUserId = data.reporterId || actorId;
    let reporterUser: any = null;
    if (effectiveUserId) {
      reporterUser = await this.prisma.user.findUnique({ where: { id: effectiveUserId } });
    }

    const reporterName = reporterUser?.name || data.reporterName || 'Nhân viên vận hành';
    const department = reporterUser?.department || data.department || equipment.department || null;
    const reporterId = reporterUser?.id || null;

    const request = await this.prisma.$transaction(async (tx) => {
      // Safe collision-resistant requestCode generation
      let nextNum = 1;
      const lastReq = await tx.maintenanceRequest.findFirst({
        where: { requestCode: { startsWith: 'REQ-' } },
        orderBy: { createdAt: 'desc' },
        select: { requestCode: true },
      });
      if (lastReq) {
        const match = lastReq.requestCode.match(/REQ-(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      let requestCode = `REQ-${nextNum.toString().padStart(4, '0')}`;
      while (await tx.maintenanceRequest.findUnique({ where: { requestCode } })) {
        nextNum++;
        requestCode = `REQ-${nextNum.toString().padStart(4, '0')}`;
      }

      const request = await tx.maintenanceRequest.create({
        data: {
          requestCode,
          equipmentId: equipment.id,
          functionalUnitId: data.functionalUnitId || null,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          reporterId,
          reporterName,
          department,
          images: data.images ? JSON.stringify(data.images) : null,
        },
        include: { 
          equipment: true,
          functionalUnit: { include: { libraryItem: true } },
          reporter: true,
        },
      });

      // Cập nhật trạng thái cụm chức năng gặp lỗi (nếu có chọn cụm)
      if (data.functionalUnitId) {
        const fuStatus = (data.priority === 'URGENT' || data.priority === 'HIGH') ? 'INCIDENT' : 'WARNING';
        await tx.equipmentFunctionalUnit.update({
          where: { id: data.functionalUnitId },
          data: { status: fuStatus },
        }).catch(() => {});
      }

      // Recalculate equipment status
      await this.equipmentStatus.calculateAndSetStatus(equipment.id, tx);

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

  async approve(id: string, body: ApproveRequestDto, actorId?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atomic check-and-set update status first to prevent concurrency anomaly
      const updateResult = await tx.maintenanceRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: 'APPROVED' },
      });
      if (updateResult.count === 0) {
        throw new ConflictException('Yêu cầu sửa chữa đã được phê duyệt hoặc xử lý bởi người dùng khác.');
      }

      // 2. Fetch details for validation and Work Order generation
      const request = await tx.maintenanceRequest.findUnique({
        where: { id },
        include: { 
          workOrders: true,
          equipment: true,
        },
      });
      if (!request) throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');

      // Dynamic RBAC Authorization Check by Reporter's Department
      if (actorId) {
        const actor = await tx.user.findUnique({ 
          where: { id: actorId },
          include: { customRole: true }
        });
        const authCheck = canManageDepartmentRequest(actor, request.department, 'requests:approve');
        if (!authCheck.allowed) {
          throw new ForbiddenException(authCheck.reason);
        }
      }

      // Determine handling route, target department, and technician assignment
      const isExternalTransfer = 
        body.handlerType === 'EXTERNAL_DEPT' || 
        !!body.targetDepartment;

      let targetStatus = 'PENDING';
      let assignedTechName: string | null = null;
      let assignedTechId: string | null = null;
      let handlingRoute: HandlingRoute = HandlingRoute.WORKSHOP_SELF_HANDLE;
      let titlePrefix = '[Sửa chữa nội bộ]';
      let actionComment = '';

      if (isExternalTransfer) {
        const targetDept = body.targetDepartment || 'Bộ phận kỹ thuật';
        targetStatus = 'PENDING'; // Chờ quản lý bộ phận tiếp nhận phân công
        handlingRoute = HandlingRoute.TECHNICAL_MAINTENANCE_SUPPORT;
        assignedTechName = null;
        assignedTechId = null;
        titlePrefix = `[${targetDept} xử lý]`;
        actionComment = body.note || `Duyệt yêu cầu - Chuyển giao ${targetDept} xử lý (Chờ phân công KTV)`;
      } else {
        // Xưởng tự xử lý nội bộ
        handlingRoute = HandlingRoute.WORKSHOP_SELF_HANDLE;
        titlePrefix = '[Sửa chữa nội bộ]';
        const hasAssignees = (body.assignedTechnicianIds && body.assignedTechnicianIds.length > 0) || body.assignedTechnicianId || body.technicianName;
        if (hasAssignees) {
          targetStatus = 'ASSIGNED';
          const candidateTechId = body.assignedTechnicianIds?.[0] || body.assignedTechnicianId || null;
          if (candidateTechId) {
            const firstTech = await tx.user.findUnique({ where: { id: candidateTechId }, select: { id: true, name: true } });
            if (firstTech) {
              assignedTechId = firstTech.id;
              assignedTechName = body.technicianName || firstTech.name || 'Kỹ thuật viên';
            } else {
              // If candidateTechId does not exist as UUID, do not set foreign key to avoid 500 error
              assignedTechId = null;
              assignedTechName = body.technicianName || 'Kỹ thuật viên';
            }
          } else {
            assignedTechName = body.technicianName || 'Kỹ thuật viên';
          }
          actionComment = body.note || `Duyệt yêu cầu - Xưởng tự xử lý (Đã phân công)`;
        } else {
          targetStatus = 'PENDING';
          assignedTechName = null;
          assignedTechId = null;
          actionComment = body.note || 'Duyệt yêu cầu - Xưởng tự xử lý (Chờ phân công)';
        }
      }

      // Validate watcherId if provided to prevent foreign key constraint failure
      let validatedWatcherId: string | null = null;
      if (body.watcherId) {
        const watcherUser = await tx.user.findUnique({ where: { id: body.watcherId }, select: { id: true } });
        if (watcherUser) {
          validatedWatcherId = watcherUser.id;
        }
      }

      // Safe collision-resistant orderCode generation
      let nextWoNum = 1;
      const lastWo = await tx.workOrder.findFirst({
        where: { orderCode: { startsWith: 'WO-' } },
        orderBy: { createdAt: 'desc' },
        select: { orderCode: true },
      });
      if (lastWo) {
        const match = lastWo.orderCode.match(/WO-(\d+)/);
        if (match) {
          nextWoNum = parseInt(match[1], 10) + 1;
        }
      }
      let orderCode = `WO-${nextWoNum.toString().padStart(4, '0')}`;
      while (await tx.workOrder.findUnique({ where: { orderCode } })) {
        nextWoNum++;
        orderCode = `WO-${nextWoNum.toString().padStart(4, '0')}`;
      }

      const workOrder = await tx.workOrder.create({
        data: {
          orderCode,
          equipmentId: request.equipmentId,
          functionalUnitId: request.functionalUnitId || null,
          requestId: request.id,
          title: `${titlePrefix} ${request.title}`,
          description: request.description,
          priority: request.priority,
          status: targetStatus,
          handlingRoute,
          classificationResult: isExternalTransfer ? 'MAINTENANCE_REQUIRED' : 'WORKSHOP_CONTINUE',
          technicianName: assignedTechName,
          assignedTechnicianId: assignedTechId,
          assignedTechnicianIds: body.assignedTechnicianIds && body.assignedTechnicianIds.length > 0 ? body.assignedTechnicianIds : undefined,
          supporterIds: body.supporterIds && body.supporterIds.length > 0 ? body.supporterIds : undefined,
          watcherId: validatedWatcherId,
          actualStartDate: null,
        },
      });

      request.status = 'APPROVED';
      const updatedRequest = request;

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
          comment: actionComment,
          actedById: actorId || null,
        },
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: workOrder.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: targetStatus,
          comment: `Khởi tạo từ yêu cầu sửa chữa ${request.requestCode}`,
          actedById: actorId || null,
        },
      });

      return { request: updatedRequest, workOrder, isExternalTransfer };
    });

    // Create Database Notifications OUTSIDE transaction to avoid locking/timeouts!
    try {
      const request = await this.prisma.maintenanceRequest.findUnique({
        where: { id },
        include: { equipment: true },
      });
      const orderCode = result.workOrder.orderCode;

      if (result.isExternalTransfer) {
        const targetDept = body.targetDepartment || 'Bộ phận kỹ thuật';
        await this.notifications.createNotification(
          null,
          'MANAGER',
          targetDept,
          `Phiếu bảo trì mới chờ phân công: ${orderCode}`,
          `Yêu cầu sửa chữa ${request.requestCode} (${request.equipment.name}) đã chuyển đến ${targetDept}. Vui lòng phân công kỹ thuật viên thực hiện.`,
        );
      } else if (result.workOrder.assignedTechnicianId || result.workOrder.technicianName) {
        let techId = result.workOrder.assignedTechnicianId;
        if (!techId && result.workOrder.technicianName) {
          const tech = await this.prisma.user.findFirst({ where: { name: result.workOrder.technicianName } });
          if (tech) techId = tech.id;
        }
        if (techId) {
          await this.notifications.createNotification(
            techId,
            null,
            null,
            `Phiếu bảo trì mới được phân công: ${orderCode}`,
            `Bạn được phân công xử lý phiếu bảo trì ${orderCode} cho thiết bị ${request.equipment.name}.`,
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

      // Dynamic RBAC Authorization Check by Reporter's Department
      if (actorId) {
        const actor = await tx.user.findUnique({ 
          where: { id: actorId },
          include: { customRole: true }
        });
        const authCheck = canManageDepartmentRequest(actor, request.department, 'requests:reject');
        if (!authCheck.allowed) {
          throw new ForbiddenException(authCheck.reason);
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

      // Dynamic RBAC Authorization Check by Reporter's Department
      if (actorId) {
        const actor = await tx.user.findUnique({ 
          where: { id: actorId },
          include: { customRole: true }
        });
        const authCheck = canManageDepartmentRequest(actor, request.department, 'requests:reject');
        if (!authCheck.allowed) {
          throw new ForbiddenException(authCheck.reason);
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

        // Recalculate Equipment status
        await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);

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

        // Recalculate Equipment status
        await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);

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

        // Recalculate Equipment status
        await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);

        return updated;
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  // ─── UPDATE REQUEST ───
  async update(id: string, body: any, actorId?: string) {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { workOrders: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa');
    }

    if (existing.status === 'CLOSED') {
      throw new BadRequestException('Yêu cầu báo sự cố này đã được nghiệm thu hoàn tất và đã đóng. Đã khóa toàn bộ, không thể chỉnh sửa.');
    }

    if (existing.workOrders && existing.workOrders.length > 0) {
      throw new BadRequestException('Yêu cầu báo sự cố này đã được chuyển thành Phiếu sửa chữa (Work Order). Đã khóa, không thể chỉnh sửa.');
    }

    // Nếu đổi thiết bị, kiểm tra thiết bị có tồn tại không
    if (body.equipmentId && body.equipmentId !== existing.equipmentId) {
      const eq = await this.prisma.equipment.findUnique({ where: { id: body.equipmentId } });
      if (!eq) throw new BadRequestException('Thiết bị được chọn không tồn tại');
    }

    const dataToUpdate: any = {};
    if (body.title !== undefined) dataToUpdate.title = body.title.trim();
    if (body.description !== undefined) dataToUpdate.description = body.description.trim();
    if (body.priority !== undefined) dataToUpdate.priority = body.priority;
    if (body.equipmentId !== undefined) dataToUpdate.equipmentId = body.equipmentId;
    if (body.functionalUnitId !== undefined) dataToUpdate.functionalUnitId = body.functionalUnitId || null;
    if (body.reporterName !== undefined) dataToUpdate.reporterName = body.reporterName;
    if (body.department !== undefined) dataToUpdate.department = body.department;

    dataToUpdate.version = { increment: 1 };

    const updated = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: dataToUpdate,
      include: {
        equipment: true,
        functionalUnit: { include: { libraryItem: true } },
        reporter: true,
        workOrders: true,
      },
    });

    // Ghi nhận WorkflowHistory
    try {
      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'MaintenanceRequest',
          entityId: id,
          action: 'UPDATE',
          fromStatus: existing.status,
          toStatus: updated.status,
          comment: 'Chỉnh sửa thông tin báo cáo sự cố',
          actedById: actorId || null,
          requestVersionBefore: existing.version,
          requestVersionAfter: updated.version,
        },
      });
    } catch (e) {
      console.warn('Lỗi ghi workflow history khi update request:', e);
    }

    // Recalculate Equipment status
    await this.equipmentStatus.calculateAndSetStatus(updated.equipmentId);
    if (existing.equipmentId !== updated.equipmentId) {
      await this.equipmentStatus.calculateAndSetStatus(existing.equipmentId);
    }

    return updated;
  }

  // ─── DELETE REQUEST ───
  // ─── DELETE REQUEST ───
  async delete(id: string, actorContext?: any) {
    const existing = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { workOrders: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy yêu cầu sửa chữa cần xóa');
    }

    if (!hasPermission(actorContext, 'requests:delete')) {
      throw new ForbiddenException('Bạn không có quyền xóa yêu cầu sự cố này (yêu cầu quyền requests:delete).');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Dọn dẹp an toàn các Work Order con (nếu có)
      for (const wo of existing.workOrders) {
        // Tìm toàn bộ executionLogIds của work order này
        const execLogs = await tx.workOrderExecutionLog.findMany({
          where: { workOrderId: wo.id },
          select: { id: true },
        });
        const execLogIds = execLogs.map((l) => l.id);

        // Tìm toàn bộ checklistExecutionIds của work order này
        const checkExecs = await tx.checklistExecution.findMany({
          where: { workOrderId: wo.id },
          select: { id: true },
        });
        const checkExecIds = checkExecs.map((e) => e.id);
        const checkItems = await tx.checklistExecutionItem.findMany({
          where: { executionId: { in: checkExecIds } },
          select: { id: true },
        });
        const checkItemIds = checkItems.map((i) => i.id);

        // A. Xóa tất cả attachments liên quan đến work order, execution logs, checklist
        await tx.attachment.deleteMany({
          where: {
            OR: [
              { workOrderId: wo.id },
              { executionLogId: { in: execLogIds } },
              { entityType: 'WorkOrder', entityId: wo.id },
              { entityType: 'ChecklistExecution', entityId: { in: checkExecIds } },
              { entityType: 'ChecklistExecutionItem', entityId: { in: checkItemIds } },
            ],
          },
        });

        // B. Bẻ gãy liên kết tự tham chiếu adjustedLogId trong WorkOrderExecutionLog
        await tx.workOrderExecutionLog.updateMany({
          where: { workOrderId: wo.id },
          data: { adjustedLogId: null },
        });

        // C. Xóa các bản ghi nhật ký thực thi WorkOrderExecutionLog
        await tx.workOrderExecutionLog.deleteMany({ where: { workOrderId: wo.id } });

        // D. Xóa các mục kiểm tra checklist và checklist execution
        if (checkExecIds.length > 0) {
          await tx.checklistExecutionItem.deleteMany({ where: { executionId: { in: checkExecIds } } });
          await tx.checklistExecution.deleteMany({ where: { workOrderId: wo.id } });
        }

        // E. Ngắt liên kết giao dịch kho và lịch trình trước khi xóa work order item
        await tx.inventoryTransaction.updateMany({
          where: { workOrderId: wo.id },
          data: { workOrderId: null, workOrderItemId: null },
        });
        await tx.scheduleHistory.updateMany({
          where: { workOrderId: wo.id },
          data: { workOrderId: null },
        });

        // F. Xóa vật tư work order items
        await tx.workOrderItem.deleteMany({ where: { workOrderId: wo.id } });

        // G. Xóa lịch sử luồng duyệt của WorkOrder
        await tx.workflowHistory.deleteMany({
          where: { entityType: 'WorkOrder', entityId: wo.id },
        });

        // H. Xóa chính bản ghi WorkOrder
        await tx.workOrder.delete({ where: { id: wo.id } });
      }

      // 2. Ngắt liên kết bất kỳ work order nào khác đang trỏ tới requestId (nếu có)
      await tx.workOrder.updateMany({
        where: { requestId: id },
        data: { requestId: null },
      });

      // 3. Xóa Attachment liên quan đến Request
      await tx.attachment.deleteMany({
        where: {
          OR: [
            { entityType: 'MaintenanceRequest', entityId: id },
          ],
        },
      });

      // 4. Xóa WorkflowHistory liên quan đến Request
      await tx.workflowHistory.deleteMany({
        where: {
          entityType: 'MaintenanceRequest',
          entityId: id,
        },
      });

      // 5. Xóa chính bản ghi MaintenanceRequest
      await tx.maintenanceRequest.delete({
        where: { id },
      });

      // 6. Recalculate Equipment status
      await this.equipmentStatus.calculateAndSetStatus(existing.equipmentId, tx);

      return { success: true, message: `Đã xóa yêu cầu báo hỏng ${existing.requestCode} thành công.` };
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
