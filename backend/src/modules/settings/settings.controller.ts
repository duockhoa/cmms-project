import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateProductionLineDto,
  UpdateProductionLineDto,
  UpdateSystemSettingDto,
} from './dto/settings.dto';

// ── Equipment Categories Controller ────────────────────────────
@Controller('equipment-categories')
@UseGuards(JwtAuthGuard)
export class EquipmentCategoryController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.getAllCategories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getCategoryById(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }
}

// ── Locations Controller ────────────────────────────────────────
@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.getAllLocations();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getLocationById(id);
  }

  @Post()
  create(@Body() dto: CreateLocationDto) {
    return this.service.createLocation(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.service.updateLocation(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteLocation(id);
  }
}

// ── Production Lines Controller ─────────────────────────────────
@Controller('production-lines')
@UseGuards(JwtAuthGuard)
export class ProductionLineController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.getAllProductionLines();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getProductionLineById(id);
  }

  @Post()
  create(@Body() dto: CreateProductionLineDto) {
    return this.service.createProductionLine(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductionLineDto) {
    return this.service.updateProductionLine(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deleteProductionLine(id);
  }
}

// ── System Settings Controller ──────────────────────────────────
@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.getAllSystemSettings();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.service.getSettingByKey(key);
  }

  @Post()
  update(@Body() dto: UpdateSystemSettingDto) {
    return this.service.updateSystemSetting(dto);
  }
}
