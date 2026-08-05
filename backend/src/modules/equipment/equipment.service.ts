import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEquipmentDto } from './dto/equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; category?: string; status?: string; location?: string; page?: string; limit?: string }) {
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

    // Check if pagination parameters are provided
    if (query?.page || query?.limit) {
      const page = Math.max(1, parseInt(query.page || '1', 10));
      const limit = Math.max(1, parseInt(query.limit || '10', 10));
      const skip = (page - 1) * limit;

      const [total, data] = await Promise.all([
        this.prisma.equipment.count({ where }),
        this.prisma.equipment.findMany({
          where,
          skip,
          take: limit,
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
        })
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }

    // Default legacy behavior: return raw array
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

  async update(id: string, data: UpdateEquipmentDto) {
    const item = await this.prisma.equipment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy thiết bị');

    if (item.version !== data.expectedVersion) {
      throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
    }

    const { expectedVersion, ...updateData } = data;

    try {
      return await this.prisma.equipment.update({
        where: { id, version: expectedVersion },
        data: {
          ...updateData,
          version: { increment: 1 }
        }
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.delete({ where: { id } });
  }
}
