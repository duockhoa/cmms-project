import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto, UpdateEquipmentDto } from './dto/equipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';

@ApiTags('Equipment')
@Controller('equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách thiết bị', method: 'GET', path: '/equipment' })
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.equipmentService.findAll({ search, category, status, location, page, limit });
  }

  @ApiStandardResponse({ summary: 'Lấy chi tiết thiết bị theo ID', method: 'GET', path: '/equipment/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Tạo thiết bị mới', method: 'POST', path: '/equipment' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateEquipmentDto) {
    return this.equipmentService.create(data);
  }

  @ApiStandardResponse({ summary: 'Cập nhật thiết bị', method: 'PATCH', path: '/equipment/{id}' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateEquipmentDto) {
    return this.equipmentService.update(id, data);
  }

  @ApiStandardResponse({ summary: 'Xóa thiết bị', method: 'DELETE', path: '/equipment/{id}' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.equipmentService.remove(id);
  }
}
