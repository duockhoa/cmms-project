"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateActedBy(tx, actedById) {
        if (!actedById || typeof actedById !== 'string' || actedById.trim() === '') {
            throw new common_1.BadRequestException('Người thực hiện (actedById) là bắt buộc');
        }
        const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
        if (!user) {
            throw new common_1.BadRequestException(`Người thực hiện (actedById) không tồn tại: ${actedById}`);
        }
        if (!user.isActive) {
            throw new common_1.BadRequestException(`Người thực hiện (actedById) đã ngừng hoạt động: ${actedById}`);
        }
    }
    async findAll(query) {
        const where = {};
        if (query?.category)
            where.category = query.category;
        if (query?.search) {
            where.OR = [
                { name: { contains: query.search } },
                { itemCode: { contains: query.search } },
            ];
        }
        return this.prisma.inventoryItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException('Không tìm thấy vật tư');
        return item;
    }
    async create(data) {
        if (!data.itemCode) {
            const count = await this.prisma.inventoryItem.count();
            data.itemCode = `VT-${(count + 1).toString().padStart(4, '0')}`;
        }
        return this.prisma.inventoryItem.create({ data });
    }
    async update(id, data) {
        const item = await this.findOne(id);
        if (data.expectedVersion !== undefined && item.version !== data.expectedVersion) {
            throw new common_1.ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
        }
        const expectedVersion = data.expectedVersion !== undefined ? data.expectedVersion : item.version;
        delete data.expectedVersion;
        const result = await this.prisma.inventoryItem.updateMany({
            where: { id, version: expectedVersion },
            data: {
                ...data,
                version: { increment: 1 },
                updatedAt: new Date(),
            },
        });
        if (result.count === 0) {
            throw new common_1.ConflictException('Xung đột đồng thời. Vui lòng thử lại.');
        }
        return this.findOne(id);
    }
    async adjustStock(id, body) {
        return this.prisma.$transaction(async (tx) => {
            const item = await tx.inventoryItem.findUnique({ where: { id } });
            if (!item)
                throw new common_1.NotFoundException('Không tìm thấy vật tư');
            if (body.expectedVersion !== undefined && item.version !== body.expectedVersion) {
                throw new common_1.ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
            }
            const expectedVersion = body.expectedVersion !== undefined ? body.expectedVersion : item.version;
            const quantityBefore = item.quantity;
            const quantityAfter = quantityBefore + body.changeQuantity;
            if (quantityAfter < 0) {
                throw new common_1.BadRequestException('Số lượng tồn kho sau điều chỉnh không thể nhỏ hơn 0');
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
                throw new common_1.ConflictException('Xung đột đồng thời khi cập nhật tồn kho. Vui lòng thử lại.');
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
    }
    async adjustIn(itemId, dto) {
        if (!dto.quantity || dto.quantity <= 0) {
            throw new common_1.BadRequestException('Số lượng điều chỉnh tăng phải lớn hơn 0');
        }
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do điều chỉnh (reason) là bắt buộc');
        }
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.clientTransactionId) {
                const existingTx = await tx.inventoryTransaction.findUnique({
                    where: { clientTransactionId: dto.clientTransactionId },
                });
                if (existingTx) {
                    return tx.inventoryItem.findUnique({ where: { id: itemId } });
                }
            }
            const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
            if (!item)
                throw new common_1.NotFoundException('Không tìm thấy vật tư');
            if (!item.isActive)
                throw new common_1.BadRequestException('Vật tư đã bị vô hiệu hóa');
            await this.validateActedBy(tx, dto.actedById);
            if (item.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Vật tư đã bị sửa đổi bởi người dùng khác.');
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
                throw new common_1.ConflictException('Xung đột đồng thời khi điều chỉnh tăng tồn kho. Vui lòng thử lại.');
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
                    actedById: dto.actedById.trim(),
                    inventoryVersionBefore: dto.expectedVersion,
                    inventoryVersionAfter: dto.expectedVersion + 1,
                    clientTransactionId: dto.clientTransactionId || null,
                },
            });
            return tx.inventoryItem.findUnique({ where: { id: itemId } });
        });
    }
    async adjustOut(itemId, dto) {
        if (!dto.quantity || dto.quantity <= 0) {
            throw new common_1.BadRequestException('Số lượng điều chỉnh giảm phải lớn hơn 0');
        }
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do điều chỉnh (reason) là bắt buộc');
        }
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.clientTransactionId) {
                const existingTx = await tx.inventoryTransaction.findUnique({
                    where: { clientTransactionId: dto.clientTransactionId },
                });
                if (existingTx) {
                    return tx.inventoryItem.findUnique({ where: { id: itemId } });
                }
            }
            const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
            if (!item)
                throw new common_1.NotFoundException('Không tìm thấy vật tư');
            if (!item.isActive)
                throw new common_1.BadRequestException('Vật tư đã bị vô hiệu hóa');
            await this.validateActedBy(tx, dto.actedById);
            if (item.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Vật tư đã bị sửa đổi bởi người dùng khác.');
            }
            const quantityBefore = item.quantity;
            const quantityAfter = quantityBefore - dto.quantity;
            if (quantityAfter < 0) {
                throw new common_1.BadRequestException(`Số lượng tồn kho không đủ để điều chỉnh giảm (Tồn hiện tại: ${quantityBefore}, Yêu cầu giảm: ${dto.quantity})`);
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
                throw new common_1.ConflictException('Xung đột đồng thời khi điều chỉnh giảm tồn kho. Vui lòng thử lại.');
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
                    actedById: dto.actedById.trim(),
                    inventoryVersionBefore: dto.expectedVersion,
                    inventoryVersionAfter: dto.expectedVersion + 1,
                    clientTransactionId: dto.clientTransactionId || null,
                },
            });
            return tx.inventoryItem.findUnique({ where: { id: itemId } });
        });
    }
    async materialReturn(workOrderId, dto) {
        if (!dto.quantity || dto.quantity <= 0) {
            throw new common_1.BadRequestException('Số lượng trả vật tư phải lớn hơn 0');
        }
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do trả vật tư (reason) là bắt buộc');
        }
        if (!dto.workOrderItemId) {
            throw new common_1.BadRequestException('workOrderItemId là bắt buộc');
        }
        if (dto.expectedInventoryVersion === undefined || dto.expectedInventoryVersion === null) {
            throw new common_1.BadRequestException('expectedInventoryVersion là bắt buộc');
        }
        if (dto.expectedWorkOrderVersion === undefined || dto.expectedWorkOrderVersion === null) {
            throw new common_1.BadRequestException('expectedWorkOrderVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.clientTransactionId) {
                const existingTx = await tx.inventoryTransaction.findUnique({
                    where: { clientTransactionId: dto.clientTransactionId },
                });
                if (existingTx) {
                    return { transaction: existingTx, returnableQuantityRemaining: 0 };
                }
            }
            const wo = await tx.workOrder.findUnique({
                where: { id: workOrderId },
                include: { items: true },
            });
            if (!wo)
                throw new common_1.NotFoundException('Không tìm thấy phiếu bảo trì');
            if (wo.status === 'CANCELLED') {
                throw new common_1.BadRequestException('Không thể trả vật tư cho phiếu bảo trì đã bị hủy (CANCELLED)');
            }
            if (wo.status === 'CLOSED') {
                throw new common_1.BadRequestException('Không thể trả vật tư cho phiếu bảo trì đã đóng (CLOSED)');
            }
            if (wo.version !== dto.expectedWorkOrderVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời phiếu bảo trì. Vui lòng tải lại dữ liệu.');
            }
            const item = await tx.inventoryItem.findUnique({ where: { id: dto.inventoryItemId } });
            if (!item)
                throw new common_1.NotFoundException('Không tìm thấy vật tư');
            if (!item.isActive)
                throw new common_1.BadRequestException('Vật tư đã bị vô hiệu hóa');
            if (item.version !== dto.expectedInventoryVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời tồn kho vật tư. Vui lòng tải lại dữ liệu.');
            }
            await this.validateActedBy(tx, dto.actedById);
            const woItem = wo.items.find((i) => i.id === dto.workOrderItemId);
            if (!woItem) {
                throw new common_1.BadRequestException('Dòng vật tư (workOrderItemId) không thuộc phiếu bảo trì này');
            }
            if (woItem.inventoryItemId !== dto.inventoryItemId) {
                throw new common_1.BadRequestException('Vật tư không khớp với dòng phiếu bảo trì');
            }
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
                throw new common_1.BadRequestException('Vật tư chưa từng được xuất (ISSUE) cho phiếu bảo trì này');
            }
            if (returnableQuantity <= 0) {
                throw new common_1.BadRequestException('Vật tư đã được trả hết');
            }
            if (dto.quantity > returnableQuantity) {
                throw new common_1.BadRequestException(`Số lượng trả (${dto.quantity}) vượt quá số lượng có thể trả (${returnableQuantity})`);
            }
            const quantityBefore = item.quantity;
            const quantityAfter = quantityBefore + dto.quantity;
            const invRes = await tx.inventoryItem.updateMany({
                where: { id: dto.inventoryItemId, version: dto.expectedInventoryVersion },
                data: {
                    quantity: quantityAfter,
                    version: { increment: 1 },
                    updatedAt: new Date(),
                },
            });
            if (invRes.count === 0) {
                throw new common_1.ConflictException('Xung đột đồng thời tồn kho vật tư. Vui lòng thử lại.');
            }
            const woRes = await tx.workOrder.updateMany({
                where: { id: workOrderId, version: dto.expectedWorkOrderVersion },
                data: {
                    version: { increment: 1 },
                    updatedAt: new Date(),
                },
            });
            if (woRes.count === 0) {
                throw new common_1.ConflictException('Xung đột đồng thời phiếu bảo trì. Vui lòng thử lại.');
            }
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
                    actedById: dto.actedById.trim(),
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
    async getItemTransactions(itemId, query) {
        const item = await this.findOne(itemId);
        const where = { inventoryItemId: itemId };
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
            if (query.dateFrom)
                where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.createdAt.lte = new Date(query.dateTo);
        }
        const page = Math.max(1, parseInt(query?.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 10));
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
    async getWorkOrderTransactions(workOrderId) {
        return this.prisma.inventoryTransaction.findMany({
            where: { workOrderId },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: {
                inventoryItem: true,
                actedBy: true,
            },
        });
    }
    async remove(id) {
        const item = await this.findOne(id);
        const txCount = await this.prisma.inventoryTransaction.count({
            where: { inventoryItemId: id },
        });
        if (txCount > 0) {
            throw new common_1.ConflictException('Không thể xóa vật tư đã phát sinh giao dịch xuất nhập kho. Hãy vô hiệu hóa hoặc ẩn vật tư này.');
        }
        const woItemCount = await this.prisma.workOrderItem.count({
            where: { inventoryItemId: id },
        });
        if (woItemCount > 0) {
            throw new common_1.ConflictException('Không thể xóa vật tư đang được gắn với Phiếu bảo trì.');
        }
        return this.prisma.inventoryItem.delete({ where: { id } });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map