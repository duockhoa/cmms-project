import { SchedulesController } from './schedules.controller';

describe('authenticated schedule authors', () => {
  const request = { user: { id: 'verified-b' } };
  it('overrides forged createdById and every action author with the authenticated id', () => {
    const service: any = {};
    for (const method of ['create', 'update', 'activate', 'pause', 'complete', 'cancel', 'generateWorkOrder', 'processDueSchedules']) service[method] = jest.fn();
    const controller = new SchedulesController(service);
    controller.create({ createdById: 'forged-a' } as any, request);
    expect(service.create).toHaveBeenCalledWith({ createdById: 'verified-b' });
    for (const method of ['update', 'activate', 'pause', 'complete', 'cancel', 'generateWorkOrder']) {
      (controller as any)[method]('schedule', { actedById: 'forged-a' }, request);
      expect(service[method].mock.calls[0][1].actedById).toBe('verified-b');
    }
    controller.processDueSchedules(request, '2026-11-03');
    expect(service.processDueSchedules).toHaveBeenCalledWith('verified-b', '2026-11-03');
  });
});
