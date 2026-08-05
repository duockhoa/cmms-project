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
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("./permissions.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        const request = context.switchToHttp().getRequest();
        const actor = request.user;
        if (!actor) {
            return false;
        }
        const dbUser = await this.prisma.user.findUnique({ where: { id: actor.id } });
        if (!dbUser || !dbUser.isActive) {
            throw new common_1.ForbiddenException('User is inactive or profile does not exist.');
        }
        if (dbUser.role === 'ADMIN') {
            return true;
        }
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const userPermissions = [];
        if (dbUser.role === 'MANAGER') {
            userPermissions.push('EQUIPMENT_READ', 'WORK_ORDER_WRITE', 'REQUEST_APPROVE', 'INVENTORY_READ', 'INVENTORY_WRITE');
        }
        else if (dbUser.role === 'TECHNICIAN') {
            userPermissions.push('EQUIPMENT_READ', 'WORK_ORDER_EXECUTE', 'INVENTORY_READ');
        }
        const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            throw new common_1.ForbiddenException('You do not possess the required permission scope for this action.');
        }
        const reqParamId = request.params.id;
        if (reqParamId && dbUser.role === 'TECHNICIAN' && requiredPermissions.includes('WORK_ORDER_EXECUTE')) {
            const workOrder = await this.prisma.workOrder.findUnique({
                where: { id: reqParamId },
            });
            if (workOrder && workOrder.technicianName !== dbUser.name) {
                throw new common_1.ForbiddenException('Access denied: You are not assigned to this work order.');
            }
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map