import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EquipmentTechnicalSpecsService {
  constructor(private prisma: PrismaService) {}

  async getSpecs(equipmentId: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment #${equipmentId} not found`);
    }

    return this.prisma.equipmentTechnicalSpec.findMany({
      where: { equipmentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSpec(equipmentId: string, data: { name: string; value: string; unit?: string; category?: string; notes?: string }) {
    return this.prisma.equipmentTechnicalSpec.create({
      data: {
        equipmentId,
        name: data.name,
        value: data.value,
        unit: data.unit,
        category: data.category,
        notes: data.notes,
      },
    });
  }

  async updateSpec(id: string, data: { name?: string; value?: string; unit?: string; category?: string; notes?: string }) {
    return this.prisma.equipmentTechnicalSpec.update({
      where: { id },
      data,
    });
  }

  async deleteSpec(id: string) {
    return this.prisma.equipmentTechnicalSpec.delete({
      where: { id },
    });
  }

  // Bulk assign from Standard Technical Spec Library
  async bulkAssignFromStandard(equipmentId: string, standardSpecIds: string[]) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment #${equipmentId} not found`);
    }

    if (!standardSpecIds || standardSpecIds.length === 0) {
      return this.getSpecs(equipmentId);
    }

    const standardSpecs = await this.prisma.standardTechnicalSpec.findMany({
      where: { id: { in: standardSpecIds } },
    });

    const existingSpecs = await this.prisma.equipmentTechnicalSpec.findMany({
      where: { equipmentId },
    });

    const existingNames = new Set(existingSpecs.map((s) => s.name.trim().toLowerCase()));

    for (const std of standardSpecs) {
      if (!existingNames.has(std.name.trim().toLowerCase())) {
        await this.prisma.equipmentTechnicalSpec.create({
          data: {
            equipmentId,
            name: std.name,
            value: '', // Giá trị để người dùng điền theo hồ sơ NSX
            unit: std.unit,
            category: std.category,
          },
        });
      }
    }

    return this.getSpecs(equipmentId);
  }

  // Batch update all technical specs of an equipment
  async batchUpdateSpecs(equipmentId: string, items: Array<{ id?: string; name: string; value: string; unit?: string | null; category?: string | null; notes?: string | null }>) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment #${equipmentId} not found`);
    }

    for (const item of items) {
      if (item.id) {
        await this.prisma.equipmentTechnicalSpec.update({
          where: { id: item.id },
          data: {
            name: item.name,
            value: item.value,
            unit: item.unit,
            category: item.category,
            notes: item.notes,
          },
        });
      } else {
        await this.prisma.equipmentTechnicalSpec.create({
          data: {
            equipmentId,
            name: item.name,
            value: item.value,
            unit: item.unit,
            category: item.category,
            notes: item.notes,
          },
        });
      }
    }

    return this.getSpecs(equipmentId);
  }
}
