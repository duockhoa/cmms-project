import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbacksService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateFeedbackCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.appFeedback.count();
    const nextSeq = String(count + 1).padStart(3, '0');
    let candidate = `FB-${year}-${nextSeq}`;

    // Verify uniqueness
    let exists = await this.prisma.appFeedback.findUnique({ where: { code: candidate } });
    let inc = 1;
    while (exists) {
      const altSeq = String(count + 1 + inc).padStart(3, '0');
      candidate = `FB-${year}-${altSeq}`;
      exists = await this.prisma.appFeedback.findUnique({ where: { code: candidate } });
      inc++;
    }

    return candidate;
  }

  async create(dto: CreateFeedbackDto, user?: any) {
    const code = await this.generateFeedbackCode();
    const requesterName = dto.requesterName || user?.name || user?.username || 'Người dùng';
    const department = dto.department || user?.department || null;

    return this.prisma.appFeedback.create({
      data: {
        code,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'BUG',
        requesterName,
        department,
        phone: dto.phone || null,
        attachments: dto.attachments || null,
        status: 'PENDING',
      },
    });
  }

  async findAll(params?: { status?: string; type?: string; search?: string }) {
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.type) {
      where.type = params.type;
    }

    if (params?.search) {
      where.OR = [
        { code: { contains: params.search } },
        { title: { contains: params.search } },
        { description: { contains: params.search } },
        { requesterName: { contains: params.search } },
        { department: { contains: params.search } },
        { handlerName: { contains: params.search } },
      ];
    }

    return this.prisma.appFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.appFeedback.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy báo cáo/góp ý với ID: ${id}`);
    }
    return item;
  }

  async update(id: string, dto: UpdateFeedbackDto) {
    const existing = await this.findOne(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.response !== undefined) updateData.response = dto.response;
    if (dto.rootCause !== undefined) updateData.rootCause = dto.rootCause;
    if (dto.handlerName !== undefined) updateData.handlerName = dto.handlerName;
    if (dto.expectedCompletionDate !== undefined) {
      updateData.expectedCompletionDate = dto.expectedCompletionDate ? new Date(dto.expectedCompletionDate) : null;
    }
    if (dto.actualCompletionDate !== undefined) {
      updateData.actualCompletionDate = dto.actualCompletionDate ? new Date(dto.actualCompletionDate) : null;
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      // Auto-fill actualCompletionDate if marked as RESOLVED or CLOSED and not set
      if ((dto.status === 'RESOLVED' || dto.status === 'CLOSED') && !dto.actualCompletionDate && !existing.actualCompletionDate) {
        updateData.actualCompletionDate = new Date();
      }
    }
    if (dto.completionImages !== undefined) updateData.completionImages = dto.completionImages;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    return this.prisma.appFeedback.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appFeedback.delete({ where: { id } });
  }
}
