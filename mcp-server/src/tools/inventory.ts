import { z } from 'zod';
import { prisma } from '../db.js';

export const inventoryToolDefinitions = [
  {
    name: 'search_inventory_items',
    description: 'Tìm kiếm vật tư, phụ tùng, linh kiện trong kho theo tên, mã vật tư hoặc chủng loại.',
    parameters: z.object({
      keyword: z.string().optional().describe('Tên hoặc mã vật tư (VD: Vòng bi, Dây curoa, Lọc dầu...)'),
      category: z.string().optional().describe('Chủng loại (Cơ khí, Điện, Thủy lực, Dầu mỡ...)'),
      limit: z.number().optional().default(20).describe('Số lượng tối đa cần lấy'),
    }),
    handler: async (args: { keyword?: string; category?: string; limit?: number }) => {
      const where: any = { isActive: true };

      if (args.keyword) {
        where.OR = [
          { itemCode: { contains: args.keyword } },
          { name: { contains: args.keyword } },
        ];
      }

      if (args.category) {
        where.category = { contains: args.category };
      }

      const items = await prisma.inventoryItem.findMany({
        where,
        take: args.limit || 20,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          itemCode: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          minQuantity: true,
          unitPrice: true,
          location: true,
        },
      });

      return {
        count: items.length,
        items,
      };
    },
  },
  {
    name: 'get_low_stock_alerts',
    description: 'Thống kê danh sách các vật tư/phụ tùng đang bị thiếu hụt, có số lượng tồn kho thực tế nhỏ hơn hoặc bằng mức tồn kho tối thiểu (minQuantity).',
    parameters: z.object({}),
    handler: async () => {
      // Find all active items where quantity <= minQuantity
      const items = await prisma.inventoryItem.findMany({
        where: {
          isActive: true,
        },
      });

      const lowStockItems = items.filter((item) => item.quantity <= item.minQuantity);

      return {
        totalLowStockCount: lowStockItems.length,
        warningItems: lowStockItems.map((i) => ({
          id: i.id,
          itemCode: i.itemCode,
          name: i.name,
          category: i.category,
          currentQuantity: i.quantity,
          minRequired: i.minQuantity,
          deficit: i.minQuantity - i.quantity,
          unit: i.unit,
          unitPrice: i.unitPrice,
          estimatedReorderCost: Math.max(0, i.minQuantity - i.quantity) * i.unitPrice,
          storageLocation: i.location || 'Chưa định vị',
        })),
      };
    },
  },
  {
    name: 'get_recent_inventory_transactions',
    description: 'Tra cứu lịch sử xuất kho, nhập kho hoặc điều chỉnh phụ tùng gần đây (phục vụ bảo trì hoặc chế tạo).',
    parameters: z.object({
      type: z.enum(['ALL', 'ISSUE', 'RETURN', 'ADJUST_IN', 'ADJUST_OUT']).optional().default('ALL').describe('Loại giao dịch: ISSUE (Xuất dùng), RETURN (Trả lại), ADJUST...'),
      limit: z.number().optional().default(15).describe('Số lượng giao dịch cần lấy'),
    }),
    handler: async (args: { type?: string; limit?: number }) => {
      const where: any = {};
      if (args.type && args.type !== 'ALL') {
        where.transactionType = args.type;
      }

      const txs = await prisma.inventoryTransaction.findMany({
        where,
        take: args.limit || 15,
        orderBy: { createdAt: 'desc' },
        include: {
          inventoryItem: {
            select: { itemCode: true, name: true, unit: true },
          },
          workOrder: {
            select: { orderCode: true, title: true },
          },
        },
      });

      return {
        count: txs.length,
        transactions: txs.map((t) => ({
          id: t.id,
          type: t.transactionType,
          item: `${t.inventoryItem.name} (${t.inventoryItem.itemCode})`,
          quantity: t.quantity,
          unitPrice: t.unitPrice,
          totalAmount: t.totalAmount,
          workOrder: t.workOrder ? `${t.workOrder.title} (${t.workOrder.orderCode})` : null,
          reason: t.reason,
          createdAt: t.createdAt,
        })),
      };
    },
  },
];
