"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.DATABASE_URL = `file:./test-an.db`;
const core_1 = require("@nestjs/core");
const app_module_1 = require("../../app.module");
const analytics_date_window_service_1 = require("./services/analytics-date-window.service");
const analytics_scope_service_1 = require("./services/analytics-scope.service");
const kpi_engine_service_1 = require("./services/kpi-engine.service");
const kpi_classifier_utility_1 = require("./utils/kpi-classifier.utility");
const analytics_constants_1 = require("./analytics.constants");
const prisma_service_1 = require("../../prisma/prisma.service");
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
jest.setTimeout(30000);
describe('Analytics Module', () => {
    let app;
    let prisma;
    let dateWindowService;
    let scopeService;
    let kpiEngineService;
    const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-an.db');
    beforeAll(async () => {
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch (e) { }
        }
        (0, child_process_1.execSync)('npx prisma db push --accept-data-loss', {
            env: { ...process.env, DATABASE_URL: `file:./test-an.db` },
            stdio: 'inherit',
        });
        app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
        prisma = app.get(prisma_service_1.PrismaService);
        dateWindowService = app.get(analytics_date_window_service_1.AnalyticsDateWindowService);
        scopeService = app.get(analytics_scope_service_1.AnalyticsScopeService);
        kpiEngineService = app.get(kpi_engine_service_1.KpiEngineService);
        await prisma.user.create({
            data: {
                id: 'admin-id',
                name: 'Admin User',
                email: 'admin@company.com',
                role: 'ADMIN',
                isActive: true,
            },
        });
        await prisma.user.create({
            data: {
                id: 'tech-id',
                name: 'Technician User',
                email: 'tech@company.com',
                role: 'TECHNICIAN',
                isActive: true,
            },
        });
    });
    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (fs.existsSync(testDbPath)) {
            try {
                fs.unlinkSync(testDbPath);
            }
            catch (e) { }
        }
    });
    describe('INTEGRATION TESTS: Analytics Date Window', () => {
        it('should resolve date windows accurately with timezone shifts', () => {
            const defWin = dateWindowService.resolveDateWindow();
            const defDays = (new Date(defWin.endExclusive).getTime() - new Date(defWin.startInclusive).getTime()) / 86400000;
            expect(Math.round(defDays)).toBe(30);
            const hcmWin = dateWindowService.resolveDateWindow('2026-07-01', '2026-07-01', 'Asia/Ho_Chi_Minh');
            expect(hcmWin.startInclusive).toBe('2026-06-30T17:00:00.000Z');
        });
    });
    describe('INTEGRATION TESTS: Scope Service & Permissions', () => {
        it('should assign roles distinct permission scopes', () => {
            const adminScope = scopeService.buildServerEnforcedScope({ id: 'admin-id', role: 'ADMIN', isActive: true });
            expect(Object.keys(adminScope).length).toBe(0);
            const techScope = scopeService.buildServerEnforcedScope({ id: 'tech-id', role: 'TECHNICIAN', isActive: true });
            expect(techScope.schedule.assignedTechnicianId).toBe('tech-id');
            expect(() => {
                scopeService.buildServerEnforcedScope({ id: 'op-id', role: 'OPERATOR', isActive: true });
            }).toThrow();
        });
    });
    describe('INTEGRATION TESTS: KPI Engine & Classifier', () => {
        it('should classify work orders correctly', () => {
            expect((0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: 'sch-1', requestId: null })).toBe(analytics_constants_1.WORK_ORDER_CLASSIFICATION.PREVENTIVE);
            expect((0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: null, requestId: 'req-1' })).toBe(analytics_constants_1.WORK_ORDER_CLASSIFICATION.CORRECTIVE);
            expect((0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: null, requestId: null })).toBe(analytics_constants_1.WORK_ORDER_CLASSIFICATION.UNCLASSIFIED);
            expect((0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: 'sch-1', requestId: 'req-1' })).toBe(analytics_constants_1.WORK_ORDER_CLASSIFICATION.CONFLICTED);
        });
    });
});
//# sourceMappingURL=analytics.spec.js.map