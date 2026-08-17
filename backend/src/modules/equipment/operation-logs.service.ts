import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitOperationLogsDto } from './dto/operation-log.dto';

@Injectable()
export class OperationLogsService {
  constructor(private prisma: PrismaService) {}

  async getLogsByEquipment(equipmentId: string, limit: number = 100) {
    return this.prisma.operationLog.findMany({
      where: { equipmentId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        parameter: true,
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getAllLogs(limit: number = 100) {
    return this.prisma.operationLog.findMany({
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        equipment: { select: { id: true, name: true, code: true } },
        parameter: true,
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async submitLogs(equipmentId: string, userId: string, dto: SubmitOperationLogsDto) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    const parameters = await this.prisma.equipmentParameter.findMany({
      where: { equipmentId },
    });

    const paramMap = new Map(parameters.map(p => [p.id, p]));

    const createData = dto.logs.map(log => {
      const param = paramMap.get(log.parameterId);
      if (!param) {
        throw new NotFoundException(`Parameter with ID ${log.parameterId} not found for this equipment`);
      }

      let isOutlier = false;
      if (param.minSpec !== null && log.value < param.minSpec) {
        isOutlier = true;
      }
      if (param.maxSpec !== null && log.value > param.maxSpec) {
        isOutlier = true;
      }

      return {
        equipmentId,
        parameterId: log.parameterId,
        value: log.value,
        notes: log.notes,
        isOutlier,
        recordedById: userId,
      };
    });

    return this.prisma.$transaction(
      createData.map(data => this.prisma.operationLog.create({ data, include: { parameter: true } }))
    );
  }
}
