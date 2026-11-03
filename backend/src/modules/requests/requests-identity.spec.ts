import { RequestsService } from './requests.service';

describe('maintenance request author identity', () => {
  it('records the verified author despite a different reporter id/name in the request body', async () => {
    const tx: any = {
      maintenanceRequest: {
        findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'request', ...data })),
      }, location: { findFirst: jest.fn().mockResolvedValue(null) },
      workflowHistory: { create: jest.fn() },
    };
    const prisma: any = {
      equipment: { findFirst: jest.fn().mockResolvedValue({ id: 'equipment', location: 'Factory', department: 'QA' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'verified-b', name: 'Old Name', department: 'QA' }) },
      $transaction: (callback: any) => callback(tx),
    };
    const service = new RequestsService(prisma, { calculateAndSetStatus: jest.fn() } as any, { emit: jest.fn() } as any);
    const result = await service.create({ equipmentId: 'equipment', title: 'Issue', reporterId: 'forged-a', reporterName: 'Forged A' },
      { id: 'verified-b', name: 'Verified B', role: 'ADMIN' } as any);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'verified-b' } });
    expect(result.reporterId).toBe('verified-b');
    expect(result.reporterName).toBe('Verified B');
    expect(tx.workflowHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actedById: 'verified-b' }) }));
  });
});
