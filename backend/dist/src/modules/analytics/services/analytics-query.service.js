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
exports.AnalyticsQueryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const analytics_date_window_service_1 = require("./analytics-date-window.service");
const analytics_scope_service_1 = require("./analytics-scope.service");
let AnalyticsQueryService = class AnalyticsQueryService {
    constructor(prisma, dateWindowService, scopeService) {
        this.prisma = prisma;
        this.dateWindowService = dateWindowService;
        this.scopeService = scopeService;
    }
    prepareQuery(dto, user) {
        const timezone = dto.timezone || 'Asia/Ho_Chi_Minh';
        const dateWindow = this.dateWindowService.resolveDateWindow(dto.startDate, dto.endDate, timezone);
        const userFilters = {};
        userFilters.createdAt = {
            gte: new Date(dateWindow.startInclusive),
            lt: new Date(dateWindow.endExclusive),
        };
        if (dto.equipmentId)
            userFilters.equipmentId = dto.equipmentId;
        if (dto.priority)
            userFilters.priority = dto.priority;
        if (dto.technicianId)
            userFilters.technicianId = dto.technicianId;
        if (dto.workOrderStatus) {
            userFilters.status = dto.workOrderStatus;
        }
        let finalWhere = userFilters;
        if (user) {
            const serverScope = this.scopeService.buildServerEnforcedScope(user);
            finalWhere = this.scopeService.combineFilters(serverScope, userFilters);
        }
        return {
            timezone,
            dateWindow,
            finalWhere,
        };
    }
    async getWorkOrderSummaryAggregates(dto, user) {
        const { timezone, dateWindow, finalWhere } = this.prepareQuery(dto, user);
        const aggregateResult = await this.prisma.workOrder.aggregate({
            where: finalWhere,
            _count: { id: true },
            _sum: { totalCost: true },
            _avg: { totalCost: true },
        });
        const statusGroups = await this.prisma.workOrder.groupBy({
            by: ['status'],
            where: finalWhere,
            _count: { id: true },
        });
        const statusCounts = {};
        for (const group of statusGroups) {
            statusCounts[group.status] = group._count.id;
        }
        const data = {
            totalWorkOrders: aggregateResult._count.id || 0,
            totalCost: aggregateResult._sum.totalCost || 0,
            averageCost: aggregateResult._avg.totalCost || 0,
            statusBreakdown: statusCounts,
        };
        return this.formatResponse(data, dateWindow, timezone, dto);
    }
    formatResponse(data, dateWindow, timezone, appliedFilters, pagination, correlationId) {
        const cleanFilters = {};
        if (appliedFilters) {
            for (const [key, val] of Object.entries(appliedFilters)) {
                if (val !== undefined && val !== null && val !== '') {
                    cleanFilters[key] = val;
                }
            }
        }
        return {
            data,
            dateWindow,
            timezone,
            generatedAt: new Date().toISOString(),
            appliedFilters: Object.freeze(cleanFilters),
            ...(pagination ? { pagination } : {}),
            ...(correlationId ? { correlationId } : {}),
        };
    }
};
exports.AnalyticsQueryService = AnalyticsQueryService;
exports.AnalyticsQueryService = AnalyticsQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_date_window_service_1.AnalyticsDateWindowService,
        analytics_scope_service_1.AnalyticsScopeService])
], AnalyticsQueryService);
//# sourceMappingURL=analytics-query.service.js.map