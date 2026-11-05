import { HrmIdentityService } from './hrm-identity.service';

describe('HRM equipment application assignment', () => {
  const originalFetch = global.fetch;
  const response = (body: any, status = 200): any => ({ ok: status === 200, status, json: async () => body });
  let service: HrmIdentityService;
  beforeEach(() => {
    HrmIdentityService.invalidateCache();
    const settings: Record<string, string> = { HRM_APPLICATION_ID: '42', HRM_APPLICATION_KEY: 'test-maintenance' };
    service = new HrmIdentityService({ get: (key: string) => settings[key] } as any, {} as any);
  });
  afterEach(() => { global.fetch = originalFetch; });
  it('accepts only the configured active HRM application', async () => {
    for (const body of [[{ id: 42, key: 'test-maintenance', is_active: true }], { data: { applications: [{ application: { id: 42, key: 'test-maintenance', is_active: 1 } }] } }]) {
      global.fetch = jest.fn().mockResolvedValue(response(body)) as any;
      await expect(service.assertApplication('session', true)).resolves.toBeUndefined();
    }
  });
  it('denies missing, inactive, renamed or mismatched application assignments', async () => {
    for (const body of [[], [{ id: 8, key: 'test-maintenance', is_active: true }], [{ id: 42, key: 'other', is_active: true }], [{ id: 42, key: 'test-maintenance', is_active: false }], [{ is_active: 0, application: { id: 42, key: 'test-maintenance', is_active: true } }]]) {
      global.fetch = jest.fn().mockResolvedValue(response(body)) as any;
      await expect(service.assertApplication('session', true)).rejects.toMatchObject({ status: 403 });
    }
  });
  it('fails closed on unknown response format and outages', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ unknown: [] })) as any;
    await expect(service.assertApplication('session')).rejects.toMatchObject({ status: 503 });
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(service.assertApplication('session')).rejects.toMatchObject({ status: 503 });
  });
  it('deduplicates simultaneous checks, but forced revocation clears cached grants', async () => {
    global.fetch = jest.fn().mockResolvedValue(response([{ id: 42, key: 'test-maintenance', is_active: true }])) as any;
    await Promise.all([service.assertApplication('session'), service.assertApplication('session')]);
    await service.assertApplication('session');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    global.fetch = jest.fn().mockResolvedValue(response([])) as any;
    await expect(service.assertApplication('session', true)).rejects.toMatchObject({ status: 403 });
    await expect(service.assertApplication('session')).rejects.toMatchObject({ status: 403 });
  });
  it('rejects missing application configuration before calling HRM', async () => {
    for (const settings of [{}, { HRM_APPLICATION_ID: '42' }, { HRM_APPLICATION_ID: ' ', HRM_APPLICATION_KEY: 'test-maintenance' }]) {
      const unconfigured = new HrmIdentityService({ get: (key: string) => (settings as any)[key] } as any, {} as any);
      global.fetch = jest.fn() as any;
      await expect(unconfigured.assertApplication('session')).rejects.toMatchObject({ status: 503 });
      expect(global.fetch).not.toHaveBeenCalled();
    }
  });
  it('permits a verified HRM identity to change email without reassigning histories', async () => {
    const user = { id: 'local', hrmId: '1125', email: 'old@example.test', isActive: true };
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(null), update: jest.fn() } };
    const identities = new HrmIdentityService({} as any, prisma);
    await expect(identities.resolve({ id: 1125, email: 'new@example.test' })).resolves.toEqual(user);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
