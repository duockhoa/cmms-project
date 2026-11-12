import { equipmentScope } from '../../common/auth/resource-scope';
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

  async getDepartments() {
    const equipments = await this.prisma.equipment.findMany({
      where: {
        isActive: true,
        department: { not: null },
      },
      select: { department: true },
      distinct: ['department'],
    });
    return equipments
      .map((equipment) => equipment.department?.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'vi'));
  }

  async lookup(search?: string) {
    const where: any = { isActive: true };
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { oldCode: { contains: q } },
        { accountingCode: { contains: q } },
        { location: { contains: q } },
      ];
    }
    return this.prisma.equipment.findMany({
      where,
      select: {
        id: true,
        code: true,
        oldCode: true,
        accountingCode: true,
        name: true,
        category: true,
        department: true,
        location: true,
        status: true,
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async findAll(query?: { search?: string; category?: string; department?: string; status?: string; location?: string; page?: string; limit?: string }, actor?: any) {
    const where: any = { isActive: true, ...(actor ? { AND: [equipmentScope(actor)] } : {}) };
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
        spareParts: {
          include: {
            sparePart: true,
          },
          orderBy: { createdAt: 'asc' },
        },
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

    return {
      ...item,
      attachments,
      logs,
      spareParts: item.spareParts || [],
    };
  }

  async getEquipmentSpareParts(equipmentId: string) {
    const eq = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!eq) throw new NotFoundException('Không tìm thấy thiết bị');

    return this.prisma.equipmentSparePart.findMany({
      where: { equipmentId: eq.id },
      include: {
        sparePart: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addEquipmentSparePart(equipmentId: string, data: { sparePartId: string; role?: string; quantityPerEquipment?: number; notes?: string }) {
    const eq = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!eq) throw new NotFoundException('Không tìm thấy thiết bị');

    const sparePart = await this.prisma.inventoryItem.findUnique({
      where: { id: data.sparePartId },
    });
    if (!sparePart) throw new NotFoundException('Không tìm thấy phụ tùng');

    return this.prisma.equipmentSparePart.create({
      data: {
        equipmentId: eq.id,
        sparePartId: data.sparePartId,
        role: data.role?.trim() || undefined,
        quantityPerEquipment: Math.max(1, data.quantityPerEquipment || 1),
        notes: data.notes?.trim() || undefined,
      },
      include: {
        sparePart: true,
      },
    });
  }

  async removeEquipmentSparePart(equipmentId: string, linkId: string) {
    const item = await this.prisma.equipmentSparePart.findUnique({
      where: { id: linkId },
    });
    if (!item) throw new NotFoundException('Không tìm thấy liên kết phụ tùng');

    await this.prisma.equipmentSparePart.delete({
      where: { id: linkId },
    });
    return { success: true };
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
      await this.syncFunctionalUnitsForEquipment(newEquipment, rawUnits, data.category);

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

  private async syncFunctionalUnitsForEquipment(
    equipment: { id: string; code: string },
    rawUnits: any[],
    category?: string,
  ) {
    const unitNames = rawUnits.map((s: any) => String(s).trim()).filter(Boolean);
    if (unitNames.length === 0) return;

    for (let i = 0; i < unitNames.length; i++) {
      const uName = unitNames[i];
      try {
        let libItem = await this.prisma.functionalUnitLibrary.findFirst({
          where: { name: uName },
        });
        if (!libItem) {
          libItem = await this.prisma.functionalUnitLibrary.create({
            data: {
              name: uName,
              code: `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              category: category || 'Cơ khí',
              description: `Tự động lưu từ thiết bị ${equipment.code}`,
            },
          });
        }
        await this.prisma.equipmentFunctionalUnit.create({
          data: {
            equipmentId: equipment.id,
            libraryId: libItem.id,
            name: uName,
            code: `${equipment.code}-CU${(i + 1).toString().padStart(2, '0')}`,
            status: 'OPERATIONAL',
            orderIndex: i,
          },
        });
      } catch (unitErr) {
        console.warn('Lỗi khi tự động khởi tạo cụm chức năng:', unitErr);
      }
    }
  }

  private normalizeImportStatus(rawStatus: any): string {
    const val = String(rawStatus ?? '').trim().toUpperCase();
    if (!val) return 'OPERATIONAL';

    const aliasMap: Record<string, string> = {
      OPERATIONAL: 'OPERATIONAL',
      'HOẠT ĐỘNG TỐT': 'OPERATIONAL',
      'HOAT DONG TOT': 'OPERATIONAL',
      'BÌNH THƯỜNG': 'OPERATIONAL',
      UNDER_MAINTENANCE: 'UNDER_MAINTENANCE',
      'ĐANG BẢO TRÌ': 'UNDER_MAINTENANCE',
      'DANG BAO TRI': 'UNDER_MAINTENANCE',
      'BẢO TRÌ': 'UNDER_MAINTENANCE',
      INCIDENT: 'INCIDENT',
      'SỰ CỐ': 'INCIDENT',
      'SU CO': 'INCIDENT',
      'HỎNG': 'INCIDENT',
      DISCOMMISSIONED: 'DISCOMMISSIONED',
      'NGỪNG SỬ DỤNG': 'DISCOMMISSIONED',
      'NGUNG SU DUNG': 'DISCOMMISSIONED',
    };

    const mapped = aliasMap[val];
    if (!mapped) {
      throw new Error(`Trạng thái không hợp lệ: '${rawStatus}'`);
    }
    return mapped;
  }

  private parseOptionalNumber(val: any, fieldLabel: string): number | undefined {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const num = Number(String(val).replace(/,/g, '').trim());
    if (!Number.isFinite(num)) {
      throw new Error(`${fieldLabel} phải là số hợp lệ`);
    }
    return num;
  }

  private parseOptionalBoolean(val: any): boolean | undefined {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const normalized = String(val).trim().toLowerCase();
    if (['true', '1', 'có', 'co', 'yes', 'x'].includes(normalized)) return true;
    if (['false', '0', 'không', 'khong', 'no'].includes(normalized)) return false;
    return undefined;
  }

  private parseOptionalDate(val: any): Date | undefined {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Ngày mua không hợp lệ: '${val}'`);
    }
    return d;
  }

  async importBulk(items: Record<string, any>[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Danh sách thiết bị import không được để trống.');
    }

    // Lấy toàn bộ mã hệ thống & mã kế toán hiện có 1 lần để kiểm tra trùng lặp và sinh EQ-xxxx tuần tự
    const existingEquipment = await this.prisma.equipment.findMany({
      select: { code: true, accountingCode: true, name: true },
    });

    const usedCodes = new Set<string>();
    const existingAccMap = new Map<string, { code: string; name: string }>();
    let maxEqNum = 0;

    for (const eq of existingEquipment) {
      if (eq.code) {
        usedCodes.add(eq.code);
        if (eq.code.startsWith('EQ-')) {
          const numPart = parseInt(eq.code.replace('EQ-', ''), 10);
          if (!Number.isNaN(numPart) && numPart > maxEqNum) {
            maxEqNum = numPart;
          }
        }
      }
      if (eq.accountingCode) {
        existingAccMap.set(eq.accountingCode, { code: eq.code, name: eq.name });
      }
    }

    const created: Array<{ id: string; code: string; name: string; accountingCode: string | null }> = [];
    const errors: Array<{ rowNumber: number; name?: string; accountingCode?: string; reason: string }> = [];

    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx] || {};
      const rowNumber = Number(raw.rowNumber) || idx + 2; // Excel row 1 is header
      const name = String(raw.name ?? '').trim();
      const category = String(raw.category ?? '').trim();
      const location = String(raw.location ?? '').trim();
      const accountingCode = raw.accountingCode && String(raw.accountingCode).trim() !== ''
        ? String(raw.accountingCode).trim()
        : null;

      try {
        if (!name) throw new Error('Thiếu tên thiết bị');
        if (!category) throw new Error('Thiếu loại thiết bị');
        if (!location) throw new Error('Thiếu vị trí lắp đặt');

        if (accountingCode && existingAccMap.has(accountingCode)) {
          const dup = existingAccMap.get(accountingCode)!;
          throw new Error(`Mã kế toán '${accountingCode}' đã tồn tại (${dup.code} - ${dup.name})`);
        }

        const status = this.normalizeImportStatus(raw.status);
        const purchaseDate = this.parseOptionalDate(raw.purchaseDate);
        const currentOperatingHours = this.parseOptionalNumber(raw.currentOperatingHours, 'Giờ vận hành hiện tại');
        const standardSpeedPerHour = this.parseOptionalNumber(raw.standardSpeedPerHour, 'Tốc độ chuẩn/giờ');
        const plannedShiftMinutes = this.parseOptionalNumber(raw.plannedShiftMinutes, 'Thời gian ca (phút)');
        const oeeTarget = this.parseOptionalNumber(raw.oeeTarget, 'Mục tiêu OEE (%)');
        const isCritical = this.parseOptionalBoolean(raw.isCritical);

        const oldCode = raw.oldCode && String(raw.oldCode).trim() !== ''
          ? String(raw.oldCode).trim()
          : (raw.code && String(raw.code).trim() !== '' && !String(raw.code).startsWith('EQ-')
            ? String(raw.code).trim()
            : null);

        // Sinh mã EQ-xxxx tiếp theo không trùng
        let nextNum = maxEqNum + 1;
        let nextCode = `EQ-${String(nextNum).padStart(4, '0')}`;
        while (usedCodes.has(nextCode)) {
          nextNum++;
          nextCode = `EQ-${String(nextNum).padStart(4, '0')}`;
        }
        maxEqNum = nextNum;
        usedCodes.add(nextCode);

        const department = raw.department && String(raw.department).trim() !== '' ? String(raw.department).trim() : null;
        const serialNumber = raw.serialNumber && String(raw.serialNumber).trim() !== '' ? String(raw.serialNumber).trim() : null;
        const warrantyPeriod = raw.warrantyPeriod && String(raw.warrantyPeriod).trim() !== '' ? String(raw.warrantyPeriod).trim() : null;
        const specs = raw.specs && String(raw.specs).trim() !== '' ? String(raw.specs).trim() : null;
        const notes = raw.notes && String(raw.notes).trim() !== '' ? String(raw.notes).trim() : null;
        const outputUnit = raw.outputUnit && String(raw.outputUnit).trim() !== '' ? String(raw.outputUnit).trim() : undefined;
        const functionalUnit = raw.functionalUnit && String(raw.functionalUnit).trim() !== ''
          ? String(raw.functionalUnit).trim()
          : null;

        const newEquipment = await this.prisma.equipment.create({
          data: {
            code: nextCode,
            oldCode,
            accountingCode,
            name,
            category,
            department,
            location,
            status,
            purchaseDate,
            warrantyPeriod,
            serialNumber,
            specs,
            notes,
            functionalUnit,
            currentOperatingHours,
            isCritical,
            standardSpeedPerHour,
            outputUnit,
            plannedShiftMinutes,
            oeeTarget,
          },
        });

        if (accountingCode) {
          existingAccMap.set(accountingCode, { code: newEquipment.code, name: newEquipment.name });
        }

        if (functionalUnit) {
          await this.syncFunctionalUnitsForEquipment(
            newEquipment,
            functionalUnit.split(','),
            category,
          );
        }

        created.push({
          id: newEquipment.id,
          code: newEquipment.code,
          name: newEquipment.name,
          accountingCode: newEquipment.accountingCode,
        });
      } catch (err: any) {
        errors.push({
          rowNumber,
          name: name || undefined,
          accountingCode: accountingCode || undefined,
          reason: err?.message || 'Lỗi không xác định khi lưu thiết bị',
        });
      }
    }

    return {
      totalRows: items.length,
      createdCount: created.length,
      skippedCount: errors.length,
      errors,
      created,
    };
  }
}
