import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { AnalyticsService } from './analytics.service';
import { KpiEngineService } from './services/kpi-engine.service';
import { IncidentResponseKpiService } from './services/incident-response-kpi.service';
import { AnalyticsAuditAdapter } from './adapters/analytics-audit.adapter';
import { AnalyticsPermissionGuard } from './guards/analytics-permission.guard';
import { KpiQueryDto } from './dto/kpi-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Analytics (Báo cáo & KPI)')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly kpiEngineService: KpiEngineService,
    private readonly auditAdapter: AnalyticsAuditAdapter,
    private readonly incidentResponseKpiService: IncidentResponseKpiService
  ) {}

  @ApiStandardResponse({ summary: 'Lấy dữ liệu tổng hợp Dashboard trang chủ', method: 'GET', path: '/analytics/dashboard' })
  @Get('dashboard')
  getDashboardSummary(@Req() req: any) {
    return this.analyticsService.getDashboardSummary(req.user);
  }

  @ApiStandardResponse({ summary: 'Tính toán tổng hợp các chỉ số KPI bảo trì toàn nhà máy', method: 'GET', path: '/analytics/kpis' })
  @Get('kpis')
  @UseGuards(AnalyticsPermissionGuard)
  async getKpiSummary(@Query() query: KpiQueryDto, @Req() req: any) {
    const user = req?.user;
    if (!user || !user.id) {
      throw new ForbiddenException('Xác thực thất bại: req.user không tồn tại hoặc không hợp lệ');
    }
    if (!user.role) {
      user.role = (user.roles && user.roles[0]) || 'USER';
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

  @ApiStandardResponse({ summary: 'Tính tỷ lệ đạt KPI phản hồi sự cố 4h trong giờ làm việc (8h-17h)', method: 'GET', path: '/analytics/kpis/incident-response-4h' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Đến ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'supportDepartment', required: false, description: 'Bộ phận hỗ trợ (Cơ điện, IT...)' })
  @ApiQuery({ name: 'workshop', required: false, description: 'Xưởng yêu cầu (PX1, PX2...)' })
  @Get('kpis/incident-response-4h')
  getIncidentResponseKpi(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('supportDepartment') supportDepartment?: string,
    @Query('workshop') workshop?: string,
  ) {
    return this.incidentResponseKpiService.calculateIncidentResponseKpi({
      startDate,
      endDate,
      supportDepartment,
      workshop,
    });
  }

  @ApiStandardResponse({ summary: 'Báo cáo tổng hợp nhật ký vận hành thiết bị', method: 'GET', path: '/analytics/operation-logs-report' })
  @Get('operation-logs-report')
  getOperationLogsReport(@Req() req: any) {
    return this.analyticsService.getOperationLogsReport(50, req.user);
  }
}
