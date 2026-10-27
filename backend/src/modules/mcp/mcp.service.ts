import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

@Injectable()
export class McpService {
  constructor(private readonly prisma: PrismaService) {}

  public createServerInstance(): McpServer {
    const server = new McpServer({
      name: 'cmms-native-mcp-v2',
      version: '2.0.0',
    });

    // 1. TOOL: search_equipment
    server.tool(
      'search_equipment',
      'Tìm kiếm danh sách thiết bị/máy móc trong nhà máy theo từ khóa, trạng thái hoặc vị trí.',
      {
        keyword: z.string().optional().describe('Từ khóa (mã thiết bị, tên máy)'),
        status: z.enum(['ALL', 'OPERATIONAL', 'UNDER_MAINTENANCE', 'INCIDENT', 'DISCOMMISSIONED']).optional().default('ALL'),
        limit: z.number().optional().default(20),
      },
      async ({ keyword, status, limit }) => {
        const where: any = { isActive: true };
        if (keyword) {
          where.OR = [
            { code: { contains: keyword } },
            { oldCode: { contains: keyword } },
            { name: { contains: keyword } },
          ];
        }
        if (status && status !== 'ALL') {
          where.status = status;
        }

        const items = await this.prisma.equipment.findMany({
          where,
          take: limit || 20,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            code: true,
            oldCode: true,
            name: true,
            category: true,
            department: true,
            location: true,
            status: true,
            currentOperatingHours: true,
          },
        });

        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ count: items.length, equipments: items }, null, 2) }],
        };
      },
    );

    // 2. TOOL: get_equipment_details
    server.tool(
      'get_equipment_details',
      'Lấy thông tin hồ sơ chi tiết của thiết bị, lịch sử sự cố và các phiếu sửa chữa gần nhất.',
      {
        equipmentCodeOrId: z.string().describe('Mã máy (VD: EQ-0001) hoặc UUID của thiết bị'),
      },
      async ({ equipmentCodeOrId }) => {
        const eq = await this.prisma.equipment.findFirst({
          where: {
            OR: [{ id: equipmentCodeOrId }, { code: equipmentCodeOrId }, { oldCode: equipmentCodeOrId }],
          },
          include: {
            technicalSpecs: true,
            functionalUnits: true,
            requests: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: { requestCode: true, title: true, priority: true, status: true, reporterName: true, createdAt: true },
            },
            workOrders: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: { orderCode: true, title: true, status: true, totalCost: true, failureCause: true, solution: true },
            },
          },
        });

        if (!eq) {
          return { content: [{ type: 'text' as const, text: `Không tìm thấy thiết bị: ${equipmentCodeOrId}` }] };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(eq, null, 2) }],
        };
      },
    );

    // 3. TOOL: get_active_work_orders
    server.tool(
      'get_active_work_orders',
      'Tra cứu các phiếu bảo trì/sửa chữa đang mở, đang chờ duyệt hoặc đang thực hiện trong nhà máy.',
      {
        priority: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('ALL'),
        limit: z.number().optional().default(20),
      },
      async ({ priority, limit }) => {
        const where: any = {
          status: { in: ['PENDING', 'IN_PROGRESS', 'INSPECTION'] },
        };
        if (priority && priority !== 'ALL') {
          where.priority = priority;
        }

        const items = await this.prisma.workOrder.findMany({
          where,
          take: limit || 20,
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          include: {
            equipment: { select: { code: true, name: true, location: true } },
            assignedTechnician: { select: { name: true, email: true } },
          },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                items.map((w) => ({
                  orderCode: w.orderCode,
                  title: w.title,
                  priority: w.priority,
                  status: w.status,
                  equipment: `${w.equipment.name} (${w.equipment.code})`,
                  location: w.equipment.location,
                  technician: w.assignedTechnician?.name || w.technicianName || 'Chưa phân công',
                  totalCost: w.totalCost,
                  createdAt: w.createdAt,
                })),
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // 4. TOOL: get_low_stock_alerts
    server.tool(
      'get_low_stock_alerts',
      'Cảnh báo các vật tư/phụ tùng trong kho đang thiếu hụt (tồn kho <= tồn kho an toàn minQuantity).',
      {},
      async () => {
        const items = await this.prisma.inventoryItem.findMany({
          where: { isActive: true },
        });

        const lowStock = items.filter((i) => i.quantity <= i.minQuantity);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  totalLowStockCount: lowStock.length,
                  items: lowStock.map((i) => ({
                    code: i.itemCode,
                    name: i.name,
                    category: i.category,
                    currentQuantity: i.quantity,
                    minRequired: i.minQuantity,
                    unit: i.unit,
                    unitPrice: i.unitPrice,
                    location: i.location,
                  })),
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // 5. TOOL: get_maintenance_kpis
    server.tool(
      'get_maintenance_kpis',
      'Báo cáo KPIs tổng thể: số lượng máy sẵn sàng, tổng số phiếu sửa chữa, chi phí vật tư đã dùng.',
      {},
      async () => {
        const [totalEquipments, operationalEquipments, totalWorkOrders, completedWorkOrders] = await Promise.all([
          this.prisma.equipment.count({ where: { isActive: true } }),
          this.prisma.equipment.count({ where: { isActive: true, status: 'OPERATIONAL' } }),
          this.prisma.workOrder.count(),
          this.prisma.workOrder.count({ where: { status: { in: ['COMPLETED', 'VERIFIED', 'CLOSED'] } } }),
        ]);

        const costAgg = await this.prisma.workOrder.aggregate({
          _sum: { totalCost: true, actualHours: true },
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  totalEquipments,
                  operationalEquipments,
                  equipmentAvailabilityRate:
                    totalEquipments > 0 ? ((operationalEquipments / totalEquipments) * 100).toFixed(1) + '%' : '0%',
                  totalWorkOrders,
                  completedWorkOrders,
                  workOrderCompletionRate:
                    totalWorkOrders > 0 ? ((completedWorkOrders / totalWorkOrders) * 100).toFixed(1) + '%' : '0%',
                  totalMaintenanceCost: costAgg._sum.totalCost || 0,
                  totalHours: costAgg._sum.actualHours || 0,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // 6. TOOL: execute_readonly_sql_query
    server.tool(
      'execute_readonly_sql_query',
      'Thực thi câu truy vấn SQL SELECT an toàn (chỉ đọc) để phân tích bất kỳ dữ liệu tùy biến nào trong cơ sở dữ liệu.',
      {
        query: z.string().describe('Câu lệnh SQL SELECT'),
      },
      async ({ query }) => {
        const upper = query.trim().toUpperCase();
        if (!upper.startsWith('SELECT')) {
          return { content: [{ type: 'text' as const, text: 'Bảo mật: Chỉ chấp nhận câu lệnh bắt đầu bằng SELECT.' }] };
        }
        const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'RENAME', 'CREATE', 'GRANT'];
        for (const f of forbidden) {
          if (new RegExp(`\\b${f}\\b`, 'i').test(query)) {
            return { content: [{ type: 'text' as const, text: `Bảo mật: Chứa từ khóa cấm ${f}` }] };
          }
        }

        try {
          const data: any = await this.prisma.$queryRawUnsafe(query);
          return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
        } catch (err: any) {
          return { content: [{ type: 'text' as const, text: `Lỗi SQL: ${err.message}` }] };
        }
      },
    );

    return server;
  }
}
