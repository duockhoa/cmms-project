import { Injectable, ForbiddenException } from '@nestjs/common';

export interface UserContext {
  id: string;
  name?: string;
  role: string; // ADMIN, MANAGER, TECHNICIAN, OPERATOR
  department?: string;
  isActive: boolean;
}

@Injectable()
export class AnalyticsScopeService {
  /**
   * Generates server-enforced Prisma scope filter for the given user context.
   * Prevents client filter overrides and data leaks.
   */
  buildServerEnforcedScope(user?: UserContext): any {
    if (!user || !user.isActive) {
      throw new ForbiddenException('Tài khoản chưa xác thực hoặc đã bị vô hiệu hóa');
    }

    switch (user.role) {
      case 'ADMIN':
        return {};

      case 'MANAGER':
        // Preserve existing system policy for MANAGER:
        // If department string exists on user, restrict by department where applicable,
        // otherwise default to full manager system access according to existing policy.
        if (user.department && user.department.trim()) {
          return { department: user.department.trim() };
        }
        return {};

      case 'TECHNICIAN':
        // TECHNICIAN is strictly authorized by User ID relation on MaintenanceSchedule.
        // String technicianName is NOT used for authorization because it is non-unique and lacks foreign keys.
        return {
          schedule: {
            assignedTechnicianId: user.id,
          },
        };

      case 'OPERATOR':
        // OPERATOR is strictly blocked from Analytics & Reports
        throw new ForbiddenException('Vai trò OPERATOR không có quyền truy cập Analytics & Reports');

      default:
        // Safe fallback: Block unauthorized/unknown roles
        throw new ForbiddenException(`Vai trò '${user.role}' không được phép truy cập Analytics`);
    }
  }

  /**
   * Merges server-enforced scope with client-requested filters using Prisma AND array.
   */
  combineFilters(serverEnforcedScope: any, userRequestedFilters: any): any {
    const filters = [];

    if (serverEnforcedScope && Object.keys(serverEnforcedScope).length > 0) {
      filters.push(serverEnforcedScope);
    }

    if (userRequestedFilters && Object.keys(userRequestedFilters).length > 0) {
      filters.push(userRequestedFilters);
    }

    if (filters.length === 0) return {};
    if (filters.length === 1) return filters[0];

    return { AND: filters };
  }
}
