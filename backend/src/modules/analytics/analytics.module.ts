import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsDateWindowService } from './services/analytics-date-window.service';
import { AnalyticsScopeService } from './services/analytics-scope.service';
import { AnalyticsQueryService } from './services/analytics-query.service';
import { AnalyticsAuditAdapter } from './adapters/analytics-audit.adapter';
import { AnalyticsPermissionGuard } from './guards/analytics-permission.guard';
import { KpiEngineService } from './services/kpi-engine.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsDateWindowService,
    AnalyticsScopeService,
    AnalyticsQueryService,
    AnalyticsAuditAdapter,
    AnalyticsPermissionGuard,
    KpiEngineService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsDateWindowService,
    AnalyticsScopeService,
    AnalyticsQueryService,
    AnalyticsAuditAdapter,
    AnalyticsPermissionGuard,
    KpiEngineService,
  ],
})
export class AnalyticsModule {}
