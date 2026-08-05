import {
  IsOptional,
  IsISO8601,
  IsUUID,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TIME_RESOLUTION_ENUM,
  MAINTENANCE_TYPE_ENUM,
  WORK_ORDER_PRIORITY,
  WORK_ORDER_STATUS,
  SCHEDULE_STATUS,
} from '../analytics.constants';

@ValidatorConstraint({ name: 'isIanaTimezone', async: false })
export class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: any): boolean {
    if (typeof timezone !== 'string' || !timezone.trim()) return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `Múi giờ '${args.value}' không phải là múi giờ IANA hợp lệ (ví dụ: 'Asia/Ho_Chi_Minh', 'UTC')`;
  }
}

export class BaseAnalyticsFilterDto {
  @IsOptional()
  @IsISO8601({}, { message: 'startDate phải theo chuẩn ISO 8601' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'endDate phải theo chuẩn ISO 8601' })
  endDate?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'equipmentId phải là UUID hợp lệ' })
  equipmentId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'technicianId phải là UUID hợp lệ' })
  technicianId?: string;

  @IsOptional()
  @IsEnum(WORK_ORDER_PRIORITY, { message: 'priority không hợp lệ' })
  priority?: WORK_ORDER_PRIORITY;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsEnum(MAINTENANCE_TYPE_ENUM, { message: 'maintenanceType không hợp lệ' })
  maintenanceType?: MAINTENANCE_TYPE_ENUM;

  @IsOptional()
  @IsEnum(TIME_RESOLUTION_ENUM, { message: 'timeResolution không hợp lệ' })
  timeResolution?: TIME_RESOLUTION_ENUM;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit?: number = 10;

  @IsOptional()
  @Validate(IsIanaTimezoneConstraint)
  timezone?: string = 'Asia/Ho_Chi_Minh';
}

export class WorkOrderAnalyticsFilterDto extends BaseAnalyticsFilterDto {
  @IsOptional()
  @IsEnum(WORK_ORDER_STATUS, { message: 'workOrderStatus không hợp lệ' })
  workOrderStatus?: WORK_ORDER_STATUS;
}

export class ScheduleAnalyticsFilterDto extends BaseAnalyticsFilterDto {
  @IsOptional()
  @IsEnum(SCHEDULE_STATUS, { message: 'scheduleStatus không hợp lệ' })
  scheduleStatus?: SCHEDULE_STATUS;
}
