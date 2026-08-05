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
var RequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const equipment_status_service_1 = require("../equipment/equipment-status.service");
let RequestsService = RequestsService_1 = class RequestsService {
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
    async findOne(id) {
        const request = await this.prisma.maintenanceRequest.findUnique({
            where: { id },
            include: { equipment: true, workOrders: true },
        });
        if (!request)
            throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
        return request;
    }
    async create(data) {
        const equipment = await this.prisma.equipment.findUnique({ where: { id: data.equipmentId } });
        if (!equipment)
            throw new common_1.BadRequestException('Thiết bị không tồn tại');
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
            await this.equipmentStatus.calculateAndSetStatus(data.equipmentId, tx);
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
    async approve(id, body) {
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.findUnique({
                where: { id },
                include: { workOrders: true },
            });
            if (!request)
                throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
            if (request.status !== 'PENDING') {
                throw new common_1.ConflictException(`Yêu cầu sửa chữa đã được xử lý (Trạng thái hiện tại: ${request.status})`);
            }
            if (request.workOrders.length > 0) {
                throw new common_1.ConflictException('Yêu cầu sửa chữa này đã được liên kết với một Phiếu bảo trì');
            }
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
            const updatedRequest = await tx.maintenanceRequest.update({
                where: { id },
                data: { status: 'APPROVED' },
            });
            await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);
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
    async reject(id, body) {
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.findUnique({ where: { id } });
            if (!request)
                throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
            if (request.status !== 'PENDING') {
                throw new common_1.ConflictException(`Yêu cầu sửa chữa đã được xử lý (Trạng thái hiện tại: ${request.status})`);
            }
            const updatedRequest = await tx.maintenanceRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectedReason: body.reason || 'Yêu cầu chưa đủ điều kiện hoặc thông tin trùng lặp',
                },
            });
            await this.equipmentStatus.calculateAndSetStatus(request.equipmentId, tx);
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
    async validateActedBy(tx, actedById) {
        if (!actedById || typeof actedById !== 'string' || actedById.trim() === '') {
            throw new common_1.BadRequestException('Người thực hiện (actedById) là bắt buộc.');
        }
        const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
        if (!user) {
            throw new common_1.BadRequestException(`Người thực hiện (actedById) không tồn tại: ${actedById}`);
        }
        if (!user.isActive) {
            throw new common_1.BadRequestException(`Người thực hiện (actedById) đã ngừng hoạt động: ${actedById}`);
        }
    }
    async returnRequest(id, body) {
        if (!body.reason || body.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do trả lại (reason) là bắt buộc.');
        }
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.findUnique({
                where: { id },
                include: { workOrders: true },
            });
            if (!request)
                throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
            if (request.status !== 'PENDING') {
                throw new common_1.BadRequestException(`Chỉ được trả lại yêu cầu ở trạng thái PENDING. Trạng thái hiện tại: ${request.status}`);
            }
            if (request.version !== body.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (request.workOrders.length > 0) {
                throw new common_1.ConflictException('Không thể trả lại yêu cầu đã sinh Work Order.');
            }
            await this.validateActedBy(tx, body.actedById);
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
                        actedById: body.actedById || null,
                        requestVersionBefore: body.expectedVersion,
                        requestVersionAfter: body.expectedVersion + 1,
                    },
                });
                return updated;
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
    async resubmitRequest(id, body) {
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.findUnique({
                where: { id },
                include: { workOrders: true },
            });
            if (!request)
                throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
            if (request.status !== 'RETURNED') {
                throw new common_1.BadRequestException(`Chỉ được tái gửi yêu cầu ở trạng thái RETURNED. Trạng thái hiện tại: ${request.status}`);
            }
            if (request.version !== body.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (request.workOrders.length > 0) {
                throw new common_1.ConflictException('Không thể tái gửi yêu cầu đã sinh Work Order.');
            }
            await this.validateActedBy(tx, body.actedById);
            const updateData = {
                status: 'PENDING',
                returnedReason: null,
                version: { increment: 1 },
            };
            if (body.updatedFields) {
                for (const [key, value] of Object.entries(body.updatedFields)) {
                    if (RequestsService_1.RESUBMIT_WHITELIST.includes(key)) {
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
                        actedById: body.actedById || null,
                        requestVersionBefore: body.expectedVersion,
                        requestVersionAfter: body.expectedVersion + 1,
                    },
                });
                return updated;
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
    async cancelRequest(id, body) {
        if (!body.reason || body.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do hủy (reason) là bắt buộc.');
        }
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.maintenanceRequest.findUnique({
                where: { id },
                include: { workOrders: true },
            });
            if (!request)
                throw new common_1.NotFoundException('Không tìm thấy yêu cầu sửa chữa');
            if (request.status !== 'RETURNED') {
                throw new common_1.BadRequestException(`Chỉ được hủy yêu cầu ở trạng thái RETURNED (trong phạm vi Pha 3.5). Trạng thái hiện tại: ${request.status}`);
            }
            if (request.version !== body.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (request.workOrders.length > 0) {
                throw new common_1.ConflictException('Không thể hủy yêu cầu đã sinh Work Order.');
            }
            await this.validateActedBy(tx, body.actedById);
            try {
                const updated = await tx.maintenanceRequest.update({
                    where: { id, version: body.expectedVersion },
                    data: {
                        status: 'CANCELLED',
                        cancelledReason: body.reason.trim(),
                        cancelledAt: new Date(),
                        cancelledById: body.actedById || null,
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
                        actedById: body.actedById || null,
                        requestVersionBefore: body.expectedVersion,
                        requestVersionAfter: body.expectedVersion + 1,
                    },
                });
                return updated;
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Yêu cầu đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
    async getHistory(requestId) {
        return this.prisma.workflowHistory.findMany({
            where: {
                entityType: 'MaintenanceRequest',
                entityId: requestId,
            },
            orderBy: { createdAt: 'asc' },
        });
    }
};
exports.RequestsService = RequestsService;
RequestsService.RESUBMIT_WHITELIST = ['title', 'description', 'priority', 'reporterName', 'department', 'images'];
exports.RequestsService = RequestsService = RequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        equipment_status_service_1.EquipmentStatusService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map