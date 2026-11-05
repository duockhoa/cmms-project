import { HttpException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService HRM synchronization', () => {
  const originalFetch = global.fetch;
  const originalHrmApiUrl = process.env.HRM_API_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.HRM_API_URL = originalHrmApiUrl;
    jest.restoreAllMocks();
  });

  it('returns departments from active users only', async () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { department: ' QA ' },
          { department: 'Kỹ thuật' },
          { department: 'QA' },
        ]),
      },
    };
    const service = new UsersService(prisma);

    await expect(service.getDepartments()).resolves.toEqual(['Kỹ thuật', 'QA']);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        dataSource: 'HRM',
        department: { not: null },
      },
    }));
  });

  it('returns assignees from active HRM users in the selected department', async () => {
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new UsersService(prisma);

    await service.getAssignees('Kỹ thuật');

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        dataSource: 'HRM',
        OR: [
          { department: { equals: 'Kỹ thuật' } },
          { managedDepartments: { contains: 'Kỹ thuật' } },
        ],
      },
    }));
  });

  it('loads every declared HRM page before returning a snapshot', async () => {
    const service = new UsersService({} as any);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 1 }], meta: { page: 1, totalPages: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 2 }], meta: { page: 2, totalPages: 2 } }),
      }) as any;

    const result = await (service as any).fetchHrmUsersSnapshot('https://hrm.example.com/', 'token');

    expect(result.map((user: any) => user.id)).toEqual([1, 2]);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      new URL('https://hrm.example.com/users?page=2'),
      expect.any(Object),
    );
  });

  it('rejects an empty HRM snapshot without touching local data', async () => {
    const service = new UsersService({} as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as any;

    await expect((service as any).fetchHrmUsersSnapshot('https://hrm.example.com', 'token'))
      .rejects.toBeInstanceOf(HttpException);
  });

  it('deactivates only active HRM users not seen in the completed snapshot', async () => {
    process.env.HRM_API_URL = 'https://hrm.example.com';
    const currentUser = {
      id: '1',
      hrmId: '1',
      email: 'current@example.com',
      name: 'Current User',
      role: 'USER',
      roleId: null,
      customPermissions: null,
      department: 'QA',
      specialty: null,
      avatar: null,
      isActive: true,
      dataSource: 'HRM',
      createdAt: new Date('2026-01-01'),
      lastHrmSyncedAt: new Date('2026-01-01'),
    };
    const staleUser = {
      ...currentUser,
      id: '2',
      hrmId: '2',
      email: 'stale@example.com',
      name: 'Stale User',
    };
    const prisma: any = {
      user: {
        findMany: jest.fn().mockResolvedValue([currentUser, staleUser]),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...currentUser, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new UsersService(prisma);
    jest.spyOn(service, 'cleanSsoDuplicates').mockResolvedValue({ mergedCount: 0, details: [] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 1,
        email: 'current@example.com',
        name: 'Current User',
        department: 'QA',
        status: 'ACTIVE',
      }],
    }) as any;

    const result = await service.syncHrmUsers('token');

    expect(result.deactivatedCount).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '1', mergedIntoId: null },
      data: expect.objectContaining({
        hrmId: '1',
        dataSource: 'HRM',
        isActive: true,
        lastHrmSyncedAt: expect.any(Date),
      }),
    }));
    expect(prisma.user.updateMany).toHaveBeenLastCalledWith({
      where: {
        dataSource: 'HRM',
        hrmId: { not: null, notIn: ['1'] },
        OR: [{ isActive: true }, { hrmIsActive: true }, { hrmIsActive: null }],
      },
      data: {
        isActive: false,
        hrmIsActive: false,
        version: { increment: 1 },
      },
    });
  });
  it('reports conflicting identities without merging, deleting or moving history', async () => {
    process.env.HRM_API_URL = 'https://hrm.example.test';
    const users = [
      { id: 'local-a', hrmId: 'A', email: 'shared@example.test', name: 'Same Name' },
      { id: 'local-b', hrmId: 'B', email: 'b@example.test', name: 'Same Name' },
    ];
    const prisma: any = { user: {
      findMany: jest.fn().mockResolvedValue(users), update: jest.fn(), create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }), delete: jest.fn(), deleteMany: jest.fn(),
    }, role: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new UsersService(prisma);
    jest.spyOn(service as any, 'fetchHrmUsersSnapshot').mockResolvedValue([{ id: 'B', email: 'shared@example.test' }]);
    jest.spyOn(service as any, 'fetchHrmDepartmentsSnapshot').mockResolvedValue([]);
    const result = await service.syncHrmUsers('token');
    expect(result.reviewRequiredCount).toBe(1);
    expect(result.mergedCount).toBe(0);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    expect(prisma.user.updateMany.mock.calls[0][0].where.hrmId.notIn).toEqual(['B']);
  });

  it('preserves a local block when HRM still reports an active employee', async () => {
    process.env.HRM_API_URL = 'https://hrm.example.test';
    const user = { id: 'local', hrmId: 'external', email: 'test@example.test', name: 'Test', isActive: false, accessBlocked: true };
    const prisma: any = { user: {
      findMany: jest.fn().mockResolvedValue([user]),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...user, ...data })),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }), create: jest.fn(),
    }, role: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new UsersService(prisma);
    jest.spyOn(service as any, 'fetchHrmUsersSnapshot').mockResolvedValue([{ id: 'external', email: user.email, status: 'ACTIVE' }]);
    jest.spyOn(service as any, 'fetchHrmDepartmentsSnapshot').mockResolvedValue([]);
    await service.syncHrmUsers('token');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id, mergedIntoId: null }, data: expect.objectContaining({ isActive: false, hrmIsActive: true }),
    }));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('disables an account without transferring authorship or deleting its identity', async () => {
    const prisma: any = { user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'old', name: 'Same Name' }),
      update: jest.fn().mockResolvedValue({ id: 'old', isActive: false }), delete: jest.fn(), findFirst: jest.fn(),
    } };
    await new UsersService(prisma).deleteUser('old');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'old' }, data: { isActive: false, accessBlocked: true, version: { increment: 1 } } });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('does not allow a merged account to be edited or unlocked again', async () => {
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'source', mergedIntoId: 'target' }), update: jest.fn() } };
    const service = new UsersService(prisma);
    await expect(service.updateUser('source', { isActive: true })).rejects.toMatchObject({ status: 409 });
    await expect(service.updateRole('source', null)).rejects.toMatchObject({ status: 409 });
    await expect(service.updateCustomPermissions('source', ['*'])).rejects.toMatchObject({ status: 409 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('duplicate cleanup produces a read-only report even for equal names', async () => {
    const prisma: any = { user: { findMany: jest.fn().mockResolvedValue([
      { id: 'a', hrmId: null, email: 'a@local.hrm', name: 'Same Name', dataSource: 'HRM' },
      { id: 'b', hrmId: 'B', email: 'b@example.test', name: 'Same Name', dataSource: 'HRM' },
    ]), update: jest.fn(), delete: jest.fn() } };
    const service = new UsersService(prisma);
    const result = await service.cleanSsoDuplicates();
    expect(result.mergedCount).toBe(0);
    expect(result.details.some(detail => detail.includes('MISSING_HRM_LINK'))).toBe(true);
    expect(result.details.some(detail => detail.includes('SAME_NAME_REVIEW_ONLY'))).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

});
