import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';

@Controller('api/equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
  ) {
    return this.equipmentService.findAll({ search, category, status, location });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateEquipmentDto) {
    return this.equipmentService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateEquipmentDto) {
    return this.equipmentService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
}
