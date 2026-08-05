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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const kpi_engine_service_1 = require("./services/kpi-engine.service");
const analytics_audit_adapter_1 = require("./adapters/analytics-audit.adapter");
const analytics_permission_guard_1 = require("./guards/analytics-permission.guard");
const kpi_query_dto_1 = require("./dto/kpi-query.dto");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService, kpiEngineService, auditAdapter) {
        this.analyticsService = analyticsService;
        this.kpiEngineService = kpiEngineService;
        this.auditAdapter = auditAdapter;
    }
    getDashboardSummary() {
        return this.analyticsService.getDashboardSummary();
    }
    async getKpiSummary(query, req) {
        const user = req?.user;
        if (!user || !user.id || !user.role) {
            throw new common_1.UnauthorizedException('Xác thực thất bại: req.user không tồn tại hoặc không hợp lệ');
        }
        const correlationId = req?.headers?.['x-correlation-id'] || (query && query.correlationId) || `corr-${Date.now()}`;
        if (query && !query.correlationId) {
            query.correlationId = correlationId;
        }
        await this.auditAdapter.logReportView(user.id, 'KPI_SUMMARY_REPORT', { timezone: query.timezone || 'Asia/Ho_Chi_Minh' }, correlationId);
        return this.kpiEngineService.computeKpiSummary(query, user);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('kpis'),
    (0, common_1.UseGuards)(analytics_permission_guard_1.AnalyticsPermissionGuard),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kpi_query_dto_1.KpiQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getKpiSummary", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('api/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        kpi_engine_service_1.KpiEngineService,
        analytics_audit_adapter_1.AnalyticsAuditAdapter])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map