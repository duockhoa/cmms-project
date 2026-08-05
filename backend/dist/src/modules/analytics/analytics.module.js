"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const analytics_service_1 = require("./analytics.service");
const analytics_controller_1 = require("./analytics.controller");
const analytics_date_window_service_1 = require("./services/analytics-date-window.service");
const analytics_scope_service_1 = require("./services/analytics-scope.service");
const analytics_query_service_1 = require("./services/analytics-query.service");
const analytics_audit_adapter_1 = require("./adapters/analytics-audit.adapter");
const analytics_permission_guard_1 = require("./guards/analytics-permission.guard");
const kpi_engine_service_1 = require("./services/kpi-engine.service");
let AnalyticsModule = class AnalyticsModule {
};
exports.AnalyticsModule = AnalyticsModule;
exports.AnalyticsModule = AnalyticsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [analytics_controller_1.AnalyticsController],
        providers: [
            analytics_service_1.AnalyticsService,
            analytics_date_window_service_1.AnalyticsDateWindowService,
            analytics_scope_service_1.AnalyticsScopeService,
            analytics_query_service_1.AnalyticsQueryService,
            analytics_audit_adapter_1.AnalyticsAuditAdapter,
            analytics_permission_guard_1.AnalyticsPermissionGuard,
            kpi_engine_service_1.KpiEngineService,
        ],
        exports: [
            analytics_service_1.AnalyticsService,
            analytics_date_window_service_1.AnalyticsDateWindowService,
            analytics_scope_service_1.AnalyticsScopeService,
            analytics_query_service_1.AnalyticsQueryService,
            analytics_audit_adapter_1.AnalyticsAuditAdapter,
            analytics_permission_guard_1.AnalyticsPermissionGuard,
            kpi_engine_service_1.KpiEngineService,
        ],
    })
], AnalyticsModule);
//# sourceMappingURL=analytics.module.js.map