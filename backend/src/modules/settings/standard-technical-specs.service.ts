import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StandardTechnicalSpecsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.standardTechnicalSpec.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const spec = await this.prisma.standardTechnicalSpec.findUnique({ where: { id } });
    if (!spec) throw new NotFoundException(`Technical spec #${id} not found`);
    return spec;
  }

  async create(data: { name: string; unit?: string; category?: string; description?: string; isActive?: boolean }) {
    return this.prisma.standardTechnicalSpec.create({
      data: {
        name: data.name,
        unit: data.unit,
        category: data.category,
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async update(id: string, data: { name?: string; unit?: string; category?: string; description?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.standardTechnicalSpec.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.standardTechnicalSpec.delete({ where: { id } });
  }
}
