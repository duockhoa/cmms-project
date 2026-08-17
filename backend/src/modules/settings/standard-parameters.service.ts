import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StandardParametersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.standardParameter.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    return this.prisma.standardParameter.create({
      data: {
        name: data.name,
        unit: data.unit,
        minSpec: data.minSpec,
        maxSpec: data.maxSpec,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.standardParameter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Standard parameter with ID ${id} not found`);
    }

    return this.prisma.standardParameter.update({
      where: { id },
      data: {
        name: data.name,
        unit: data.unit,
        minSpec: data.minSpec,
        maxSpec: data.maxSpec,
        description: data.description,
        isActive: data.isActive,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.standardParameter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Standard parameter with ID ${id} not found`);
    }

    return this.prisma.standardParameter.delete({
      where: { id },
    });
  }
}
