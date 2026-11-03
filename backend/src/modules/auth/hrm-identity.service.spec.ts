import { ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { HrmIdentityService } from './hrm-identity.service';

describe('HrmIdentityService', () => {
  const originalFetch = global.fetch;
  const profile = { id: '1120', name: 'Employee B', email: 'b@example.test', status: 'active' };
  const user = { id: 'local-b', hrmId: '1120', name: 'Employee B', email: profile.email, role: 'USER', isActive: true };
  let prisma: any;
  let service: HrmIdentityService;
  const response = (body: any, status = 200) => ({ ok: status === 200, status, json: async () => body });
  beforeEach(() => {
    HrmIdentityService.invalidateCache();
    prisma = { user: { findMany: jest.fn().mockResolvedValue([user]), create: jest.fn(), findUnique: jest.fn() } };
    service = new HrmIdentityService({ get: (key: string) => key === 'HRM_API_URL' ? 'https://hrm.example.test' : undefined } as any, prisma);
  });
  afterEach(() => { global.fetch = originalFetch; });

  it('asks HRM for the actual primary key, with no token-sub/employee-code assumptions', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ user: profile })) as any;
    expect((await service.getProfile('token')).id).toBe('1120');
    expect(global.fetch).toHaveBeenCalledWith('https://hrm.example.test/users/me', expect.objectContaining({ headers: { Authorization: 'Bearer token' } }));
  });
  it('caches by token, forces revalidation at session bootstrap, and never caches failed verification', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(profile)) as any;
    await service.getProfile('a'); await service.getProfile('a');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await service.getProfile('b'); await service.getProfile('a', true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  it('fails closed on HRM outage instead of returning a guessed local user', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(service.getProfile('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
  it('does not reuse a cached profile after a forced revalidation fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response(profile)).mockRejectedValue(new Error('offline')) as any;
    await service.getProfile('token');
    await expect(service.getProfile('token', true)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.getProfile('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  it('rejects upstream revocation, inactivity, and missing identity', async () => {
    for (const result of [response({}, 401), response({ ...profile, isActive: false }), response({ name: 'No id' })]) {
      global.fetch = jest.fn().mockResolvedValue(result) as any;
      await expect(service.getProfile('token', true)).rejects.toBeInstanceOf(UnauthorizedException);
    }
  });
  it('reloads local account status on each request', async () => {
    expect((await service.resolve(profile)).id).toBe('local-b');
    prisma.user.findMany.mockResolvedValue([{ ...user, isActive: false }]);
    await expect(service.resolve(profile)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('does not create, merge, or attach an ambiguous legacy account', async () => {
    prisma.user.findMany.mockResolvedValue([{ ...user, hrmId: null }]);
    await expect(service.resolve(profile)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it('provisions only a new identity and never promotes through a partial email/name match', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.create.mockImplementation(async ({ data }: any) => data);
    const configured = new HrmIdentityService({ get: (key: string) => key === 'ADMIN_EMPLOYEE_CODE' ? '12' : undefined } as any, prisma);
    expect((await configured.resolve({ ...profile, name: 'Admin 12', email: '12@example.test' })).role).toBe('USER');
  });
  it('does not confuse an administrator employee code with another HRM primary key', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.create.mockImplementation(async ({ data }: any) => data);
    const configured = new HrmIdentityService({ get: (key: string) => key === 'ADMIN_EMPLOYEE_CODE' ? '1120' : undefined } as any, prisma);
    expect((await configured.resolve({ ...profile, id: '1120', username: 'other-code' })).role).toBe('USER');
    expect((await configured.resolve({ ...profile, id: '1125', username: '1120' })).role).toBe('ADMIN');
  });
  it('rejects refresh-token user A when the verified session belongs to B', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ accessToken: 'access-a', refreshToken: 'refresh-a' }))
      .mockResolvedValueOnce(response({ ...profile, id: 'A' })) as any;
    await expect(service.refreshSession('refresh-a', '1120')).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('accepts refresh only after verifying the same HRM identity', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(response({ accessToken: 'new-b' })).mockResolvedValueOnce(response(profile)) as any;
    await expect(service.refreshSession('refresh-b', '1120')).resolves.toEqual({ accessToken: 'new-b', refreshToken: 'refresh-b' });
  });
});
