import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustInDto, AdjustOutDto, MaterialReturnDto } from './dto/inventory.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvents } from '../notifications/events/notification-events.constants';
import { InventoryLowStockEvent } from '../notifications/events/inventory.events';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── HELPER: Validate actedById ───
  private async validateActedBy(tx: any, actedById?: string) {
    if (!actedById || typeof actedById !== 'string' || actedById.trim() === '') {
      throw new BadRequestException('Người thực hiện (actedById) là bắt buộc');
    }
    const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
    if (!user) {
      throw new BadRequestException(`Người thực hiện (actedById) không tồn tại: ${actedById}`);
    }
    if (!user.isActive) {
      throw new BadRequestException(`Người thực hiện (actedById) đã ngừng hoạt động: ${actedById}`);
    }
  }

  async findAll(query?: { category?: string; search?: string; page?: string; limit?: string }) {
    const where: any = {};
    if (query?.category) where.category = query.category;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { itemCode: { contains: query.search } },
      ];
    }

    if (query?.page || query?.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.inventoryItem.count({ where }),
        this.prisma.inventoryItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            equipmentSpareParts: {
              include: {
                equipment: {
                  select: { id: true, code: true, name: true },
                },
              },
            },
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

    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        equipmentSpareParts: {
          include: {
            equipment: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        equipmentSpareParts: {
          include: {
            equipment: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy vật tư');
    return item;
  }

  async create(data: any) {
    const { equipmentIds, ...itemData } = data;
    if (!itemData.itemCode || !itemData.itemCode.trim()) {
      const count = await this.prisma.inventoryItem.count();
      itemData.itemCode = `VT-${(count + 1).toString().padStart(4, '0')}`;
    }
    const item = await this.prisma.inventoryItem.create({ data: itemData });

    if (Array.isArray(equipmentIds) && equipmentIds.length > 0) {
      for (const eqId of equipmentIds) {
        if (!eqId) continue;
        await this.prisma.equipmentSparePart.create({
          data: {
            equipmentId: eqId,
            sparePartId: item.id,
            quantityPerEquipment: 1,
          },
        });
      }
    }

    return this.findOne(item.id);
  }

  async update(id: string, data: any) {
    const item = await this.findOne(id);
    const { equipmentIds, ...updateData } = data;

    // Optimistic locking check if expectedVersion is provided
    if (updateData.expectedVersion !== undefined && item.version !== updateData.expectedVersion) {
      throw new ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
    }

    const expectedVersion = updateData.expectedVersion !== undefined ? updateData.expectedVersion : item.version;
    delete updateData.expectedVersion;

    const result = await this.prisma.inventoryItem.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Xung đột đồng thời hoặc bản ghi đã bị thay đổi. Vui lòng thử lại.');
    }

    if (Array.isArray(equipmentIds)) {
      await this.prisma.equipmentSparePart.deleteMany({
        where: { sparePartId: id },
      });
      for (const eqId of equipmentIds) {
        if (!eqId) continue;
        await this.prisma.equipmentSparePart.create({
          data: {
            equipmentId: eqId,
            sparePartId: id,
            quantityPerEquipment: 1,
          },
        });
      }
    }

    return this.findOne(id);
  }

  async adjustStock(id: string, body: { changeQuantity: number; expectedVersion?: number }) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id } });
      if (!item) throw new NotFoundException('Không tìm thấy vật tư');

      if (body.expectedVersion !== undefined && item.version !== body.expectedVersion) {
        throw new ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
      }

      const expectedVersion = body.expectedVersion !== undefined ? body.expectedVersion : item.version;

      const quantityBefore = item.quantity;
      const quantityAfter = quantityBefore + body.changeQuantity;

      if (quantityAfter < 0) {
        throw new BadRequestException('Số lượng tồn kho sau điều chỉnh không thể nhỏ hơn 0');
      }

      const result = await tx.inventoryItem.updateMany({
        where: { id, version: expectedVersion },
        data: {
          quantity: quantityAfter,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi cập nhật tồn kho. Vui lòng thử lại.');
      }

      const transactionType = body.changeQuantity > 0 ? 'ADJUST_IN' : 'ADJUST_OUT';
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: id,
          workOrderId: null,
          workOrderItemId: null,
          transactionType,
          quantity: Math.abs(body.changeQuantity),
          unitPrice: item.unitPrice,
          totalAmount: Math.abs(body.changeQuantity) * item.unitPrice,
          quantityBefore,
          quantityAfter,
          issueKey: null,
          reference: `Điều chỉnh kho trực tiếp (Thay đổi: ${body.changeQuantity})`,
        },
      });

      return tx.inventoryItem.findUnique({ where: { id } });
    });

    if (body.changeQuantity < 0 && updated && updated.quantity <= updated.minQuantity) {
      this.eventEmitter.emit(
        NotificationEvents.INVENTORY_LOW_STOCK,
        new InventoryLowStockEvent(updated),
      );
    }

    return updated;
  }

  // ─── ADJUST IN (PHASE 3.6) ───
  async adjustIn(itemId: string, dto: AdjustInDto, actorId: string) {
    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('Số lượng điều chỉnh tăng phải lớn hơn 0');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do điều chỉnh (reason) là bắt buộc');
    }
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      // Idempotency check
      if (dto.clientTransactionId) {
        const existingTx = await tx.inventoryTransaction.findUnique({
          where: { clientTransactionId: dto.clientTransactionId },
        });
        if (existingTx) {
          return tx.inventoryItem.findUnique({ where: { id: itemId } });
        }
      }

      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Không tìm thấy vật tư');
      if (!item.isActive) throw new BadRequestException('Vật tư đã bị vô hiệu hóa');

      await this.validateActedBy(tx, actorId);

      if (item.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Vật tư đã bị sửa đổi bởi người dùng khác.');
      }

      const quantityBefore = item.quantity;
      const quantityAfter = quantityBefore + dto.quantity;

      const updateResult = await tx.inventoryItem.updateMany({
        where: { id: itemId, version: dto.expectedVersion },
        data: {
          quantity: quantityAfter,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi điều chỉnh tăng tồn kho. Vui lòng thử lại.');
      }

      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: itemId,
          transactionType: 'ADJUST_IN',
          quantity: dto.quantity,
          unitPrice: item.unitPrice,
          totalAmount: dto.quantity * item.unitPrice,
          quantityBefore,
          quantityAfter,
          reason: dto.reason.trim(),
          referenceCode: dto.referenceCode || null,
          reference: dto.referenceCode ? `Điều chỉnh tăng: ${dto.referenceCode}` : 'Điều chỉnh tăng tồn kho',
          actedById: actorId.trim(),
          inventoryVersionBefore: dto.expectedVersion,
          inventoryVersionAfter: dto.expectedVersion + 1,
          clientTransactionId: dto.clientTransactionId || null,
        },
      });

      return tx.inventoryItem.findUnique({ where: { id: itemId } });
    });
  }

  // ─── ADJUST OUT (PHASE 3.6) ───
  async adjustOut(itemId: string, dto: AdjustOutDto, actorId: string) {
    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('Số lượng điều chỉnh giảm phải lớn hơn 0');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do điều chỉnh (reason) là bắt buộc');
    }
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Idempotency check
      if (dto.clientTransactionId) {
        const existingTx = await tx.inventoryTransaction.findUnique({
          where: { clientTransactionId: dto.clientTransactionId },
        });
        if (existingTx) {
          return tx.inventoryItem.findUnique({ where: { id: itemId } });
        }
      }

      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) throw new NotFoundException('Không tìm thấy vật tư');
      if (!item.isActive) throw new BadRequestException('Vật tư đã bị vô hiệu hóa');

      await this.validateActedBy(tx, actorId);

      if (item.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Vật tư đã bị sửa đổi bởi người dùng khác.');
      }

      const quantityBefore = item.quantity;
      const quantityAfter = quantityBefore - dto.quantity;

      if (quantityAfter < 0) {
        throw new BadRequestException(`Số lượng tồn kho không đủ để điều chỉnh giảm (Tồn hiện tại: ${quantityBefore}, Yêu cầu giảm: ${dto.quantity})`);
      }

      const updateResult = await tx.inventoryItem.updateMany({
        where: { id: itemId, version: dto.expectedVersion },
        data: {
          quantity: quantityAfter,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi điều chỉnh giảm tồn kho. Vui lòng thử lại.');
      }

      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: itemId,
          transactionType: 'ADJUST_OUT',
          quantity: dto.quantity,
          unitPrice: item.unitPrice,
          totalAmount: dto.quantity * item.unitPrice,
          quantityBefore,
          quantityAfter,
          reason: dto.reason.trim(),
          referenceCode: dto.referenceCode || null,
          reference: dto.referenceCode ? `Điều chỉnh giảm: ${dto.referenceCode}` : 'Điều chỉnh giảm tồn kho',
          actedById: actorId.trim(),
          inventoryVersionBefore: dto.expectedVersion,
          inventoryVersionAfter: dto.expectedVersion + 1,
          clientTransactionId: dto.clientTransactionId || null,
        },
      });

      return tx.inventoryItem.findUnique({ where: { id: itemId } });
    });

    if (updated && updated.quantity <= updated.minQuantity) {
      this.eventEmitter.emit(
        NotificationEvents.INVENTORY_LOW_STOCK,
        new InventoryLowStockEvent(updated),
      );
    }

    return updated;
  }

  // ─── MATERIAL RETURN FROM WORK ORDER (PHASE 3.6) ───
  async materialReturn(workOrderId: string, dto: MaterialReturnDto, actorId: string) {
    if (!dto.quantity || dto.quantity <= 0) {
      throw new BadRequestException('Số lượng trả vật tư phải lớn hơn 0');
    }
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do trả vật tư (reason) là bắt buộc');
    }
    if (!dto.workOrderItemId) {
      throw new BadRequestException('workOrderItemId là bắt buộc');
    }
    if (dto.expectedInventoryVersion === undefined || dto.expectedInventoryVersion === null) {
      throw new BadRequestException('expectedInventoryVersion là bắt buộc');
    }
    if (dto.expectedWorkOrderVersion === undefined || dto.expectedWorkOrderVersion === null) {
      throw new BadRequestException('expectedWorkOrderVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      // Idempotency check
      if (dto.clientTransactionId) {
        const existingTx = await tx.inventoryTransaction.findUnique({
          where: { clientTransactionId: dto.clientTransactionId },
        });
        if (existingTx) {
          return { transaction: existingTx, returnableQuantityRemaining: 0 };
        }
      }

      // Check WorkOrder
      const wo = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        include: { items: true },
      });
      if (!wo) throw new NotFoundException('Không tìm thấy phiếu bảo trì');
      if (wo.status === 'CANCELLED') {
        throw new BadRequestException('Không thể trả vật tư cho phiếu bảo trì đã bị hủy (CANCELLED)');
      }
      if (wo.status === 'CLOSED') {
        throw new BadRequestException('Không thể trả vật tư cho phiếu bảo trì đã đóng (CLOSED)');
      }

      if (wo.version !== dto.expectedWorkOrderVersion) {
        throw new ConflictException('Xung đột đồng thời phiếu bảo trì. Vui lòng tải lại dữ liệu.');
      }

      // Check InventoryItem
      const item = await tx.inventoryItem.findUnique({ where: { id: dto.inventoryItemId } });
      if (!item) throw new NotFoundException('Không tìm thấy vật tư');
      if (!item.isActive) throw new BadRequestException('Vật tư đã bị vô hiệu hóa');

      if (item.version !== dto.expectedInventoryVersion) {
        throw new ConflictException('Xung đột đồng thời tồn kho vật tư. Vui lòng tải lại dữ liệu.');
      }

      await this.validateActedBy(tx, actorId);

      // Check workOrderItem
      const woItem = wo.items.find((i) => i.id === dto.workOrderItemId);
      if (!woItem) {
        throw new BadRequestException('Dòng vật tư (workOrderItemId) không thuộc phiếu bảo trì này');
      }
      if (woItem.inventoryItemId !== dto.inventoryItemId) {
        throw new BadRequestException('Vật tư không khớp với dòng phiếu bảo trì');
      }

      // Calculate returnable quantity from InventoryTransaction history
      const txs = await tx.inventoryTransaction.findMany({
        where: { workOrderId, workOrderItemId: dto.workOrderItemId },
      });

      const totalIssued = txs
        .filter((t) => t.transactionType === 'ISSUE')
        .reduce((sum, t) => sum + t.quantity, 0);

      const totalReturned = txs
        .filter((t) => t.transactionType === 'RETURN')
        .reduce((sum, t) => sum + t.quantity, 0);

      const returnableQuantity = totalIssued - totalReturned;

      if (totalIssued === 0) {
        throw new BadRequestException('Vật tư chưa từng được xuất (ISSUE) cho phiếu bảo trì này');
      }

      if (returnableQuantity <= 0) {
        throw new BadRequestException('Vật tư đã được trả hết');
      }

      if (dto.quantity > returnableQuantity) {
        throw new BadRequestException(`Số lượng trả (${dto.quantity}) vượt quá số lượng có thể trả (${returnableQuantity})`);
      }

      const quantityBefore = item.quantity;
      const quantityAfter = quantityBefore + dto.quantity;

      // Update InventoryItem
      const invRes = await tx.inventoryItem.updateMany({
        where: { id: dto.inventoryItemId, version: dto.expectedInventoryVersion },
        data: {
          quantity: quantityAfter,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      if (invRes.count === 0) {
        throw new ConflictException('Xung đột đồng thời tồn kho vật tư. Vui lòng thử lại.');
      }

      // Update WorkOrder
      const woRes = await tx.workOrder.updateMany({
        where: { id: workOrderId, version: dto.expectedWorkOrderVersion },
        data: {
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      if (woRes.count === 0) {
        throw new ConflictException('Xung đột đồng thời phiếu bảo trì. Vui lòng thử lại.');
      }

      // Create InventoryTransaction (RETURN)
      const createdTx = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: dto.inventoryItemId,
          workOrderId,
          workOrderItemId: dto.workOrderItemId,
          transactionType: 'RETURN',
          quantity: dto.quantity,
          unitPrice: woItem.unitPrice || item.unitPrice,
          totalAmount: dto.quantity * (woItem.unitPrice || item.unitPrice),
          quantityBefore,
          quantityAfter,
          reason: dto.reason.trim(),
          actedById: actorId.trim(),
          inventoryVersionBefore: dto.expectedInventoryVersion,
          inventoryVersionAfter: dto.expectedInventoryVersion + 1,
          clientTransactionId: dto.clientTransactionId || null,
          reference: `Trả vật tư từ phiếu bảo trì ${wo.orderCode}`,
        },
      });

      return {
        transaction: createdTx,
        returnableQuantityRemaining: returnableQuantity - dto.quantity,
      };
    });
  }

  // ─── TRANSACTION HISTORY ───
  async getItemTransactions(itemId: string, query?: {
    transactionType?: string;
    dateFrom?: string;
    dateTo?: string;
    workOrderId?: string;
    referenceCode?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const item = await this.findOne(itemId);

    const where: any = { inventoryItemId: itemId };

    if (query?.transactionType) {
      where.transactionType = query.transactionType;
    }

    if (query?.workOrderId) {
      where.workOrderId = query.workOrderId;
    }

    if (query?.referenceCode) {
      where.OR = [
        { referenceCode: { contains: query.referenceCode } },
        { reference: { contains: query.referenceCode } },
      ];
    }

    if (query?.dateFrom || query?.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const page = Math.max(1, parseInt(query?.page as any) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit as any) || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.inventoryTransaction.count({ where }),
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: {
          actedBy: true,
          workOrder: true,
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getWorkOrderTransactions(workOrderId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { workOrderId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        inventoryItem: true,
        actedBy: true,
      },
    });
  }

  async remove(id: string) {
    const item = await this.findOne(id);

    // Business Validation: Prevent deletion of items that have history/transactions
    const txCount = await this.prisma.inventoryTransaction.count({
      where: { inventoryItemId: id },
    });
    if (txCount > 0) {
      throw new ConflictException('Không thể xóa vật tư đã phát sinh giao dịch xuất nhập kho. Hãy vô hiệu hóa hoặc ẩn vật tư này.');
    }

    const woItemCount = await this.prisma.workOrderItem.count({
      where: { inventoryItemId: id },
    });
    if (woItemCount > 0) {
      throw new ConflictException('Không thể xóa vật tư đang được gắn với Phiếu bảo trì.');
    }

    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  /**
   * Scan all items and report low stock items
   */
  async checkAllLowStock() {
    const items = await this.prisma.inventoryItem.findMany({
      where: { isActive: true },
    });
    const lowStock = items.filter((it) => it.quantity <= it.minQuantity);
    return {
      totalScanned: items.length,
      lowStockCount: lowStock.length,
      items: lowStock,
    };
  }
}
