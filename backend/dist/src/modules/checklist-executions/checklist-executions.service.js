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
exports.ChecklistExecutionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ChecklistExecutionsService = class ChecklistExecutionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createExecution(workOrderId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const wo = await tx.workOrder.findUnique({
                where: { id: workOrderId },
            });
            if (!wo) {
                throw new common_1.NotFoundException(`Không tìm thấy Work Order với ID: ${workOrderId}`);
            }
            if (wo.status === 'CANCELLED' || wo.status === 'CLOSED') {
                throw new common_1.BadRequestException(`Không thể tạo checklist cho Work Order ở trạng thái ${wo.status}.`);
            }
            if (dto.executedById) {
                const user = await tx.user.findUnique({
                    where: { id: dto.executedById },
                });
                if (!user) {
                    throw new common_1.BadRequestException('Kỹ thuật viên thực hiện không tồn tại.');
                }
                if (!user.isActive) {
                    throw new common_1.BadRequestException('Kỹ thuật viên thực hiện đã ngừng hoạt động.');
                }
            }
            let checklistItems = [];
            if (dto.checklistItems && dto.checklistItems.length > 0) {
                checklistItems = dto.checklistItems;
            }
            else if (wo.scheduleId) {
                const schedule = await tx.maintenanceSchedule.findUnique({
                    where: { id: wo.scheduleId },
                });
                if (!schedule) {
                    throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì liên kết của Work Order này.');
                }
                try {
                    checklistItems = JSON.parse(schedule.checklistJson);
                }
                catch (e) {
                    throw new common_1.BadRequestException('Mẫu checklist của lịch bảo trì không đúng định dạng JSON.');
                }
            }
            else {
                throw new common_1.BadRequestException('Vui lòng cung cấp danh sách checklist hoặc tạo từ lịch bảo trì định kỳ.');
            }
            const execution = await tx.checklistExecution.create({
                data: {
                    workOrderId,
                    executedById: dto.executedById || null,
                    templateVersion: dto.templateVersion || 1,
                    status: client_1.ChecklistExecutionStatus.DRAFT,
                    result: null,
                },
            });
            const itemsData = checklistItems.map((itemText, idx) => ({
                executionId: execution.id,
                itemIndex: idx,
                itemText,
                status: client_1.ChecklistItemStatus.NOT_CHECKED,
            }));
            await tx.checklistExecutionItem.createMany({
                data: itemsData,
            });
            return tx.checklistExecution.findUnique({
                where: { id: execution.id },
                include: { items: true, executedBy: true },
            });
        });
    }
    async getExecutionsForWorkOrder(workOrderId) {
        return this.prisma.checklistExecution.findMany({
            where: { workOrderId },
            include: { items: true, executedBy: true },
            orderBy: { startedAt: 'desc' },
        });
    }
    async getExecutionById(executionId) {
        const execution = await this.prisma.checklistExecution.findUnique({
            where: { id: executionId },
            include: { items: true, executedBy: true },
        });
        if (!execution) {
            throw new common_1.NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
        }
        return execution;
    }
    async updateItem(executionId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const execution = await tx.checklistExecution.findUnique({
                where: { id: executionId },
            });
            if (!execution) {
                throw new common_1.NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
            }
            if (execution.status !== client_1.ChecklistExecutionStatus.DRAFT) {
                throw new common_1.BadRequestException('Chỉ được phép cập nhật đầu mục khi Checklist ở trạng thái nháp (DRAFT).');
            }
            if (execution.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (dto.status === client_1.ChecklistItemStatus.FAILED && (!dto.comment || dto.comment.trim() === '')) {
                throw new common_1.BadRequestException('FAILED items must have an explanatory comment');
            }
            const item = await tx.checklistExecutionItem.findFirst({
                where: { executionId, itemIndex: dto.itemIndex },
            });
            if (!item) {
                throw new common_1.NotFoundException(`Không tìm thấy đầu mục checklist với chỉ số Index: ${dto.itemIndex}`);
            }
            await tx.checklistExecutionItem.update({
                where: { id: item.id },
                data: {
                    status: dto.status,
                    comment: dto.comment || null,
                },
            });
            try {
                return await tx.checklistExecution.update({
                    where: { id: executionId, version: dto.expectedVersion },
                    data: {
                        version: { increment: 1 },
                    },
                    include: { items: true, executedBy: true },
                });
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
    async completeExecution(executionId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const execution = await tx.checklistExecution.findUnique({
                where: { id: executionId },
                include: { items: true },
            });
            if (!execution) {
                throw new common_1.NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
            }
            if (execution.status !== client_1.ChecklistExecutionStatus.DRAFT) {
                throw new common_1.BadRequestException('Checklist đã hoàn thành hoặc hủy trước đó.');
            }
            if (execution.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
            }
            const hasNotChecked = execution.items.some((item) => item.status === client_1.ChecklistItemStatus.NOT_CHECKED);
            if (hasNotChecked) {
                throw new common_1.BadRequestException('Vui lòng hoàn thành kiểm tra toàn bộ đầu mục trước khi lưu kết quả.');
            }
            const allNA = execution.items.length > 0 && execution.items.every((item) => item.status === client_1.ChecklistItemStatus.NA);
            if (allNA) {
                throw new common_1.BadRequestException('Không thể hoàn tất checklist khi toàn bộ đầu mục đều là Không áp dụng (NA).');
            }
            const hasFailed = execution.items.some((item) => item.status === client_1.ChecklistItemStatus.FAILED);
            const result = hasFailed ? 'FAILED' : 'PASSED';
            try {
                return await tx.checklistExecution.update({
                    where: { id: executionId, version: dto.expectedVersion },
                    data: {
                        status: client_1.ChecklistExecutionStatus.COMPLETED,
                        result: result,
                        completedAt: new Date(),
                        version: { increment: 1 },
                    },
                    include: { items: true, executedBy: true },
                });
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
    async cancelExecution(executionId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const execution = await tx.checklistExecution.findUnique({
                where: { id: executionId },
            });
            if (!execution) {
                throw new common_1.NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
            }
            if (execution.status !== client_1.ChecklistExecutionStatus.DRAFT) {
                throw new common_1.BadRequestException('Chỉ được phép hủy Checklist ở trạng thái nháp (DRAFT). Trạng thái hiện tại: ' + execution.status);
            }
            if (execution.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (!dto.reason || dto.reason.trim() === '') {
                throw new common_1.BadRequestException('Lý do hủy (reason) là bắt buộc.');
            }
            try {
                return await tx.checklistExecution.update({
                    where: { id: executionId, version: dto.expectedVersion },
                    data: {
                        status: client_1.ChecklistExecutionStatus.CANCELLED,
                        cancelReason: dto.reason.trim(),
                        cancelledAt: new Date(),
                        cancelledById: dto.cancelledById || null,
                        version: { increment: 1 },
                    },
                    include: { items: true, executedBy: true },
                });
            }
            catch (err) {
                if (err.code === 'P2025') {
                    throw new common_1.ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
                }
                throw err;
            }
        });
    }
};
exports.ChecklistExecutionsService = ChecklistExecutionsService;
exports.ChecklistExecutionsService = ChecklistExecutionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChecklistExecutionsService);
//# sourceMappingURL=checklist-executions.service.js.map