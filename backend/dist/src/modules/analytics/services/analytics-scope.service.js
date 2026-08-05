"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsScopeService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsScopeService = class AnalyticsScopeService {
    buildServerEnforcedScope(user) {
        if (!user || !user.isActive) {
            throw new common_1.ForbiddenException('Tài khoản chưa xác thực hoặc đã bị vô hiệu hóa');
        }
        switch (user.role) {
            case 'ADMIN':
                return {};
            case 'MANAGER':
                if (user.department && user.department.trim()) {
                    return { department: user.department.trim() };
                }
                return {};
            case 'TECHNICIAN':
                return {
                    schedule: {
                        assignedTechnicianId: user.id,
                    },
                };
            case 'OPERATOR':
                throw new common_1.ForbiddenException('Vai trò OPERATOR không có quyền truy cập Analytics & Reports');
            default:
                throw new common_1.ForbiddenException(`Vai trò '${user.role}' không được phép truy cập Analytics`);
        }
    }
    combineFilters(serverEnforcedScope, userRequestedFilters) {
        const filters = [];
        if (serverEnforcedScope && Object.keys(serverEnforcedScope).length > 0) {
            filters.push(serverEnforcedScope);
        }
        if (userRequestedFilters && Object.keys(userRequestedFilters).length > 0) {
            filters.push(userRequestedFilters);
        }
        if (filters.length === 0)
            return {};
        if (filters.length === 1)
            return filters[0];
        return { AND: filters };
    }
};
exports.AnalyticsScopeService = AnalyticsScopeService;
exports.AnalyticsScopeService = AnalyticsScopeService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsScopeService);
//# sourceMappingURL=analytics-scope.service.js.map