import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { EquipmentParametersService } from './equipment-parameters.service';
import { CreateEquipmentParameterDto, UpdateEquipmentParameterDto } from './dto/equipment-parameter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('equipment/:equipmentId/parameters')
@UseGuards(JwtAuthGuard)
export class EquipmentParametersController {
  constructor(private readonly service: EquipmentParametersService) {}

  @Get()
  async getParameters(@Param('equipmentId') equipmentId: string) {
    return this.service.getParameters(equipmentId);
  }

  @Post()
  async createParameter(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateEquipmentParameterDto,
  ) {
    return this.service.createParameter(equipmentId, dto);
  }

  @Post('bulk-assign')
  async bulkAssign(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { standardParameterIds: string[] },
  ) {
    return this.service.bulkAssignFromStandard(equipmentId, body.standardParameterIds);
  }

  @Post('sync')
  async sync(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { items: any[] },
  ) {
    return this.service.syncParameters(equipmentId, body.items || []);
  }

  @Put('batch')
  async batchUpdate(
    @Param('equipmentId') equipmentId: string,
    @Body() body: { items: any[] },
  ) {
    return this.service.batchUpdateParameters(equipmentId, body.items);
  }

  @Put(':id')
  async updateParameter(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentParameterDto,
  ) {
    return this.service.updateParameter(id, dto);
  }

  @Delete(':id')
  async deleteParameter(@Param('id') id: string) {
    return this.service.deleteParameter(id);
  }
}
