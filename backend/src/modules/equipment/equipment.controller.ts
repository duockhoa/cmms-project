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
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('location') location?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.equipmentService.findAll({ search, category, department, status, location, page, limit });
  }

  @ApiStandardResponse({ summary: 'Đồng bộ chuẩn hóa trạng thái toàn bộ thiết bị', method: 'POST', path: '/equipment/sync-statuses' })
  @Post('sync-statuses')
  syncStatuses() {
    return this.equipmentService.syncStatuses();
  }

  @ApiStandardResponse({ summary: 'Lấy chi tiết thiết bị theo ID', method: 'GET', path: '/equipment/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Lấy danh mục phụ tùng BOM của thiết bị', method: 'GET', path: '/equipment/{id}/spare-parts' })
  @Get(':id/spare-parts')
  getSpareParts(@Param('id') id: string) {
    return this.equipmentService.getEquipmentSpareParts(id);
  }

  @ApiStandardResponse({ summary: 'Gán phụ tùng vào thiết bị', method: 'POST', path: '/equipment/{id}/spare-parts' })
  @Post(':id/spare-parts')
  addSparePart(
    @Param('id') id: string,
    @Body() data: { sparePartId: string; role?: string; quantityPerEquipment?: number; notes?: string },
  ) {
    return this.equipmentService.addEquipmentSparePart(id, data);
  }

  @ApiStandardResponse({ summary: 'Gỡ phụ tùng khỏi thiết bị', method: 'DELETE', path: '/equipment/{id}/spare-parts/{linkId}' })
  @Delete(':id/spare-parts/:linkId')
  removeSparePart(@Param('id') id: string, @Param('linkId') linkId: string) {
    return this.equipmentService.removeEquipmentSparePart(id, linkId);
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
