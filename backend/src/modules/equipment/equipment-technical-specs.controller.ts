import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EquipmentTechnicalSpecsService } from './equipment-technical-specs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('equipment/:equipmentId/technical-specs')
@UseGuards(JwtAuthGuard)
export class EquipmentTechnicalSpecsController {
  constructor(private readonly service: EquipmentTechnicalSpecsService) {}

  @Get()
  getSpecs(@Param('equipmentId') equipmentId: string) {
    return this.service.getSpecs(equipmentId);
  }

  @Post()
  createSpec(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { name: string; value: string; unit?: string; category?: string; notes?: string },
  ) {
    return this.service.createSpec(equipmentId, body);
  }

  @Post('bulk-assign')
  bulkAssign(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { standardSpecIds: string[] },
  ) {
    return this.service.bulkAssignFromStandard(equipmentId, body.standardSpecIds);
  }

  @Post('sync')
  sync(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { items: any[] },
  ) {
    return this.service.syncSpecs(equipmentId, body.items || []);
  }

  @Put('batch')
  batchUpdate(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { items: any[] },
  ) {
    return this.service.batchUpdateSpecs(equipmentId, body.items);
  }

  @Put(':id')
  updateSpec(
    @Param('id') id: string,
    @Body() body: { name?: string; value?: string; unit?: string; category?: string; notes?: string },
  ) {
    return this.service.updateSpec(id, body);
  }

  @Delete(':id')
  deleteSpec(@Param('id') id: string) {
    return this.service.deleteSpec(id);
  }
}
