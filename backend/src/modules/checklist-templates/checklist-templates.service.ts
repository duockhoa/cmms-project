import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChecklistTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.checklistTemplate.findMany({
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { itemIndex: 'asc' }
        }
      }
    });
    if (!template) throw new NotFoundException('Checklist Template not found');
    return template;
  }

  async create(data: { code: string; name: string; description?: string; category?: string }) {
    return this.prisma.checklistTemplate.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string; category?: string; isActive?: boolean }) {
    return this.prisma.checklistTemplate.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.checklistTemplate.delete({ where: { id } });
  }

  // Manage items within template
  async addItems(templateId: string, items: { itemText: string; isRequired?: boolean }[]) {
    // get current max index
    const maxItem = await this.prisma.checklistTemplateItem.findFirst({
      where: { templateId },
      orderBy: { itemIndex: 'desc' }
    });
    let nextIndex = maxItem ? maxItem.itemIndex + 1 : 0;

    const createData = items.map(i => ({
      templateId,
      itemIndex: nextIndex++,
      itemText: i.itemText,
      isRequired: i.isRequired ?? true
    }));

    await this.prisma.checklistTemplateItem.createMany({
      data: createData
    });

    return this.findOne(templateId);
  }

  async removeItem(templateId: string, itemId: string) {
    await this.prisma.checklistTemplateItem.delete({
      where: { id: itemId, templateId }
    });
    return this.findOne(templateId);
  }

  async reorderItems(templateId: string, items: { id: string; itemIndex: number }[]) {
    // using a transaction to update indices
    await this.prisma.$transaction(
      items.map(item =>
        this.prisma.checklistTemplateItem.update({
          where: { id: item.id },
          data: { itemIndex: item.itemIndex }
        })
      )
    );
    return this.findOne(templateId);
  }
}
