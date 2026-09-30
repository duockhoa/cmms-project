import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFabricationDto } from './dto/create-fabrication.dto';
import { UpdateFabricationDto } from './dto/update-fabrication.dto';

@Injectable()
export class FabricationService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateOrderCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.fabricationOrder.count();
    const nextSeq = String(count + 1).padStart(4, '0');
    let candidate = `GC-${year}-${nextSeq}`;

    let exists = await this.prisma.fabricationOrder.findUnique({ where: { orderCode: candidate } });
    let inc = 1;
    while (exists) {
      const altSeq = String(count + 1 + inc).padStart(4, '0');
      candidate = `GC-${year}-${altSeq}`;
      exists = await this.prisma.fabricationOrder.findUnique({ where: { orderCode: candidate } });
      inc++;
    }

    return candidate;
  }

  async create(dto: CreateFabricationDto, user?: any) {
    const orderCode = await this.generateOrderCode();

    // Calculate initial materials and total cost
    let totalCost = 0;
    const materialsData = (dto.materials || []).map((m) => {
      const lineTotal = (m.quantity || 1) * (m.unitPrice || 0);
      totalCost += lineTotal;
      return {
        materialName: m.materialName,
        quantity: m.quantity || 1,
        unit: m.unit,
        unitPrice: m.unitPrice || 0,
        totalPrice: lineTotal,
        inventoryItemId: m.inventoryItemId || null,
      };
    });

    return this.prisma.fabricationOrder.create({
      data: {
        orderCode,
        title: dto.title,
        category: (dto.category as any) || 'FABRICATION',
        priority: dto.priority || 'MEDIUM',
        status: 'ASSIGNED',
        description: dto.description,
        specifications: dto.specifications || null,
        location: dto.location || null,
        targetDepartment: dto.targetDepartment || null,
        equipmentId: dto.equipmentId || null,
        assignedTechnicianId: dto.assignedTechnicianId || null,
        supporterIds: dto.supporterIds ? JSON.stringify(dto.supporterIds) : null,
        creatorId: user?.id || null,
        plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
        estimatedHours: dto.estimatedHours || 0,
        actualHours: 0,
        drawings: dto.drawings ? JSON.stringify(dto.drawings) : null,
        totalCost,
        materials: {
          create: materialsData,
        },
      },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });
  }

  async findAll(params?: {
    status?: string;
    category?: string;
    search?: string;
    technicianId?: string;
  }) {
    const where: any = {};

    if (params?.status && params.status !== 'ALL' && params.status.trim()) {
      where.status = params.status.trim();
    }

    if (params?.category && params.category !== 'ALL' && params.category.trim()) {
      where.category = params.category.trim();
    }

    if (params?.technicianId && params.technicianId.trim()) {
      where.assignedTechnicianId = params.technicianId.trim();
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderCode: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
        { targetDepartment: { contains: q } },
      ];
    }

    const items = await this.prisma.fabricationOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.fabricationOrder.findUnique({
      where: { id },
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy công việc gia công/chế tạo với mã ${id}`);
    }

    return item;
  }

  async update(id: string, dto: UpdateFabricationDto, user?: any) {
    const existing = await this.findOne(id);

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.specifications !== undefined) updateData.specifications = dto.specifications;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.targetDepartment !== undefined) updateData.targetDepartment = dto.targetDepartment;
    if (dto.equipmentId !== undefined) updateData.equipmentId = dto.equipmentId || null;
    if (dto.assignedTechnicianId !== undefined) updateData.assignedTechnicianId = dto.assignedTechnicianId || null;
    if (dto.supporterIds !== undefined) updateData.supporterIds = dto.supporterIds ? JSON.stringify(dto.supporterIds) : null;
    if (dto.plannedStartDate !== undefined) updateData.plannedStartDate = dto.plannedStartDate ? new Date(dto.plannedStartDate) : null;
    if (dto.plannedEndDate !== undefined) updateData.plannedEndDate = dto.plannedEndDate ? new Date(dto.plannedEndDate) : null;
    if (dto.actualStartDate !== undefined) updateData.actualStartDate = dto.actualStartDate ? new Date(dto.actualStartDate) : null;
    if (dto.actualEndDate !== undefined) updateData.actualEndDate = dto.actualEndDate ? new Date(dto.actualEndDate) : null;
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = dto.estimatedHours;
    if (dto.actualHours !== undefined) updateData.actualHours = dto.actualHours;
    if (dto.drawings !== undefined) updateData.drawings = dto.drawings ? JSON.stringify(dto.drawings) : null;
    if (dto.resultImages !== undefined) updateData.resultImages = dto.resultImages ? JSON.stringify(dto.resultImages) : null;
    if (dto.resultNotes !== undefined) updateData.resultNotes = dto.resultNotes;
    if (dto.acceptanceRating !== undefined) updateData.acceptanceRating = dto.acceptanceRating;

    // Status transition helpers
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'IN_PROGRESS' && !existing.actualStartDate && !dto.actualStartDate) {
        updateData.actualStartDate = new Date();
      }
      if (dto.status === 'COMPLETED') {
        if (!existing.actualEndDate && !dto.actualEndDate) {
          updateData.actualEndDate = new Date();
        }
        if (dto.actualHours === undefined && (!existing.actualHours || existing.actualHours === 0)) {
          const start = updateData.actualStartDate || existing.actualStartDate;
          const end = updateData.actualEndDate || existing.actualEndDate || new Date();
          if (start && end) {
            const diffMs = new Date(end).getTime() - new Date(start).getTime();
            if (diffMs > 0) {
              updateData.actualHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
            }
          }
        }
      }
      if (dto.status === 'CLOSED') {
        updateData.acceptedAt = new Date();
        updateData.acceptedById = user?.id || null;
        updateData.acceptedByName = dto.acceptedByName || user?.name || 'Quản lý';
      }
    }

    // Material update if specified
    if (dto.materials && Array.isArray(dto.materials)) {
      // Re-create materials
      await this.prisma.fabricationMaterial.deleteMany({ where: { orderId: id } });
      let totalCost = 0;
      const materialsData = dto.materials.map((m) => {
        const lineTotal = (m.quantity || 1) * (m.unitPrice || 0);
        totalCost += lineTotal;
        return {
          orderId: id,
          materialName: m.materialName,
          quantity: m.quantity || 1,
          unit: m.unit,
          unitPrice: m.unitPrice || 0,
          totalPrice: lineTotal,
          inventoryItemId: m.inventoryItemId || null,
        };
      });
      await this.prisma.fabricationMaterial.createMany({ data: materialsData });
      updateData.totalCost = totalCost;
    }

    return this.prisma.fabricationOrder.update({
      where: { id },
      data: updateData,
      include: {
        assignedTechnician: {
          select: { id: true, name: true, email: true, specialty: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        equipment: {
          select: { id: true, code: true, name: true, location: true },
        },
        materials: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fabricationOrder.delete({
      where: { id },
    });
  }

  async getStats() {
    const [total, assigned, inProgress, completed, closed] = await Promise.all([
      this.prisma.fabricationOrder.count(),
      this.prisma.fabricationOrder.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'COMPLETED' } }),
      this.prisma.fabricationOrder.count({ where: { status: 'CLOSED' } }),
    ]);

    return {
      total,
      assigned,
      inProgress,
      completed,
      closed,
    };
  }
}
