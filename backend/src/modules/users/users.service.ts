import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
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
  }

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

  async createUser(data: any) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role || 'USER',
        roleId: data.roleId || null,
        department: data.department || null,
        specialty: data.specialty || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: { customRole: true }
    });
  }

  async updateUser(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.roleId !== undefined) updateData.roleId = data.roleId || null;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.specialty !== undefined) updateData.specialty = data.specialty;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }
      },
      include: { customRole: true }
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async syncHrmUsers(accessToken: string) {
    const hrmApiUrl = process.env.HRM_API_URL;
    if (!hrmApiUrl) {
      throw new HttpException('Chưa cấu hình HRM_API_URL trong biến môi trường', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      // Call HRM API
      const response = await fetch(`${hrmApiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new HttpException('Tài khoản của bạn không có quyền lấy danh sách người dùng từ HRM', HttpStatus.FORBIDDEN);
        }
        throw new HttpException(`Lỗi khi gọi API HRM: ${response.statusText}`, HttpStatus.BAD_REQUEST);
      }

      const rawData = await response.json();
      const hrmUsers = Array.isArray(rawData)
        ? rawData
        : (rawData.data || rawData.users || rawData.items || rawData.results || []);
      
      if (!Array.isArray(hrmUsers) || hrmUsers.length === 0) {
        if (!Array.isArray(rawData)) {
          throw new HttpException('Dữ liệu từ HRM không đúng định dạng danh sách người dùng', HttpStatus.BAD_REQUEST);
        }
      }

      const defaultRole = process.env.DEFAULT_SYNC_ROLE || 'USER';
      const dummyDomain = process.env.HRM_DUMMY_EMAIL_DOMAIN || '@local.hrm';
      const inactiveStatusesStr = process.env.HRM_INACTIVE_STATUSES || 'INACTIVE,BANNED,0';
      const inactiveStatuses = inactiveStatusesStr.split(',').map(s => s.trim().toUpperCase());

      let syncedCount = 0;
      
      // Upsert each user
      for (const hrmUser of hrmUsers) {
        // Skip users without id or username/email
        if (!hrmUser.id || (!hrmUser.email && !hrmUser.username)) continue;
        
        const emailOrUsername = (hrmUser.email && hrmUser.email.includes('@'))
          ? hrmUser.email
          : `${hrmUser.username || hrmUser.id}${dummyDomain}`;
        const name = hrmUser.name || hrmUser.username || `User ${hrmUser.id}`;
        const isUserActive = !inactiveStatuses.includes(String(hrmUser.status || '').toUpperCase());
        const position = hrmUser.position || hrmUser.role || null;
        
        await this.prisma.user.upsert({
          where: { email: emailOrUsername },
          update: {
            name: name,
            department: hrmUser.department || null,
            specialty: position || undefined,
            isActive: isUserActive,
          },
          create: {
            id: String(hrmUser.id),
            email: emailOrUsername,
            name: name,
            role: defaultRole, // Configurable via .env
            department: hrmUser.department || null,
            specialty: position || null,
            isActive: isUserActive,
          }
        });
        syncedCount++;
      }

      return { success: true, syncedCount };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(`Lỗi kết nối tới HRM: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
