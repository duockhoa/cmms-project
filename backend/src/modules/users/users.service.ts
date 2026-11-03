import { selectHrmIdentity, isHrmProfileActive, buildIdentityAudit } from '../auth/identity-resolution';
import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { getUserDepartments, isGlobalAdmin, isUserInDepartment } from '../../common/utils/rbac.helper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartments() {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        dataSource: 'HRM',
        department: { not: null },
      },
      select: {
        department: true,
        managedDepartments: true,
      },
      distinct: ['department'],
    });
    const deptSet = new Set<string>();
    users.forEach((u) => {
      getUserDepartments(u).forEach((d) => deptSet.add(d));
    });
    return Array.from(deptSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
  }

  private extractHrmUsers(rawData: any): any[] | null {
    const candidates = [
      rawData,
      rawData?.data,
      rawData?.users,
      rawData?.items,
      rawData?.results,
      rawData?.data?.users,
      rawData?.data?.items,
      rawData?.data?.results,
    ];
    return candidates.find(Array.isArray) || null;
  }

  private getHrmPagination(rawData: any, itemCount: number) {
    const sources = [rawData?.meta, rawData?.pagination, rawData?.data?.meta, rawData?.data?.pagination, rawData];
    const valueFrom = (keys: string[]) => {
      for (const source of sources) {
        for (const key of keys) {
          const value = Number(source?.[key]);
          if (Number.isFinite(value) && value > 0) return value;
        }
      }
      return undefined;
    };

    const currentPage = valueFrom(['page', 'currentPage', 'current_page']) || 1;
    const limit = valueFrom(['limit', 'pageSize', 'page_size', 'perPage', 'per_page']) || itemCount;
    const total = valueFrom(['total', 'totalItems', 'total_items', 'count']);
    const declaredTotalPages = valueFrom(['totalPages', 'total_pages', 'pageCount', 'page_count']);
    const totalPages = declaredTotalPages || (total && limit ? Math.ceil(total / limit) : 1);

    return { currentPage, totalPages };
  }

  private async fetchHrmUsersSnapshot(hrmApiUrl: string, accessToken: string): Promise<any[]> {
    const fetchPage = async (page?: number) => {
      const url = new URL(`${hrmApiUrl.replace(/\/$/, '')}/users`);
      if (page !== undefined) url.searchParams.set('page', String(page));
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new HttpException('Tài khoản của bạn không có quyền lấy danh sách người dùng từ HRM', HttpStatus.FORBIDDEN);
        }
        throw new HttpException(`Lỗi khi gọi API HRM: ${response.statusText}`, HttpStatus.BAD_REQUEST);
      }

      const rawData = await response.json();
      const users = this.extractHrmUsers(rawData);
      if (!users) {
        throw new HttpException('Dữ liệu từ HRM không đúng định dạng danh sách người dùng', HttpStatus.BAD_REQUEST);
      }
      return { rawData, users };
    };

    const firstPage = await fetchPage();
    const pagination = this.getHrmPagination(firstPage.rawData, firstPage.users.length);
    if (pagination.currentPage !== 1) {
      throw new HttpException('HRM không trả về trang đầu tiên của danh sách nhân sự', HttpStatus.BAD_REQUEST);
    }
    if (pagination.totalPages > 1000) {
      throw new HttpException('Số trang dữ liệu HRM vượt quá giới hạn an toàn', HttpStatus.BAD_REQUEST);
    }

    const allUsers = [...firstPage.users];
    for (let page = 2; page <= pagination.totalPages; page++) {
      const pageResult = await fetchPage(page);
      const pagePagination = this.getHrmPagination(pageResult.rawData, pageResult.users.length);
      if (pagePagination.currentPage !== page) {
        throw new HttpException(`HRM trả sai dữ liệu phân trang tại trang ${page}`, HttpStatus.BAD_REQUEST);
      }
      allUsers.push(...pageResult.users);
    }

    const uniqueUsers = new Map<string, any>();
    for (const user of allUsers) {
      if (user?.id !== undefined && user?.id !== null) {
        if (uniqueUsers.has(String(user.id))) throw new HttpException('Duplicate HRM identity. Synchronization aborted.', HttpStatus.CONFLICT);
        uniqueUsers.set(String(user.id), user);
      }
    }
    if (uniqueUsers.size === 0) {
      throw new HttpException('HRM trả về danh sách nhân sự rỗng; đã hủy đồng bộ để bảo vệ dữ liệu', HttpStatus.BAD_REQUEST);
    }
    return Array.from(uniqueUsers.values());
  }

  private async fetchHrmDepartmentsSnapshot(hrmApiUrl: string, accessToken: string): Promise<any[]> {
    try {
      const url = new URL(`${hrmApiUrl.replace(/\/$/, '')}/departments`);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      if (!response.ok) return [];
      const rawData = await response.json();
      const candidates = [
        rawData,
        rawData?.data,
        rawData?.departments,
        rawData?.items,
        rawData?.results,
      ];
      return candidates.find(Array.isArray) || [];
    } catch {
      return [];
    }
  }

  async getAssignees(department?: string) {
    const whereClause: any = { isActive: true, dataSource: 'HRM' };
    if (department) {
      whereClause.OR = [
        { department: { equals: department } },
        { managedDepartments: { contains: department } },
      ];
    }
    const list = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        department: true,
        managedDepartments: true,
        specialty: true,
        status: true,
        avatar: true,
      },
    });
    const filtered = department
      ? list.filter((u) => isUserInDepartment(u, department))
      : list;
    return filtered.map((u) => ({
      ...u,
      managedDepartments: getUserDepartments(u),
    }));
  }

  async getUsers(role?: string, includeInactive = false, department?: string, currentUser?: any) {
    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    if (!includeInactive) {
      whereClause.isActive = true;
    }
    if (department) {
      whereClause.OR = [
        { department: { equals: department } },
        { managedDepartments: { contains: department } },
      ];
    }

    const isAdmin = isGlobalAdmin(currentUser);

    const rawUsers = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managedDepartments: true,
        specialty: true,
        status: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        roleId: isAdmin ? true : false,
        customRole: isAdmin
          ? {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
              },
            }
          : {
              select: {
                name: true,
              },
            },
        customPermissions: isAdmin ? true : false,
      },
    });

    const users = department
      ? rawUsers.filter((u) => isUserInDepartment(u, department))
      : rawUsers;

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
          managedDepartments: getUserDepartments(user),
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

    let roleString = user.role;
    if (roleId) {
      const targetRole = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (targetRole) {
        const lowerName = targetRole.name.toLowerCase();
        if (lowerName.includes('quản lý') || lowerName.includes('manager')) {
          roleString = 'MANAGER';
        } else if (lowerName.includes('kỹ thuật') || lowerName.includes('technician')) {
          roleString = 'TECHNICIAN';
        } else if (lowerName.includes('quản trị') || lowerName.includes('admin')) {
          roleString = 'ADMIN';
        } else if (lowerName.includes('người dùng') || lowerName.includes('user')) {
          roleString = 'USER';
        }
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        roleId,
        role: roleString,
        version: { increment: 1 }
      },
      include: { customRole: true }
    });
    JwtStrategy.invalidateCache(id);
    return updated;
  }

  async updateCustomPermissions(id: string, permissions: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID: ${id}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        customPermissions: JSON.stringify(permissions || []),
        version: { increment: 1 },
      },
      include: { customRole: true },
    });
    JwtStrategy.invalidateCache(id);
    return updated;
  }

  async createUser(data: any) {
    const depts = getUserDepartments({
      department: data.department,
      managedDepartments: data.managedDepartments,
    });
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role || 'USER',
        roleId: data.roleId || null,
        department: data.department || depts[0] || null,
        managedDepartments: depts.length > 0 ? JSON.stringify(depts) : null,
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
    if (data.managedDepartments !== undefined || data.department !== undefined) {
      const depts = getUserDepartments({
        department: data.department !== undefined ? data.department : user.department,
        managedDepartments: data.managedDepartments !== undefined ? data.managedDepartments : user.managedDepartments,
      });
      updateData.managedDepartments = depts.length > 0 ? JSON.stringify(depts) : null;
    }
    if (data.specialty !== undefined) updateData.specialty = data.specialty;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 }
      },
      include: { customRole: true }
    });
    JwtStrategy.invalidateCache(id);
    return {
      ...updated,
      managedDepartments: getUserDepartments(updated),
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID: ${id}`);
    }

    // Tìm xem có tài khoản khác cùng người (cùng tên hoặc cùng email/mã HRM) để gộp quan hệ sang không
    const otherUser = await this.prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          { name: user.name },
          ...(user.email ? [{ email: user.email }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const targetUserId = otherUser ? otherUser.id : null;

    return await this.prisma.$transaction(async (tx) => {
      if (targetUserId) {
        // Nếu có tài khoản tương ứng, chuyển toàn bộ quan hệ sang tài khoản đó rồi xóa tài khoản này
        await tx.maintenanceRequest.updateMany({ where: { reporterId: id }, data: { reporterId: targetUserId } });
        await tx.maintenanceRequest.updateMany({ where: { cancelledById: id }, data: { cancelledById: targetUserId } });
        await tx.operationLog.updateMany({ where: { recordedById: id }, data: { recordedById: targetUserId } });
        await tx.operationLog.updateMany({ where: { voidedById: id }, data: { voidedById: targetUserId } });
        await tx.utilityReading.updateMany({ where: { recordedById: id }, data: { recordedById: targetUserId } });
        await tx.utilitySystemStatusLog.updateMany({ where: { recordedById: id }, data: { recordedById: targetUserId } });
        await tx.workOrder.updateMany({ where: { assignedTechnicianId: id }, data: { assignedTechnicianId: targetUserId } });
        await tx.workOrder.updateMany({ where: { watcherId: id }, data: { watcherId: targetUserId } });
        await tx.workOrder.updateMany({ where: { classificationReporterId: id }, data: { classificationReporterId: targetUserId } });
        await tx.workOrderExecutionLog.updateMany({ where: { performedById: id }, data: { performedById: targetUserId } });
        await tx.checklistExecution.updateMany({ where: { executedById: id }, data: { executedById: targetUserId } });
        await tx.checklistExecution.updateMany({ where: { cancelledById: id }, data: { cancelledById: targetUserId } });
        await tx.maintenanceSchedule.updateMany({ where: { createdById: id }, data: { createdById: targetUserId } });
        await tx.maintenanceSchedule.updateMany({ where: { assignedTechnicianId: id }, data: { assignedTechnicianId: targetUserId } });
        await tx.maintenanceSchedule.updateMany({ where: { pausedById: id }, data: { pausedById: targetUserId } });
        await tx.maintenanceSchedule.updateMany({ where: { cancelledById: id }, data: { cancelledById: targetUserId } });
        await tx.workflowHistory.updateMany({ where: { actedById: id }, data: { actedById: targetUserId } });
        await tx.scheduleHistory.updateMany({ where: { actedById: id }, data: { actedById: targetUserId } });
        await tx.inventoryTransaction.updateMany({ where: { actedById: id }, data: { actedById: targetUserId } });
        await tx.location.updateMany({ where: { responsibleTechId: id }, data: { responsibleTechId: targetUserId } });
        await tx.attachment.updateMany({ where: { uploadedById: id }, data: { uploadedById: targetUserId } });
        await tx.notification.updateMany({ where: { userId: id }, data: { userId: targetUserId } });

        // Đổi email tạm để tránh xung đột duy nhất trước khi xóa
        await tx.user.update({
          where: { id },
          data: { email: `del_${id}_${Date.now()}@temp.merge` },
        });

        return tx.user.delete({ where: { id } });
      }

      // Nếu không có tài khoản trùng, kiểm tra xem có lịch sử kiểm toán bắt buộc không (onDelete: Restrict)
      const [opCount, utCount, usCount, schedCount, execCount, chkCount] = await Promise.all([
        tx.operationLog.count({ where: { recordedById: id } }),
        tx.utilityReading.count({ where: { recordedById: id } }),
        tx.utilitySystemStatusLog.count({ where: { recordedById: id } }),
        tx.maintenanceSchedule.count({ where: { createdById: id } }),
        tx.workOrderExecutionLog.count({ where: { performedById: id } }),
        tx.checklistExecution.count({ where: { executedById: id } }),
      ]);

      const hasRestrictedHistory = (opCount + utCount + usCount + schedCount + execCount + chkCount) > 0;

      if (hasRestrictedHistory) {
        // Soft delete: Vô hiệu hóa tài khoản và giải phóng email để tài khoản biến mất khỏi danh sách
        return tx.user.update({
          where: { id },
          data: {
            isActive: false,
            email: `deleted_${id}_${Date.now()}@deleted.local`,
          },
        });
      }

      // Xóa quan hệ nullable
      await tx.maintenanceRequest.updateMany({ where: { reporterId: id }, data: { reporterId: null } });
      await tx.maintenanceRequest.updateMany({ where: { cancelledById: id }, data: { cancelledById: null } });
      await tx.operationLog.updateMany({ where: { voidedById: id }, data: { voidedById: null } });
      await tx.workOrder.updateMany({ where: { assignedTechnicianId: id }, data: { assignedTechnicianId: null } });
      await tx.workOrder.updateMany({ where: { watcherId: id }, data: { watcherId: null } });
      await tx.workOrder.updateMany({ where: { classificationReporterId: id }, data: { classificationReporterId: null } });
      await tx.checklistExecution.updateMany({ where: { cancelledById: id }, data: { cancelledById: null } });
      await tx.maintenanceSchedule.updateMany({ where: { assignedTechnicianId: id }, data: { assignedTechnicianId: null } });
      await tx.maintenanceSchedule.updateMany({ where: { pausedById: id }, data: { pausedById: null } });
      await tx.maintenanceSchedule.updateMany({ where: { cancelledById: id }, data: { cancelledById: null } });
      await tx.workflowHistory.updateMany({ where: { actedById: id }, data: { actedById: null } });
      await tx.scheduleHistory.updateMany({ where: { actedById: id }, data: { actedById: null } });
      await tx.inventoryTransaction.updateMany({ where: { actedById: id }, data: { actedById: null } });
      await tx.location.updateMany({ where: { responsibleTechId: id }, data: { responsibleTechId: null } });
      await tx.attachment.updateMany({ where: { uploadedById: id }, data: { uploadedById: null } });
      await tx.notification.deleteMany({ where: { userId: id } });

      return tx.user.delete({ where: { id } });
    });
  }

  async syncHrmUsers(accessToken: string) {
    const hrmApiUrl = process.env.HRM_API_URL;
    if (!hrmApiUrl) {
      throw new HttpException('Chưa cấu hình HRM_API_URL trong biến môi trường', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const syncStartedAt = new Date();
      const [hrmUsers, hrmDepartments] = await Promise.all([
        this.fetchHrmUsersSnapshot(hrmApiUrl, accessToken),
        this.fetchHrmDepartmentsSnapshot(hrmApiUrl, accessToken),
      ]);

      // Xây dựng bản đồ bộ phận quản lý / kiêm nhiệm từ API /departments (trường team_lead & users) của HRM
      const deptMapByHrmId = new Map<string, Set<string>>();
      const teamLeadHrmIds = new Set<string>();

      const addDeptToMap = (map: Map<string, Set<string>>, key: string | null | undefined, deptName: string) => {
        const cleanKey = (key || '').trim().toLowerCase();
        if (!cleanKey || !deptName) return;
        const set = map.get(cleanKey) || new Set<string>();
        set.add(deptName);
        map.set(cleanKey, set);
      };

      for (const dept of hrmDepartments) {
        if (!dept || dept.deleted_at || !dept.name) continue;
        const deptName = String(dept.name).trim();
        if (!deptName) continue;

        if (dept.team_lead !== undefined && dept.team_lead !== null) {
          const leadId = String(dept.team_lead).trim();
          teamLeadHrmIds.add(leadId);
          addDeptToMap(deptMapByHrmId, leadId, deptName);
        }
        if (dept.team_lead_user) {
          if (dept.team_lead_user.id !== undefined && dept.team_lead_user.id !== null) {
            const leadId = String(dept.team_lead_user.id).trim();
            teamLeadHrmIds.add(leadId);
            addDeptToMap(deptMapByHrmId, leadId, deptName);
          }
        }
        if (Array.isArray(dept.users)) {
          for (const member of dept.users) {
            if (member?.id !== undefined && member?.id !== null) {
              addDeptToMap(deptMapByHrmId, String(member.id), deptName);
            }
          }
        }
      }

      const defaultRole = process.env.DEFAULT_SYNC_ROLE || 'USER';
      const dummyDomain = process.env.HRM_DUMMY_EMAIL_DOMAIN || '@local.hrm';

      let syncedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      // THUẬT TOÁN TỐI ƯU HÓA: Inverted Hash Index trong RAM
      // Thay vì gửi N x DB queries tuần tự, preload toàn bộ Users và defaultRole trong 1 câu SQL
      const [allDbUsers, defaultUserRole, managerUserRole] = await Promise.all([
        this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
        this.prisma.role.findFirst({
          where: {
            OR: [
              { name: 'Người dùng' },
              { name: { contains: 'Người dùng' } },
              { name: { contains: 'Nhân viên' } },
              { name: 'OPERATOR' },
              { name: 'USER' },
            ],
          },
        }),
        this.prisma.role ? this.prisma.role.findFirst({
          where: {
            OR: [
              { name: 'Quản lý' },
              { name: { contains: 'Quản lý' } },
              { name: 'MANAGER' },
            ],
          },
        }) : Promise.resolve(null),
      ]);

      // Preflight the complete HRM snapshot before changing any records.
      const ids = hrmUsers.map(user => String(user.id));
      if (new Set(ids).size !== ids.length) {
        throw new HttpException('Duplicate HRM ids. Synchronization aborted.', HttpStatus.CONFLICT);
      }
      const conflicts: { hrmId: string; userIds: string[]; reason: string }[] = [];
      for (const hrmUser of hrmUsers) {
        if (hrmUser.id === undefined || hrmUser.id === null) continue;
        const hrmId = String(hrmUser.id);
        const selected = selectHrmIdentity(allDbUsers, hrmUser);
        if (selected.reason) {
          conflicts.push({ hrmId, userIds: selected.candidates.map(user => user.id), reason: selected.reason });
          continue;
        }
        const existing = selected.user;
        const hrmDeptCandidates = [hrmUser.department, ...(deptMapByHrmId.get(hrmId.toLowerCase()) || [])].filter(Boolean);
        const resolvedDepts = getUserDepartments({
          department: hrmUser.department || existing?.department,
          managedDepartments: hrmDepartments.length > 0 ? hrmDeptCandidates : [
            ...hrmDeptCandidates, ...getUserDepartments(existing),
          ],
        });
        const data: any = {
          name: hrmUser.name || hrmUser.username || `HRM ${hrmId}`,
          department: hrmUser.department || null,
          managedDepartments: resolvedDepts.length ? JSON.stringify(resolvedDepts) : null,
          specialty: hrmUser.position || undefined, avatar: hrmUser.avatar || undefined,
          isActive: isHrmProfileActive(hrmUser), hrmId, dataSource: 'HRM', lastHrmSyncedAt: syncStartedAt,
        };
        if (hrmUser.email?.includes('@')) data.email = hrmUser.email;
        if (existing) {
          // Keep ids, permissions, assignments and historical authors unchanged.
          const updated = await this.prisma.user.update({ where: { id: existing.id }, data });
          Object.assign(existing, updated);
          updatedCount++;
        } else {
          const isLead = teamLeadHrmIds.has(hrmId);
          const created = await this.prisma.user.create({ data: {
            ...data, email: data.email || `${hrmId}${dummyDomain}`,
            role: isLead ? 'MANAGER' : defaultRole,
            roleId: (isLead ? managerUserRole?.id : defaultUserRole?.id) || null,
          } });
          allDbUsers.push(created);
          createdCount++;
        }
        syncedCount++;
      }
      // Present but conflicting entries are never deactivated as a side effect.
      const deactivatedResult = await this.prisma.user.updateMany({
        where: { dataSource: 'HRM', isActive: true, hrmId: { not: null, notIn: ids } },
        data: { isActive: false, version: { increment: 1 } },
      });
      JwtStrategy.invalidateCache();
      return {
        success: conflicts.length === 0, syncedCount, createdCount, updatedCount,
        deactivatedCount: deactivatedResult.count, mergedCount: 0,
        reviewRequiredCount: conflicts.length, conflicts,
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(`Lỗi kết nối tới HRM: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** Read-only reconciliation: never merge users or rewrite historical authors. */
  async auditHrmIdentities() {
    const users = await this.prisma.user.findMany({
      select: { id: true, hrmId: true, email: true, name: true, dataSource: true, isActive: true },
      orderBy: { id: 'asc' },
    });
    return buildIdentityAudit(users);
  }

  async cleanSsoDuplicates(): Promise<{ mergedCount: number; details: string[] }> {
    const report = await this.auditHrmIdentities();
    return { mergedCount: 0, details: report.issues.map(issue => `${issue.code}: ${issue.userIds.join(', ')}`) };
  }
}
