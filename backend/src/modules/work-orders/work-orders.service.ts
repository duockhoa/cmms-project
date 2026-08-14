import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';
import { WorkOrderStateMachine, WorkOrderStatus } from './work-order-state-machine';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRepairLogDto, CompleteWorkOrderDto } from './dto/work-orders.dto';
import { RepairLogActionType } from '@prisma/client';

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
    // Business Validation: Equipment must exist
    const equipment = await this.prisma.equipment.findUnique({ where: { id: data.equipmentId } });
    if (!equipment) throw new BadRequestException('Thiết bị không tồn tại');

    // Business Validation: Request must exist if provided
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

      // Recalculate equipment status
      await this.equipmentStatus.calculateAndSetStatus(data.equipmentId, tx);

      // Log Workflow History
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

  async findByEquipmentQr(qrToken: string, userId: string, scanMethod: string = 'QR_SCAN') {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [
          { code: qrToken },
        ]
      }
    });

    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị với mã này.');
    }

    // Write audit trail for the scan action
    await this.prisma.workflowHistory.create({
      data: {
        entityType: 'Equipment',
        entityId: equipment.id,
        action: scanMethod === 'MANUAL_ENTRY' ? 'MANUAL_ENTRY' : 'QR_SCAN',
        comment: `Kỹ thuật viên quét thiết bị ${equipment.code} (${scanMethod === 'MANUAL_ENTRY' ? 'Nhập tay' : 'Quét QR'})`,
        actedById: userId,
        metadata: JSON.stringify({ scanMethod, timestamp: new Date() }),
      },
    });

    // Allowed active states: ASSIGNED, IN_PROGRESS, ON_HOLD
    const activeStatuses = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'];

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        equipmentId: equipment.id,
        assignedTechnicianId: userId,
        status: { in: activeStatuses }
      },
      include: {
        equipment: true,
        request: true,
      }
    });

    return {
      equipment,
      workOrders,
    };
  }

  async getRepairLogs(workOrderId: string) {
    return this.prisma.workOrderRepairLog.findMany({
      where: { workOrderId },
      orderBy: { recordedAt: 'asc' },
      include: {
        technician: true,
        attachments: {
          where: { isDeleted: false }
        }
      }
    });
  }

  async createRepairLog(workOrderId: string, dto: CreateRepairLogDto, userId: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId }
    });
    if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (user.role === 'TECHNICIAN' && wo.assignedTechnicianId !== userId) {
      throw new ForbiddenException('Bạn không được phân công thực hiện công việc này.');
    }

    return this.prisma.$transaction(async (tx) => {
      let adjustmentReason = null;
      if (dto.adjustedLogId) {
        const oldLog = await tx.workOrderRepairLog.findUnique({ where: { id: dto.adjustedLogId } });
        if (!oldLog) throw new NotFoundException('Không tìm thấy bản ghi nhật ký cần điều chỉnh');
        adjustmentReason = dto.adjustmentReason || 'Điều chỉnh thông tin ghi nhận sửa chữa';
      }

      const log = await tx.workOrderRepairLog.create({
        data: {
          workOrderId,
          equipmentId: wo.equipmentId,
          technicianId: userId,
          actionType: RepairLogActionType.LOG, // strictly LOG from this endpoint
          content: dto.content,
          result: dto.result || null,
          notes: dto.notes || null,
          adjustedLogId: dto.adjustedLogId || null,
          adjustmentReason: adjustmentReason,
        }
      });

      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: workOrderId,
          action: 'LOG',
          comment: `Kỹ thuật viên thêm ghi nhận sửa chữa: ${dto.content}`,
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
    if (targetStatus === 'CLOSED' && actorContext && actorContext.role === 'TECHNICIAN') {
      throw new BadRequestException('Chỉ Quản đốc xưởng hoặc bộ phận kỹ thuật (Cơ điện) mới được đóng hồ sơ sự cố này.');
    }

    return this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id },
        include: { items: { include: { inventoryItem: true } } },
      });
      if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');

      // Optimistic Locking Check
      if (wo.version !== expectedVersion) {
        throw new ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
      }

      // State Machine Check
      WorkOrderStateMachine.assertTransition(wo.status as WorkOrderStatus, targetStatus);

      // Security checking: only assigned technician can perform technician-level actions
      if (actorContext && actorContext.role === 'TECHNICIAN' && wo.assignedTechnicianId !== actorContext.id) {
        throw new ForbiddenException('Bạn không được phân công thực hiện công việc này.');
      }

      // Extra Business Operations (like Stock Deductions)
      if (extraOperations) {
        await extraOperations(tx, wo);
      }

      // Resolve actor ID for logging
      let actorId = actorContext?.id;
      if (!actorId) {
        if (wo.assignedTechnicianId) {
          actorId = wo.assignedTechnicianId;
        } else if (wo.technicianName) {
          const user = await tx.user.findFirst({ where: { name: wo.technicianName } });
          if (user) actorId = user.id;
        }
      }
      if (!actorId) {
        const fallbackUser = await tx.user.findFirst();
        if (fallbackUser) actorId = fallbackUser.id;
      }

      // Extract special properties
      const { _completionFields, _pauseReason, ...prismaUpdateData } = updateData;

      // Perform Update
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

      // Write WorkOrderRepairLog if it is START, PAUSE, RESUME, COMPLETE
      let logActionType: RepairLogActionType | null = null;
      let logContent = comment || `Chuyển trạng thái sang ${targetStatus}`;

      if (actionName === 'START') {
        logActionType = RepairLogActionType.START;
      } else if (actionName === 'PAUSE') {
        logActionType = RepairLogActionType.PAUSE;
        logContent = `Tạm dừng sửa chữa. Lý do: ${_pauseReason || reason}`;
      } else if (actionName === 'RESUME') {
        logActionType = RepairLogActionType.RESUME;
      } else if (actionName === 'COMPLETE') {
        logActionType = RepairLogActionType.COMPLETE;
        logContent = `Hoàn thành sửa chữa, đề nghị bàn giao. Công việc: ${_completionFields?.workDone || 'Sửa chữa thiết bị'}`;
      }

      if (logActionType && actorId) {
        await tx.workOrderRepairLog.create({
          data: {
            workOrderId: id,
            equipmentId: wo.equipmentId,
            technicianId: actorId,
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

      // Recalculate Equipment status
      await this.equipmentStatus.calculateAndSetStatus(wo.equipmentId, tx);

      // Log Workflow History
      await tx.workflowHistory.create({
        data: {
          entityType: 'WorkOrder',
          entityId: id,
          action: actionName,
          fromStatus: wo.status,
          toStatus: targetStatus,
          comment: comment || `Chuyển trạng thái sang ${targetStatus}`,
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

  async assign(id: string, dto: { technicianName: string; expectedVersion: number }, actorContext?: { id: string; role: string }) {
    const user = await this.prisma.user.findFirst({
      where: {
        name: dto.technicianName,
        role: 'TECHNICIAN',
      },
    });
    if (user && !user.isActive) {
      throw new BadRequestException(`Kỹ thuật viên "${dto.technicianName}" hiện đang ngừng hoạt động.`);
    }

    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'ASSIGNED',
      { 
        technicianName: dto.technicianName,
        assignedTechnicianId: user ? user.id : null
      },
      'ASSIGN',
      `Phân công cho kỹ thuật viên: ${dto.technicianName}`,
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
      {
        _pauseReason: dto.reason
      },
      'PAUSE',
      'Tạm dừng công việc',
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
      // 1. Stock Validation
      const neededQuantities: Record<string, { required: number; name: string; itemCode: string; available: number }> = {};
      for (const item of wo.items) {
        if (!neededQuantities[item.inventoryItemId]) {
          neededQuantities[item.inventoryItemId] = {
            required: 0,
            name: item.inventoryItem.name,
            itemCode: item.inventoryItem.itemCode,
            available: item.inventoryItem.quantity,
          };
        }
        neededQuantities[item.inventoryItemId].required += item.quantity;
      }

      for (const itemId of Object.keys(neededQuantities)) {
        const check = neededQuantities[itemId];
        if (check.required > check.available) {
          throw new BadRequestException({
            message: 'INSUFFICIENT_STOCK',
            details: {
              itemId,
              itemCode: check.itemCode,
              required: check.required,
              available: check.available,
            },
          });
        }
      }

      // 2. Perform Stock Deduction
      for (const item of wo.items) {
        const existingTx = await tx.inventoryTransaction.findUnique({
          where: { issueKey: item.id },
        });

        if (!existingTx) {
          const itemBefore = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
          const quantityBefore = itemBefore?.quantity || 0;
          const quantityAfter = quantityBefore - item.quantity;

          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: item.inventoryItemId,
              workOrderId: wo.id,
              workOrderItemId: item.id,
              transactionType: 'ISSUE',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.quantity * item.unitPrice,
              quantityBefore,
              quantityAfter,
              issueKey: item.id,
              reference: `Xuất kho cho phiếu WO ${wo.orderCode}`,
            },
          });
        }
      }
    };

    return this.updateStatusTransaction(
      id,
      dto.expectedVersion,
      'COMPLETED',
      {
        actualEndDate: new Date(),
        completedAt: new Date(),
        failureCause: dto.failureCause || null,
        solution: dto.solution || dto.workDone || null,
        _completionFields: {
          workDone: dto.workDone || dto.solution || null,
          equipmentStatusAfter: dto.equipmentStatusAfter || null,
          testResult: dto.testResult || null,
          conclusion: dto.conclusion || null,
          recommendations: dto.recommendation || null,
        }
      },
      'COMPLETE',
      'Hoàn tất công việc sửa chữa',
      undefined,
      extraOperations,
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
      dto.comment || 'Nghiệm thu đạt yêu cầu kỹ thuật',
      undefined,
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
      dto.reason || 'Nghiệm thu không đạt, yêu cầu xử lý lại',
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
          return this.reopen(id, { expectedVersion, reason: 'Reopened from legacy endpoint' }, actorContext);
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
      case 'INSPECTION' as any: // Map legacy INSPECTION status to VERIFIED
        return this.verify(id, { expectedVersion, comment: 'Nghiệm thu từ legacy endpoint' }, actorContext);
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

      // Business Validation: Closed WOs cannot add materials
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

      // Recalculate total cost
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
