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
exports.RequestsController = void 0;
const common_1 = require("@nestjs/common");
const requests_service_1 = require("./requests.service");
const create_request_dto_1 = require("./dto/create-request.dto");
const approve_request_dto_1 = require("./dto/approve-request.dto");
const reject_request_dto_1 = require("./dto/reject-request.dto");
const return_request_dto_1 = require("./dto/return-request.dto");
const resubmit_request_dto_1 = require("./dto/resubmit-request.dto");
const cancel_request_dto_1 = require("./dto/cancel-request.dto");
let RequestsController = class RequestsController {
    constructor(requestsService) {
        this.requestsService = requestsService;
    }
    findAll(status, priority, search) {
        return this.requestsService.findAll({ status, priority, search });
    }
    findOne(id) {
        return this.requestsService.findOne(id);
    }
    getHistory(id) {
        return this.requestsService.getHistory(id);
    }
    create(data) {
        return this.requestsService.create(data);
    }
    approve(id, body) {
        return this.requestsService.approve(id, body);
    }
    reject(id, body) {
        return this.requestsService.reject(id, body);
    }
    returnRequest(id, body) {
        return this.requestsService.returnRequest(id, body);
    }
    resubmitRequest(id, body) {
        return this.requestsService.resubmitRequest(id, body);
    }
    cancelRequest(id, body) {
        return this.requestsService.cancelRequest(id, body);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('priority')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_request_dto_1.CreateMaintenanceRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_request_dto_1.ApproveMaintenanceRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_request_dto_1.RejectMaintenanceRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/return'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, return_request_dto_1.ReturnRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "returnRequest", null);
__decorate([
    (0, common_1.Post)(':id/resubmit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, resubmit_request_dto_1.ResubmitRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "resubmitRequest", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cancel_request_dto_1.CancelRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "cancelRequest", null);
exports.RequestsController = RequestsController = __decorate([
    (0, common_1.Controller)('api/requests'),
    __metadata("design:paramtypes", [requests_service_1.RequestsService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map