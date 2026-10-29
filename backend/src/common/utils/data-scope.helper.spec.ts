import { ALL_PERMISSION_CODES } from '../constants/permissions.registry';
import { buildRequestScopeWhere, buildWorkOrderScopeWhere } from './data-scope.helper';
import { isGlobalAdmin, UserWithPermissions } from './rbac.helper';

const actor = (overrides: Partial<UserWithPermissions> = {}): UserWithPermissions => ({
  id: 'user-1',
  role: 'USER',
  department: 'Production A',
  ...overrides,
});

describe('data scope helpers', () => {
  it('grants global scope to legacy administrators', () => {
    expect(buildRequestScopeWhere(actor({ role: 'ADMIN' }))).toEqual({});
    expect(buildWorkOrderScopeWhere(actor({ role: 'ADMIN' }))).toEqual({});
  });

  it('grants global scope when every registered permission is assigned', () => {
    const fullAccessActor = actor({
      role: 'USER',
      customPermissions: ALL_PERMISSION_CODES,
    });

    expect(isGlobalAdmin(fullAccessActor)).toBe(true);
    expect(buildRequestScopeWhere(fullAccessActor)).toEqual({});
    expect(buildWorkOrderScopeWhere(fullAccessActor)).toEqual({});
  });

  it('fails closed for managers without a department', () => {
    const manager = actor({ role: 'MANAGER', department: null });

    expect(buildRequestScopeWhere(manager)).toEqual({ id: { in: [] } });
    expect(buildWorkOrderScopeWhere(manager)).toEqual({ id: { in: [] } });
  });

  it('uses exact department matching for managers', () => {
    const manager = actor({ role: 'MANAGER', department: 'Warehouse' });

    expect(buildRequestScopeWhere(manager)).toEqual({
      OR: [
        { department: { equals: 'Warehouse' } },
        { equipment: { department: { equals: 'Warehouse' } } },
      ],
    });
  });

  it('includes all managedDepartments for multi-department managers', () => {
    const multiDeptManager = actor({
      role: 'MANAGER',
      department: 'PX1',
      managedDepartments: JSON.stringify(['PX1', 'PX3']),
    });

    expect(buildRequestScopeWhere(multiDeptManager)).toEqual({
      OR: [
        { department: { in: ['PX1', 'PX3'] } },
        { equipment: { department: { in: ['PX1', 'PX3'] } } },
      ],
    });

    expect(buildWorkOrderScopeWhere(multiDeptManager)).toEqual({
      OR: [
        { equipment: { department: { in: ['PX1', 'PX3'] } } },
        { request: { department: { in: ['PX1', 'PX3'] } } },
        { title: { contains: 'PX1' } },
        { title: { contains: 'PX3' } },
        { assignedTechnician: { department: { in: ['PX1', 'PX3'] } } },
      ],
    });
  });

  it('limits ordinary users to their own or department records', () => {
    expect(buildRequestScopeWhere(actor())).toEqual({
      OR: [
        { reporterId: 'user-1' },
        { department: { equals: 'Production A' } },
        { equipment: { department: { equals: 'Production A' } } },
      ],
    });
  });

  it('limits technicians to assigned, supported, or unassigned pending work', () => {
    expect(buildWorkOrderScopeWhere(actor({ role: 'TECHNICIAN' }))).toEqual({
      OR: [
        { assignedTechnicianId: 'user-1' },
        { assignedTechnicianIds: { array_contains: 'user-1' } },
        { supporterIds: { array_contains: 'user-1' } },
        { status: 'PENDING', assignedTechnicianId: null },
      ],
    });
  });
});