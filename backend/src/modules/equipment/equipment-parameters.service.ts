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
}
