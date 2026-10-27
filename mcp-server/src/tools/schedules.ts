import { z } from 'zod';
import { prisma } from '../db.js';

export const scheduleToolDefinitions = [
  {
    name: 'get_upcoming_maintenance_schedules',
    description: 'Lấy danh sách các kế hoạch bảo trì định kỳ sắp đến hạn (theo ngày hoặc số giờ hoạt động) để chuẩn bị vật tư và nhân lực.',
    parameters: z.object({
      daysAhead: z.number().optional().default(30).describe('Số ngày sắp tới cần xem (mặc định 30 ngày)'),
      status: z.enum(['ALL', 'ACTIVE', 'PAUSED', 'DRAFT']).optional().default('ACTIVE').describe('Trạng thái lịch bảo dưỡng'),
    }),
    handler: async (args: { daysAhead?: number; status?: string }) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (args.daysAhead || 30));

      const where: any = {};
      if (args.status && args.status !== 'ALL') {
        where.status = args.status;
      }

      where.nextDueDate = {
        lte: targetDate,
      };

      const schedules = await prisma.maintenanceSchedule.findMany({
        where,
        take: 30,
        orderBy: { nextDueDate: 'asc' },
        include: {
          equipment: {
            select: { code: true, name: true, location: true },
          },
          assignedTechnician: {
            select: { name: true, email: true },
          },
        },
      });

      return {
        count: schedules.length,
        timeframeDays: args.daysAhead || 30,
        schedules: schedules.map((s) => ({
          scheduleCode: s.scheduleCode,
          title: s.title,
          equipment: `${s.equipment.name} (${s.equipment.code})`,
          location: s.equipment.location,
          frequency: `${s.frequencyType} (Chu kỳ: ${s.frequencyInterval})`,
          nextDueDate: s.nextDueDate,
          estimatedDurationMinutes: s.estimatedDurationMinutes,
          priority: s.defaultPriority,
          technician: s.assignedTechnician?.name || 'Chưa chỉ định',
          status: s.status,
        })),
      };
    },
  },
];
