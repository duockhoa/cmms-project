export interface UserWithPermissions {
  id: string;
  role?: string | null;
  department?: string | null;
  customRole?: {
    id?: string;
    name?: string;
    permissions?: string | string[] | null;
  } | null;
  customPermissions?: string | string[] | null;
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
  return perms.has('*') || perms.has('ALL');
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
  requiredPermission: string = 'requests:approve'
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

  // Nếu sự cố không có bộ phận hoặc người dùng không có bộ phận
  const actorDept = (actor.department || '').trim().toLowerCase();
  const reqDept = (requestDepartment || '').trim().toLowerCase();

  if (!actorDept) {
    return { allowed: false, reason: 'Tài khoản của bạn chưa được gán bộ phận công tác nên không thể duyệt sự cố phân xưởng.' };
  }

  if (reqDept && actorDept !== reqDept) {
    return { 
      allowed: false, 
      reason: `Bạn là Quản lý bộ phận [${actor.department}], không có thẩm quyền phê duyệt sự cố thuộc bộ phận [${requestDepartment}].` 
    };
  }

  return { allowed: true };
}
