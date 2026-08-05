import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EquipmentStatusService {
  constructor(private prisma: PrismaService) {}

  async calculateAndSetStatus(equipmentId: string, tx?: any): Promise<string> {
    const db = tx || this.prisma;
    
    const eq = await db.equipment.findUnique({ where: { id: equipmentId } });
    if (!eq) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    // 1. Active HIGH or URGENT Work Orders -> INCIDENT
    const activeUrgentWOs = await db.workOrder.findMany({
      where: {
        equipmentId,
        status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
        priority: { in: ['HIGH', 'URGENT'] },
      },
    });

    if (activeUrgentWOs.length > 0) {
      await db.equipment.update({
        where: { id: equipmentId },
        data: { status: 'INCIDENT' },
      });
      return 'INCIDENT';
    }

    // 2. Any active Work Orders -> UNDER_MAINTENANCE
    const activeWOs = await db.workOrder.findMany({
      where: {
        equipmentId,
        status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
      },
    });

    if (activeWOs.length > 0) {
      await db.equipment.update({
        where: { id: equipmentId },
        data: { status: 'UNDER_MAINTENANCE' },
      });
      return 'UNDER_MAINTENANCE';
    }

    // 3. Pending HIGH or URGENT Requests -> INCIDENT
    const pendingUrgentRequests = await db.maintenanceRequest.findMany({
      where: {
        equipmentId,
        status: 'PENDING',
        priority: { in: ['HIGH', 'URGENT'] },
      },
    });

    if (pendingUrgentRequests.length > 0) {
      await db.equipment.update({
        where: { id: equipmentId },
        data: { status: 'INCIDENT' },
      });
      return 'INCIDENT';
    }

    // 4. Otherwise -> OPERATIONAL
    await db.equipment.update({
      where: { id: equipmentId },
      data: { status: 'OPERATIONAL' },
    });
    return 'OPERATIONAL';
  }
}
