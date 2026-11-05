import { getUserDepartments, hasPermission, isGlobalAdmin, UserWithPermissions } from './rbac.helper';

const denyAllScope = () => ({ id: { in: [] } });

const matchDepartments = (departments: string[]) =>
  departments.length === 1 ? { equals: departments[0] } : { in: departments };

const isDepartmentManager = (actor: UserWithPermissions): boolean => {
  const role = (actor.customRole?.isActive === false ? 'USER' : actor.role || '').toUpperCase();
  if (role === 'MANAGER') return true;
  if (hasPermission(actor, 'requests:approve')) return true;
  return false;
};

export function buildRequestScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.customRole?.isActive === false ? 'USER' : actor.role || '').toUpperCase();
  const departments = getUserDepartments(actor);

  if (role === 'MANAGER') {
    if (departments.length === 0) return denyAllScope();

    return {
      OR: [
        { department: matchDepartments(departments) },
        { equipment: { department: matchDepartments(departments) } },
      ],
    };
  }

  if (role === 'OPERATOR' || role === 'USER') {
    if (departments.length === 0) return { reporterId: actor.id };

    return {
      OR: [
        { reporterId: actor.id },
        { department: matchDepartments(departments) },
        { equipment: { department: matchDepartments(departments) } },
      ],
    };
  }

  return role === 'TECHNICIAN' ? {} : denyAllScope();
}

export function buildWorkOrderScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.customRole?.isActive === false ? 'USER' : actor.role || '').toUpperCase();
  const departments = getUserDepartments(actor);

  if (isDepartmentManager(actor)) {
    if (departments.length === 0) return denyAllScope();

    return {
      OR: [
        { equipment: { department: matchDepartments(departments) } },
        { request: { department: matchDepartments(departments) } },
        { assignedTechnician: { department: matchDepartments(departments) } },
      ],
    };
  }

  if (role === 'OPERATOR' || role === 'USER') {
    if (departments.length === 0) return { request: { reporterId: actor.id } };

    return {
      OR: [
        { request: { reporterId: actor.id } },
        { equipment: { department: matchDepartments(departments) } },
        { request: { department: matchDepartments(departments) } },
      ],
    };
  }

  return {
    OR: [
      { assignedTechnicianId: actor.id },
      { assignedTechnicianIds: { array_contains: actor.id } },
      { supporterIds: { array_contains: actor.id } },
      { status: 'PENDING', assignedTechnicianId: null },
    ],
  };
}
