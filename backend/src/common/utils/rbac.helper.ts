import { ALL_PERMISSION_CODES } from '../constants/permissions.registry';

export interface UserWithPermissions {
  id: string;
  role?: string | null;
  department?: string | null;
  managedDepartments?: string | string[] | null;
  customRole?: {
    id?: string;
    name?: string;
    permissions?: string | string[] | null;
  } | null;
  customPermissions?: string | string[] | null;
}

/**
 * Phân tách chuỗi/mảng bộ phận (hỗ trợ JSON array '["PX1","PX3"]' hoặc chuỗi ngăn cách bằng dấu phẩy/chấm phẩy)
 */
export function parseDepartmentList(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => parseDepartmentList(item))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item || '').trim())
            .filter(Boolean);
        }
      } catch {
        // Fallback to delimiter split
      }
    }
    return trimmed
      .split(/[,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Lấy danh sách tất cả bộ phận mà người dùng trực thuộc hoặc kiêm nhiệm quản lý (duy nhất, không phân biệt hoa thường)
 */
export function getUserDepartments(
  user?: { department?: string | null; managedDepartments?: string | string[] | null } | null
): string[] {
  if (!user) return [];
  const combined = [
    ...parseDepartmentList(user.department),
    ...parseDepartmentList(user.managedDepartments),
  ];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dept of combined) {
    const key = dept.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(dept);
    }
  }
  return result;
}

/**
 * Kiểm tra xem người dùng có thuộc hoặc quản lý một bộ phận cụ thể hay không
 */
export function isUserInDepartment(
  user?: { department?: string | null; managedDepartments?: string | string[] | null } | null,
  targetDepartment?: string | null
): boolean {
  const target = (targetDepartment || '').trim().toLowerCase();
  if (!target) return false;
  return getUserDepartments(user).some((d) => d.toLowerCase() === target);
}

/**
 * Trích xuất danh sách mã quyền hiệu lực (Set<string>) từ user.
 */
export function extractEffectivePermissions(user: UserWithPermissions | null | undefined): Set<string> {
  if (!user) return new Set();

  let rolePerms: string[] = [];
  if (user.customRole?.permissions) {
    try {
      rolePerms = typeof user.customRole.permissions === 'string'
        ? JSON.parse(user.customRole.permissions)
        : user.customRole.permissions;
    } catch (e) {
      rolePerms = [];
    }
  }

  let customPerms: string[] = [];
  if (user.customPermissions) {
    try {
      customPerms = typeof user.customPermissions === 'string'
        ? JSON.parse(user.customPermissions)
        : user.customPermissions;
    } catch (e) {
      customPerms = [];
    }
  }

  const perms = new Set<string>([...(Array.isArray(rolePerms) ? rolePerms : []), ...(Array.isArray(customPerms) ? customPerms : [])]);
  
  // Backward compatibility: If legacy role is ADMIN, grant global wildcard
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    perms.add('*');
  }

  return perms;
}

/**
 * Kiểm tra xem người dùng có quyền toàn quyền (Global Scope - ví dụ Admin) hay không.
 */
export function isGlobalAdmin(user: UserWithPermissions | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  const perms = extractEffectivePermissions(user);
  return perms.has('*') || perms.has('ALL') || ALL_PERMISSION_CODES.every((permission) => perms.has(permission));
}

/**
 * Kiểm tra xem user có mã quyền yêu cầu hay không (hỗ trợ wildcard '*', 'ALL', '{module}:*').
 */
export function hasPermission(user: UserWithPermissions | null | undefined, requiredPermission: string): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

  const effectivePerms = extractEffectivePermissions(user);

  // 1. Direct match
  if (effectivePerms.has(requiredPermission)) return true;

  // 2. Global wildcard
  if (effectivePerms.has('*') || effectivePerms.has('ALL')) return true;

  // 3. Module-level wildcard, e.g. "requests:*" matches "requests:approve"
  const [moduleName] = requiredPermission.split(':');
  if (effectivePerms.has(`${moduleName}:*`) || effectivePerms.has(`${moduleName}:ALL`)) return true;

  return false;
}

/**
 * Kiểm tra xem Quản lý có thẩm quyền duyệt sự cố của một bộ phận cụ thể hay không:
 * - Admin / Global manager: Duyệt được tất cả các bộ phận.
 * - Quản lý phân xưởng: Phải có quyền `requests:approve` VÀ bộ phận của quản lý phải khớp với bộ phận sự cố.
 */
export function canManageDepartmentRequest(
  actor: UserWithPermissions | null | undefined,
  requestDepartment: string | null | undefined,
  requiredPermission: string = 'requests:approve',
  fallbackDepartment?: string | null
): { allowed: boolean; reason?: string } {
  if (!actor) {
    return { allowed: false, reason: 'Không xác định được danh tính người dùng.' };
  }

  if (!hasPermission(actor, requiredPermission)) {
    return { allowed: false, reason: `Bạn không có quyền thực hiện thao tác này (${requiredPermission}).` };
  }

  // Toàn quyền duyệt mọi bộ phận nếu là Global Admin
  if (isGlobalAdmin(actor)) {
    return { allowed: true };
  }

  // Lấy toàn bộ danh sách bộ phận mà Quản lý phụ trách (gồm bộ phận gốc + bộ phận kiêm nhiệm từ HRM)
  const actorDepts = getUserDepartments(actor);
  if (actorDepts.length === 0) {
    return { allowed: false, reason: 'Tài khoản của bạn chưa được gán bộ phận công tác nên không thể duyệt sự cố phân xưởng.' };
  }

  const candidateRequestDepts = [requestDepartment, fallbackDepartment]
    .flatMap((d) => parseDepartmentList(d))
    .filter(Boolean);

  if (candidateRequestDepts.length > 0) {
    const actorDeptSet = new Set(actorDepts.map((d) => d.toLowerCase()));
    const hasMatch = candidateRequestDepts.some((d) => actorDeptSet.has(d.toLowerCase()));
    if (!hasMatch) {
      return {
        allowed: false,
        reason: `Bạn là Quản lý bộ phận [${actorDepts.join(', ')}], không có thẩm quyền phê duyệt sự cố thuộc bộ phận [${requestDepartment || fallbackDepartment}].`,
      };
    }
  }

  return { allowed: true };
}
