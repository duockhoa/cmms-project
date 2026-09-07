import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitOperationLogsDto } from './dto/operation-log.dto';
import { VoidOperationLogSessionDto } from './dto/void-operation-log.dto';

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
        voidedBy: {
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
        voidedBy: {
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

  async voidSessionLogs(equipmentId: string, userId: string, dto: VoidOperationLogSessionDto) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${equipmentId} not found`);
    }

    const whereClause: any = { equipmentId };
    if (dto.logIds && dto.logIds.length > 0) {
      whereClause.id = { in: dto.logIds };
    } else if (dto.recordedAt) {
      const targetDate = new Date(dto.recordedAt);
      const startWindow = new Date(targetDate.getTime() - 5000);
      const endWindow = new Date(targetDate.getTime() + 5000);
      whereClause.recordedAt = {
        gte: startWindow,
        lte: endWindow,
      };
    } else {
      throw new BadRequestException('Vui lòng cung cấp logIds hoặc thời gian recordedAt của phiên ghi cần hủy');
    }

    // Mark as voided - strictly preserving original record in database (no deletion)
    const updated = await this.prisma.operationLog.updateMany({
      where: whereClause,
      data: {
        isVoided: true,
        voidReason: dto.reason,
        voidedAt: new Date(),
        voidedById: userId,
      },
    });

    return {
      success: true,
      count: updated.count,
      message: `Đã đánh dấu hủy ${updated.count} bản ghi dữ liệu sai. Dữ liệu được lưu vết toàn vẹn trong nhật ký kiểm toán.`,
    };
  }
}

