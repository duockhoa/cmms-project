import { FunctionalUnitsService } from './functional-units.service';
import { BadRequestException } from '@nestjs/common';

describe('FunctionalUnitsService.importBulkByEquipment', () => {
  const makeService = () => {
    let idCounter = 1;
    const prisma: any = {
      equipment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'eq-1',
            code: 'EQ-0001',
            oldCode: 'TBNC100.01',
            accountingCode: 'TS-001',
            name: 'Bếp hồng ngoại - 1',
            category: 'Thiết bị nghiên cứu',
          },
        ]),
      },
      equipmentFunctionalUnit: {
        findMany: jest.fn().mockResolvedValue([
          { equipmentId: 'eq-1', name: 'Mặt kính', code: 'EQ-0001-CU01' },
        ]),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: `efu-${idCounter++}`,
          ...data,
        })),
      },
      functionalUnitLibrary: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: `lib-${idCounter++}`,
          ...data,
        })),
      },
    };

    return { service: new FunctionalUnitsService(prisma), prisma };
  };

  it('should throw BadRequestException when items is empty', async () => {
    const { service } = makeService();
    await expect(service.importBulkByEquipment([])).rejects.toThrow(BadRequestException);
  });

  it('should import functional units matched by code or oldCode and skip duplicates/unknown equipment', async () => {
    const { service, prisma } = makeService();

    const result = await service.importBulkByEquipment([
      {
        rowNumber: 2,
        equipmentKey: 'TBNC100.01',
        name: 'Bộ gia nhiệt',
        status: 'Hoạt động tốt',
      },
      {
        rowNumber: 3,
        equipmentKey: 'EQ-0001',
        name: 'Mặt kính', // already exists on eq-1
      },
      {
        rowNumber: 4,
        equipmentKey: 'UNKNOWN-999',
        name: 'Động cơ',
      },
      {
        rowNumber: 5,
        equipmentKey: 'TS-001',
        name: 'Quạt tản nhiệt',
      },
    ]);

    expect(result.totalRows).toBe(4);
    expect(result.createdCount).toBe(2);
    expect(result.skippedCount).toBe(2);

    expect(result.created[0]).toMatchObject({
      code: 'EQ-0001-CU02',
      name: 'Bộ gia nhiệt',
      equipmentCode: 'EQ-0001',
    });
    expect(result.created[1]).toMatchObject({
      code: 'EQ-0001-CU03',
      name: 'Quạt tản nhiệt',
      equipmentCode: 'EQ-0001',
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].rowNumber).toBe(3);
    expect(result.errors[1].rowNumber).toBe(4);
    expect(prisma.equipmentFunctionalUnit.create).toHaveBeenCalledTimes(2);
  });
});

