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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardSummary() {
        const totalEquipment = await this.prisma.equipment.count();
        const operationalEquipment = await this.prisma.equipment.count({ where: { status: 'OPERATIONAL' } });
        const underMaintenanceEquipment = await this.prisma.equipment.count({ where: { status: 'UNDER_MAINTENANCE' } });
        const incidentEquipment = await this.prisma.equipment.count({ where: { status: 'INCIDENT' } });
        const pendingRequests = await this.prisma.maintenanceRequest.count({ where: { status: 'PENDING' } });
        const activeWorkOrders = await this.prisma.workOrder.count({
            where: { status: { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] } },
        });
        const completedWorkOrders = await this.prisma.workOrder.count({ where: { status: 'COMPLETED' } });
        const totalMaintenanceCostResult = await this.prisma.workOrder.aggregate({
            _sum: { totalCost: true },
        });
        const lowStockItems = await this.prisma.inventoryItem.count({
            where: { quantity: { lte: 5 } },
        });
        const recentRequests = await this.prisma.maintenanceRequest.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { equipment: true },
        });
        const urgentWorkOrders = await this.prisma.workOrder.findMany({
            where: { priority: { in: ['HIGH', 'URGENT'] }, status: { not: 'COMPLETED' } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { equipment: true },
        });
        return {
            kpi: {
                totalEquipment,
                operationalEquipment,
                underMaintenanceEquipment,
                incidentEquipment,
                pendingRequests,
                activeWorkOrders,
                completedWorkOrders,
                totalCost: totalMaintenanceCostResult._sum.totalCost || 0,
                lowStockItems,
            },
            recentRequests,
            urgentWorkOrders,
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map