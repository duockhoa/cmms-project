import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { FabricationService } from './fabrication.service';
import { CreateFabricationDto } from './dto/create-fabrication.dto';
import { UpdateFabricationDto } from './dto/update-fabrication.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Gia công & Chế tạo')
@ApiBearerAuth()
@Controller('fabrication-orders')
@UseGuards(JwtAuthGuard)
export class FabricationController {
  constructor(private readonly fabricationService: FabricationService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu công việc gia công / chế tạo mới' })
  async create(@Body() dto: CreateFabricationDto, @Req() req: any) {
    return this.fabricationService.create(dto, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê KPI công việc gia công / chế tạo' })
  async getStats() {
    return this.fabricationService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiếu gia công / chế tạo' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('technicianId') technicianId?: string,
  ) {
    return this.fabricationService.findAll({ status, category, search, technicianId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phiếu gia công / chế tạo' })
  async findOne(@Param('id') id: string) {
    return this.fabricationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tiến độ, nghiệm thu, giờ công, vật tư' })
  async update(@Param('id') id: string, @Body() dto: UpdateFabricationDto, @Req() req: any) {
    return this.fabricationService.update(id, dto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phiếu gia công / chế tạo' })
  async remove(@Param('id') id: string) {
    return this.fabricationService.remove(id);
  }
}
