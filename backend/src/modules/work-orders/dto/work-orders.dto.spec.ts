import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkOrderDto } from './work-orders.dto';

describe('CreateWorkOrderDto', () => {
  const validatePayload = (payload: Record<string, unknown>) =>
    validate(plainToInstance(CreateWorkOrderDto, payload), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('accepts the ad-hoc maintenance payload', async () => {
    const errors = await validatePayload({
      title: 'Equipment inspection',
      description: 'Ad-hoc maintenance',
      equipmentId: 'equipment-id',
      plannedStartDate: '2026-10-14T00:00:00.000Z',
      priority: 'MEDIUM',
      assignedTechnicianId: 'technician-id',
      assignedTechnicianIds: ['technician-id'],
      technicianName: 'Technician',
      handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects client-managed workflow fields', async () => {
    const errors = await validatePayload({
      title: 'Equipment inspection',
      description: 'Ad-hoc maintenance',
      equipmentId: 'equipment-id',
      classificationResult: 'MAINTENANCE_REQUIRED',
      status: 'ASSIGNED',
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['classificationResult', 'status']),
    );
  });
});
