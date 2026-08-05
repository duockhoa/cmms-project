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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthController = class AuthController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMe(req) {
        const actor = req.user;
        let dbUser = await this.prisma.user.findUnique({
            where: { id: actor.id },
        });
        if (!dbUser && actor.email) {
            dbUser = await this.prisma.user.findFirst({
                where: { email: actor.email },
            });
        }
        if (!dbUser) {
            throw new common_1.NotFoundException('User profile is not synchronized with CMMS database.');
        }
        const permissions = [];
        if (dbUser.role === 'ADMIN') {
            permissions.push('ALL');
        }
        else if (dbUser.role === 'MANAGER') {
            permissions.push('EQUIPMENT_READ', 'WORK_ORDER_WRITE', 'REQUEST_APPROVE', 'INVENTORY_READ');
        }
        else if (dbUser.role === 'TECHNICIAN') {
            permissions.push('EQUIPMENT_READ', 'WORK_ORDER_EXECUTE', 'INVENTORY_READ');
        }
        return {
            authenticated: true,
            user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
                status: dbUser.status,
                isActive: dbUser.isActive,
            },
            permissions: permissions,
            scope: {
                department: dbUser.role === 'MANAGER' ? 'Phân xưởng A' : 'ALL',
                assignedOnly: dbUser.role === 'TECHNICIAN',
            },
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map