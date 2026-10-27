import { z } from 'zod';
import { prisma } from '../db.js';

export const workOrderToolDefinitions = [
  {
    name: 'get_active_work_orders',
    description: 'Truy xuất danh sách phiếu công việc / bảo trì (Work Order) đang chờ xử lý, đang thực hiện, hoặc quá hạn.',
    parameters: z.object({
      status: z.enum(['ALL_ACTIVE', 'PENDING', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED', 'VERIFIED', 'CLOSED']).optional().default('ALL_ACTIVE').describe('Trạng thái của phiếu'),
      priority: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('ALL').describe('Mức độ ưu tiên'),
      limit: z.number().optional().default(20).describe('Số lượng phiếu cần lấy'),
    }),
    handler: async (args: { status?: string; priority?: string; limit?: number }) => {
      const where: any = {};

      if (args.status === 'ALL_ACTIVE') {
        where.status = { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] };
      } else if (args.status && args.status !== 'ALL') {
        where.status = args.status;
      }

      if (args.priority && args.priority !== 'ALL') {
        where.priority = args.priority;
      }

      const items = await prisma.workOrder.findMany({
        where,
        take: args.limit || 20,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          equipment: {
            select: {
              code: true,
              name: true,
              location: true,
              department: true,
            },
          },
          assignedTechnician: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        count: items.length,
        workOrders: items.map((w) => ({
          id: w.id,
          orderCode: w.orderCode,
          title: w.title,
          priority: w.priority,
          status: w.status,
          equipmentCode: w.equipment.code,
          equipmentName: w.equipment.name,
          location: w.equipment.location,
          technician: w.assignedTechnician?.name || w.technicianName || 'Chưa phân công',
          plannedStartDate: w.plannedStartDate,
          plannedEndDate: w.plannedEndDate,
          totalCost: w.totalCost,
          createdAt: w.createdAt,
        })),
      };
    },
  },
  {
    name: 'get_work_order_details',
    description: 'Xem chi tiết một phiếu bảo trì cụ thể: các vật tư/phụ tùng đã xuất kho sử dụng, chi phí, nguyên nhân lỗi và giải pháp xử lý.',
    parameters: z.object({
      orderCodeOrId: z.string().describe('Mã phiếu (VD: WO-20261026-0001) hoặc UUID của phiếu'),
    }),
    handler: async (args: { orderCodeOrId: string }) => {
      const wo = await prisma.workOrder.findFirst({
        where: {
          OR: [{ id: args.orderCodeOrId }, { orderCode: args.orderCodeOrId }],
        },
        include: {
          equipment: true,
          assignedTechnician: {
            select: { id: true, name: true, email: true, specialty: true },
          },
          request: {
            select: {
              requestCode: true,
              title: true,
              description: true,
              reporterName: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  itemCode: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          transactions: {
            select: {
              transactionType: true,
              quantity: true,
              unitPrice: true,
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      });

      if (!wo) {
        return { error: `Không tìm thấy phiếu công việc với mã '${args.orderCodeOrId}'` };
      }

      return {
        id: wo.id,
        orderCode: wo.orderCode,
        title: wo.title,
        description: wo.description,
        priority: wo.priority,
        status: wo.status,
        equipment: {
          id: wo.equipment.id,
          code: wo.equipment.code,
          name: wo.equipment.name,
          location: wo.equipment.location,
        },
        technician: wo.assignedTechnician?.name || wo.technicianName,
        failureCause: wo.failureCause,
        solution: wo.solution,
        totalCost: wo.totalCost,
        actualHours: wo.actualHours,
        usedSpareParts: wo.items.map((i) => ({
          itemCode: i.inventoryItem.itemCode,
          name: i.inventoryItem.name,
          quantity: i.quantity,
          unit: i.inventoryItem.unit,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
        createdAt: wo.createdAt,
        completedAt: wo.completedAt,
      };
    },
  },
  {
    name: 'get_pending_maintenance_requests',
    description: 'Tra cứu các yêu cầu sửa chữa/báo hỏng (Maintenance Request) mới gửi từ các phân xưởng đang chờ duyệt hoặc xử lý.',
    parameters: z.object({
      priority: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('ALL').describe('Lọc theo mức độ ưu tiên'),
      limit: z.number().optional().default(15).describe('Số lượng yêu cầu tối đa'),
    }),
    handler: async (args: { priority?: string; limit?: number }) => {
      const where: any = {
        status: { in: ['PENDING', 'APPROVED'] },
      };

      if (args.priority && args.priority !== 'ALL') {
        where.priority = args.priority;
      }

      const requests = await prisma.maintenanceRequest.findMany({
        where,
        take: args.limit || 15,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          equipment: {
            select: { code: true, name: true, location: true },
          },
        },
      });

      return {
        count: requests.length,
        requests: requests.map((r) => ({
          requestCode: r.requestCode,
          equipment: `${r.equipment.name} (${r.equipment.code})`,
          location: r.equipment.location,
          title: r.title,
          description: r.description,
          priority: r.priority,
          status: r.status,
          reporter: r.reporterName,
          department: r.department,
          createdAt: r.createdAt,
        })),
      };
    },
  },
];
