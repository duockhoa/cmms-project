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
exports.WorkOrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const equipment_status_service_1 = require("../equipment/equipment-status.service");
const work_order_state_machine_1 = require("./work-order-state-machine");
let WorkOrdersService = class WorkOrdersService {
    constructor(prisma, equipmentStatus) {
        this.prisma = prisma;
        this.equipmentStatus = equipmentStatus;
    }
    async findAll(query) {
        const where = {};
        if (query?.status)
            where.status = query.status;
        if (query?.priority)
            where.priority = query.priority;
        if (query?.equipmentId)
            where.equipmentId = query.equipmentId;
        if (query?.search) {
            where.OR = [
                { title: { contains: query.search } },
                { orderCode: { contains: query.search } },
                { technicianName: { contains: query.search } },
            ];
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
    async findOne(id) {
        const wo = await this.prisma.workOrder.findUnique({
            where: { id },
            include: {
                equipment: true,
                request: true,
                items: { include: { inventoryItem: true } },
            },
        });
        if (!wo)
            throw new common_1.NotFoundException('Không tìm thấy phiếu bảo trì');
        return wo;
    }
    async create(data) {
        const equipment = await this.prisma.equipment.findUnique({ where: { id: data.equipmentId } });
        if (!equipment)
            throw new common_1.BadRequestException('Thiết bị không tồn tại');
        if (data.requestId) {
            const request = await this.prisma.maintenanceRequest.findUnique({ where: { id: data.requestId } });
            if (!request)
                throw new common_1.BadRequestException('Yêu cầu sửa chữa không tồn tại');
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
    async updateStatusTransaction(id, expectedVersion, targetStatus, updateData, actionName, comment, reason, extraOperations) {
        return this.prisma.$transaction(async (tx) => {
            const wo = await tx.workOrder.findUnique({
                where: { id },
                include: { items: { include: { inventoryItem: true } } },
            });
            if (!wo)
                throw new common_1.NotFoundException('Không tìm thấy phiếu bảo trì');
            if (wo.version !== expectedVersion) {
                throw new common_1.ConflictException('Bản ghi đã bị sửa đổi bởi người dùng khác. Vui lòng tải lại dữ liệu.');
            }
            work_order_state_machine_1.WorkOrderStateMachine.assertTransition(wo.status, targetStatus);
            if (extraOperations) {
                await extraOperations(tx, wo);
            }
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
                throw new common_1.ConflictException('Xung đột đồng thời. Vui lòng thử lại.');
            }
            await this.equipmentStatus.calculateAndSetStatus(wo.equipmentId, tx);
            await tx.workflowHistory.create({
                data: {
                    entityType: 'WorkOrder',
                    entityId: id,
                    action: actionName,
                    fromStatus: wo.status,
                    toStatus: targetStatus,
                    comment: comment || `Chuyển trạng thái sang ${targetStatus}`,
                    reason: reason || null,
                },
            });
            return tx.workOrder.findUnique({
                where: { id },
                include: { equipment: true, items: { include: { inventoryItem: true } } },
            });
        });
    }
    async assign(id, dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                name: dto.technicianName,
                role: 'TECHNICIAN',
            },
        });
        if (user && !user.isActive) {
            throw new common_1.BadRequestException(`Kỹ thuật viên "${dto.technicianName}" hiện đang ngừng hoạt động.`);
        }
        return this.updateStatusTransaction(id, dto.expectedVersion, 'ASSIGNED', { technicianName: dto.technicianName }, 'ASSIGN', `Phân công cho kỹ thuật viên: ${dto.technicianName}`);
    }
    async start(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'IN_PROGRESS', { actualStartDate: new Date() }, 'START', 'Bắt đầu thực hiện công việc');
    }
    async pause(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'ON_HOLD', {}, 'PAUSE', 'Tạm dừng công việc', dto.reason);
    }
    async resume(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'IN_PROGRESS', {}, 'RESUME', 'Tiếp tục thực hiện công việc');
    }
    async complete(id, dto) {
        const extraOperations = async (tx, wo) => {
            const neededQuantities = {};
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
                    throw new common_1.BadRequestException({
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
        return this.updateStatusTransaction(id, dto.expectedVersion, 'COMPLETED', {
            actualEndDate: new Date(),
            completedAt: new Date(),
            failureCause: dto.failureCause || null,
            solution: dto.solution || null,
        }, 'COMPLETE', 'Hoàn tất công việc sửa chữa', undefined, extraOperations);
    }
    async verify(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'VERIFIED', { verifiedAt: new Date() }, 'VERIFY', dto.comment || 'Nghiệm thu đạt yêu cầu kỹ thuật');
    }
    async reopen(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'IN_PROGRESS', { completedAt: null, actualEndDate: null }, 'REOPEN', dto.reason || 'Nghiệm thu không đạt, yêu cầu xử lý lại');
    }
    async close(id, dto) {
        const result = await this.updateStatusTransaction(id, dto.expectedVersion, 'CLOSED', { closedAt: new Date() }, 'CLOSE', 'Đóng phiếu bảo trì vĩnh viễn');
        if (result && result.scheduleId) {
            await this.prisma.maintenanceSchedule.updateMany({
                where: { id: result.scheduleId },
                data: { lastCompletedAt: new Date(), updatedAt: new Date() },
            }).catch(() => { });
        }
        return result;
    }
    async cancel(id, dto) {
        return this.updateStatusTransaction(id, dto.expectedVersion, 'CANCELLED', {}, 'CANCEL', 'Hủy phiếu bảo trì', dto.reason);
    }
    async updateStatusLegacy(id, body) {
        const wo = await this.findOne(id);
        const expectedVersion = wo.version;
        const targetStatus = body.status;
        switch (targetStatus) {
            case 'ASSIGNED':
                return this.assign(id, { technicianName: body.technicianName || 'Kỹ thuật viên', expectedVersion });
            case 'IN_PROGRESS':
                if (wo.status === 'ON_HOLD') {
                    return this.resume(id, { expectedVersion });
                }
                else if (wo.status === 'COMPLETED') {
                    return this.reopen(id, { expectedVersion, reason: 'Reopened from legacy endpoint' });
                }
                else {
                    return this.start(id, { expectedVersion });
                }
            case 'ON_HOLD':
                return this.pause(id, { reason: body.reason || 'Legacy pause', expectedVersion });
            case 'COMPLETED':
                return this.complete(id, { expectedVersion, failureCause: body.failureCause, solution: body.solution });
            case 'VERIFIED':
            case 'INSPECTION':
                return this.verify(id, { expectedVersion, comment: 'Nghiệm thu từ legacy endpoint' });
            case 'CLOSED':
                return this.close(id, { expectedVersion });
            case 'CANCELLED':
                return this.cancel(id, { reason: body.reason || 'Legacy cancel', expectedVersion });
            default:
                throw new common_1.BadRequestException(`Trạng thái không hợp lệ: ${targetStatus}`);
        }
    }
    async addItem(id, itemDto) {
        return this.prisma.$transaction(async (tx) => {
            const wo = await tx.workOrder.findUnique({ where: { id } });
            if (!wo)
                throw new common_1.NotFoundException('Không tìm thấy phiếu bảo trì');
            if (wo.status === 'CLOSED' || wo.status === 'CANCELLED') {
                throw new common_1.BadRequestException('Phiếu bảo trì đã đóng hoặc hủy, không thể thêm vật tư');
            }
            const invItem = await tx.inventoryItem.findUnique({ where: { id: itemDto.inventoryItemId } });
            if (!invItem)
                throw new common_1.NotFoundException('Vật tư không tồn tại');
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.workOrder.delete({ where: { id } });
    }
};
exports.WorkOrdersService = WorkOrdersService;
exports.WorkOrdersService = WorkOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        equipment_status_service_1.EquipmentStatusService])
], WorkOrdersService);
//# sourceMappingURL=work-orders.service.js.map