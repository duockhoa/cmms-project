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
exports.AnalyticsPermissionGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let AnalyticsPermissionGuard = class AnalyticsPermissionGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const userId = request.headers['x-user-id'] || request.query?.actedById || request.body?.actedById;
        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            throw new common_1.UnauthorizedException('Yêu cầu truyền x-user-id hoặc actedById hợp lệ để xác thực');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId.trim() },
        });
        if (!user || !user.isActive) {
            throw new common_1.ForbiddenException('Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa');
        }
        request.user = {
            id: user.id,
            name: user.name,
            role: user.role,
            department: user.department,
            isActive: user.isActive,
        };
        if (user.role === 'OPERATOR') {
            throw new common_1.ForbiddenException('Vai trò OPERATOR không có quyền truy cập Analytics & Reports');
        }
        const url = request.url || '';
        if (url.includes('/cost') || url.includes('/financial')) {
            if (user.role === 'TECHNICIAN') {
                throw new common_1.ForbiddenException('Kỹ thuật viên (TECHNICIAN) không có quyền xem dữ liệu Chi phí & Tài chính');
            }
        }
        return true;
    }
};
exports.AnalyticsPermissionGuard = AnalyticsPermissionGuard;
exports.AnalyticsPermissionGuard = AnalyticsPermissionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsPermissionGuard);
//# sourceMappingURL=analytics-permission.guard.js.map