const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?')
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_analytics?an')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_analytics');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AnalyticsDateWindowService } from './services/analytics-date-window.service';
import { AnalyticsScopeService } from './services/analytics-scope.service';
import { KpiEngineService } from './services/kpi-engine.service';
import { classifyWorkOrder } from './utils/kpi-classifier.utility';
import { WORK_ORDER_CLASSIFICATION } from './analytics.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('Analytics Module', () => {
  let app: any;
  let prisma: PrismaService;
  let dateWindowService: AnalyticsDateWindowService;
  let scopeService: AnalyticsScopeService;
  let kpiEngineService: KpiEngineService;
  

  beforeAll(async () => {
    

    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    dateWindowService = app.get(AnalyticsDateWindowService);
    scopeService = app.get(AnalyticsScopeService);
    kpiEngineService = app.get(KpiEngineService);

    // Seed dynamic data
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
      expect(classifyWorkOrder({ scheduleId: 'sch-1', requestId: null })).toBe(WORK_ORDER_CLASSIFICATION.PREVENTIVE);
      expect(classifyWorkOrder({ scheduleId: null, requestId: 'req-1' })).toBe(WORK_ORDER_CLASSIFICATION.CORRECTIVE);
      expect(classifyWorkOrder({ scheduleId: null, requestId: null })).toBe(WORK_ORDER_CLASSIFICATION.UNCLASSIFIED);
      expect(classifyWorkOrder({ scheduleId: 'sch-1', requestId: 'req-1' })).toBe(WORK_ORDER_CLASSIFICATION.CONFLICTED);
    });
  });
});
