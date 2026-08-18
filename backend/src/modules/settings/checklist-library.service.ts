import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChecklistLibraryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.checklistLibraryItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: { category: string; itemText: string; description?: string }) {
    return this.prisma.checklistLibraryItem.create({ data });
  }

  async update(id: string, data: { category?: string; itemText?: string; description?: string; isActive?: boolean }) {
    const item = await this.prisma.checklistLibraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.checklistLibraryItem.update({ where: { id }, data });
  }

  async remove(id: string) {
    const item = await this.prisma.checklistLibraryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.checklistLibraryItem.delete({ where: { id } });
  }
}
