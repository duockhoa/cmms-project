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
exports.WorkOrdersController = void 0;
const common_1 = require("@nestjs/common");
const work_orders_service_1 = require("./work-orders.service");
const inventory_service_1 = require("../inventory/inventory.service");
const inventory_dto_1 = require("../inventory/dto/inventory.dto");
const work_orders_dto_1 = require("./dto/work-orders.dto");
let WorkOrdersController = class WorkOrdersController {
    constructor(workOrdersService, inventoryService) {
        this.workOrdersService = workOrdersService;
        this.inventoryService = inventoryService;
    }
    findAll(status, priority, search, equipmentId) {
        return this.workOrdersService.findAll({ status, priority, search, equipmentId });
    }
    findOne(id) {
        return this.workOrdersService.findOne(id);
    }
    getWorkOrderTransactions(workOrderId) {
        return this.inventoryService.getWorkOrderTransactions(workOrderId);
    }
    create(data) {
        return this.workOrdersService.create(data);
    }
    updateStatus(id, body) {
        return this.workOrdersService.updateStatusLegacy(id, body);
    }
    assign(id, body) {
        return this.workOrdersService.assign(id, body);
    }
    start(id, body) {
        return this.workOrdersService.start(id, body);
    }
    pause(id, body) {
        return this.workOrdersService.pause(id, body);
    }
    resume(id, body) {
        return this.workOrdersService.resume(id, body);
    }
    complete(id, body) {
        return this.workOrdersService.complete(id, body);
    }
    verify(id, body) {
        return this.workOrdersService.verify(id, body);
    }
    close(id, body) {
        return this.workOrdersService.close(id, body);
    }
    cancel(id, body) {
        return this.workOrdersService.cancel(id, body);
    }
    addItem(id, itemDto) {
        return this.workOrdersService.addItem(id, itemDto);
    }
    materialReturn(workOrderId, body) {
        return this.inventoryService.materialReturn(workOrderId, body);
    }
    remove(id) {
        return this.workOrdersService.remove(id);
    }
};
exports.WorkOrdersController = WorkOrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('priority')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('equipmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':workOrderId/inventory-transactions'),
    __param(0, (0, common_1.Param)('workOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "getWorkOrderTransactions", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [work_orders_dto_1.CreateWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.AssignWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.StartWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.PauseWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.ResumeWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.CompleteWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.VerifyWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':id/close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.CloseWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "close", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.CancelWorkOrderDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, work_orders_dto_1.AddWorkOrderItemDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "addItem", null);
__decorate([
    (0, common_1.Post)(':workOrderId/material-returns'),
    __param(0, (0, common_1.Param)('workOrderId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, inventory_dto_1.MaterialReturnDto]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "materialReturn", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkOrdersController.prototype, "remove", null);
exports.WorkOrdersController = WorkOrdersController = __decorate([
    (0, common_1.Controller)('api/work-orders'),
    __metadata("design:paramtypes", [work_orders_service_1.WorkOrdersService,
        inventory_service_1.InventoryService])
], WorkOrdersController);
//# sourceMappingURL=work-orders.controller.js.map