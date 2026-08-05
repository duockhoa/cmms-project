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
exports.GenerateWorkOrderDto = exports.CancelScheduleDto = exports.CompleteScheduleDto = exports.PauseScheduleDto = exports.ActivateScheduleDto = exports.UpdateScheduleDto = exports.CreateScheduleDto = void 0;
const class_validator_1 = require("class-validator");
class CreateScheduleDto {
}
exports.CreateScheduleDto = CreateScheduleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Tiêu đề (title) là bắt buộc' }),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Thiết bị (equipmentId) là bắt buộc' }),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "equipmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Loại chu kỳ (frequencyType) là bắt buộc' }),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "frequencyType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'frequencyInterval phải lớn hơn 0' }),
    __metadata("design:type", Number)
], CreateScheduleDto.prototype, "frequencyInterval", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Ngày bắt đầu (startDate) là bắt buộc' }),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateScheduleDto.prototype, "estimatedDurationMinutes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "defaultPriority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Người tạo (createdById) là bắt buộc' }),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "createdById", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateScheduleDto.prototype, "autoGenerate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateScheduleDto.prototype, "leadTimeDays", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateScheduleDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateScheduleDto.prototype, "checklistJson", void 0);
class UpdateScheduleDto {
}
exports.UpdateScheduleDto = UpdateScheduleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "frequencyType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "frequencyInterval", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "estimatedDurationMinutes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "defaultPriority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "assignedTechnicianId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateScheduleDto.prototype, "autoGenerate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "leadTimeDays", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], UpdateScheduleDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], UpdateScheduleDto.prototype, "actedById", void 0);
class ActivateScheduleDto {
}
exports.ActivateScheduleDto = ActivateScheduleDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], ActivateScheduleDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], ActivateScheduleDto.prototype, "actedById", void 0);
class PauseScheduleDto {
}
exports.PauseScheduleDto = PauseScheduleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lý do tạm dừng (reason) là bắt buộc' }),
    __metadata("design:type", String)
], PauseScheduleDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], PauseScheduleDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], PauseScheduleDto.prototype, "actedById", void 0);
class CompleteScheduleDto {
}
exports.CompleteScheduleDto = CompleteScheduleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lý do hoàn thành (reason) là bắt buộc' }),
    __metadata("design:type", String)
], CompleteScheduleDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], CompleteScheduleDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], CompleteScheduleDto.prototype, "actedById", void 0);
class CancelScheduleDto {
}
exports.CancelScheduleDto = CancelScheduleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lý do hủy (reason) là bắt buộc' }),
    __metadata("design:type", String)
], CancelScheduleDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], CancelScheduleDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], CancelScheduleDto.prototype, "actedById", void 0);
class GenerateWorkOrderDto {
}
exports.GenerateWorkOrderDto = GenerateWorkOrderDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'expectedVersion là bắt buộc' }),
    __metadata("design:type", Number)
], GenerateWorkOrderDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'actedById là bắt buộc' }),
    __metadata("design:type", String)
], GenerateWorkOrderDto.prototype, "actedById", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateWorkOrderDto.prototype, "dueDate", void 0);
//# sourceMappingURL=schedules.dto.js.map