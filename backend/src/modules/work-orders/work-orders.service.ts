import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';
import { WorkOrderStateMachine, WorkOrderStatus } from './work-order-state-machine';
import { NotificationsService } from '../notifications/notifications.service';
import { 
  CreateExecutionLogDto, 
  CompleteWorkOrderDto,
  EscalateWorkOrderDto,
  ClassifyWorkOrderDto,
  SubmitHandoverDto,
  RejectHandoverDto,
  AssignWorkOrderDto
} from './dto/work-orders.dto';
import { ExecutionLogActionType, PerformerUnitType, HandlingRoute } from '@prisma/client';

@Injectable()
export class WorkOrdersService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private equipmentStatus: EquipmentStatusService,
    private notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      const workOrders = await this.prisma.workOrder.findMany({
        where: { assignedTechnicianId: null, technicianName: { not: null } },
      });
      for (const wo of workOrders) {
        if (wo.technicianName) {
          const user = await this.prisma.user.findFirst({
            where: { name: wo.technicianName, role: 'TECHNICIAN' },
          });
          if (user) {
            await this.prisma.workOrder.update({
              where: { id: wo.id },
              data: { assignedTechnicianId: user.id },
            });
          }
        }
      }
      console.log(`[STARTUP] Successfully synchronized ${workOrders.length} legacy Work Order technicians.`);
    } catch (e) {
      console.error('[STARTUP] Failed to migrate technician relationships on startup:', e);
    }
  }

  async findAll(query?: { status?: string; priority?: string; search?: string; equipmentId?: string; page?: string; limit?: string; handlerTeam?: string }) {
    const andConditions: any[] = [];

    if (query?.status) andConditions.push({ status: query.status });
    if (query?.priority) andConditions.push({ priority: query.priority });
    if (query?.equipmentId) andConditions.push({ equipmentId: query.equipmentId });
    if (query?.search) {
      andConditions.push({
        OR: [
          { title: { contains: query.search } },
          { orderCode: { contains: query.search } },
          { technicianName: { contains: query.search } },
        ]
      });
    }

    if (query?.handlerTeam) {
      if (query.handlerTeam === 'CO_DIEN') {
        const users = await this.prisma.user.findMany({
          where: { department: { contains: 'Cơ điện' } },
          select: { name: true }
        });
        const names = users.map((u) => u.name);
        andConditions.push({
          OR: [
            { technicianName: { in: names } },
            { technicianName: { contains: 'Cơ điện' } },
            { title: { contains: 'Cơ điện' } }
          ]
        });
      } else if (query.handlerTeam === 'XUONG') {
        const users = await this.prisma.user.findMany({
          where: { 
            OR: [
              { department: null },
              { NOT: { department: { contains: 'Cơ điện' } } }
            ]
          },
          select: { name: true }
        });
        const names = users.map((u) => u.name);
        andConditions.push({
          AND: [
            { OR: [
              { technicianName: null },
              { technicianName: { in: names } },
              { NOT: { technicianName: { contains: 'Cơ điện' } } }
            ]},
            { NOT: { title: { contains: 'Cơ điện' } } }
          ]
        });
      } else {
        const users = await this.prisma.user.findMany({
          where: { department: query.handlerTeam },
          select: { name: true }
        });
        const names = users.map((u) => u.name);
        andConditions.push({
          technicianName: { in: names }
        });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    if (query?.page || query?.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.workOrder.count({ where }),
        this.prisma.workOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            equipment: true,
            request: true,
            items: { include: { inventoryItem: true } },
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

    return this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: true,
        request: true,
        items: { include: { inventoryItem: true } },
      },
    });
  }

  async findOne(id: string, actorContext?: { id: string; role: string }) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        equipment: true,
        request: true,
        items: { include: { inventoryItem: true } },
      },
    });
    if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

    if (actorContext && actorContext.role === 'TECHNICIAN' && wo.assignedTechnicianId !== actorContext.id) {
      throw new ForbiddenException('Bạn không được phân công thực hiện công việc này.');
    }

    return wo;
  }

  async create(data: any) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: data.equipmentId } });
    if (!equipment) throw new BadRequestException('Thiết bị không tồn tại');

    if (data.requestId) {
      const request = await this.prisma.maintenanceRequest.findUnique({ where: { id: data.requestId } });
      if (!request) throw new BadRequestException('Yêu cầu sửa chữa không tồn tại');
    }

    let assignedTechnicianId: string | null = null;
    if (data.technicianName) {
      const user = await this.prisma.user.findFirst({
        where: { name: data.technicianName, role: 'TECHNICIAN' }
      });
      if (user) {
        assignedTechnicianId = user.id;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.workOrder.count();
      const orderCode = `WO-${(count + 1).toString().padStart(4, '0')}`;

      const workOrder = await tx.workOrder.create({
        data: {
          orderCode,
          equipmentId: data.equipmentId,
          requestId: data.requestId || null,
          title: data.title,
          description: data.description,
          priority: data.priority || 'MEDIUM',
          status: 'PENDING',
          technicianName: data.technicianName || null,
          assignedTechnicianId,
          plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
          plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
        },
      });

      await this.equipmentStatus.calculateAndSetStatus(data.equipmentId, tx);

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: workOrder.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: 'PENDING',
          comment: 'Tạo phiếu bảo trì mới',
        },
      });

      return workOrder;
    });
  }

  getPerformerUnitType(user: { role: string; department?: string | null }): PerformerUnitType {
    const dept = (user.department || '').toLowerCase();
    if (dept.includes('xưởng') || dept.includes('workshop') || user.role === 'OPERATOR') {
      return PerformerUnitType.WORKSHOP;
    }
    if (dept.includes('kỹ thuật') || dept.includes('technical') || user.role === 'ADMIN' || user.role === 'MANAGER') {
      return PerformerUnitType.TECHNICAL;
    }
    return PerformerUnitType.MAINTENANCE;
  }

  async findByEquipmentQr(qrToken: string, userId: string, scanMethod: string = 'QR_SCAN') {
    const equipment = await this.prisma.equipment.findFirst({
      where: { code: qrToken }
    });

    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị với mã này.');
    }

    await this.prisma.workflowHistory.create({
      data: {
        entityType: 'Equipment',
        entityId: equipment.id,
        action: scanMethod === 'MANUAL_ENTRY' ? 'MANUAL_ENTRY' : 'QR_SCAN',
        comment: `Quét thiết bị ${equipment.code} (${scanMethod === 'MANUAL_ENTRY' ? 'Nhập tay' : 'Quét QR'})`,
        actedById: userId,
        metadata: JSON.stringify({ scanMethod, timestamp: new Date() }),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const unitType = this.getPerformerUnitType(user);

    const activeWos = await this.prisma.workOrder.findMany({
      where: {
        equipmentId: equipment.id,
        status: { notIn: ['CLOSED', 'CANCELLED'] }
      },
      include: {
        equipment: true,
        request: true,
      }
    });

    const filteredWos = activeWos.filter((wo) => {
      // ADMIN and MANAGER can see all active WOs
      if (user.role === 'ADMIN' || user.role === 'MANAGER') {
        return true;
      }
      if (unitType === PerformerUnitType.TECHNICAL && wo.status === 'PENDING') {
        return true;
      }
      if (unitType === PerformerUnitType.WORKSHOP) {
        return (wo.handlingRoute === HandlingRoute.WORKSHOP_SELF_HANDLE && wo.status !== 'COMPLETED') || wo.assignedTechnicianId === userId;
      }
      if (unitType === PerformerUnitType.MAINTENANCE) {
        return wo.assignedTechnicianId === userId;
      }
      return false;
    });

    return {
      equipment,
      workOrders: filteredWos,
    };
  }

  async getExecutionLogs(workOrderId: string) {
    return this.prisma.workOrderExecutionLog.findMany({
      where: { workOrderId },
      orderBy: { recordedAt: 'asc' },
      include: {
        performedBy: true,
        attachments: {
          where: { isDeleted: false }
        }
      }
    });
  }

  async createExecutionLog(workOrderId: string, dto: CreateExecutionLogDto, userId: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId }
    });
    if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const unitType = this.getPerformerUnitType(user);

    if (wo.handlingRoute === HandlingRoute.WORKSHOP_SELF_HANDLE) {
      if (unitType !== PerformerUnitType.WORKSHOP && user.role !== 'ADMIN' && user.role !== 'MANAGER' && wo.assignedTechnicianId !== userId) {
        throw new ForbiddenException('Bạn không thuộc bộ phận Xưởng để ghi nhận WO này.');
      }
    } else {
      if (wo.assignedTechnicianId !== userId && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        throw new ForbiddenException('Bạn không phải kỹ thuật viên Cơ điện được phân công cho WO này.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let adjustmentReason = null;
      if (dto.adjustedLogId) {
        const oldLog = await tx.workOrderExecutionLog.findUnique({ where: { id: dto.adjustedLogId } });
        if (!oldLog) throw new NotFoundException('Không tìm thấy bản ghi nhật ký cần điều chỉnh');
        adjustmentReason = dto.adjustmentReason || 'Điều chỉnh thông tin';
      }

      const log = await tx.workOrderExecutionLog.create({
        data: {
          workOrderId,
          equipmentId: wo.equipmentId,
          performedById: userId,
          performerUnitType: unitType,
          performerDepartmentId: user.department || 'Bộ phận',
          performerDepartmentCodeSnapshot: user.department || 'SNAPSHOT_CODE',
          performerDepartmentNameSnapshot: user.department || 'SNAPSHOT_NAME',
          handlingRoute: wo.handlingRoute as HandlingRoute,
          actionType: ExecutionLogActionType.LOG,
          content: dto.content,
          result: dto.result || null,
          notes: dto.notes || null,
          adjustedLogId: dto.adjustedLogId || null,
          adjustmentReason,
        }
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: workOrderId,
          action: 'LOG',
          comment: `Ghi nhận thao tác sửa chữa: ${dto.content}`,
          actedById: userId,
        }
      });

      return log;
    });
  }

  private async updateStatusTransaction(
    id: string,
    expectedVersion: number,
    targetStatus: WorkOrderStatus,
    updateData: any,
    actionName: string,
    comment?: string,
    reason?: string,
    extraOperations?: (tx: any, wo: any) => Promise<void>,
    actorContext?: { id: string; role: string },
  ) {
    let resolvedActorUser = null;
    if (actorContext?.id) {
      resolvedActorUser = await this.prisma.user.findUnique({ where: { id: actorContext.id } });
    }

    return this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id },
        include: { items: { include: { inventoryItem: true } } },
      });
      if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

      if (wo.version !== expectedVersion) {
        throw new ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
      }

      WorkOrderStateMachine.assertTransition(wo.status as WorkOrderStatus, targetStatus);

      if (actorContext && actorContext.role !== 'ADMIN' && actorContext.role !== 'MANAGER') {
        const user = resolvedActorUser;
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');
        const unitType = this.getPerformerUnitType(user);

        if (wo.handlingRoute === HandlingRoute.WORKSHOP_SELF_HANDLE) {
          if (unitType !== PerformerUnitType.WORKSHOP && wo.assignedTechnicianId !== actorContext.id) {
            throw new ForbiddenException('Bạn không thuộc Xưởng hoặc không được giao xử lý WO này.');
          }
        } else {
          const isHandoverAction = actionName === 'HANDOVER_ACCEPT' || actionName === 'HANDOVER_REJECT';
          if (wo.assignedTechnicianId !== actorContext.id && 
              actionName !== 'ESCALATE' && 
              actionName !== 'CLASSIFY' && 
              actionName !== 'ASSIGN' &&
              !isHandoverAction) {
            throw new ForbiddenException('Bạn không phải Cơ điện được phân công cho WO này.');
          }
        }
      }

      if (extraOperations) {
        await extraOperations(tx, wo);
      }

      let actorId = actorContext?.id;
      if (!actorId) {
        actorId = wo.assignedTechnicianId;
        if (!actorId) {
          const fallback = await tx.user.findFirst();
          actorId = fallback?.id;
        }
      }

      const { _completionFields, _pauseReason, ...prismaUpdateData } = updateData;

      const result = await tx.workOrder.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...prismaUpdateData,
          status: targetStatus,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Xung đột đồng thời. Vui lòng thử lại.');
      }

      let logActionType: ExecutionLogActionType | null = null;
      let logContent = comment || `Chuyển trạng thái sang ${targetStatus}`;

      if (actionName === 'START') {
        logActionType = ExecutionLogActionType.START;
      } else if (actionName === 'PAUSE') {
        logActionType = ExecutionLogActionType.PAUSE;
        logContent = `Tạm dừng sửa chữa. Lý do: ${_pauseReason || reason}`;
      } else if (actionName === 'RESUME') {
        logActionType = ExecutionLogActionType.RESUME;
      } else if (actionName === 'COMPLETE') {
        logActionType = ExecutionLogActionType.COMPLETE;
        logContent = `Hoàn thành sửa chữa. Công việc: ${_completionFields?.workDone || 'Đã sửa chữa'}`;
      } else if (actionName === 'ESCALATE') {
        logActionType = ExecutionLogActionType.ESCALATE;
        logContent = `Yêu cầu hỗ trợ kỹ thuật. Lý do: ${reason}`;
      } else if (actionName === 'CLASSIFY') {
        logActionType = ExecutionLogActionType.CLASSIFY;
        logContent = `Phân loại sự cố. Nhận xét: ${comment}`;
      } else if (actionName === 'ASSIGN') {
        logActionType = ExecutionLogActionType.ASSIGN;
      } else if (actionName === 'HANDOVER_SUBMIT') {
        logActionType = ExecutionLogActionType.HANDOVER_SUBMIT;
      } else if (actionName === 'HANDOVER_ACCEPT') {
        logActionType = ExecutionLogActionType.HANDOVER_ACCEPT;
      } else if (actionName === 'HANDOVER_REJECT') {
        logActionType = ExecutionLogActionType.HANDOVER_REJECT;
        logContent = `Từ chối nhận bàn giao. Lý do: ${reason}`;
      }

      if (logActionType && actorId) {
        let actorUser = (resolvedActorUser && resolvedActorUser.id === actorId) ? resolvedActorUser : null;
        if (!actorUser) {
          actorUser = await tx.user.findUnique({ where: { id: actorId } });
        }
        const actorUnitType = actorUser ? this.getPerformerUnitType(actorUser) : PerformerUnitType.MAINTENANCE;

        await tx.workOrderExecutionLog.create({
          data: {
            workOrderId: id,
            equipmentId: wo.equipmentId,
            performedById: actorId,
            performerUnitType: actorUnitType,
            performerDepartmentId: actorUser?.department || 'Bộ phận',
            performerDepartmentCodeSnapshot: actorUser?.department || 'SNAPSHOT_CODE',
            performerDepartmentNameSnapshot: actorUser?.department || 'SNAPSHOT_NAME',
            handlingRoute: wo.handlingRoute as HandlingRoute,
            actionType: logActionType,
            content: logContent,
            result: _completionFields?.conclusion || null,
            notes: _completionFields?.recommendations || null,
            pauseReason: _pauseReason || reason || null,
            workDone: _completionFields?.workDone || null,
            equipmentStatusAfter: _completionFields?.equipmentStatusAfter || null,
            testResult: _completionFields?.testResult || null,
            conclusion: _completionFields?.conclusion || null,
            recommendations: _completionFields?.recommendations || null,
          }
        });
      }

      await this.equipmentStatus.calculateAndSetStatus(wo.equipmentId, tx);

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: id,
          action: actionName,
          fromStatus: wo.status,
          toStatus: targetStatus,
          comment: comment || `Chuyển sang ${targetStatus}`,
          reason: reason || null,
          actedById: actorContext?.id || null,
        },
      });

      return tx.workOrder.findUnique({
        where: { id },
        include: { equipment: true, items: { include: { inventoryItem: true } } },
      });
    });
  }

  async assign(id: string, dto: AssignWorkOrderDto, actorContext?: { id: string; role: string }) {
    let targetTechId = dto.assignedTechnicianId;
    let techName = dto.technicianName;

    if (!targetTechId && techName) {
      const u = await this.prisma.user.findFirst({ where: { name: techName } });
      if (u) targetTechId = u.id;
    } else if (targetTechId && !techName) {
      const u = await this.prisma.user.findUnique({ where: { id: targetTechId } });
      if (u) techName = u.name;
    }

    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'ASSIGNED',
      {
        technicianName: techName || 'Kỹ thuật viên',
        assignedTechnicianId: targetTechId || null,
      },
      'ASSIGN',
      `Phân công người thực hiện: ${techName || 'Kỹ thuật viên'}`,
      undefined,
      undefined,
      actorContext,
    );
  }

  async start(id: string, dto: { expectedVersion: number }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'IN_PROGRESS',
      { actualStartDate: new Date() },
      'START',
      'Bắt đầu thực hiện công việc',
      undefined,
      undefined,
      actorContext,
    );
  }

  async pause(id: string, dto: { reason: string; expectedVersion: number }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'ON_HOLD',
      { _pauseReason: dto.reason },
      'PAUSE',
      'Tạm dừng sửa chữa',
      dto.reason,
      undefined,
      actorContext,
    );
  }

  async resume(id: string, dto: { expectedVersion: number }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'IN_PROGRESS',
      {},
      'RESUME',
      'Tiếp tục thực hiện công việc',
      undefined,
      undefined,
      actorContext,
    );
  }

  async complete(id: string, dto: CompleteWorkOrderDto, actorContext?: { id: string; role: string }) {
    const extraOperations = async (tx: any, wo: any) => {
      const neededQuantities: Record<string, { required: number; name: string; itemCode: string; available: number; unitPrice: number }> = {};
      for (const item of wo.items) {
        if (!neededQuantities[item.inventoryItemId]) {
          neededQuantities[item.inventoryItemId] = {
            required: 0,
            name: item.inventoryItem.name,
            itemCode: item.inventoryItem.itemCode,
            available: item.inventoryItem.quantity,
            unitPrice: item.unitPrice,
          };
        }
        neededQuantities[item.inventoryItemId].required += item.quantity;
      }

      for (const itemId of Object.keys(neededQuantities)) {
        const check = neededQuantities[itemId];
        if (check.required > check.available) {
          throw new BadRequestException({
            message: 'INSUFFICIENT_STOCK',
            details: { itemId, itemCode: check.itemCode, required: check.required, available: check.available }
          });
        }
        await tx.inventoryItem.update({
          where: { id: itemId },
          data: { quantity: { decrement: check.required } },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: itemId,
            transactionType: 'ISSUE',
            quantity: check.required,
            unitPrice: check.unitPrice,
            totalAmount: check.required * check.unitPrice,
            quantityBefore: check.available,
            quantityAfter: check.available - check.required,
            actedById: actorContext?.id || null,
            reference: `WorkOrder complete: ${wo.orderCode}`,
          }
        });
      }
    };

    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'COMPLETED',
      {
        completedAt: new Date(),
        actualEndDate: new Date(),
        failureCause: dto.failureCause || null,
        solution: dto.solution || null,
        _completionFields: {
          workDone: dto.workDone,
          equipmentStatusAfter: dto.equipmentStatusAfter,
          testResult: dto.testResult,
          conclusion: dto.conclusion,
          recommendations: dto.recommendation,
        }
      },
      'COMPLETE',
      'Xác nhận hoàn thành sửa chữa',
      undefined,
      extraOperations,
      actorContext,
    );
  }

  async escalate(id: string, dto: EscalateWorkOrderDto, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'PENDING',
      {
        handlingRoute: HandlingRoute.TECHNICAL_MAINTENANCE_SUPPORT,
        assignedTechnicianId: null,
      },
      'ESCALATE',
      `Xưởng không tự xử lý được, chuyển hỗ trợ kỹ thuật. Lý do: ${dto.reason}`,
      dto.reason,
      undefined,
      actorContext,
    );
  }

  async classify(id: string, dto: ClassifyWorkOrderDto, actorContext?: { id: string; role: string }) {
    const actorId = actorContext?.id;
    if (!actorId) throw new BadRequestException('Yêu cầu định danh người thực hiện phân loại');

    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const unitType = this.getPerformerUnitType(user);

    if (unitType !== PerformerUnitType.TECHNICAL && user.role !== 'ADMIN' && user.role !== 'MANAGER' && !user.department?.toLowerCase().includes('xưởng')) {
      throw new ForbiddenException('Bạn không có quyền thực hiện phân loại Work Order này.');
    }

    const wo = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');
    if (wo.status !== 'PENDING' || wo.classificationResult) {
      throw new ConflictException('Work Order đã được phân loại trước đó.');
    }

    const nextStatus = dto.classificationResult === 'WORKSHOP_CONTINUE' ? 'ASSIGNED' : 'PENDING';
    const nextRoute = dto.classificationResult === 'WORKSHOP_CONTINUE' ? HandlingRoute.WORKSHOP_SELF_HANDLE : HandlingRoute.TECHNICAL_MAINTENANCE_SUPPORT;

    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      nextStatus,
      {
        handlingRoute: nextRoute,
        classificationNotes: dto.classificationNotes,
        classificationResult: dto.classificationResult,
        classificationReporterId: actorId,
      },
      'CLASSIFY',
      `Phân loại kết quả: ${dto.classificationResult}. Nhận xét: ${dto.classificationNotes}`,
      undefined,
      undefined,
      actorContext,
    );
  }

  async assignExecutor(id: string, dto: AssignWorkOrderDto, actorContext?: { id: string; role: string }) {
    if (actorContext && actorContext.role !== 'ADMIN' && actorContext.role !== 'MANAGER') {
      const user = await this.prisma.user.findUnique({ where: { id: actorContext.id } });
      if (!user || this.getPerformerUnitType(user) !== PerformerUnitType.TECHNICAL) {
        throw new ForbiddenException('Chỉ phòng kỹ thuật mới có quyền phân công Cơ điện.');
      }
    }

    return this.assign(id, dto, actorContext);
  }

  async submitHandover(id: string, dto: SubmitHandoverDto, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'COMPLETED',
      {
        _completionFields: {
          workDone: dto.workDone,
          equipmentStatusAfter: dto.equipmentStatusAfter,
          testResult: dto.testResult,
          conclusion: dto.conclusion,
          recommendations: dto.recommendation,
        }
      },
      'HANDOVER_SUBMIT',
      'Đã hoàn thành sửa chữa, đề nghị bàn giao nghiệm thu',
      undefined,
      undefined,
      actorContext,
    );
  }

  async acceptHandover(id: string, dto: { expectedVersion: number }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'VERIFIED',
      {},
      'HANDOVER_ACCEPT',
      'Chấp nhận bàn giao nghiệm thu thành công',
      undefined,
      undefined,
      actorContext,
    );
  }

  async rejectHandover(id: string, dto: RejectHandoverDto, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'IN_PROGRESS',
      {},
      'HANDOVER_REJECT',
      `Từ chối nhận bàn giao nghiệm thu. Lý do: ${dto.reason}`,
      dto.reason,
      undefined,
      actorContext,
    );
  }

  async reopen(id: string, dto: { expectedVersion: number; reason?: string }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'IN_PROGRESS',
      { completedAt: null, actualEndDate: null },
      'REOPEN',
      dto.reason || 'Yêu cầu xử lý lại',
      undefined,
      undefined,
      actorContext,
    );
  }

  async verify(id: string, dto: { expectedVersion: number; comment?: string }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'VERIFIED',
      { verifiedAt: new Date() },
      'VERIFY',
      dto.comment || 'Nghiệm thu hoàn tất',
      undefined,
      undefined,
      actorContext,
    );
  }

  async close(id: string, dto: { expectedVersion: number }, actorContext?: { id: string; role: string }) {
    const result = await this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'CLOSED',
      { closedAt: new Date() },
      'CLOSE',
      'Đóng phiếu bảo trì vĩnh viễn',
      undefined,
      undefined,
      actorContext,
    );

    if (result && result.scheduleId) {
      await this.prisma.maintenanceSchedule.updateMany({
        where: { id: result.scheduleId },
        data: { lastCompletedAt: new Date(), updatedAt: new Date() },
      }).catch(() => {});
    }

    return result;
  }

  async cancel(id: string, dto: { reason: string; expectedVersion: number }, actorContext?: { id: string; role: string }) {
    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'CANCELLED',
      {},
      'CANCEL',
      'Hủy phiếu bảo trì',
      dto.reason,
      undefined,
      actorContext,
    );
  }

  async updateStatusLegacy(id: string, body: any, actorContext?: { id: string; role: string }) {
    const wo = await this.findOne(id);
    const expectedVersion = wo.version;
    const targetStatus = body.status as WorkOrderStatus;

    switch (targetStatus) {
      case 'ASSIGNED':
        return this.assign(id, { technicianName: body.technicianName || 'Kỹ thuật viên', expectedVersion }, actorContext);
      case 'IN_PROGRESS':
        if (wo.status === 'ON_HOLD') {
          return this.resume(id, { expectedVersion }, actorContext);
        } else if (wo.status === 'COMPLETED') {
          return this.reopen(id, { expectedVersion, reason: 'Reopened from legacy' }, actorContext);
        } else {
          return this.start(id, { expectedVersion }, actorContext);
        }
      case 'ON_HOLD':
        return this.pause(id, { reason: body.reason || 'Legacy pause', expectedVersion }, actorContext);
      case 'COMPLETED':
        return this.complete(id, {
          expectedVersion,
          failureCause: body.failureCause,
          solution: body.solution,
          workDone: body.workDone,
          equipmentStatusAfter: body.equipmentStatusAfter,
          testResult: body.testResult,
          conclusion: body.conclusion,
          recommendation: body.recommendation,
        }, actorContext);
      case 'VERIFIED':
        return this.verify(id, { expectedVersion, comment: 'Nghiệm thu từ legacy' }, actorContext);
      case 'CLOSED':
        return this.close(id, { expectedVersion }, actorContext);
      case 'CANCELLED':
        return this.cancel(id, { reason: body.reason || 'Legacy cancel', expectedVersion }, actorContext);
      default:
        throw new BadRequestException(`Trạng thái không hợp lệ: ${targetStatus}`);
    }
  }

  async addItem(id: string, itemDto: { inventoryItemId: string; quantity: number }) {
    return this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({ where: { id } });
      if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

      if (wo.status === 'CLOSED' || wo.status === 'CANCELLED') {
        throw new BadRequestException('Phiếu bảo trì đã đóng hoặc hủy, không thể thêm vật tư');
      }

      const invItem = await tx.inventoryItem.findUnique({ where: { id: itemDto.inventoryItemId } });
      if (!invItem) throw new NotFoundException('Vật tư không tồn tại');

      const unitPrice = invItem.unitPrice;
      await tx.workOrderItem.create({
        data: {
          workOrderId: id,
          inventoryItemId: itemDto.inventoryItemId,
          quantity: itemDto.quantity,
          unitPrice,
        },
      });

      const items = await tx.workOrderItem.findMany({ where: { workOrderId: id } });
      const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

      const updatedWo = await tx.workOrder.update({
        where: { id },
        data: { totalCost },
        include: { items: { include: { inventoryItem: true } } },
      });

      return updatedWo;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.workOrder.delete({ where: { id } });
  }
}
