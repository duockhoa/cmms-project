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

    // THUẬT TOÁN TỐI ƯU HÓA: Short-Circuit State Machine & Idempotent Guard
    // 1. Kiểm tra Work Order khẩn cấp / cao đang hoạt động -> INCIDENT
    const activeUrgentWO = await db.workOrder.findFirst({
      where: {
        equipmentId,
        status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
        priority: { in: ['HIGH', 'URGENT'] },
      },
      select: { id: true },
    });
    if (activeUrgentWO) {
      return this.applyStatus(db, equipmentId, eq.status, 'INCIDENT');
    }

    // 2. Kiểm tra bất kỳ Work Order nào đang hoạt động -> UNDER_MAINTENANCE
    const activeWO = await db.workOrder.findFirst({
      where: {
        equipmentId,
        status: { in: ['IN_PROGRESS', 'ON_HOLD', 'ASSIGNED', 'PENDING'] },
      },
      select: { id: true },
    });
    if (activeWO) {
      return this.applyStatus(db, equipmentId, eq.status, 'UNDER_MAINTENANCE');
    }

    // 3. Kiểm tra yêu cầu bảo trì khẩn cấp đang chờ duyệt -> INCIDENT
    const pendingUrgentRequest = await db.maintenanceRequest.findFirst({
      where: {
        equipmentId,
        status: 'PENDING',
        priority: { in: ['HIGH', 'URGENT'] },
      },
      select: { id: true },
    });
    if (pendingUrgentRequest) {
      return this.applyStatus(db, equipmentId, eq.status, 'INCIDENT');
    }

    // 4. Nếu không có điều kiện nào ở trên -> OPERATIONAL
    return this.applyStatus(db, equipmentId, eq.status, 'OPERATIONAL');
  }

  /**
   * Idempotent Write Guard: Chỉ cập nhật DB nếu trạng thái mới thực sự thay đổi
   */
  private async applyStatus(db: any, equipmentId: string, currentStatus: string, targetStatus: string): Promise<string> {
    if (currentStatus === targetStatus) {
      return targetStatus;
    }
    await db.equipment.update({
      where: { id: equipmentId },
      data: { status: targetStatus },
    });
    return targetStatus;
  }
}
