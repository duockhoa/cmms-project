import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipmentStatusService } from '../equipment/equipment-status.service';
import { WorkOrderStateMachine, WorkOrderStatus } from './work-order-state-machine';

@Injectable()
export class WorkOrdersService {
  constructor(
    private prisma: PrismaService,
    private equipmentStatus: EquipmentStatusService,
  ) {}

  async findAll(query?: { status?: string; priority?: string; search?: string; equipmentId?: string; page?: string; limit?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.priority) where.priority = query.priority;
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { orderCode: { contains: query.search } },
        { technicianName: { contains: query.search } },
      ];
    }

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

  async findOne(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        equipment: true,
        request: true,
        items: { include: { inventoryItem: true } },
      },
    });
    if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');
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

      // Extra Business Operations (like Stock Deductions)
      if (extraOperations) {
        await extraOperations(tx, wo);
      }

      // Perform Update
      const result = await tx.workOrder.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...updateData,
          status: targetStatus,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Xung đột đồng thời. Vui lòng thử lại.');
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
      { technicianName: dto.technicianName },
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
      {},
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

  async complete(id: string, dto: { expectedVersion: number; failureCause?: string; solution?: string }, actorContext?: { id: string; role: string }) {
    const extraOperations = async (tx: any, wo: any) => {
      // 1. Stock Validation
      // Sum up quantities for unique inventory items needed
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

      // Check if stock is sufficient
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

      // 2. Perform Stock Deduction & Create Inventory Transactions
      for (const item of wo.items) {
        // Double issue prevention: check if an ISSUE transaction already exists for this WorkOrderItem.id
        const existingTx = await tx.inventoryTransaction.findUnique({
          where: { issueKey: item.id },
        });

        if (!existingTx) {
          // Decrement Inventory
          const itemBefore = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
          const quantityBefore = itemBefore?.quantity || 0;
          const quantityAfter = quantityBefore - item.quantity;

          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { quantity: { decrement: item.quantity } },
          });

          // Log transaction
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
              issueKey: item.id, // Enforced by database unique constraint
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
        solution: dto.solution || null,
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
        return this.complete(id, { expectedVersion, failureCause: body.failureCause, solution: body.solution }, actorContext);
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
