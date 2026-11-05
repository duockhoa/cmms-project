import { getUserDepartments, isGlobalAdmin, UserWithPermissions } from '../utils/rbac.helper';

export function equipmentScope(actor?: UserWithPermissions | null): any {
  if (!actor || isGlobalAdmin(actor) || actor.role === 'TECHNICIAN') return {};
  const departments = getUserDepartments(actor);
  return departments.length ? { department: { in: departments } } : { id: { in: [] } };
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
