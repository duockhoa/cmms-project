import { AuthController } from './auth.controller';

describe('verified auth profile response', () => {
  it('uses the verified HRM display profile with local roles and internal id', async () => {
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue({
      id: 'local-b', hrmId: '1125', name: 'Outdated Name', email: 'b@example.test',
      role: 'USER', isActive: true, department: 'QA',
    }) } };
    const controller = new AuthController(prisma, {} as any);
    const result = await controller.getMe({ user: {
      id: 'local-b', name: 'Verified B', email: 'b@example.test', avatar: 'verified-avatar',
      identity: { provider: 'hrm', subject: '1125' },
    } });
    expect(result.user.id).toBe('local-b');
    expect(result.user.name).toBe('Verified B');
    expect(result.user.avatar).toBe('verified-avatar');
    expect(result.identity.subject).toBe('1125');
    expect(result.permissions).not.toContain('ALL');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'local-b' } }));
  });
  it('does not fall back to another account email after the selected account disappears', async () => {
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn() } };
    const controller = new AuthController(prisma, {} as any);
    await expect(controller.getMe({ user: { id: 'removed', email: 'someone@example.test' } })).rejects.toThrow();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it('reuses the local account loaded by JWT verification without a second database query', async () => {
    const prisma: any = { user: { findUnique: jest.fn() } };
    const localUser = { id: 'local', hrmId: 'external', role: 'USER', isActive: true, customPermissions: '["equipment:view"]' };
    const result = await new AuthController(prisma, {} as any).getMe({ user: {
      id: localUser.id, role: localUser.role, localUser, identity: { provider: 'hrm', subject: localUser.hrmId },
    } });
    expect(result.permissions).toContain('equipment:view');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
