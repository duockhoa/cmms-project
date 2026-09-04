import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { KpiEngineService } from './services/kpi-engine.service';
import { AnalyticsAuditAdapter } from './adapters/analytics-audit.adapter';
import { AnalyticsPermissionGuard } from './guards/analytics-permission.guard';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly kpiEngineService: KpiEngineService,
    private readonly auditAdapter: AnalyticsAuditAdapter
  ) {}

  @Get('dashboard')
  getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('kpis')
  @UseGuards(AnalyticsPermissionGuard)
  async getKpiSummary(@Query() query: KpiQueryDto, @Req() req: any) {
    const user = req?.user;
    if (!user || !user.id) {
      throw new ForbiddenException('Xác thực thất bại: req.user không tồn tại hoặc không hợp lệ');
    }
    if (!user.role) {
      user.role = (user.roles && user.roles[0]) || 'ADMIN';
    }

    const correlationId = (req?.headers?.['x-correlation-id'] as string) || (query && query.correlationId) || `corr-${Date.now()}`;
    if (query && !query.correlationId) {
      query.correlationId = correlationId;
    }

    // Fail-closed audit logging for KPI summary report view
    await this.auditAdapter.logReportView(
      user.id,
      'KPI_SUMMARY_REPORT',
      { timezone: query.timezone || 'Asia/Ho_Chi_Minh' },
      correlationId
    );

    return this.kpiEngineService.computeKpiSummary(query, user);
  }

  @Get('operation-logs-report')
  getOperationLogsReport() {
    return this.analyticsService.getOperationLogsReport();
  }
}
