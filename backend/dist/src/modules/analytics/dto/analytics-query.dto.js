"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleAnalyticsFilterDto = exports.WorkOrderAnalyticsFilterDto = exports.BaseAnalyticsFilterDto = exports.IsIanaTimezoneConstraint = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const analytics_constants_1 = require("../analytics.constants");
let IsIanaTimezoneConstraint = class IsIanaTimezoneConstraint {
    validate(timezone) {
        if (typeof timezone !== 'string' || !timezone.trim())
            return false;
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        }
        catch (e) {
            return false;
        }
    }
    defaultMessage(args) {
        return `Múi giờ '${args.value}' không phải là múi giờ IANA hợp lệ (ví dụ: 'Asia/Ho_Chi_Minh', 'UTC')`;
    }
};
exports.IsIanaTimezoneConstraint = IsIanaTimezoneConstraint;
exports.IsIanaTimezoneConstraint = IsIanaTimezoneConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isIanaTimezone', async: false })
], IsIanaTimezoneConstraint);
class BaseAnalyticsFilterDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
        this.timezone = 'Asia/Ho_Chi_Minh';
    }
}
exports.BaseAnalyticsFilterDto = BaseAnalyticsFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)({}, { message: 'startDate phải theo chuẩn ISO 8601' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)({}, { message: 'endDate phải theo chuẩn ISO 8601' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(undefined, { message: 'equipmentId phải là UUID hợp lệ' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "equipmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "departmentId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(undefined, { message: 'technicianId phải là UUID hợp lệ' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "technicianId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analytics_constants_1.WORK_ORDER_PRIORITY, { message: 'priority không hợp lệ' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "correlationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analytics_constants_1.MAINTENANCE_TYPE_ENUM, { message: 'maintenanceType không hợp lệ' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "maintenanceType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analytics_constants_1.TIME_RESOLUTION_ENUM, { message: 'timeResolution không hợp lệ' }),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "timeResolution", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'page phải là số nguyên' }),
    (0, class_validator_1.Min)(1, { message: 'page phải lớn hơn hoặc bằng 1' }),
    __metadata("design:type", Number)
], BaseAnalyticsFilterDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'limit phải là số nguyên' }),
    (0, class_validator_1.Min)(1, { message: 'limit phải lớn hơn hoặc bằng 1' }),
    (0, class_validator_1.Max)(100, { message: 'limit tối đa là 100' }),
    __metadata("design:type", Number)
], BaseAnalyticsFilterDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Validate)(IsIanaTimezoneConstraint),
    __metadata("design:type", String)
], BaseAnalyticsFilterDto.prototype, "timezone", void 0);
class WorkOrderAnalyticsFilterDto extends BaseAnalyticsFilterDto {
}
exports.WorkOrderAnalyticsFilterDto = WorkOrderAnalyticsFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analytics_constants_1.WORK_ORDER_STATUS, { message: 'workOrderStatus không hợp lệ' }),
    __metadata("design:type", String)
], WorkOrderAnalyticsFilterDto.prototype, "workOrderStatus", void 0);
class ScheduleAnalyticsFilterDto extends BaseAnalyticsFilterDto {
}
exports.ScheduleAnalyticsFilterDto = ScheduleAnalyticsFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analytics_constants_1.SCHEDULE_STATUS, { message: 'scheduleStatus không hợp lệ' }),
    __metadata("design:type", String)
], ScheduleAnalyticsFilterDto.prototype, "scheduleStatus", void 0);
//# sourceMappingURL=analytics-query.dto.js.map