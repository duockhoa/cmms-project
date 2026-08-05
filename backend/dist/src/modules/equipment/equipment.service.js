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
exports.EquipmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let EquipmentService = class EquipmentService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = {};
        if (query?.search) {
            where.OR = [
                { name: { contains: query.search } },
                { code: { contains: query.search } },
                { serialNumber: { contains: query.search } },
            ];
        }
        if (query?.category)
            where.category = query.category;
        if (query?.status)
            where.status = query.status;
        if (query?.location)
            where.location = query.location;
        return this.prisma.equipment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                schedules: {
                    where: { status: 'ACTIVE' },
                    orderBy: { nextDueDate: 'asc' },
                    take: 1,
                },
                _count: {
                    select: { requests: true, workOrders: true, schedules: true }
                }
            }
        });
    }
    async findOne(id) {
        const item = await this.prisma.equipment.findUnique({
            where: { id },
            include: {
                requests: { orderBy: { createdAt: 'desc' }, take: 10 },
                workOrders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { inventoryItem: true } } } },
                schedules: true,
            },
        });
        if (!item)
            throw new common_1.NotFoundException('Không tìm thấy thiết bị');
        const attachments = await this.prisma.attachment.findMany({
            where: { entityId: id, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        const requestIds = item.requests.map(r => r.id);
        const workOrderIds = item.workOrders.map(w => w.id);
        const logEntityIds = [id, ...requestIds, ...workOrderIds];
        const logs = await this.prisma.workflowHistory.findMany({
            where: {
                entityId: { in: logEntityIds }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        const spareParts = await this.prisma.inventoryItem.findMany({
            where: { isActive: true }
        });
        return {
            ...item,
            attachments,
            logs,
            spareParts
        };
    }
    async create(data) {
        if (!data.code) {
            const count = await this.prisma.equipment.count();
            data.code = `EQ-${(count + 1).toString().padStart(4, '0')}`;
        }
        return this.prisma.equipment.create({ data });
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.equipment.update({ where: { id }, data });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.equipment.delete({ where: { id } });
    }
};
exports.EquipmentService = EquipmentService;
exports.EquipmentService = EquipmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EquipmentService);
//# sourceMappingURL=equipment.service.js.map