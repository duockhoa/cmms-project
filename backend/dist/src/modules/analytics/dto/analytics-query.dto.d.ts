import { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { TIME_RESOLUTION_ENUM, MAINTENANCE_TYPE_ENUM, WORK_ORDER_PRIORITY, WORK_ORDER_STATUS, SCHEDULE_STATUS } from '../analytics.constants';
export declare class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
    validate(timezone: any): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare class BaseAnalyticsFilterDto {
    startDate?: string;
    endDate?: string;
    equipmentId?: string;
    departmentId?: string;
    technicianId?: string;
    priority?: WORK_ORDER_PRIORITY;
    correlationId?: string;
    maintenanceType?: MAINTENANCE_TYPE_ENUM;
    timeResolution?: TIME_RESOLUTION_ENUM;
    page?: number;
    limit?: number;
    timezone?: string;
}
export declare class WorkOrderAnalyticsFilterDto extends BaseAnalyticsFilterDto {
    workOrderStatus?: WORK_ORDER_STATUS;
}
export declare class ScheduleAnalyticsFilterDto extends BaseAnalyticsFilterDto {
    scheduleStatus?: SCHEDULE_STATUS;
}
