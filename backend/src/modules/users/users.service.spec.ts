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
      where: { id: '1' },
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
        isActive: true,
        OR: [
          { lastHrmSyncedAt: null },
          { lastHrmSyncedAt: { lt: expect.any(Date) } },
        ],
      },
      data: {
        isActive: false,
        version: { increment: 1 },
      },
    });
  });
});
