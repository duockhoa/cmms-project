import { z } from 'zod';
import { prisma } from '../db.js';

export const checklistToolDefinitions = [
  {
    name: 'get_recent_checklist_executions',
    description: 'Tra cứu danh sách các lần thực hiện kiểm tra an toàn / checklist thiết bị gần đây, xem có hạng mục nào bị FAILED (không đạt) không.',
    parameters: z.object({
      status: z.enum(['ALL', 'COMPLETED', 'DRAFT', 'CANCELLED']).optional().default('ALL'),
      limit: z.number().optional().default(10),
    }),
    handler: async (args: { status?: string; limit?: number }) => {
      const where: any = {};
      if (args.status && args.status !== 'ALL') {
        where.status = args.status;
      }

      const items = await prisma.checklistExecution.findMany({
        where,
        take: args.limit || 10,
        orderBy: { startedAt: 'desc' },
        include: {
          executedBy: {
            select: { name: true, email: true },
          },
          workOrder: {
            select: {
              orderCode: true,
              equipment: { select: { code: true, name: true, location: true } },
            },
          },
          items: {
            where: { status: 'FAILED' },
            select: {
              itemText: true,
              status: true,
              comment: true,
            },
          },
        },
      });

      return {
        count: items.length,
        checklists: items.map((c) => ({
          id: c.id,
          workOrderCode: c.workOrder?.orderCode || 'N/A',
          equipment: c.workOrder?.equipment
            ? `${c.workOrder.equipment.name} (${c.workOrder.equipment.code})`
            : 'N/A',
          location: c.workOrder?.equipment?.location,
          status: c.status,
          result: c.result,
          executedBy: c.executedBy?.name || 'N/A',
          failedItemsCount: c.items.length,
          failedItems: c.items,
          completedAt: c.completedAt,
        })),
      };
    },
  },
];
