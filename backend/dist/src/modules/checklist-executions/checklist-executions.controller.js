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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChecklistExecutionsController = void 0;
const common_1 = require("@nestjs/common");
const checklist_executions_service_1 = require("./checklist-executions.service");
const create_checklist_execution_dto_1 = require("./dto/create-checklist-execution.dto");
const patch_checklist_item_dto_1 = require("./dto/patch-checklist-item.dto");
const complete_checklist_execution_dto_1 = require("./dto/complete-checklist-execution.dto");
const cancel_checklist_execution_dto_1 = require("./dto/cancel-checklist-execution.dto");
let ChecklistExecutionsController = class ChecklistExecutionsController {
    constructor(checklistService) {
        this.checklistService = checklistService;
    }
    async createExecution(workOrderId, dto) {
        return this.checklistService.createExecution(workOrderId, dto);
    }
    async getExecutions(workOrderId) {
        return this.checklistService.getExecutionsForWorkOrder(workOrderId);
    }
    async getExecutionById(executionId) {
        return this.checklistService.getExecutionById(executionId);
    }
    async updateItem(executionId, dto) {
        return this.checklistService.updateItem(executionId, dto);
    }
    async completeExecution(executionId, dto) {
        return this.checklistService.completeExecution(executionId, dto);
    }
    async cancelExecution(executionId, dto) {
        return this.checklistService.cancelExecution(executionId, dto);
    }
};
exports.ChecklistExecutionsController = ChecklistExecutionsController;
__decorate([
    (0, common_1.Post)('work-orders/:id/checklist-executions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_checklist_execution_dto_1.CreateChecklistExecutionDto]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "createExecution", null);
__decorate([
    (0, common_1.Get)('work-orders/:id/checklist-executions'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "getExecutions", null);
__decorate([
    (0, common_1.Get)('checklist-executions/:executionId'),
    __param(0, (0, common_1.Param)('executionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "getExecutionById", null);
__decorate([
    (0, common_1.Patch)('checklist-executions/:executionId/items'),
    __param(0, (0, common_1.Param)('executionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, patch_checklist_item_dto_1.PatchChecklistItemDto]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Post)('checklist-executions/:executionId/complete'),
    __param(0, (0, common_1.Param)('executionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, complete_checklist_execution_dto_1.CompleteChecklistExecutionDto]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "completeExecution", null);
__decorate([
    (0, common_1.Post)('checklist-executions/:executionId/cancel'),
    __param(0, (0, common_1.Param)('executionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_checklist_execution_dto_1.CancelChecklistExecutionDto]),
    __metadata("design:returntype", Promise)
], ChecklistExecutionsController.prototype, "cancelExecution", null);
exports.ChecklistExecutionsController = ChecklistExecutionsController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [checklist_executions_service_1.ChecklistExecutionsService])
], ChecklistExecutionsController);
//# sourceMappingURL=checklist-executions.controller.js.map