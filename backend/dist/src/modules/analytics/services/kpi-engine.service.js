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
exports.KpiEngineService = void 0;
exports.transformScopeForEquipment = transformScopeForEquipment;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const analytics_date_window_service_1 = require("./analytics-date-window.service");
const analytics_scope_service_1 = require("./analytics-scope.service");
const analytics_query_service_1 = require("./analytics-query.service");
const analytics_constants_1 = require("../analytics.constants");
const kpi_classifier_utility_1 = require("../utils/kpi-classifier.utility");
const kpi_math_utility_1 = require("../utils/kpi-math.utility");
function transformScopeForEquipment(scope) {
    if (!scope || typeof scope !== 'object')
        return {};
    if (Array.isArray(scope.AND)) {
        return {
            ...scope,
            AND: scope.AND.map((item) => transformScopeForEquipment(item)),
        };
    }
    if (Array.isArray(scope.OR)) {
        return {
            ...scope,
            OR: scope.OR.map((item) => transformScopeForEquipment(item)),
        };
    }
    const transformed = {};
    for (const [key, val] of Object.entries(scope)) {
        if (key === 'schedule' && val && typeof val === 'object') {
            const schVal = val;
            if (schVal.assignedTechnicianId) {
                transformed.schedules = {
                    some: {
                        assignedTechnicianId: schVal.assignedTechnicianId,
                    },
                };
            }
            else {
                transformed.schedules = { some: schVal };
            }
        }
        else if (key === 'technicianName' && typeof val === 'string') {
            transformed.workOrders = {
                some: {
                    technicianName: val,
                },
            };
        }
        else if (key === 'request' && val && typeof val === 'object') {
            transformed.requests = {
                some: val,
            };
        }
        else if (key === 'department' && typeof val === 'string') {
            transformed.requests = {
                some: {
                    department: val,
                },
            };
        }
        else {
            transformed[key] = val;
        }
    }
    return transformed;
}
let KpiEngineService = class KpiEngineService {
    constructor(prisma, dateWindowService, queryService, scopeService) {
        this.prisma = prisma;
        this.dateWindowService = dateWindowService;
        this.queryService = queryService;
        this.scopeService = scopeService;
    }
    async computeKpiSummary(dto, user) {
        const timezone = dto.timezone || 'Asia/Ho_Chi_Minh';
        const dateWindow = this.dateWindowService.resolveDateWindow(dto.startDate, dto.endDate, timezone);
        let serverScope = {};
        if (user) {
            if (user.role === 'MANAGER' && user.department && user.department.trim()) {
                const dept = user.department.trim();
                serverScope = {
                    request: { department: dept },
                };
            }
            else {
                serverScope = this.scopeService.buildServerEnforcedScope(user);
            }
        }
        let nValidEquipment = 0;
        const skipEquipmentCount = user?.role === 'TECHNICIAN' || user?.role === 'MANAGER';
        if (!skipEquipmentCount) {
            const eqScope = transformScopeForEquipment(serverScope);
            if (dto.equipmentId) {
                const eqWhere = this.scopeService.combineFilters(eqScope, {
                    id: dto.equipmentId,
                    isActive: true,
                });
                const eqCount = await this.prisma.equipment.count({ where: eqWhere });
                nValidEquipment = eqCount > 0 ? 1 : 0;
            }
            else {
                const allEqWhere = this.scopeService.combineFilters(eqScope, { isActive: true });
                nValidEquipment = await this.prisma.equipment.count({ where: allEqWhere });
            }
        }
        const userWoFilter = {
            createdAt: {
                gte: new Date(dateWindow.startInclusive),
                lt: new Date(dateWindow.endExclusive),
            },
        };
        if (dto.equipmentId)
            userWoFilter.equipmentId = dto.equipmentId;
        if (dto.technicianId)
            userWoFilter.technicianId = dto.technicianId;
        if (dto.priority)
            userWoFilter.priority = dto.priority;
        const finalWoWhere = this.scopeService.combineFilters(serverScope, userWoFilter);
        const allWorkOrders = await this.prisma.workOrder.findMany({
            where: finalWoWhere,
            select: {
                id: true,
                orderCode: true,
                scheduleId: true,
                requestId: true,
                status: true,
                priority: true,
                scheduledDueDate: true,
                plannedStartDate: true,
                actualStartDate: true,
                actualEndDate: true,
                completedAt: true,
                totalCost: true,
                createdAt: true,
                equipmentId: true,
                equipment: {
                    select: { id: true, name: true },
                },
            },
        });
        const reqWhere = {
            createdAt: {
                gte: new Date(dateWindow.startInclusive),
                lt: new Date(dateWindow.endExclusive),
            },
        };
        if (dto.equipmentId)
            reqWhere.equipmentId = dto.equipmentId;
        if (user) {
            if (user.role === 'TECHNICIAN') {
                reqWhere.workOrders = {
                    some: serverScope,
                };
            }
            else if (user.role === 'MANAGER' && user.department && user.department.trim()) {
                reqWhere.department = user.department.trim();
            }
        }
        const maintenanceRequests = await this.prisma.maintenanceRequest.findMany({
            where: reqWhere,
            select: {
                id: true,
                requestCode: true,
                createdAt: true,
                equipmentId: true,
                workOrders: {
                    select: { id: true },
                },
            },
        });
        const woToRequestMap = new Map();
        const duplicateRequestWoIds = new Set();
        for (const req of maintenanceRequests) {
            if (req.workOrders && req.workOrders.length > 0) {
                for (const wo of req.workOrders) {
                    if (woToRequestMap.has(wo.id)) {
                        duplicateRequestWoIds.add(wo.id);
                    }
                    else {
                        woToRequestMap.set(wo.id, { id: req.id, createdAt: req.createdAt });
                    }
                }
            }
        }
        const uniqueExcludedRecordIds = new Set();
        let totalEvaluated = allWorkOrders.length;
        const completedWorkOrders = allWorkOrders.filter((wo) => analytics_constants_1.COMPLETED_WORK_ORDER_STATUSES.includes(wo.status));
        let preventiveCount = 0;
        let correctiveCount = 0;
        let unclassifiedCount = 0;
        let conflictedCount = 0;
        let totalRepairDurationHours = 0;
        let validMttrCount = 0;
        let mttrExcludedCount = 0;
        let onTimeCount = 0;
        let onTimeEligibleCount = 0;
        let onTimeExcludedCount = 0;
        for (const wo of completedWorkOrders) {
            const linkedReq = woToRequestMap.get(wo.id);
            const classification = (0, kpi_classifier_utility_1.classifyWorkOrder)({
                scheduleId: wo.scheduleId,
                requestId: linkedReq ? linkedReq.id : null,
            });
            if (duplicateRequestWoIds.has(wo.id)) {
                conflictedCount++;
                uniqueExcludedRecordIds.add(wo.id);
            }
            else {
                switch (classification) {
                    case analytics_constants_1.WORK_ORDER_CLASSIFICATION.PREVENTIVE:
                        preventiveCount++;
                        break;
                    case analytics_constants_1.WORK_ORDER_CLASSIFICATION.CORRECTIVE:
                        correctiveCount++;
                        break;
                    case analytics_constants_1.WORK_ORDER_CLASSIFICATION.UNCLASSIFIED:
                        unclassifiedCount++;
                        break;
                    case analytics_constants_1.WORK_ORDER_CLASSIFICATION.CONFLICTED:
                        conflictedCount++;
                        uniqueExcludedRecordIds.add(wo.id);
                        break;
                }
            }
            if (classification === analytics_constants_1.WORK_ORDER_CLASSIFICATION.CORRECTIVE) {
                if (wo.actualStartDate && wo.actualEndDate) {
                    const startMs = new Date(wo.actualStartDate).getTime();
                    const endMs = new Date(wo.actualEndDate).getTime();
                    if (endMs >= startMs) {
                        const durationHours = (endMs - startMs) / (1000 * 3600);
                        totalRepairDurationHours += durationHours;
                        validMttrCount++;
                    }
                    else {
                        uniqueExcludedRecordIds.add(wo.id);
                        mttrExcludedCount++;
                    }
                }
                else {
                    mttrExcludedCount++;
                }
            }
            if (wo.scheduledDueDate && wo.completedAt) {
                const completedMs = new Date(wo.completedAt).getTime();
                const dueMs = new Date(wo.scheduledDueDate).getTime();
                onTimeEligibleCount++;
                if (completedMs <= dueMs) {
                    onTimeCount++;
                }
            }
            else {
                onTimeExcludedCount++;
            }
        }
        let totalResponseTimeHours = 0;
        let validResponseCount = 0;
        let responseExcludedCount = 0;
        let totalCreationTimeHours = 0;
        let validCreationCount = 0;
        for (const wo of allWorkOrders) {
            const linkedReq = woToRequestMap.get(wo.id);
            if (linkedReq) {
                const reqCreatedMs = new Date(linkedReq.createdAt).getTime();
                const woCreatedMs = new Date(wo.createdAt).getTime();
                if (woCreatedMs >= reqCreatedMs) {
                    totalCreationTimeHours += (woCreatedMs - reqCreatedMs) / (1000 * 3600);
                    validCreationCount++;
                }
                if (wo.actualStartDate) {
                    const startMs = new Date(wo.actualStartDate).getTime();
                    if (startMs >= reqCreatedMs) {
                        totalResponseTimeHours += (startMs - reqCreatedMs) / (1000 * 3600);
                        validResponseCount++;
                    }
                    else {
                        uniqueExcludedRecordIds.add(wo.id);
                        responseExcludedCount++;
                    }
                }
                else {
                    responseExcludedCount++;
                }
            }
        }
        const rawMttr = validMttrCount > 0 ? totalRepairDurationHours / validMttrCount : 0;
        let mttrMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawMttr),
            unit: 'hours',
            status: 'OK',
            sampleCount: validMttrCount,
            excludedCount: mttrExcludedCount,
        };
        const mtbfMetric = {
            value: null,
            unit: 'hours',
            isEstimated: false,
            status: 'N/A',
            note: 'Nguồn dữ liệu Operating Hours theo kỳ chưa sẵn có trong schema. MTBF trả về N/A.',
        };
        let repairDurationMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(totalRepairDurationHours),
            unit: 'hours',
            isEstimated: true,
            status: 'ESTIMATED',
            note: 'Thời gian sửa chữa sự cố thực tế từ các WO Corrective',
            sampleCount: validMttrCount,
        };
        let availabilityMetric;
        if (user?.role === 'TECHNICIAN') {
            availabilityMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: 'Không đủ quan hệ định danh để xác định đầy đủ Corrective downtime theo kỹ thuật viên.',
            };
        }
        else if (user?.role === 'MANAGER') {
            availabilityMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: 'Schema hiện tại chưa có trường department trực tiếp trên Equipment. Calendar Availability cho Manager trả về N/A để tránh suy luận sai từ lịch sử Request.',
            };
        }
        else if (nValidEquipment === 0) {
            availabilityMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: 'Không có thiết bị hợp lệ trong phạm vi truy cập',
            };
        }
        else {
            const windowStartMs = new Date(dateWindow.startInclusive).getTime();
            const windowEndMs = new Date(dateWindow.endExclusive).getTime();
            const calendarHoursPerEquipment = (windowEndMs - windowStartMs) / (1000 * 3600);
            const totalCalendarEquipmentHours = calendarHoursPerEquipment * nValidEquipment;
            const rawAvailability = totalCalendarEquipmentHours > 0
                ? Math.max(0, ((totalCalendarEquipmentHours - totalRepairDurationHours) / totalCalendarEquipmentHours) * 100)
                : 100;
            availabilityMetric = {
                value: (0, kpi_math_utility_1.roundHalfUp)(rawAvailability),
                unit: 'percent',
                isEstimated: true,
                status: 'ESTIMATED',
                note: `Tính toán trên ${nValidEquipment} thiết bị với tổng ${(0, kpi_math_utility_1.roundHalfUp)(totalCalendarEquipmentHours)} Calendar Equipment-Hours`,
                sampleCount: nValidEquipment,
            };
        }
        const totalCompleted = completedWorkOrders.length;
        const rawPrevRatio = totalCompleted > 0 ? (preventiveCount / totalCompleted) * 100 : 0;
        const rawCorrRatio = totalCompleted > 0 ? (correctiveCount / totalCompleted) * 100 : 0;
        const rawUnclassRatio = totalCompleted > 0 ? (unclassifiedCount / totalCompleted) * 100 : 0;
        let prevRatioMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawPrevRatio),
            unit: 'percent',
            status: 'OK',
            sampleCount: preventiveCount,
            eligibleCount: totalCompleted,
        };
        let corrRatioMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawCorrRatio),
            unit: 'percent',
            status: 'OK',
            sampleCount: correctiveCount,
            eligibleCount: totalCompleted,
        };
        let unclassRatioMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawUnclassRatio),
            unit: 'percent',
            status: 'OK',
            sampleCount: unclassifiedCount,
            eligibleCount: totalCompleted,
        };
        const rawOnTimeRate = onTimeEligibleCount > 0 ? (onTimeCount / onTimeEligibleCount) * 100 : 100;
        let onTimeMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawOnTimeRate),
            unit: 'percent',
            status: 'OK',
            sampleCount: onTimeCount,
            eligibleCount: onTimeEligibleCount,
            excludedCount: onTimeExcludedCount,
        };
        const rawAvgResponse = validResponseCount > 0 ? totalResponseTimeHours / validResponseCount : 0;
        let avgResponseMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawAvgResponse),
            unit: 'hours',
            status: 'OK',
            sampleCount: validResponseCount,
            excludedCount: responseExcludedCount,
        };
        const rawAvgCreation = validCreationCount > 0 ? totalCreationTimeHours / validCreationCount : 0;
        let avgCreationMetric = {
            value: (0, kpi_math_utility_1.roundHalfUp)(rawAvgCreation),
            unit: 'hours',
            status: 'OK',
            note: 'Supporting diagnostic metric – không thuộc 8 KPI nghiệp vụ chính.',
            sampleCount: validCreationCount,
        };
        if (user?.role === 'TECHNICIAN') {
            const techNaNote = 'Không thể xác định đầy đủ phạm vi Work Order (thiếu quan hệ khóa ngoại ID cho Corrective Work Order).';
            mttrMetric = {
                value: null,
                unit: 'hours',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            repairDurationMetric = {
                value: null,
                unit: 'hours',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            prevRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            corrRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            unclassRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            onTimeMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            avgResponseMetric = {
                value: null,
                unit: 'hours',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
            avgCreationMetric = {
                value: null,
                unit: 'hours',
                isEstimated: false,
                status: 'N/A',
                note: techNaNote,
            };
        }
        if (user?.role === 'MANAGER') {
            const mgrRatioNote = 'Schema hiện tại chưa có trường department trên Equipment/Schedule. Manager không thể scope đầy đủ Preventive Work Orders.';
            prevRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: mgrRatioNote,
            };
            corrRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: mgrRatioNote,
            };
            unclassRatioMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: mgrRatioNote,
            };
            onTimeMetric = {
                value: null,
                unit: 'percent',
                isEstimated: false,
                status: 'N/A',
                note: 'Schema hiện tại chưa có trường department trên Equipment/Schedule. On-Time Completion Rate tổng thể cho Manager trả về N/A.',
            };
        }
        const validCount = totalEvaluated - uniqueExcludedRecordIds.size;
        const dataQuality = {
            totalEvaluatedRecords: totalEvaluated,
            validRecords: Math.max(0, validCount),
            uniqueExcludedRecords: uniqueExcludedRecordIds.size,
            ...(uniqueExcludedRecordIds.size > 0
                ? { qualityWarning: `Có ${uniqueExcludedRecordIds.size} bản ghi vi phạm quy tắc dữ liệu (thời gian âm hoặc phân loại xung đột) đã bị loại khỏi các phép tính.` }
                : {}),
        };
        const kpiSummaryData = {
            mttr: mttrMetric,
            mtbf: mtbfMetric,
            repairDurationProxy: repairDurationMetric,
            calendarAvailability: availabilityMetric,
            preventiveRatio: prevRatioMetric,
            correctiveRatio: corrRatioMetric,
            unclassifiedRatio: unclassRatioMetric,
            onTimeCompletionRate: onTimeMetric,
            averageResponseTime: avgResponseMetric,
            averageRequestToWoCreationTime: avgCreationMetric,
            dataQuality,
        };
        return this.queryService.formatResponse(kpiSummaryData, dateWindow, timezone, dto, undefined, dto.correlationId);
    }
};
exports.KpiEngineService = KpiEngineService;
exports.KpiEngineService = KpiEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_date_window_service_1.AnalyticsDateWindowService,
        analytics_query_service_1.AnalyticsQueryService,
        analytics_scope_service_1.AnalyticsScopeService])
], KpiEngineService);
//# sourceMappingURL=kpi-engine.service.js.map