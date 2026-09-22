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
          // MERGE duplicates:
          // Ưu tiên bản ghi có id khớp với hrmId, nếu không thì lấy bản ghi cũ nhất
          const primary = existingUsers.find((u) => u.id === hrmId) || existingUsers[0];
          const duplicates = existingUsers.filter((u) => u.id !== primary.id);

          // Thu thập thông tin tốt nhất (ưu tiên role ADMIN, roleId, quyền tùy chỉnh)
          let bestRole = primary.role;
          let bestRoleId = primary.roleId;
          let bestCustomPerms = primary.customPermissions;
          for (const dup of duplicates) {
            if (dup.role === 'ADMIN') bestRole = 'ADMIN';
            if (dup.roleId && !bestRoleId) bestRoleId = dup.roleId;
            if (dup.customPermissions && !bestCustomPerms) bestCustomPerms = dup.customPermissions;
          }

          const bestEmail = hasRealEmail
            ? hrmUser.email
            : (primary.email.includes('@') && !primary.email.endsWith(dummyDomain) ? primary.email : dummyEmail);

          // BƯỚC 1: Đổi email của tất cả bản ghi trùng sang email tạm thời
          // để tránh lỗi Unique constraint failed trên `User_email_key`
          for (let i = 0; i < duplicates.length; i++) {
            const dup = duplicates[i];
            try {
              await this.prisma.user.update({
                where: { id: dup.id },
                data: { email: `merged_${dup.id}_${Date.now()}_${i}@merge.local` },
              });
            } catch (tempErr: any) {
              console.warn(`Không thể đổi email tạm cho dup ${dup.id}:`, tempErr?.message);
            }
          }

          // BƯỚC 2: Chuyển toàn bộ quan hệ foreign key từ duplicate sang primary để khi xóa không bị lỗi ràng buộc
          for (const dup of duplicates) {
            try {
              await this.prisma.maintenanceRequest.updateMany({ where: { reporterId: dup.id }, data: { reporterId: primary.id } });
              await this.prisma.maintenanceRequest.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
              await this.prisma.operationLog.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
              await this.prisma.operationLog.updateMany({ where: { voidedById: dup.id }, data: { voidedById: primary.id } });
              await this.prisma.utilityReading.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
              await this.prisma.utilitySystemStatusLog.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
              await this.prisma.workOrder.updateMany({ where: { assignedTechnicianId: dup.id }, data: { assignedTechnicianId: primary.id } });
              await this.prisma.workOrder.updateMany({ where: { watcherId: dup.id }, data: { watcherId: primary.id } });
              await this.prisma.workOrder.updateMany({ where: { classificationReporterId: dup.id }, data: { classificationReporterId: primary.id } });
              await this.prisma.workOrderExecutionLog.updateMany({ where: { performedById: dup.id }, data: { performedById: primary.id } });
              await this.prisma.checklistExecution.updateMany({ where: { executedById: dup.id }, data: { executedById: primary.id } });
              await this.prisma.checklistExecution.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
              await this.prisma.maintenanceSchedule.updateMany({ where: { createdById: dup.id }, data: { createdById: primary.id } });
              await this.prisma.maintenanceSchedule.updateMany({ where: { assignedTechnicianId: dup.id }, data: { assignedTechnicianId: primary.id } });
              await this.prisma.maintenanceSchedule.updateMany({ where: { pausedById: dup.id }, data: { pausedById: primary.id } });
              await this.prisma.maintenanceSchedule.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
              await this.prisma.workflowHistory.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
              await this.prisma.scheduleHistory.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
              await this.prisma.inventoryTransaction.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
              await this.prisma.location.updateMany({ where: { responsibleTechId: dup.id }, data: { responsibleTechId: primary.id } });
              await this.prisma.attachment.updateMany({ where: { uploadedById: dup.id }, data: { uploadedById: primary.id } });
            } catch (relErr: any) {
              console.warn(`Lỗi chuyển quan hệ từ dup ${dup.id} sang ${primary.id}:`, relErr?.message);
            }
          }

          // BƯỚC 3: Xóa các bản ghi duplicate
          for (const dup of duplicates) {
            try {
              await this.prisma.user.delete({ where: { id: dup.id } });
            } catch (delErr: any) {
              console.warn(`Không thể xóa bản ghi trùng ${dup.id}:`, delErr?.message);
              // Nếu không xóa được, vô hiệu hóa tài khoản duplicate
              try {
                await this.prisma.user.update({
                  where: { id: dup.id },
                  data: { isActive: false },
                });
              } catch (_) {}
            }
          }

          // BƯỚC 4: Cập nhật bản ghi chính (primary) với dữ liệu đã gộp và email chuẩn (an toàn tuyệt đối)
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

          mergedCount += duplicates.length;
        } else if (existingUsers.length === 1) {
          // Chỉ có 1 bản ghi — cập nhật thông tin
          const existing = existingUsers[0];
          const updateData: any = {
            name: name,
            department: hrmUser.department || null,
            specialty: position || undefined,
            isActive: isUserActive,
          };
          if (hasRealEmail && existing.email !== hrmUser.email) {
            const conflictUser = await this.prisma.user.findUnique({ where: { email: hrmUser.email } });
            if (!conflictUser || conflictUser.id === existing.id) {
              updateData.email = hrmUser.email;
            }
          }
          await this.prisma.user.update({
            where: { id: existing.id },
            data: updateData,
          });
        } else {
          // Chưa có bản ghi nào — kiểm tra email trước khi tạo mới để tránh xung đột
          const conflictUser = await this.prisma.user.findUnique({ where: { email: emailOrUsername } });
          if (conflictUser) {
            await this.prisma.user.update({
              where: { id: conflictUser.id },
              data: {
                name: name,
                department: hrmUser.department || null,
                specialty: position || null,
                isActive: isUserActive,
              },
            });
          } else {
            try {
              const defaultUserRole = await this.prisma.role.findFirst({ where: { name: 'Người dùng' } });
              await this.prisma.user.create({
                data: {
                  id: hrmId,
                  email: emailOrUsername,
                  name: name,
                  role: defaultRole,
                  roleId: defaultUserRole?.id || null,
                  department: hrmUser.department || null,
                  specialty: position || null,
                  isActive: isUserActive,
                },
              });
            } catch (createErr: any) {
              console.warn(`Sync create conflict for HRM user ${hrmId}: ${createErr?.message}`);
            }
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
