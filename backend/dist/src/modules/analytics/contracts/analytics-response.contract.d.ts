import { WORK_ORDER_STATUS, SCHEDULE_STATUS, WORK_ORDER_PRIORITY, MAINTENANCE_TYPE_ENUM, TIME_RESOLUTION_ENUM } from '../analytics.constants';
export interface DateWindowContract {
    startInclusive: string;
    endExclusive: string;
}
export interface PaginationMetaContract {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface AnalyticsAppliedFilters {
    startDate?: string;
    endDate?: string;
    equipmentId?: string;
    departmentId?: string;
    technicianId?: string;
    workOrderStatus?: WORK_ORDER_STATUS;
    scheduleStatus?: SCHEDULE_STATUS;
    priority?: WORK_ORDER_PRIORITY;
    maintenanceType?: MAINTENANCE_TYPE_ENUM;
    timeResolution?: TIME_RESOLUTION_ENUM;
    timezone?: string;
}
export interface AnalyticsResponseDto<T> {
    data: T;
    dateWindow: DateWindowContract;
    timezone: string;
    generatedAt: string;
    appliedFilters: Readonly<Partial<AnalyticsAppliedFilters>>;
    pagination?: PaginationMetaContract;
    correlationId?: string;
}
