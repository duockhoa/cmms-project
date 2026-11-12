import { EquipmentService } from './equipment.service';
import { BadRequestException } from '@nestjs/common';

describe('EquipmentService.importBulk', () => {
  const makeService = (existingEquipment: Array<{ code: string; accountingCode: string | null; name: string }> = []) => {
    let idCounter = 1;
    const prisma: any = {
      equipment: {
        findMany: jest.fn().mockResolvedValue(existingEquipment),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: `eq-${idCounter++}`,
          ...data,
        })),
      },
      functionalUnitLibrary: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }: any) => ({
          id: `lib-${idCounter++}`,
          ...data,
        })),
      },
      equipmentFunctionalUnit: {
        create: jest.fn().mockResolvedValue({ id: 'efu-1' }),
      },
    };

    const equipmentStatus: any = {};
    const service = new EquipmentService(prisma, equipmentStatus);
    return { service, prisma };
  };

  it('should throw BadRequestException when items is empty', async () => {
    const { service } = makeService();
    await expect(service.importBulk([])).rejects.toThrow(BadRequestException);
  });

  it('should import valid rows with sequential EQ-xxxx codes and skip invalid/duplicate rows', async () => {
    const { service, prisma } = makeService([
      { code: 'EQ-0005', accountingCode: 'KT-EXIST', name: 'Máy cũ' },
    ]);

    const result = await service.importBulk([
      {
        rowNumber: 2,
        name: 'Máy CNC 01',
        category: 'Máy gia công',
        location: 'Xưởng A',
        department: 'Sản xuất',
        accountingCode: 'KT-001',
        status: 'Hoạt động tốt',
        isCritical: 'Có',
        functionalUnit: 'Trục chính, Bộ làm mát',
      },
      {
        rowNumber: 3,
        name: '', // missing name -> error
        category: 'Máy gia công',
        location: 'Xưởng A',
      },
      {
        rowNumber: 4,
        name: 'Máy trùng KT DB',
        category: 'Phụ trợ',
        location: 'Xưởng B',
        accountingCode: 'KT-EXIST',
      },
      {
        rowNumber: 5,
        name: 'Máy trùng KT trong batch',
        category: 'Phụ trợ',
        location: 'Xưởng B',
        accountingCode: 'KT-001',
      },
      {
        rowNumber: 6,
        name: 'Máy Nén Khí 02',
        category: 'Phụ trợ',
        location: 'Phòng Máy',
        status: 'UNDER_MAINTENANCE',
      },
    ]);

    expect(result.totalRows).toBe(5);
    expect(result.createdCount).toBe(2);
    expect(result.skippedCount).toBe(3);

    expect(result.created[0]).toMatchObject({
      code: 'EQ-0006',
      name: 'Máy CNC 01',
      accountingCode: 'KT-001',
    });
    expect(result.created[1]).toMatchObject({
      code: 'EQ-0007',
      name: 'Máy Nén Khí 02',
      accountingCode: null,
    });

    expect(result.errors).toHaveLength(3);
    expect(result.errors[0].rowNumber).toBe(3);
    expect(result.errors[1].rowNumber).toBe(4);
    expect(result.errors[2].rowNumber).toBe(5);

    expect(prisma.equipment.create).toHaveBeenCalledTimes(2);
    expect(prisma.equipmentFunctionalUnit.create).toHaveBeenCalledTimes(2);
  });
});
