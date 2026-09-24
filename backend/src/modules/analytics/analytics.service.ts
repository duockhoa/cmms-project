import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const [
      totalEquipment,
      operationalEquipment,
      underMaintenanceEquipment,
      incidentEquipment,
      pendingRequests,
      activeWorkOrders,
      completedWorkOrders,
      totalMaintenanceCostResult,
      lowStockItems,
      recentRequests,
      urgentWorkOrders,
      overdueIncidents4hCount,
    ] = await Promise.all([
      this.prisma.equipment.count(),
      this.prisma.equipment.count({ where: { status: 'OPERATIONAL' } }),
      this.prisma.equipment.count({ where: { status: 'UNDER_MAINTENANCE' } }),
      this.prisma.equipment.count({ where: { status: 'INCIDENT' } }),
      this.prisma.maintenanceRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.workOrder.count({
        where: { status: { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] } },
      }),
      this.prisma.workOrder.count({ where: { status: 'COMPLETED' } }),
      this.prisma.workOrder.aggregate({
        _sum: { totalCost: true },
      }),
      this.prisma.inventoryItem.count({
        where: { quantity: { lte: 5 } },
      }),
      this.prisma.maintenanceRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { equipment: true },
      }),
      this.prisma.workOrder.findMany({
        where: { priority: { in: ['HIGH', 'URGENT'] }, status: { not: 'COMPLETED' } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { equipment: true },
      }),
      this.prisma.maintenanceRequest.count({
        where: {
          priority: { in: ['HIGH', 'URGENT'] },
          createdAt: { lt: fourHoursAgo },
          status: { notIn: ['REJECTED', 'CANCELLED'] },
          OR: [
            { workOrders: { none: {} } },
            { workOrders: { some: { status: { notIn: ['CLOSED', 'CANCELLED'] } } } },
          ],
        },
      }),
    ]);

    return {
      kpi: {
        totalEquipment,
        operationalEquipment,
        underMaintenanceEquipment,
        incidentEquipment,
        pendingRequests,
        activeWorkOrders,
        completedWorkOrders,
        totalCost: totalMaintenanceCostResult._sum.totalCost || 0,
        lowStockItems,
        overdueIncidents4hCount,
      },
      recentRequests,
      urgentWorkOrders,
    };
  }

  async getOperationLogsReport(limit: number = 50) {
    // Get latest outlier logs (excluding voided erroneous logs)
    const outliers = await this.prisma.operationLog.findMany({
      where: { isOutlier: true, isVoided: false },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: {
        equipment: { select: { id: true, name: true, code: true } },
        parameter: { select: { id: true, name: true, unit: true, minSpec: true, maxSpec: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    // Group by equipment to find those with most issues (excluding voided)
    const grouped = await this.prisma.operationLog.groupBy({
      by: ['equipmentId'],
      where: { isOutlier: true, isVoided: false },
      _count: { isOutlier: true },
      orderBy: { _count: { isOutlier: 'desc' } },
      take: 10,
    });

    const equipmentIds = grouped.map(g => g.equipmentId);
    const equipments = await this.prisma.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: { id: true, name: true, code: true }
    });

    const equipmentIssueCounts = grouped.map(g => ({
      equipment: equipments.find(e => e.id === g.equipmentId),
      count: g._count.isOutlier
    }));

    return {
      outliers,
      equipmentIssueCounts
    };
  }
}
