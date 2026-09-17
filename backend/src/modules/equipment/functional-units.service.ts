import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
}
