import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartments() {
    const users = await this.prisma.user.findMany({
      where: {
        department: { not: null },
      },
      select: {
        department: true,
      },
      distinct: ['department'],
    });
    return users.map((u) => u.department).filter(Boolean);
  }

  async getUsers(role?: string, includeInactive = false) {
    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        customRole: true,
      }
    });

    // Compute active work orders dynamically
    const usersWithWorkload = await Promise.all(
      users.map(async (user) => {
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
      })
    );

    return usersWithWorkload;
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
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

  async updateTechnicalProfile(id: string, dto: UpdateTechnicalProfileDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
      });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
      }

      if (user.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Dữ liệu nhân sự đã bị thay đổi bởi phiên làm việc khác.');
      }

      const updateData: any = {};
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

  async updateAvailability(id: string, dto: UpdateAvailabilityDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
      });
      if (!user) {
        throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
      }

      if (user.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Dữ liệu trạng thái nhân sự đã bị thay đổi bởi phiên làm việc khác.');
      }

      return tx.user.update({
        where: { id, version: dto.expectedVersion },
        data: {
          status: dto.status,
          version: { increment: 1 },
        },
      });
    });
  async updateRole(id: string, roleId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        roleId,
        version: { increment: 1 }
      },
      include: { customRole: true }
    });
  }
}
