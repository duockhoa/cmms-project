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
exports.SchedulesController = void 0;
const common_1 = require("@nestjs/common");
const schedules_service_1 = require("./schedules.service");
const schedules_dto_1 = require("./dto/schedules.dto");
let SchedulesController = class SchedulesController {
    constructor(schedulesService) {
        this.schedulesService = schedulesService;
    }
    findAll(query) {
        return this.schedulesService.findAll(query);
    }
    processDueSchedules(actedById, referenceTime) {
        return this.schedulesService.processDueSchedules(actedById, referenceTime);
    }
    findOne(id) {
        return this.schedulesService.findOne(id);
    }
    getHistory(id) {
        return this.schedulesService.getHistory(id);
    }
    create(dto) {
        return this.schedulesService.create(dto);
    }
    update(id, dto) {
        return this.schedulesService.update(id, dto);
    }
    activate(id, dto) {
        return this.schedulesService.activate(id, dto);
    }
    pause(id, dto) {
        return this.schedulesService.pause(id, dto);
    }
    complete(id, dto) {
        return this.schedulesService.complete(id, dto);
    }
    cancel(id, dto) {
        return this.schedulesService.cancel(id, dto);
    }
    generateWorkOrder(id, dto) {
        return this.schedulesService.generateWorkOrder(id, dto);
    }
    generateWorkOrderAlias(id, dto) {
        return this.schedulesService.generateWorkOrder(id, dto);
    }
    remove(id) {
        return this.schedulesService.remove(id);
    }
};
exports.SchedulesController = SchedulesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('process-due'),
    __param(0, (0, common_1.Body)('actedById')),
    __param(1, (0, common_1.Body)('referenceTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "processDueSchedules", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedules_dto_1.CreateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.UpdateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.ActivateScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.PauseScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.CompleteScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.CancelScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/generate-work-order'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.GenerateWorkOrderDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "generateWorkOrder", null);
__decorate([
    (0, common_1.Post)(':id/generate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedules_dto_1.GenerateWorkOrderDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "generateWorkOrderAlias", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "remove", null);
exports.SchedulesController = SchedulesController = __decorate([
    (0, common_1.Controller)('api/maintenance-schedules'),
    __metadata("design:paramtypes", [schedules_service_1.SchedulesService])
], SchedulesController);
//# sourceMappingURL=schedules.controller.js.map