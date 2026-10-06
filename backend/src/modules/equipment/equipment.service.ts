import { Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEquipmentDto } from './dto/equipment.dto';

import { EquipmentStatusService } from './equipment-status.service';

@Injectable()
export class EquipmentService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private equipmentStatus: EquipmentStatusService,
  ) {}

  async onModuleInit() {
    try {
      // 1. Chuẩn hóa dữ liệu cũ: chuyển các giá trị accountingCode là chuỗi rỗng '' thành null để không bị kẹt unique constraint
      await this.prisma.$executeRawUnsafe(
        "UPDATE `Equipment` SET `accountingCode` = NULL WHERE `accountingCode` = ''"
      );
    } catch (err) {
      // Bỏ qua nếu bảng chưa tồn tại hoặc DB chưa migrate
    }

    try {
      // 2. Tự động đồng bộ chuẩn hóa trạng thái thiết bị theo sự cố và phiếu sửa chữa thực tế
      const result = await this.equipmentStatus.syncAllEquipmentStatuses();
      if (result.updated > 0) {
        console.log(`[EQUIPMENT_SYNC] Đã tự động chuẩn hóa trạng thái cho ${result.updated}/${result.total} thiết bị.`);
      }
    } catch (err) {
      console.warn('[EQUIPMENT_SYNC] Lỗi đồng bộ trạng thái thiết bị:', err);
    }

    try {
      // 3. Tự động chuyển đổi mã hệ thống chuẩn EQ-xxxx cho các thiết bị cũ (Production & Local)
      const legacyEquipments = await this.prisma.equipment.findMany({
        where: {
          OR: [
            { oldCode: null },
            { NOT: { code: { startsWith: 'EQ-' } } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      if (legacyEquipments.length > 0) {
        console.log(`[EQUIPMENT_MIGRATION] Bắt đầu tự động chuyển đổi mã cho ${legacyEquipments.length} thiết bị sang chuẩn EQ-xxxx...`);
        const allEquipments = await this.prisma.equipment.findMany({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        // Bước 1: Gán mã tạm thời để tránh xung đột Unique constraint và bảo lưu mã cũ vào oldCode
        for (let i = 0; i < allEquipments.length; i++) {
          const eq = allEquipments[i];
          const preservedOldCode = eq.oldCode || eq.code;
          await this.prisma.equipment.update({
            where: { id: eq.id },
            data: {
              oldCode: preservedOldCode,
              code: `TEMP_MIGRATE_${i + 1}_${Date.now()}`,
            },
          });
        }

        // Bước 2: Gán mã chuẩn EQ-0001, EQ-0002,...
        for (let i = 0; i < allEquipments.length; i++) {
          const eq = allEquipments[i];
          const newCode = `EQ-${String(i + 1).padStart(4, '0')}`;
          await this.prisma.equipment.update({
            where: { id: eq.id },
            data: {
              code: newCode,
            },
          });
        }
        console.log(`[EQUIPMENT_MIGRATION] Hoàn thành chuyển đổi ${allEquipments.length} thiết bị sang dải mã EQ-0001 -> EQ-${String(allEquipments.length).padStart(4, '0')}.`);
      }
    } catch (err) {
      console.warn('[EQUIPMENT_MIGRATION] Lỗi tự động chuyển đổi mã thiết bị:', err);
    }
  }

  /**
   * Sinh mã thiết bị hệ thống tự động tiếp theo dạng EQ-0001, EQ-0002...
   */
  public async generateNextEquipmentCode(): Promise<string> {
    const allEq = await this.prisma.equipment.findMany({
      select: { code: true },
    });
    let maxNumber = 0;
    for (const eq of allEq) {
      if (eq.code && eq.code.startsWith('EQ-')) {
        const numPart = parseInt(eq.code.replace('EQ-', ''), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    let candidateCode = `EQ-${String(nextNumber).padStart(4, '0')}`;
    let counter = nextNumber;
    while (await this.prisma.equipment.findUnique({ where: { code: candidateCode } })) {
      counter++;
      candidateCode = `EQ-${String(counter).padStart(4, '0')}`;
    }
    return candidateCode;
  }

  async syncStatuses() {
    return this.equipmentStatus.syncAllEquipmentStatuses();
  }

  async findAll(query?: { search?: string; category?: string; department?: string; status?: string; location?: string; page?: string; limit?: string }) {
    const where: any = { isActive: true };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { oldCode: { contains: query.search } },
        { accountingCode: { contains: query.search } },
        { serialNumber: { contains: query.search } },
      ];
    }
    if (query?.category) where.category = query.category;
    if (query?.department) where.department = query.department;
    if (query?.status) where.status = query.status;
    if (query?.location) where.location = query.location;

    // Check if pagination parameters are provided
    if (query?.page || query?.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.equipment.count({ where }),
        this.prisma.equipment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            schedules: {
              where: { status: 'ACTIVE' },
              orderBy: { nextDueDate: 'asc' },
              take: 1,
            },
            _count: {
              select: { requests: true, workOrders: true, schedules: true }
            }
          }
        })
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    // Default legacy behavior: return raw array
    return this.prisma.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: {
          where: { status: 'ACTIVE' },
          orderBy: { nextDueDate: 'asc' },
          take: 1,
        },
        _count: {
          select: { requests: true, workOrders: true, schedules: true }
        }
      }
    });
  }

  async findOne(idOrCode: string) {
    const item = await this.prisma.equipment.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { code: idOrCode },
          { oldCode: idOrCode },
          { accountingCode: idOrCode },
          { code: idOrCode.toUpperCase() },
          { oldCode: idOrCode.toUpperCase() },
        ],
      },
      include: {
        requests: { orderBy: { createdAt: 'desc' }, take: 10 },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { inventoryItem: true } } } },
        schedules: true,
        functionalUnits: { include: { libraryItem: true }, orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy thiết bị');

    const realId = item.id;
    const attachments = await this.prisma.attachment.findMany({
      where: { entityId: realId, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    const requestIds = item.requests.map(r => r.id);
    const workOrderIds = item.workOrders.map(w => w.id);
    const logEntityIds = [realId, ...requestIds, ...workOrderIds];

    const logs = await this.prisma.workflowHistory.findMany({
      where: {
        entityId: { in: logEntityIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const spareParts = await this.prisma.inventoryItem.findMany({
      where: { isActive: true }
    });

    return {
      ...item,
      attachments,
      logs,
      spareParts
    };
  }

  async create(data: any) {
    // 1. Chuẩn hóa mã kế toán: chuỗi rỗng -> null
    const accountingCode = data.accountingCode && String(data.accountingCode).trim() !== ''
      ? String(data.accountingCode).trim()
      : null;

    // 2. Chuẩn hóa mã cũ / nhận diện: nếu app ngoài gửi `code` cũ mà không có `oldCode`, tự động lưu vào `oldCode`
    const oldCode = data.oldCode && String(data.oldCode).trim() !== ''
      ? String(data.oldCode).trim()
      : (data.code && String(data.code).trim() !== '' && !String(data.code).startsWith('EQ-') ? String(data.code).trim() : null);

    // 3. Tự động sinh mã thiết bị hệ thống EQ-xxxx (không cho phép người dùng tự điền/sửa)
    const code = await this.generateNextEquipmentCode();

    if (accountingCode) {
      const existingAcc = await this.prisma.equipment.findUnique({ where: { accountingCode } });
      if (existingAcc) {
        throw new ConflictException(
          `Mã kế toán '${accountingCode}' đã được sử dụng cho thiết bị khác (${existingAcc.code} - ${existingAcc.name}).`,
        );
      }
    }

    try {
      const newEquipment = await this.prisma.equipment.create({
        data: {
          ...data,
          code,
          oldCode,
          accountingCode,
          department: data.department && String(data.department).trim() !== '' ? String(data.department).trim() : null,
          serialNumber: data.serialNumber && String(data.serialNumber).trim() !== '' ? String(data.serialNumber).trim() : null,
          specs: data.specs && String(data.specs).trim() !== '' ? String(data.specs).trim() : null,
          notes: data.notes && String(data.notes).trim() !== '' ? String(data.notes).trim() : null,
          functionalUnit: (Array.isArray(data.functionalUnits) && data.functionalUnits.length > 0)
            ? data.functionalUnits.map((u: any) => String(u).trim()).filter(Boolean).join(', ')
            : (data.functionalUnit && String(data.functionalUnit).trim() !== '' ? String(data.functionalUnit).trim() : null),
        },
      });

      // Tự động đồng bộ cụm chức năng vào Thư viện và tạo bản ghi cụm chức năng con cho thiết bị
      const rawUnits = Array.isArray(data.functionalUnits)
        ? data.functionalUnits
        : (newEquipment.functionalUnit ? newEquipment.functionalUnit.split(',') : []);
      const unitNames = rawUnits.map((s: any) => String(s).trim()).filter(Boolean);

      if (unitNames.length > 0) {
        for (let i = 0; i < unitNames.length; i++) {
          const uName = unitNames[i];
          try {
            // 1. Kiểm tra hoặc thêm vào thư viện
            let libItem = await this.prisma.functionalUnitLibrary.findFirst({
              where: { name: uName }
            });
            if (!libItem) {
              libItem = await this.prisma.functionalUnitLibrary.create({
                data: {
                  name: uName,
                  code: `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  category: data.category || 'Cơ khí',
                  description: `Tự động lưu từ thiết bị ${newEquipment.code}`,
                }
              });
            }
            // 2. Tạo cụm chức năng cho thiết bị
            await this.prisma.equipmentFunctionalUnit.create({
              data: {
                equipmentId: newEquipment.id,
                libraryId: libItem.id,
                name: uName,
                code: `${newEquipment.code}-CU${(i + 1).toString().padStart(2, '0')}`,
                status: 'OPERATIONAL',
                orderIndex: i,
              }
            });
          } catch (unitErr) {
            console.warn('Lỗi khi tự động khởi tạo cụm chức năng:', unitErr);
          }
        }
      }

      return newEquipment;
    } catch (err: any) {
      if (err.code === 'P2002') {
        const target = err.meta?.target || '';
        if (String(target).includes('accountingCode')) {
          throw new ConflictException(`Mã kế toán '${accountingCode}' đã tồn tại.`);
        }
        if (String(target).includes('code')) {
          throw new ConflictException(`Mã thiết bị '${code}' đã tồn tại.`);
        }
        throw new ConflictException('Dữ liệu thiết bị bị trùng lặp mã định danh duy nhất.');
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateEquipmentDto) {
    const item = await this.prisma.equipment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy thiết bị');

    if (item.version !== data.expectedVersion) {
      throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
    }

    const { expectedVersion, ...updateData } = data;
    const sanitizedData: any = { ...updateData };

    // Mã hệ thống 'code' là Read-Only do hệ thống quản lý, không cho phép client cập nhật
    delete sanitizedData.code;

    // Cho phép cập nhật mã cũ / mã nhận diện
    if ('oldCode' in sanitizedData) {
      sanitizedData.oldCode = sanitizedData.oldCode && String(sanitizedData.oldCode).trim() !== ''
        ? String(sanitizedData.oldCode).trim()
        : null;
    }

    if ('department' in sanitizedData) {
      sanitizedData.department = sanitizedData.department && String(sanitizedData.department).trim() !== ''
        ? String(sanitizedData.department).trim()
        : null;
    }

    if ('functionalUnit' in sanitizedData) {
      sanitizedData.functionalUnit = sanitizedData.functionalUnit && String(sanitizedData.functionalUnit).trim() !== ''
        ? String(sanitizedData.functionalUnit).trim()
        : null;
    }

    if ('accountingCode' in sanitizedData) {
      sanitizedData.accountingCode = sanitizedData.accountingCode && String(sanitizedData.accountingCode).trim() !== ''
        ? String(sanitizedData.accountingCode).trim()
        : null;

      if (sanitizedData.accountingCode) {
        const existingAcc = await this.prisma.equipment.findFirst({
          where: { accountingCode: sanitizedData.accountingCode, NOT: { id } },
        });
        if (existingAcc) {
          throw new ConflictException(
            `Mã kế toán '${sanitizedData.accountingCode}' đã được sử dụng cho thiết bị khác (${existingAcc.code} - ${existingAcc.name}).`,
          );
        }
      }
    }

    try {
      return await this.prisma.equipment.update({
        where: { id, version: expectedVersion },
        data: {
          ...sanitizedData,
          version: { increment: 1 },
        },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Dữ liệu thiết bị bị trùng lặp mã duy nhất.');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
