import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsDateWindowService } from './analytics-date-window.service';
import { AnalyticsScopeService, UserContext } from './analytics-scope.service';
import { BaseAnalyticsFilterDto, WorkOrderAnalyticsFilterDto } from '../dto/analytics-query.dto';
import { AnalyticsResponseDto, DateWindowContract, PaginationMetaContract } from '../contracts/analytics-response.contract';
export declare class AnalyticsQueryService {
    private prisma;
    private dateWindowService;
    private scopeService;
    constructor(prisma: PrismaService, dateWindowService: AnalyticsDateWindowService, scopeService: AnalyticsScopeService);
    prepareQuery(dto: BaseAnalyticsFilterDto, user?: UserContext): {
        timezone: string;
        dateWindow: DateWindowContract;
        finalWhere: any;
    };
    getWorkOrderSummaryAggregates(dto: WorkOrderAnalyticsFilterDto, user?: UserContext): Promise<AnalyticsResponseDto<{
        totalWorkOrders: number;
        totalCost: number;
        averageCost: number;
        statusBreakdown: Record<string, number>;
    }>>;
    formatResponse<T>(data: T, dateWindow: DateWindowContract, timezone: string, appliedFilters: any, pagination?: PaginationMetaContract, correlationId?: string): AnalyticsResponseDto<T>;
}
