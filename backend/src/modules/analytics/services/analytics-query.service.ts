import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsDateWindowService } from './analytics-date-window.service';
import { AnalyticsScopeService, UserContext } from './analytics-scope.service';
import { BaseAnalyticsFilterDto, WorkOrderAnalyticsFilterDto } from '../dto/analytics-query.dto';
import {
  AnalyticsResponseDto,
  DateWindowContract,
  PaginationMetaContract,
} from '../contracts/analytics-response.contract';

@Injectable()
export class AnalyticsQueryService {
  constructor(
    private prisma: PrismaService,
    private dateWindowService: AnalyticsDateWindowService,
    private scopeService: AnalyticsScopeService
  ) {}

  /**
   * Builds normalized date window and Prisma where clause.
   */
  prepareQuery(dto: BaseAnalyticsFilterDto, user?: UserContext) {
    const timezone = dto.timezone || 'Asia/Ho_Chi_Minh';
    const dateWindow = this.dateWindowService.resolveDateWindow(
      dto.startDate,
      dto.endDate,
      timezone
    );

    // Build user requested filters
    const userFilters: any = {};

    // Apply startInclusive / endExclusive date window
    userFilters.createdAt = {
      gte: new Date(dateWindow.startInclusive),
      lt: new Date(dateWindow.endExclusive),
    };

    if (dto.equipmentId) userFilters.equipmentId = dto.equipmentId;
    if (dto.priority) userFilters.priority = dto.priority;
    if (dto.technicianId) userFilters.technicianId = dto.technicianId;

    if ((dto as WorkOrderAnalyticsFilterDto).workOrderStatus) {
      userFilters.status = (dto as WorkOrderAnalyticsFilterDto).workOrderStatus;
    }

    // Apply server-enforced data scope if user context is provided
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

  /**
   * Executes Database-Level Summary Aggregation (Fixed Query-Count Threshold <= 2 round-trips)
   */
  async getWorkOrderSummaryAggregates(dto: WorkOrderAnalyticsFilterDto, user?: UserContext) {
    const { timezone, dateWindow, finalWhere } = this.prepareQuery(dto, user);

    // Round-trip 1: DB Aggregate count, sum, avg
    const aggregateResult = await this.prisma.workOrder.aggregate({
      where: finalWhere,
      _count: { id: true },
      _sum: { totalCost: true },
      _avg: { totalCost: true },
    });

    // Round-trip 2: DB GroupBy status
    const statusGroups = await this.prisma.workOrder.groupBy({
      by: ['status'],
      where: finalWhere,
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
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

  /**
   * Helper to wrap raw payload into standard AnalyticsResponseDto<T>
   */
  formatResponse<T>(
    data: T,
    dateWindow: DateWindowContract,
    timezone: string,
    appliedFilters: any,
    pagination?: PaginationMetaContract,
    correlationId?: string
  ): AnalyticsResponseDto<T> {
    const cleanFilters: any = {};
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
}
