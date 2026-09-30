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

    const order = await this.prisma.fabricationOrder.create({
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

    // Record audit trail in WorkflowHistory
    try {
      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'FabricationOrder',
          entityId: order.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: order.status,
          actedById: user?.id || null,
          performedById: user?.id || null,
          comment: `Khởi tạo phiếu công việc [${order.orderCode}]: ${order.title}`,
          metadata: JSON.stringify({
            orderCode: order.orderCode,
            category: order.category,
            priority: order.priority,
            targetDepartment: order.targetDepartment,
          }),
        },
      });
    } catch (e) {
      console.error('Failed to log audit trail on create fabrication order:', e);
    }

    return order;
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
      if (dto.status === 'IN_PROGRESS') {
        if (!existing.actualStartDate && !dto.actualStartDate) {
          updateData.actualStartDate = new Date();
        }
        updateData.acceptedAt = null;
        updateData.acceptedById = null;
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

    const updated = await this.prisma.fabricationOrder.update({
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

    // Record audit trail in WorkflowHistory
    try {
      let auditAction = 'UPDATE';
      let auditComment = 'Cập nhật tiến độ & thông tin phiếu';
      let auditReason: string | null = null;
      let auditMetadata: any = {};

      if (dto.status !== undefined && dto.status !== existing.status) {
        if (dto.status === 'IN_PROGRESS' && existing.status === 'ASSIGNED') {
          auditAction = 'START_WORK';
          auditComment = 'Bắt đầu làm việc (Bật tính giờ công thực tế)';
        } else if (dto.status === 'ON_HOLD') {
          auditAction = 'PAUSE_WORK';
          auditComment = 'Tạm dừng công việc';
          auditReason = dto.resultNotes || 'Tạm dừng theo yêu cầu';
        } else if (dto.status === 'IN_PROGRESS' && existing.status === 'ON_HOLD') {
          auditAction = 'RESUME_WORK';
          auditComment = 'Tiếp tục thực hiện công việc sau khi tạm dừng';
        } else if (dto.status === 'IN_PROGRESS' && dto.acceptanceRating === 'REWORK') {
          auditAction = 'REJECT_REWORK';
          auditComment = 'Nghiệm thu KHÔNG ĐẠT - Yêu cầu kỹ thuật viên sửa chữa lại';
          auditReason = dto.resultNotes || 'Không đạt tiêu chuẩn nghiệm thu';
        } else if (dto.status === 'IN_PROGRESS' && existing.status === 'CLOSED') {
          auditAction = 'REOPEN';
          auditComment = 'Mở lại phiếu công việc sau khi đã hoàn tất';
        } else if (dto.status === 'COMPLETED') {
          auditAction = 'COMPLETE_WORK';
          const hrs = updateData.actualHours !== undefined ? updateData.actualHours : (existing.actualHours || 0);
          auditComment = `Báo cáo hoàn thành công việc (Chốt giờ công thực tế: ${hrs} giờ)`;
          auditMetadata.actualHours = hrs;
        } else if (dto.status === 'CLOSED') {
          auditAction = 'ACCEPT_HANDOVER';
          const rating = dto.acceptanceRating || existing.acceptanceRating || 'GOOD';
          const recipient = updateData.acceptedByName || 'Đại diện tiếp nhận';
          auditComment = `Đạt nghiệm thu & Bàn giao sản phẩm cho: ${recipient} (Đánh giá: ${rating})`;
          auditMetadata.rating = rating;
          auditMetadata.acceptedByName = recipient;
        }
      } else if (dto.acceptanceRating === 'REWORK' && dto.status === 'IN_PROGRESS') {
        auditAction = 'REJECT_REWORK';
        auditComment = 'Nghiệm thu KHÔNG ĐẠT - Yêu cầu kỹ thuật viên sửa chữa lại';
        auditReason = dto.resultNotes || 'Không đạt tiêu chuẩn nghiệm thu';
      } else if (dto.materials && Array.isArray(dto.materials)) {
        auditComment = `Cập nhật danh mục vật tư sử dụng (${dto.materials.length} loại vật tư)`;
      } else if (dto.resultImages && Array.isArray(dto.resultImages)) {
        auditComment = `Cập nhật hình ảnh kết quả (${dto.resultImages.length} ảnh)`;
      }

      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'FabricationOrder',
          entityId: id,
          action: auditAction,
          fromStatus: existing.status,
          toStatus: updated.status,
          actedById: user?.id || null,
          performedById: user?.id || null,
          comment: auditComment,
          reason: auditReason,
          metadata: Object.keys(auditMetadata).length > 0 ? JSON.stringify(auditMetadata) : null,
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit trail on update fabrication order:', auditErr);
    }

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.fabricationMaterial.deleteMany({ where: { orderId: id } });
    await this.prisma.attachment.deleteMany({
      where: { entityType: 'FabricationOrder', entityId: id },
    });
    try {
      await this.prisma.workflowHistory.deleteMany({
        where: { entityType: 'FabricationOrder', entityId: id },
      });
    } catch (e) {}
    return this.prisma.fabricationOrder.delete({
      where: { id },
    });
  }

  async getHistory(id: string) {
    return this.prisma.workflowHistory.findMany({
      where: {
        entityType: 'FabricationOrder',
        entityId: id,
      },
      include: {
        actedBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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
