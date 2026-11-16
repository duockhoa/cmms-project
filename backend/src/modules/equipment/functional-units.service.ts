import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreateFunctionalUnitDto, 
  UpdateFunctionalUnitDto, 
  CreateFunctionalUnitLibraryDto, 
  UpdateFunctionalUnitLibraryDto 
} from './dto/functional-unit.dto';

@Injectable()
export class FunctionalUnitsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // THƯ VIỆN CỤM CHỨC NĂNG DÙNG CHUNG (LIBRARY)
  // ==========================================

  async getLibrary() {
    return this.prisma.functionalUnitLibrary.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { functionalUnits: true }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async createLibraryItem(dto: CreateFunctionalUnitLibraryDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.functionalUnitLibrary.findFirst({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Cụm chức năng '${name}' đã tồn tại trong thư viện.`);
    }

    return this.prisma.functionalUnitLibrary.create({
      data: {
        name,
        code: dto.code?.trim() || `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        category: dto.category?.trim() || 'Cơ khí',
        description: dto.description?.trim(),
      },
    });
  }

  async updateLibraryItem(id: string, dto: UpdateFunctionalUnitLibraryDto) {
    const item = await this.prisma.functionalUnitLibrary.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy cụm chức năng trong thư viện (ID: ${id})`);
    }

    if (dto.name && dto.name.trim().toLowerCase() !== item.name.toLowerCase()) {
      const existing = await this.prisma.functionalUnitLibrary.findFirst({
        where: { name: dto.name.trim(), NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Tên cụm chức năng '${dto.name}' đã được sử dụng.`);
      }
    }

    return this.prisma.functionalUnitLibrary.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code?.trim() }),
        ...(dto.category !== undefined && { category: dto.category?.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteLibraryItem(id: string) {
    return this.prisma.functionalUnitLibrary.delete({
      where: { id },
    });
  }

  // ==========================================
  // CỤM CHỨC NĂNG THEO THIẾT BỊ (PER EQUIPMENT)
  // ==========================================

  async getByEquipment(equipmentId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Thiết bị với ID ${equipmentId} không tồn tại.`);
    }

    return this.prisma.equipmentFunctionalUnit.findMany({
      where: { equipmentId },
      include: { libraryItem: true },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createForEquipment(equipmentId: string, dto: CreateFunctionalUnitDto) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Thiết bị với ID ${equipmentId} không tồn tại.`);
    }

    const name = dto.name.trim();

    // 1. Tự động kiểm tra và thêm vào Thư viện dùng chung nếu chưa có (Auto-sync)
    let libraryItem = await this.prisma.functionalUnitLibrary.findFirst({
      where: { name },
    });

    if (!libraryItem) {
      libraryItem = await this.prisma.functionalUnitLibrary.create({
        data: {
          name,
          code: dto.code?.trim() || `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          category: dto.category?.trim() || 'Cơ khí',
          description: dto.description?.trim() || `Tự động tạo từ thiết bị ${equipment.code}`,
        },
      });
    }

    // 2. Tự động sinh mã cụm của máy nếu không nhập
    let code = dto.code ? dto.code.trim() : '';
    if (!code) {
      const count = await this.prisma.equipmentFunctionalUnit.count({ where: { equipmentId } });
      code = `${equipment.code}-CU${(count + 1).toString().padStart(2, '0')}`;
    }

    // 3. Tạo bản ghi cụm chức năng cho thiết bị
    return this.prisma.equipmentFunctionalUnit.create({
      data: {
        equipmentId,
        libraryId: libraryItem.id,
        name,
        code,
        description: dto.description?.trim(),
        status: dto.status || 'OPERATIONAL',
        orderIndex: dto.orderIndex || 0,
      },
      include: { libraryItem: true },
    });
  }

  async createBatchForEquipment(equipmentId: string, dtos: CreateFunctionalUnitDto[]) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Thiết bị với ID ${equipmentId} không tồn tại.`);
    }

    const currentUnits = await this.prisma.equipmentFunctionalUnit.findMany({
      where: { equipmentId },
    });
    const currentNames = new Set(currentUnits.map(u => u.name.toLowerCase().trim()));
    let count = currentUnits.length;
    const created = [];

    for (const dto of dtos) {
      const name = dto.name.trim();
      if (currentNames.has(name.toLowerCase())) {
        continue; // Bỏ qua nếu máy đã có cụm cùng tên
      }

      // Kiểm tra hoặc tạo trong thư viện
      let libItem = await this.prisma.functionalUnitLibrary.findFirst({ where: { name } });
      if (!libItem) {
        libItem = await this.prisma.functionalUnitLibrary.create({
          data: {
            name,
            code: dto.code?.trim() || `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            category: dto.category?.trim() || 'Cơ khí',
            description: dto.description?.trim() || `Tự động tạo từ thiết bị ${equipment.code}`,
          },
        });
      }

      count++;
      const code = dto.code?.trim() || `${equipment.code}-CU${count.toString().padStart(2, '0')}`;

      const newUnit = await this.prisma.equipmentFunctionalUnit.create({
        data: {
          equipmentId,
          libraryId: libItem.id,
          name,
          code,
          description: dto.description?.trim() || libItem.description,
          status: dto.status || 'OPERATIONAL',
          orderIndex: count - 1,
        },
        include: { libraryItem: true },
      });

      created.push(newUnit);
      currentNames.add(name.toLowerCase());
    }

    return {
      createdCount: created.length,
      items: created,
      message: `Đã thêm thành công ${created.length} cụm chức năng vào thiết bị ${equipment.code}.`,
    };
  }

  async updateForEquipment(id: string, dto: UpdateFunctionalUnitDto) {
    const existing = await this.prisma.equipmentFunctionalUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cụm chức năng (ID: ${id})`);
    }

    let libraryId = dto.libraryId !== undefined ? dto.libraryId : existing.libraryId;

    // Nếu tên thay đổi, tự động kiểm tra hoặc cập nhật vào thư viện nếu chưa có
    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const newName = dto.name.trim();
      let libraryItem = await this.prisma.functionalUnitLibrary.findFirst({
        where: { name: newName },
      });
      if (!libraryItem) {
        libraryItem = await this.prisma.functionalUnitLibrary.create({
          data: {
            name: newName,
            code: dto.code?.trim() || `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            category: 'Cơ khí',
            description: dto.description?.trim(),
          },
        });
      }
      libraryId = libraryItem.id;
    }

    return this.prisma.equipmentFunctionalUnit.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code: dto.code?.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        libraryId,
      },
      include: { libraryItem: true },
    });
  }

  async deleteForEquipment(id: string) {
    const existing = await this.prisma.equipmentFunctionalUnit.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cụm chức năng (ID: ${id})`);
    }

    return this.prisma.equipmentFunctionalUnit.delete({
      where: { id },
    });
  }

  async cloneUnitsFromEquipment(targetEquipmentId: string, sourceEquipmentId: string, unitIds?: string[]) {
    const targetEquipment = await this.prisma.equipment.findUnique({ where: { id: targetEquipmentId } });
    if (!targetEquipment) {
      throw new NotFoundException(`Thiết bị đích với ID ${targetEquipmentId} không tồn tại.`);
    }

    const sourceEquipment = await this.prisma.equipment.findUnique({ where: { id: sourceEquipmentId } });
    if (!sourceEquipment) {
      throw new NotFoundException(`Thiết bị nguồn với ID ${sourceEquipmentId} không tồn tại.`);
    }

    // Lấy các cụm của thiết bị nguồn
    const sourceUnits = await this.prisma.equipmentFunctionalUnit.findMany({
      where: { 
        equipmentId: sourceEquipmentId,
        ...(unitIds && unitIds.length > 0 ? { id: { in: unitIds } } : {})
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    if (sourceUnits.length === 0) {
      return { clonedCount: 0, items: [], message: 'Không có cụm chức năng nào từ thiết bị nguồn để sao chép.' };
    }

    // Lấy các cụm hiện tại của thiết bị đích để tránh trùng lặp tên
    const currentTargetUnits = await this.prisma.equipmentFunctionalUnit.findMany({
      where: { equipmentId: targetEquipmentId },
    });
    const currentNames = new Set(currentTargetUnits.map(u => u.name.toLowerCase().trim()));

    let currentCount = currentTargetUnits.length;
    const clonedUnits = [];

    for (const sUnit of sourceUnits) {
      if (currentNames.has(sUnit.name.toLowerCase().trim())) {
        // Đã có cụm cùng tên trên máy đích -> bỏ qua để tránh trùng
        continue;
      }

      currentCount++;
      const code = `${targetEquipment.code}-CU${currentCount.toString().padStart(2, '0')}`;

      const created = await this.prisma.equipmentFunctionalUnit.create({
        data: {
          equipmentId: targetEquipmentId,
          libraryId: sUnit.libraryId,
          name: sUnit.name,
          code,
          description: sUnit.description,
          status: 'OPERATIONAL',
          orderIndex: currentCount - 1,
        },
        include: { libraryItem: true }
      });
      clonedUnits.push(created);
      currentNames.add(sUnit.name.toLowerCase().trim());
    }

    return {
      clonedCount: clonedUnits.length,
      items: clonedUnits,
      message: `Đã sao chép thành công ${clonedUnits.length} cụm chức năng sang thiết bị ${targetEquipment.code}.`,
    };
  }

  private normalizeUnitStatus(rawStatus: any): string {
    const val = String(rawStatus ?? '').trim().toUpperCase();
    if (!val) return 'OPERATIONAL';

    const aliasMap: Record<string, string> = {
      OPERATIONAL: 'OPERATIONAL',
      'HOẠT ĐỘNG TỐT': 'OPERATIONAL',
      'HOAT DONG TOT': 'OPERATIONAL',
      'BÌNH THƯỜNG': 'OPERATIONAL',
      WARNING: 'WARNING',
      'CẦN THEO DÕI': 'WARNING',
      'CAN THEO DOI': 'WARNING',
      'CẢNH BÁO': 'WARNING',
      INCIDENT: 'INCIDENT',
      'SỰ CỐ': 'INCIDENT',
      'SU CO': 'INCIDENT',
      'HỎNG': 'INCIDENT',
      INACTIVE: 'INACTIVE',
      'NGỪNG HOẠT ĐỘNG': 'INACTIVE',
      'NGUNG HOAT DONG': 'INACTIVE',
    };

    const mapped = aliasMap[val];
    if (!mapped) {
      throw new Error(`Trạng thái cụm chức năng không hợp lệ: '${rawStatus}'`);
    }
    return mapped;
  }

  async importBulkByEquipment(items: Record<string, any>[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Danh sách cụm chức năng import không được để trống.');
    }

    const allEquipment = await this.prisma.equipment.findMany({
      where: { isActive: true },
      select: { id: true, code: true, oldCode: true, accountingCode: true, name: true, category: true },
    });

    const byId = new Map<string, typeof allEquipment[number]>();
    const byCode = new Map<string, typeof allEquipment[number]>();
    const byOldCode = new Map<string, typeof allEquipment[number]>();
    const byAccCode = new Map<string, typeof allEquipment[number]>();
    const byNameCount = new Map<string, typeof allEquipment[number][]>();

    for (const eq of allEquipment) {
      byId.set(eq.id, eq);
      if (eq.code) byCode.set(eq.code.trim().toLowerCase(), eq);
      if (eq.oldCode) byOldCode.set(eq.oldCode.trim().toLowerCase(), eq);
      if (eq.accountingCode) byAccCode.set(eq.accountingCode.trim().toLowerCase(), eq);
      if (eq.name) {
        const key = eq.name.trim().toLowerCase();
        const arr = byNameCount.get(key) || [];
        arr.push(eq);
        byNameCount.set(key, arr);
      }
    }

    // Cache existing units & library items to avoid N+1 full scans
    const existingUnits = await this.prisma.equipmentFunctionalUnit.findMany({
      select: { equipmentId: true, name: true, code: true },
    });
    const unitNamesByEq = new Map<string, Set<string>>();
    const unitCountByEq = new Map<string, number>();
    const usedUnitCodes = new Set<string>();

    for (const u of existingUnits) {
      if (!unitNamesByEq.has(u.equipmentId)) {
        unitNamesByEq.set(u.equipmentId, new Set());
      }
      unitNamesByEq.get(u.equipmentId)!.add(u.name.trim().toLowerCase());
      unitCountByEq.set(u.equipmentId, (unitCountByEq.get(u.equipmentId) || 0) + 1);
      if (u.code) usedUnitCodes.add(u.code.trim().toLowerCase());
    }

    const libraryList = await this.prisma.functionalUnitLibrary.findMany();
    const libraryByName = new Map<string, typeof libraryList[number]>();
    for (const lib of libraryList) {
      libraryByName.set(lib.name.trim().toLowerCase(), lib);
    }

    const created: Array<{ id: string; code: string; name: string; equipmentCode: string; equipmentName: string }> = [];
    const errors: Array<{ rowNumber: number; equipmentKey?: string; name?: string; reason: string }> = [];

    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx] || {};
      const rowNumber = Number(raw.rowNumber) || idx + 2;
      const equipmentIdRaw = String(raw.equipmentId ?? '').trim();
      const equipmentKey = String(
        raw.equipmentKey ?? raw.equipmentCode ?? raw.oldCode ?? raw.accountingCode ?? raw.equipmentName ?? ''
      ).trim();
      const name = String(raw.name ?? '').trim();

      try {
        if (!name) {
          throw new Error('Thiếu tên cụm chức năng');
        }

        let targetEq = equipmentIdRaw ? byId.get(equipmentIdRaw) : undefined;
        if (!targetEq) {
          if (!equipmentKey) {
            throw new Error('Thiếu mã/tên thiết bị');
          }
          const normalizedKey = equipmentKey.toLowerCase();
          targetEq = byCode.get(normalizedKey) || byOldCode.get(normalizedKey) || byAccCode.get(normalizedKey);
          if (!targetEq) {
            const matchedByName = byNameCount.get(normalizedKey);
            if (matchedByName && matchedByName.length === 1) {
              targetEq = matchedByName[0];
            } else if (matchedByName && matchedByName.length > 1) {
              throw new Error(`Tên thiết bị '${equipmentKey}' bị trùng (${matchedByName.length} máy), vui lòng dùng mã EQ-xxxx hoặc mã cũ`);
            }
          }
        }

        if (!targetEq) {
          throw new Error(`Không tìm thấy thiết bị khớp với '${equipmentKey || equipmentIdRaw}'`);
        }

        if (!unitNamesByEq.has(targetEq.id)) {
          unitNamesByEq.set(targetEq.id, new Set());
        }
        const eqUnitNames = unitNamesByEq.get(targetEq.id)!;
        if (eqUnitNames.has(name.toLowerCase())) {
          throw new Error(`Thiết bị ${targetEq.code} đã có cụm chức năng '${name}'`);
        }

        const status = this.normalizeUnitStatus(raw.status);
        const category = String(raw.category ?? '').trim() || targetEq.category || 'Cơ khí';
        const description = String(raw.description ?? '').trim() || undefined;

        let orderIndex: number | undefined;
        if (raw.orderIndex !== undefined && raw.orderIndex !== null && String(raw.orderIndex).trim() !== '') {
          const parsedOrder = Number(raw.orderIndex);
          if (!Number.isFinite(parsedOrder)) {
            throw new Error('Thứ tự hiển thị phải là số nguyên');
          }
          orderIndex = Math.trunc(parsedOrder);
        }

        // Sync vào thư viện dùng chung nếu chưa có
        let libItem = libraryByName.get(name.toLowerCase());
        if (!libItem) {
          libItem = await this.prisma.functionalUnitLibrary.create({
            data: {
              name,
              code: `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              category,
              description: description || `Tự động tạo khi import cho thiết bị ${targetEq.code}`,
            },
          });
          libraryByName.set(name.toLowerCase(), libItem);
        }

        let seq = (unitCountByEq.get(targetEq.id) || 0) + 1;
        let unitCode = String(raw.code ?? '').trim();
        if (!unitCode) {
          unitCode = `${targetEq.code}-CU${String(seq).padStart(2, '0')}`;
          while (usedUnitCodes.has(unitCode.toLowerCase())) {
            seq++;
            unitCode = `${targetEq.code}-CU${String(seq).padStart(2, '0')}`;
          }
        } else if (usedUnitCodes.has(unitCode.toLowerCase())) {
          throw new Error(`Mã cụm chức năng '${unitCode}' đã tồn tại`);
        }

        const newUnit = await this.prisma.equipmentFunctionalUnit.create({
          data: {
            equipmentId: targetEq.id,
            libraryId: libItem.id,
            name,
            code: unitCode,
            description: description ?? libItem.description,
            status,
            orderIndex: orderIndex ?? seq - 1,
          },
        });

        eqUnitNames.add(name.toLowerCase());
        unitCountByEq.set(targetEq.id, seq);
        usedUnitCodes.add(unitCode.toLowerCase());

        created.push({
          id: newUnit.id,
          code: newUnit.code,
          name: newUnit.name,
          equipmentCode: targetEq.code,
          equipmentName: targetEq.name,
        });
      } catch (err: any) {
        errors.push({
          rowNumber,
          equipmentKey: equipmentKey || undefined,
          name: name || undefined,
          reason: err?.message || 'Lỗi không xác định khi lưu cụm chức năng',
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
