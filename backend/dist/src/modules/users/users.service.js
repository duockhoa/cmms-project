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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUsers(role, includeInactive = false) {
        const whereClause = {};
        if (role) {
            whereClause.role = role;
        }
        if (!includeInactive) {
            whereClause.isActive = true;
        }
        const users = await this.prisma.user.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
        });
        const usersWithWorkload = await Promise.all(users.map(async (user) => {
            const activeWorkOrderCount = await this.prisma.workOrder.count({
                where: {
                    technicianName: user.name,
                    status: {
                        in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'],
                    },
                },
            });
            return {
                ...user,
                activeWorkOrderCount,
            };
        }));
        return usersWithWorkload;
    }
    async getUserById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
        }
        const activeWorkOrderCount = await this.prisma.workOrder.count({
            where: {
                technicianName: user.name,
                status: {
                    in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'],
                },
            },
        });
        return {
            ...user,
            activeWorkOrderCount,
        };
    }
    async updateTechnicalProfile(id, dto) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id },
            });
            if (!user) {
                throw new common_1.NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
            }
            if (user.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Dữ liệu nhân sự đã bị thay đổi bởi phiên làm việc khác.');
            }
            const updateData = {};
            if (dto.specialty !== undefined) {
                updateData.specialty = dto.specialty;
            }
            if (dto.isActive !== undefined) {
                updateData.isActive = dto.isActive;
            }
            return tx.user.update({
                where: { id, version: dto.expectedVersion },
                data: {
                    ...updateData,
                    version: { increment: 1 },
                },
            });
        });
    }
    async updateAvailability(id, dto) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id },
            });
            if (!user) {
                throw new common_1.NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
            }
            if (user.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Dữ liệu trạng thái nhân sự đã bị thay đổi bởi phiên làm việc khác.');
            }
            return tx.user.update({
                where: { id, version: dto.expectedVersion },
                data: {
                    status: dto.status,
                    version: { increment: 1 },
                },
            });
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map