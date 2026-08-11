import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateProductionLineDto,
  UpdateProductionLineDto,
  UpdateSystemSettingDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ── Equipment Categories ──────────────────────────────────────
  async getAllCategories() {
    return this.prisma.equipmentCategory.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getCategoryById(id: string) {
    const item = await this.prisma.equipmentCategory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy loại thiết bị');
    return item;
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.equipmentCategory.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Mã loại thiết bị đã tồn tại');
    return this.prisma.equipmentCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategoryById(id);
    return this.prisma.equipmentCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    await this.getCategoryById(id);
    // Check if category is being used by any equipment
    // Since Equipment.category is a string, we check if any equipment matches the name of this category
    const categoryObj = await this.prisma.equipmentCategory.findUnique({ where: { id } });
    if (categoryObj) {
      const isUsed = await this.prisma.equipment.findFirst({
        where: { category: categoryObj.name, isActive: true },
      });
      if (isUsed) {
        throw new ConflictException('Không thể xóa loại thiết bị này vì đang có thiết bị sử dụng');
      }
    }
    return this.prisma.equipmentCategory.delete({ where: { id } });
  }

  // ── Locations ──────────────────────────────────────────────────
  async getAllLocations() {
    return this.prisma.location.findMany({
      orderBy: { code: 'asc' },
      include: { responsibleTech: true },
    });
  }

  async getLocationById(id: string) {
    const item = await this.prisma.location.findUnique({
      where: { id },
      include: { responsibleTech: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy vị trí/nhà xưởng');
    return item;
  }

  async createLocation(dto: CreateLocationDto) {
    const existing = await this.prisma.location.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Mã vị trí đã tồn tại');
    return this.prisma.location.create({ data: dto });
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    await this.getLocationById(id);
    return this.prisma.location.update({
      where: { id },
      data: dto,
    });
  }

  async deleteLocation(id: string) {
    const locationObj = await this.getLocationById(id);
    // Check if location is being used by any equipment
    if (locationObj) {
      const isUsed = await this.prisma.equipment.findFirst({
        where: { location: locationObj.name, isActive: true },
      });
      if (isUsed) {
        throw new ConflictException('Không thể xóa vị trí này vì đang có thiết bị sử dụng');
      }
    }
    return this.prisma.location.delete({ where: { id } });
  }

  // ── Production Lines ───────────────────────────────────────────
  async getAllProductionLines() {
    return this.prisma.productionLine.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getProductionLineById(id: string) {
    const item = await this.prisma.productionLine.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy dây chuyền sản xuất');
    return item;
  }

  async createProductionLine(dto: CreateProductionLineDto) {
    const existing = await this.prisma.productionLine.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Mã dây chuyền đã tồn tại');
    return this.prisma.productionLine.create({ data: dto });
  }

  async updateProductionLine(id: string, dto: UpdateProductionLineDto) {
    await this.getProductionLineById(id);
    return this.prisma.productionLine.update({
      where: { id },
      data: dto,
    });
  }

  async deleteProductionLine(id: string) {
    await this.getProductionLineById(id);
    return this.prisma.productionLine.delete({ where: { id } });
  }

  // ── System Settings ────────────────────────────────────────────
  async getAllSystemSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    // Convert to a cleaner key-value dictionary for frontend consumption if preferred,
    // but returning the array of objects makes it easy to edit in table lists too.
    return settings;
  }

  async getSettingByKey(key: string) {
    const item = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!item) throw new NotFoundException('Không tìm thấy tham số cài đặt');
    return item;
  }

  async updateSystemSetting(dto: UpdateSystemSettingDto) {
    const existing = await this.prisma.systemSetting.findUnique({ where: { key: dto.key } });
    if (existing) {
      return this.prisma.systemSetting.update({
        where: { key: dto.key },
        data: { value: dto.value },
      });
    } else {
      return this.prisma.systemSetting.create({
        data: dto,
      });
    }
  }
}
