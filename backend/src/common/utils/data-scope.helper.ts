import { isGlobalAdmin, UserWithPermissions } from './rbac.helper';

const denyAllScope = () => ({ id: { in: [] } });

const sameDepartment = (department: string) => ({ equals: department });

export function buildRequestScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.role || '').toUpperCase();
  const department = (actor.department || '').trim();

  if (role === 'MANAGER') {
    if (!department) return denyAllScope();

    return {
      OR: [
        { department: sameDepartment(department) },
        { equipment: { department: sameDepartment(department) } },
      ],
    };
  }

  if (role === 'OPERATOR' || role === 'USER') {
    if (!department) return { reporterId: actor.id };

    return {
      OR: [
        { reporterId: actor.id },
        { department: sameDepartment(department) },
        { equipment: { department: sameDepartment(department) } },
      ],
    };
  }

  return {};
}

export function buildWorkOrderScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.role || '').toUpperCase();
  const department = (actor.department || '').trim();

  if (role === 'MANAGER') {
    if (!department) return denyAllScope();

    return {
      OR: [
        { equipment: { department: sameDepartment(department) } },
        { request: { department: sameDepartment(department) } },
      ],
    };
  }

  if (role === 'OPERATOR' || role === 'USER') {
    if (!department) return { request: { reporterId: actor.id } };

    return {
      OR: [
        { request: { reporterId: actor.id } },
        { equipment: { department: sameDepartment(department) } },
        { request: { department: sameDepartment(department) } },
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
