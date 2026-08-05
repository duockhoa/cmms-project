import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsDateWindowService } from './analytics-date-window.service';
import { AnalyticsScopeService, UserContext } from './analytics-scope.service';
import { AnalyticsQueryService } from './analytics-query.service';
import { KpiQueryDto } from '../dto/kpi-query.dto';
import { AnalyticsResponseDto } from '../contracts/analytics-response.contract';
export interface KpiMetricDetail {
    value: number | null;
    unit: string;
    isEstimated?: boolean;
    status?: 'OK' | 'ESTIMATED' | 'N/A';
    note?: string;
    sampleCount?: number;
    eligibleCount?: number;
    excludedCount?: number;
}
export interface DataQualityMeta {
    totalEvaluatedRecords: number;
    validRecords: number;
    uniqueExcludedRecords: number;
    qualityWarning?: string;
}
export interface KpiSummaryData {
    mttr: KpiMetricDetail;
    mtbf: KpiMetricDetail;
    repairDurationProxy: KpiMetricDetail;
    calendarAvailability: KpiMetricDetail;
    preventiveRatio: KpiMetricDetail;
    correctiveRatio: KpiMetricDetail;
    unclassifiedRatio: KpiMetricDetail;
    onTimeCompletionRate: KpiMetricDetail;
    averageResponseTime: KpiMetricDetail;
    averageRequestToWoCreationTime?: KpiMetricDetail;
    dataQuality: DataQualityMeta;
}
export declare function transformScopeForEquipment(scope: any): any;
export declare class KpiEngineService {
    private prisma;
    private dateWindowService;
    private queryService;
    private scopeService;
    constructor(prisma: PrismaService, dateWindowService: AnalyticsDateWindowService, queryService: AnalyticsQueryService, scopeService: AnalyticsScopeService);
    computeKpiSummary(dto: KpiQueryDto, user?: UserContext): Promise<AnalyticsResponseDto<KpiSummaryData>>;
}
