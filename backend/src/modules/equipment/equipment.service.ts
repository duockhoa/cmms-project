import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEquipmentDto } from './dto/equipment.dto';

@Injectable()
export class EquipmentService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Chuẩn hóa dữ liệu cũ: chuyển các giá trị accountingCode là chuỗi rỗng '' thành null để không bị kẹt unique constraint
      await this.prisma.$executeRawUnsafe(
        "UPDATE `Equipment` SET `accountingCode` = NULL WHERE `accountingCode` = ''"
      );
    } catch (err) {
      // Bỏ qua nếu bảng chưa tồn tại hoặc DB chưa migrate
    }
  }

  async findAll(query?: { search?: string; category?: string; department?: string; status?: string; location?: string; page?: string; limit?: string }) {
    const where: any = { isActive: true };
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { serialNumber: { contains: query.search } },
      ];
    }
    if (query?.category) where.category = query.category;
    if (query?.department) where.department = query.department;
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
    // 1. Chuẩn hóa mã kế toán: chuỗi rỗng -> null
    const accountingCode = data.accountingCode && String(data.accountingCode).trim() !== ''
      ? String(data.accountingCode).trim()
      : null;

    // 2. Tự động sinh mã thiết bị nếu để trống
    let code = data.code ? String(data.code).trim() : '';
    if (!code) {
      let isUnique = false;
      let counter = (await this.prisma.equipment.count()) + 1;
      while (!isUnique) {
        code = `EQ-${counter.toString().padStart(4, '0')}`;
        const exists = await this.prisma.equipment.findUnique({ where: { code } });
        if (!exists) {
          isUnique = true;
        } else {
          counter++;
        }
      }
    } else {
      const existing = await this.prisma.equipment.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictException(`Mã thiết bị '${code}' đã tồn tại trong hệ thống.`);
      }
    }

    if (accountingCode) {
      const existingAcc = await this.prisma.equipment.findUnique({ where: { accountingCode } });
      if (existingAcc) {
        throw new ConflictException(
          `Mã kế toán '${accountingCode}' đã được sử dụng cho thiết bị khác (${existingAcc.code} - ${existingAcc.name}).`,
        );
      }
    }

    try {
      return await this.prisma.equipment.create({
        data: {
          ...data,
          code,
          accountingCode,
          department: data.department && String(data.department).trim() !== '' ? String(data.department).trim() : null,
          serialNumber: data.serialNumber && String(data.serialNumber).trim() !== '' ? String(data.serialNumber).trim() : null,
          specs: data.specs && String(data.specs).trim() !== '' ? String(data.specs).trim() : null,
          notes: data.notes && String(data.notes).trim() !== '' ? String(data.notes).trim() : null,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const target = err.meta?.target || '';
        if (String(target).includes('accountingCode')) {
          throw new ConflictException(`Mã kế toán '${accountingCode}' đã tồn tại.`);
        }
        if (String(target).includes('code')) {
          throw new ConflictException(`Mã thiết bị '${code}' đã tồn tại.`);
        }
        throw new ConflictException('Dữ liệu thiết bị bị trùng lặp mã định danh duy nhất.');
      }
      throw err;
    }
  }

  async update(id: string, data: UpdateEquipmentDto) {
    const item = await this.prisma.equipment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy thiết bị');

    if (item.version !== data.expectedVersion) {
      throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
    }

    const { expectedVersion, ...updateData } = data;
    const sanitizedData: any = { ...updateData };
    if ('department' in sanitizedData) {
      sanitizedData.department = sanitizedData.department && String(sanitizedData.department).trim() !== ''
        ? String(sanitizedData.department).trim()
        : null;
    }

    if ('accountingCode' in sanitizedData) {
      sanitizedData.accountingCode = sanitizedData.accountingCode && String(sanitizedData.accountingCode).trim() !== ''
        ? String(sanitizedData.accountingCode).trim()
        : null;

      if (sanitizedData.accountingCode) {
        const existingAcc = await this.prisma.equipment.findFirst({
          where: { accountingCode: sanitizedData.accountingCode, NOT: { id } },
        });
        if (existingAcc) {
          throw new ConflictException(
            `Mã kế toán '${sanitizedData.accountingCode}' đã được sử dụng cho thiết bị khác (${existingAcc.code} - ${existingAcc.name}).`,
          );
        }
      }
    }

    try {
      return await this.prisma.equipment.update({
        where: { id, version: expectedVersion },
        data: {
          ...sanitizedData,
          version: { increment: 1 },
        },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new ConflictException('Xung đột đồng thời: Thiết bị đã bị thay đổi bởi phiên làm việc khác.');
      }
      if (err.code === 'P2002') {
        throw new ConflictException('Dữ liệu thiết bị bị trùng lặp mã duy nhất.');
      }
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
