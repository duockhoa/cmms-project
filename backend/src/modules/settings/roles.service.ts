import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions: string[]; // ['equipment:read', 'equipment:write']
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true } }
      }
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: JSON.stringify(dto.permissions),
        isActive: true,
      }
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.permissions !== undefined) data.permissions = JSON.stringify(dto.permissions);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.role.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    // Check if any users have this role
    const usersCount = await this.prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new BadRequestException(`Không thể xóa nhóm quyền này vì đang có ${usersCount} người dùng được gán.`);
    }

    return this.prisma.role.delete({
      where: { id }
    });
  }
}
