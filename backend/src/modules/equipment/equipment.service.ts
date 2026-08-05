import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; category?: string; status?: string; location?: string }) {
    const where: any = {};
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { serialNumber: { contains: query.search } },
      ];
    }
    if (query?.category) where.category = query.category;
    if (query?.status) where.status = query.status;
    if (query?.location) where.location = query.location;

    return this.prisma.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        schedules: {
          where: { status: 'ACTIVE' },
          orderBy: { nextDueDate: 'asc' },
          take: 1,
        },
        _count: {
          select: { requests: true, workOrders: true, schedules: true }
        }
      }
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        requests: { orderBy: { createdAt: 'desc' }, take: 10 },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { inventoryItem: true } } } },
        schedules: true,
      },
    });
    if (!item) throw new NotFoundException('Không tìm thấy thiết bị');

    const attachments = await this.prisma.attachment.findMany({
      where: { entityId: id, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    const requestIds = item.requests.map(r => r.id);
    const workOrderIds = item.workOrders.map(w => w.id);
    const logEntityIds = [id, ...requestIds, ...workOrderIds];

    const logs = await this.prisma.workflowHistory.findMany({
      where: {
        entityId: { in: logEntityIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const spareParts = await this.prisma.inventoryItem.findMany({
      where: { isActive: true }
    });

    return {
      ...item,
      attachments,
      logs,
      spareParts
    };
  }

  async create(data: any) {
    if (!data.code) {
      const count = await this.prisma.equipment.count();
      data.code = `EQ-${(count + 1).toString().padStart(4, '0')}`;
    }
    return this.prisma.equipment.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.delete({ where: { id } });
  }
}
