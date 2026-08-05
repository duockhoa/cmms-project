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
exports.EquipmentStatusService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let EquipmentStatusService = class EquipmentStatusService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculateAndSetStatus(equipmentId, tx) {
        const db = tx || this.prisma;
        const eq = await db.equipment.findUnique({ where: { id: equipmentId } });
        if (!eq) {
            throw new common_1.NotFoundException('Không tìm thấy thiết bị');
        }
        const activeUrgentWOs = await db.workOrder.findMany({
            where: {
                equipmentId,
                status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
                priority: { in: ['HIGH', 'URGENT'] },
            },
        });
        if (activeUrgentWOs.length > 0) {
            await db.equipment.update({
                where: { id: equipmentId },
                data: { status: 'INCIDENT' },
            });
            return 'INCIDENT';
        }
        const activeWOs = await db.workOrder.findMany({
            where: {
                equipmentId,
                status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
            },
        });
        if (activeWOs.length > 0) {
            await db.equipment.update({
                where: { id: equipmentId },
                data: { status: 'UNDER_MAINTENANCE' },
            });
            return 'UNDER_MAINTENANCE';
        }
        const pendingUrgentRequests = await db.maintenanceRequest.findMany({
            where: {
                equipmentId,
                status: 'PENDING',
                priority: { in: ['HIGH', 'URGENT'] },
            },
        });
        if (pendingUrgentRequests.length > 0) {
            await db.equipment.update({
                where: { id: equipmentId },
                data: { status: 'INCIDENT' },
            });
            return 'INCIDENT';
        }
        await db.equipment.update({
            where: { id: equipmentId },
            data: { status: 'OPERATIONAL' },
        });
        return 'OPERATIONAL';
    }
};
exports.EquipmentStatusService = EquipmentStatusService;
exports.EquipmentStatusService = EquipmentStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EquipmentStatusService);
//# sourceMappingURL=equipment-status.service.js.map