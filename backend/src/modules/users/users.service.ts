import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartments() {
    const [users, equipments] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          department: { not: null },
        },
        select: {
          department: true,
        },
        distinct: ['department'],
      }),
      this.prisma.equipment.findMany({
        where: {
          department: { not: null },
        },
        select: {
          department: true,
        },
        distinct: ['department'],
      }),
    ]);
    const deptSet = new Set<string>();
    users.forEach((u) => u.department && deptSet.add(u.department.trim()));
    equipments.forEach((e) => e.department && deptSet.add(e.department.trim()));
    return Array.from(deptSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  async getUsers(role?: string, includeInactive = false, department?: string) {
    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    if (!includeInactive) {
      whereClause.isActive = true;
    }
    if (department) {
      whereClause.department = { contains: department };
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

  async updateCustomPermissions(id: string, permissions: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        customPermissions: JSON.stringify(permissions || []),
        version: { increment: 1 },
      },
      include: { customRole: true },
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
      let mergedCount = 0;
      
      // Upsert each user — search by multiple criteria to avoid duplicates
      for (const hrmUser of hrmUsers) {
        // Skip users without id or username/email
        if (!hrmUser.id || (!hrmUser.email && !hrmUser.username)) continue;
        
        const hrmId = String(hrmUser.id);
        const hrmUsername = hrmUser.username ? String(hrmUser.username) : null;
        const hasRealEmail = hrmUser.email && hrmUser.email.includes('@');
        const dummyEmail = `${hrmUsername || hrmId}${dummyDomain}`;
        const emailOrUsername = hasRealEmail ? hrmUser.email : dummyEmail;
        const name = hrmUser.name || hrmUser.username || `User ${hrmId}`;
        const isUserActive = !inactiveStatuses.includes(String(hrmUser.status || '').toUpperCase());
        const position = hrmUser.position || hrmUser.role || null;
        
        // Build search conditions to find ALL possible matching records
        const orConditions: any[] = [
          { email: emailOrUsername },
          { email: dummyEmail },
          { id: hrmId },
        ];
        if (hasRealEmail) {
          orConditions.push({ email: hrmUser.email });
        }
        if (hrmUsername) {
          orConditions.push({ email: `${hrmUsername}${dummyDomain}` });
          orConditions.push({ email: `${hrmId}${dummyDomain}` });
        }

        // Find all potential duplicate records for this HRM user
        const existingUsers = await this.prisma.user.findMany({
          where: { OR: orConditions },
          orderBy: { createdAt: 'asc' },
        });

        if (existingUsers.length > 1) {
          // MERGE duplicates: keep the first (oldest) record, transfer important data, delete rest
          const primary = existingUsers[0];
          const duplicates = existingUsers.slice(1);

          // Collect best data from all records (prefer ADMIN role, non-null values)
          let bestRole = primary.role;
          let bestRoleId = primary.roleId;
          let bestCustomPerms = primary.customPermissions;
          for (const dup of duplicates) {
            if (dup.role === 'ADMIN') bestRole = 'ADMIN';
            if (dup.roleId && !bestRoleId) bestRoleId = dup.roleId;
            if (dup.customPermissions && !bestCustomPerms) bestCustomPerms = dup.customPermissions;
          }

          // Update primary record with merged data + fresh HRM info
          const bestEmail = hasRealEmail ? hrmUser.email : (primary.email.includes('@') && !primary.email.endsWith(dummyDomain) ? primary.email : dummyEmail);
          await this.prisma.user.update({
            where: { id: primary.id },
            data: {
              email: bestEmail,
              name: name,
              role: bestRole,
              roleId: bestRoleId,
              customPermissions: bestCustomPerms,
              department: hrmUser.department || primary.department || null,
              specialty: position || primary.specialty || null,
              isActive: isUserActive,
            },
          });

          // Delete duplicate records
          for (const dup of duplicates) {
            try {
              await this.prisma.user.delete({ where: { id: dup.id } });
            } catch (delErr: any) {
              console.warn(`Không thể xóa bản ghi trùng ${dup.id} (${dup.email}): ${delErr?.message}`);
            }
          }
          mergedCount += duplicates.length;
        } else if (existingUsers.length === 1) {
          // Single existing record — just update it
          const existing = existingUsers[0];
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              name: name,
              department: hrmUser.department || null,
              specialty: position || undefined,
              isActive: isUserActive,
            },
          });
        } else {
          // No existing record — create new
          try {
            await this.prisma.user.create({
              data: {
                id: hrmId,
                email: emailOrUsername,
                name: name,
                role: defaultRole,
                department: hrmUser.department || null,
                specialty: position || null,
                isActive: isUserActive,
              },
            });
          } catch (createErr: any) {
            // Handle race condition or id conflict
            console.warn(`Sync create conflict for HRM user ${hrmId}: ${createErr?.message}`);
          }
        }
        syncedCount++;
      }

      return { success: true, syncedCount, mergedCount };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(`Lỗi kết nối tới HRM: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
