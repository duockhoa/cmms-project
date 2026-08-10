import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary() {
    const totalEquipment = await this.prisma.equipment.count();
    const operationalEquipment = await this.prisma.equipment.count({ where: { status: 'OPERATIONAL' } });
    const underMaintenanceEquipment = await this.prisma.equipment.count({ where: { status: 'UNDER_MAINTENANCE' } });
    const incidentEquipment = await this.prisma.equipment.count({ where: { status: 'INCIDENT' } });

    const pendingRequests = await this.prisma.maintenanceRequest.count({ where: { status: 'PENDING' } });
    const activeWorkOrders = await this.prisma.workOrder.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] } },
    });
    const completedWorkOrders = await this.prisma.workOrder.count({ where: { status: 'COMPLETED' } });

    const totalMaintenanceCostResult = await this.prisma.workOrder.aggregate({
      _sum: { totalCost: true },
    });

    const lowStockItems = await this.prisma.inventoryItem.count({
      where: { quantity: { lte: 5 } },
    });

    // Recent requests
    const recentRequests = await this.prisma.maintenanceRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { equipment: true },
    });

    // Urgent work orders
    const urgentWorkOrders = await this.prisma.workOrder.findMany({
      where: { priority: { in: ['HIGH', 'URGENT'] }, status: { not: 'COMPLETED' } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { equipment: true },
    });

    // Calculate 4-hour overdue incident requests (priority: HIGH or URGENT, created > 4h ago, and not yet RESOLVED/CLOSED)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const overdueIncidents4hCount = await this.prisma.maintenanceRequest.count({
      where: {
        priority: { in: ['HIGH', 'URGENT'] },
        createdAt: { lt: fourHoursAgo },
        status: { notIn: ['REJECTED', 'CANCELLED'] },
        // A request is considered unresolved if it has no work orders or all linked work orders are not CLOSED/CANCELLED
        OR: [
          {
            workOrders: {
              none: {}
            }
          },
          {
            workOrders: {
              some: {
                status: { notIn: ['CLOSED', 'CANCELLED'] }
              }
            }
          }
        ]
      }
    });

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
}
