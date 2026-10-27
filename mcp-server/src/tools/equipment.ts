import { z } from 'zod';
import { prisma } from '../db.js';

export const equipmentToolDefinitions = [
  {
    name: 'search_equipment',
    description: 'Tìm kiếm danh sách thiết bị/máy móc trong nhà máy theo từ khóa, trạng thái, phân loại hoặc vị trí.',
    parameters: z.object({
      keyword: z.string().optional().describe('Từ khóa tìm kiếm (mã thiết bị, mã cũ, tên máy móc)'),
      status: z.enum(['ALL', 'OPERATIONAL', 'UNDER_MAINTENANCE', 'INCIDENT', 'DISCOMMISSIONED']).optional().default('ALL').describe('Trạng thái thiết bị'),
      category: z.string().optional().describe('Loại thiết bị (vd: Máy dập, Máy nén khí, Băng tải...)'),
      location: z.string().optional().describe('Vị trí hoặc xưởng (vd: Xưởng A, Xưởng B, Phòng sạch...)'),
      limit: z.number().optional().default(20).describe('Số lượng kết quả tối đa cần lấy (mặc định 20)'),
    }),
    handler: async (args: { keyword?: string; status?: string; category?: string; location?: string; limit?: number }) => {
      const where: any = { isActive: true };

      if (args.keyword) {
        where.OR = [
          { code: { contains: args.keyword } },
          { oldCode: { contains: args.keyword } },
          { name: { contains: args.keyword } },
        ];
      }

      if (args.status && args.status !== 'ALL') {
        where.status = args.status;
      }

      if (args.category) {
        where.category = { contains: args.category };
      }

      if (args.location) {
        where.location = { contains: args.location };
      }

      const items = await prisma.equipment.findMany({
        where,
        take: args.limit || 20,
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
          warrantyPeriod: true,
          purchaseDate: true,
          updatedAt: true,
        },
      });

      return {
        totalFound: items.length,
        equipments: items,
      };
    },
  },
  {
    name: 'get_equipment_details',
    description: 'Lấy thông tin hồ sơ chi tiết của một thiết bị cụ thể, bao gồm thông số kỹ thuật, lịch sử sự cố và các phiếu sửa chữa gần nhất.',
    parameters: z.object({
      equipmentIdOrCode: z.string().describe('ID hoặc mã định danh của thiết bị (VD: EQ-0001 hoặc UUID)'),
    }),
    handler: async (args: { equipmentIdOrCode: string }) => {
      const equipment = await prisma.equipment.findFirst({
        where: {
          OR: [
            { id: args.equipmentIdOrCode },
            { code: args.equipmentIdOrCode },
            { oldCode: args.equipmentIdOrCode },
          ],
        },
        include: {
          technicalSpecs: true,
          functionalUnits: true,
          spareParts: {
            include: {
              sparePart: {
                select: {
                  id: true,
                  itemCode: true,
                  name: true,
                  quantity: true,
                  unit: true,
                  unitPrice: true,
                },
              },
            },
          },
          requests: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              requestCode: true,
              title: true,
              priority: true,
              status: true,
              reporterName: true,
              createdAt: true,
            },
          },
          workOrders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              orderCode: true,
              title: true,
              status: true,
              priority: true,
              totalCost: true,
              failureCause: true,
              solution: true,
              technicianName: true,
              completedAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!equipment) {
        return { error: `Không tìm thấy thiết bị nào với mã hoặc ID '${args.equipmentIdOrCode}'` };
      }

      return equipment;
    },
  },
  {
    name: 'get_equipment_status_summary',
    description: 'Thống kê tổng quan tình trạng thiết bị toàn nhà máy: số lượng máy đang hoạt động bình thường, đang bảo dưỡng, hoặc đang bị sự cố/hỏng hóc.',
    parameters: z.object({}),
    handler: async () => {
      const total = await prisma.equipment.count({ where: { isActive: true } });
      const statusCounts = await prisma.equipment.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { status: true },
      });

      const departmentCounts = await prisma.equipment.groupBy({
        by: ['department'],
        where: { isActive: true },
        _count: { department: true },
      });

      return {
        totalActiveEquipments: total,
        byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
        byDepartment: departmentCounts.map((d) => ({ department: d.department || 'Chưa phân bổ', count: d._count.department })),
      };
    },
  },
];
