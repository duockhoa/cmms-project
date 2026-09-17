import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FunctionalUnitsService } from './functional-units.service';
import { 
  CreateFunctionalUnitDto, 
  UpdateFunctionalUnitDto, 
  CreateFunctionalUnitLibraryDto, 
  UpdateFunctionalUnitLibraryDto 
} from './dto/functional-unit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Thư viện cụm chức năng')
@Controller('functional-unit-library')
@UseGuards(JwtAuthGuard)
export class FunctionalUnitLibraryController {
  constructor(private readonly service: FunctionalUnitsService) {}

  @Get()
  async getLibrary() {
    return this.service.getLibrary();
  }

  @Post()
  async createLibraryItem(@Body() dto: CreateFunctionalUnitLibraryDto) {
    return this.service.createLibraryItem(dto);
  }

  @Patch(':id')
  async updateLibraryItem(
    @Param('id') id: string,
    @Body() dto: UpdateFunctionalUnitLibraryDto,
  ) {
    return this.service.updateLibraryItem(id, dto);
  }

  @Delete(':id')
  async deleteLibraryItem(@Param('id') id: string) {
    return this.service.deleteLibraryItem(id);
  }
}

@ApiTags('Cụm chức năng thiết bị')
@Controller('equipment/:equipmentId/functional-units')
@UseGuards(JwtAuthGuard)
export class FunctionalUnitsController {
  constructor(private readonly service: FunctionalUnitsService) {}

  @Get()
  async getByEquipment(@Param('equipmentId') equipmentId: string) {
    return this.service.getByEquipment(equipmentId);
  }

  @Post()
  async createForEquipment(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateFunctionalUnitDto,
  ) {
    return this.service.createForEquipment(equipmentId, dto);
  }

  @Post('batch')
  async createBatchForEquipment(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { items: CreateFunctionalUnitDto[] },
  ) {
    return this.service.createBatchForEquipment(equipmentId, body.items || []);
  }

  @Patch(':id')
  async updateForEquipment(
    @Param('id') id: string,
    @Body() dto: UpdateFunctionalUnitDto,
  ) {
    return this.service.updateForEquipment(id, dto);
  }

  @Post('clone')
  async cloneFromEquipment(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { sourceEquipmentId: string; unitIds?: string[] },
  ) {
    return this.service.cloneUnitsFromEquipment(equipmentId, body.sourceEquipmentId, body.unitIds);
  }

  @Delete(':id')
  async deleteForEquipment(@Param('id') id: string) {
    return this.service.deleteForEquipment(id);
  }
}
