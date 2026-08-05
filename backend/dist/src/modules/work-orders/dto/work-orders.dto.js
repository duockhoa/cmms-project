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
exports.AddWorkOrderItemDto = exports.CancelWorkOrderDto = exports.CloseWorkOrderDto = exports.VerifyWorkOrderDto = exports.CompleteWorkOrderDto = exports.ResumeWorkOrderDto = exports.PauseWorkOrderDto = exports.StartWorkOrderDto = exports.AssignWorkOrderDto = exports.CreateWorkOrderDto = void 0;
const class_validator_1 = require("class-validator");
class CreateWorkOrderDto {
}
exports.CreateWorkOrderDto = CreateWorkOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Tiêu đề không được để trống' }),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Thiết bị không được để trống' }),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "equipmentId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Mô tả không được để trống' }),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "technicianName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "plannedStartDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateWorkOrderDto.prototype, "plannedEndDate", void 0);
class AssignWorkOrderDto {
}
exports.AssignWorkOrderDto = AssignWorkOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Tên kỹ thuật viên không được để trống' }),
    __metadata("design:type", String)
], AssignWorkOrderDto.prototype, "technicianName", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], AssignWorkOrderDto.prototype, "expectedVersion", void 0);
class StartWorkOrderDto {
}
exports.StartWorkOrderDto = StartWorkOrderDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], StartWorkOrderDto.prototype, "expectedVersion", void 0);
class PauseWorkOrderDto {
}
exports.PauseWorkOrderDto = PauseWorkOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lý do tạm dừng không được để trống' }),
    __metadata("design:type", String)
], PauseWorkOrderDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], PauseWorkOrderDto.prototype, "expectedVersion", void 0);
class ResumeWorkOrderDto {
}
exports.ResumeWorkOrderDto = ResumeWorkOrderDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], ResumeWorkOrderDto.prototype, "expectedVersion", void 0);
class CompleteWorkOrderDto {
}
exports.CompleteWorkOrderDto = CompleteWorkOrderDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CompleteWorkOrderDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CompleteWorkOrderDto.prototype, "failureCause", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CompleteWorkOrderDto.prototype, "solution", void 0);
class VerifyWorkOrderDto {
}
exports.VerifyWorkOrderDto = VerifyWorkOrderDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], VerifyWorkOrderDto.prototype, "expectedVersion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VerifyWorkOrderDto.prototype, "comment", void 0);
class CloseWorkOrderDto {
}
exports.CloseWorkOrderDto = CloseWorkOrderDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CloseWorkOrderDto.prototype, "expectedVersion", void 0);
class CancelWorkOrderDto {
}
exports.CancelWorkOrderDto = CancelWorkOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Lý do hủy không được để trống' }),
    __metadata("design:type", String)
], CancelWorkOrderDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CancelWorkOrderDto.prototype, "expectedVersion", void 0);
class AddWorkOrderItemDto {
}
exports.AddWorkOrderItemDto = AddWorkOrderItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddWorkOrderItemDto.prototype, "inventoryItemId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)({ message: 'Số lượng phải lớn hơn 0' }),
    __metadata("design:type", Number)
], AddWorkOrderItemDto.prototype, "quantity", void 0);
//# sourceMappingURL=work-orders.dto.js.map