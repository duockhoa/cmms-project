import { z } from 'zod';
import { prisma } from '../db.js';

export const analyticsToolDefinitions = [
  {
    name: 'get_maintenance_kpis',
    description: 'Báo cáo chỉ số tổng quan hoạt động bảo trì bảo dưỡng toàn nhà máy (KPIs): số lượng máy móc, tỷ lệ phiếu hoàn thành, tổng chi phí vật tư phát sinh.',
    parameters: z.object({}),
    handler: async () => {
      const [
        totalEquipments,
        operationalEquipments,
        brokenEquipments,
        totalWorkOrders,
        completedWorkOrders,
        activeWorkOrders,
        totalParts,
      ] = await Promise.all([
        prisma.equipment.count({ where: { isActive: true } }),
        prisma.equipment.count({ where: { isActive: true, status: 'OPERATIONAL' } }),
        prisma.equipment.count({ where: { isActive: true, status: { in: ['UNDER_MAINTENANCE', 'INCIDENT'] } } }),
        prisma.workOrder.count(),
        prisma.workOrder.count({ where: { status: { in: ['COMPLETED', 'VERIFIED', 'CLOSED'] } } }),
        prisma.workOrder.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] } } }),
        prisma.inventoryItem.count({ where: { isActive: true } }),
      ]);

      // Calculate total cost of all completed work orders
      const costAgg = await prisma.workOrder.aggregate({
        _sum: {
          totalCost: true,
          actualHours: true,
        },
      });

      const completionRate = totalWorkOrders > 0
        ? ((completedWorkOrders / totalWorkOrders) * 100).toFixed(1) + '%'
        : '0%';

      const machineAvailabilityRate = totalEquipments > 0
        ? ((operationalEquipments / totalEquipments) * 100).toFixed(1) + '%'
        : '0%';

      return {
        equipmentStats: {
          total: totalEquipments,
          operational: operationalEquipments,
          incidentOrUnderMaintenance: brokenEquipments,
          availabilityRate: machineAvailabilityRate,
        },
        workOrderStats: {
          total: totalWorkOrders,
          completed: completedWorkOrders,
          currentlyActive: activeWorkOrders,
          completionRate,
          totalMaintenanceHours: costAgg._sum.actualHours || 0,
          totalMaintenanceCost: costAgg._sum.totalCost || 0,
        },
        inventoryStats: {
          totalCatalogItems: totalParts,
        },
      };
    },
  },
  {
    name: 'get_top_incident_equipment',
    description: 'Thống kê danh sách các thiết bị/máy móc gặp sự cố hoặc phải sửa chữa nhiều lần nhất để đánh giá độ tin cậy và lập kế hoạch đại tu.',
    parameters: z.object({
      limit: z.number().optional().default(5).describe('Số lượng thiết bị cần lấy (VD: Top 5, Top 10)'),
    }),
    handler: async (args: { limit?: number }) => {
      const topEquipments = await prisma.workOrder.groupBy({
        by: ['equipmentId'],
        _count: {
          id: true,
        },
        _sum: {
          totalCost: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: args.limit || 5,
      });

      const results = await Promise.all(
        topEquipments.map(async (item) => {
          const eq = await prisma.equipment.findUnique({
            where: { id: item.equipmentId },
            select: { code: true, name: true, location: true, category: true },
          });

          return {
            equipmentCode: eq?.code || item.equipmentId,
            equipmentName: eq?.name || 'Không rõ',
            category: eq?.category || 'Không rõ',
            location: eq?.location || 'Không rõ',
            incidentCount: item._count.id,
            totalCost: item._sum.totalCost || 0,
          };
        }),
      );

      return {
        topIncidentEquipments: results,
      };
    },
  },
  {
    name: 'execute_readonly_sql_query',
    description: 'Chạy một câu lệnh SQL SELECT an toàn (chỉ đọc) để truy vấn hoặc tổng hợp bất kỳ dữ liệu tùy biến nào trong cơ sở dữ liệu khi các công cụ định sẵn không đáp ứng đủ.',
    parameters: z.object({
      query: z.string().describe('Câu truy vấn SQL bắt đầu bằng SELECT. Tuyệt đối không chứa INSERT, UPDATE, DELETE, DROP, ALTER...'),
    }),
    handler: async (args: { query: string }) => {
      const trimmed = args.query.trim();
      const upper = trimmed.toUpperCase();

      // Safety check: Only allow SELECT queries
      if (!upper.startsWith('SELECT')) {
        return {
          error: 'Bảo mật: Chỉ cho phép thực thi câu lệnh bắt đầu bằng SELECT (Read-only query).',
        };
      }

      // Prohibit dangerous keywords
      const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'RENAME', 'CREATE', 'REPLACE', 'GRANT', 'REVOKE'];
      for (const word of forbiddenKeywords) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(trimmed)) {
          return {
            error: `Bảo mật: Câu truy vấn bị từ chối vì chứa từ khóa cấm: ${word}`,
          };
        }
      }

      try {
        const rawResults: any = await prisma.$queryRawUnsafe(trimmed);
        return {
          rowCount: Array.isArray(rawResults) ? rawResults.length : 1,
          data: rawResults,
        };
      } catch (err: any) {
        return {
          error: `Lỗi thực thi SQL: ${err.message}`,
        };
      }
    },
  },
];
