import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipmentParameterDto, UpdateEquipmentParameterDto } from './dto/equipment-parameter.dto';

@Injectable()
export class EquipmentParametersService {
  constructor(private prisma: PrismaService) {}

  async getParameters(equipmentId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    return this.prisma.equipmentParameter.findMany({
      where: { equipmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createParameter(equipmentId: string, data: CreateEquipmentParameterDto) {
    return this.prisma.equipmentParameter.create({
      data: {
        ...data,
        equipmentId,
      },
    });
  }

  async updateParameter(id: string, data: UpdateEquipmentParameterDto) {
    return this.prisma.equipmentParameter.update({
      where: { id },
      data,
    });
  }

  async deleteParameter(id: string) {
    return this.prisma.equipmentParameter.delete({
      where: { id },
    });
  }

  // Bulk assign from standard parameter library
  async bulkAssignFromStandard(equipmentId: string, standardParameterIds: string[]) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    if (!standardParameterIds || standardParameterIds.length === 0) {
      return this.getParameters(equipmentId);
    }

    const standardParams = await this.prisma.standardParameter.findMany({
      where: { id: { in: standardParameterIds } },
    });

    const existingParams = await this.prisma.equipmentParameter.findMany({
      where: { equipmentId },
    });

    const existingNames = new Set(existingParams.map((p) => p.name.trim().toLowerCase()));

    for (const std of standardParams) {
      if (!existingNames.has(std.name.trim().toLowerCase())) {
        await this.prisma.equipmentParameter.create({
          data: {
            equipmentId,
            name: std.name,
            unit: std.unit,
            minSpec: std.minSpec,
            maxSpec: std.maxSpec,
            isActive: true,
          },
        });
      }
    }

    return this.getParameters(equipmentId);
  }

  // Safe Full Sync for Checklist Matrix: Selected items are created/updated; unselected items are removed or deactivated
  async syncParameters(equipmentId: string, selectedItems: Array<{
    name: string;
    unit?: string | null;
    minSpec?: number | null;
    maxSpec?: number | null;
    standardValue?: number | null;
  }>) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    const existingParams = await this.prisma.equipmentParameter.findMany({
      where: { equipmentId },
      include: { _count: { select: { logs: true } } },
    });

    const selectedNameMap = new Map(
      selectedItems.map((item) => [item.name.trim().toLowerCase(), item])
    );

    // 1. Process existing params
    for (const existing of existingParams) {
      const normalizedName = existing.name.trim().toLowerCase();
      if (selectedNameMap.has(normalizedName)) {
        const item = selectedNameMap.get(normalizedName)!;
        await this.prisma.equipmentParameter.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            unit: item.unit,
            minSpec: item.minSpec,
            maxSpec: item.maxSpec,
            standardValue: item.standardValue,
            isActive: true,
          },
        });
        selectedNameMap.delete(normalizedName);
      } else {
        // Param is no longer selected
        if (existing._count.logs > 0) {
          // Has historical logs: deactivate so it won't break foreign keys
          await this.prisma.equipmentParameter.update({
            where: { id: existing.id },
            data: { isActive: false },
          });
        } else {
          // No logs: safely delete
          await this.prisma.equipmentParameter.delete({
            where: { id: existing.id },
          });
        }
      }
    }

    // 2. Create newly selected params
    for (const [, item] of selectedNameMap) {
      await this.prisma.equipmentParameter.create({
        data: {
          equipmentId,
          name: item.name,
          unit: item.unit,
          minSpec: item.minSpec,
          maxSpec: item.maxSpec,
          standardValue: item.standardValue,
          isActive: true,
        },
      });
    }

    return this.getParameters(equipmentId);
  }

  // Batch save / sync parameters for equipment
  async batchUpdateParameters(equipmentId: string, items: Array<{
    id?: string;
    name: string;
    unit?: string | null;
    minSpec?: number | null;
    maxSpec?: number | null;
    standardValue?: number | null;
    isActive?: boolean;
  }>) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    for (const item of items) {
      if (item.id) {
        await this.prisma.equipmentParameter.update({
          where: { id: item.id },
          data: {
            name: item.name,
            unit: item.unit,
            minSpec: item.minSpec,
            maxSpec: item.maxSpec,
            standardValue: item.standardValue,
            isActive: item.isActive !== undefined ? item.isActive : true,
          },
        });
      } else {
        await this.prisma.equipmentParameter.create({
          data: {
            equipmentId,
            name: item.name,
            unit: item.unit,
            minSpec: item.minSpec,
            maxSpec: item.maxSpec,
            standardValue: item.standardValue,
            isActive: item.isActive !== undefined ? item.isActive : true,
          },
        });
      }
    }

    return this.getParameters(equipmentId);
  }
}
