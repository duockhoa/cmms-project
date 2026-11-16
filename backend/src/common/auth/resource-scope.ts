import { getUserDepartments, isGlobalAdmin, UserWithPermissions, hasPermission } from '../utils/rbac.helper';

export function equipmentScope(actor?: UserWithPermissions | null): any {
  if (!actor || isGlobalAdmin(actor) || actor.role === 'TECHNICIAN' || actor.role === 'MANAGER' || hasPermission(actor, 'equipment:view')) {
    return {};
  }
  const departments = getUserDepartments(actor);
  return departments.length ? { OR: [{ department: { in: departments } }, { department: null }] } : {};
}
export function scheduleScope(actor?: UserWithPermissions | null): any {
  if (!actor || isGlobalAdmin(actor)) return {};
  return { OR: [{ assignedTechnicianId: actor.id }, { equipment: equipmentScope(actor) }] };
}
export function fabricationScope(actor?: UserWithPermissions | null): any {
  if (!actor || isGlobalAdmin(actor)) return {};
  const personal = [{ creatorId: actor.id }, { assignedTechnicianId: actor.id }, { supporterIds: { contains: JSON.stringify(actor.id) } }];
  const departments = getUserDepartments(actor);
  return { OR: actor.role === 'MANAGER' && departments.length
    ? [...personal, { targetDepartment: { in: departments } }, { equipment: { department: { in: departments } } }]
    : personal };
}
