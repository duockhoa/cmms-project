import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { FabricationService } from './fabrication.service';
import { CreateFabricationDto } from './dto/create-fabrication.dto';
import { UpdateFabricationDto } from './dto/update-fabrication.dto';
import { CreateProgressLogDto } from './dto/create-progress-log.dto';
import { StartWorkSessionDto, StopWorkSessionDto } from './dto/work-session.dto';
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
  async getStats(@Req() req: any) {
    return this.fabricationService.getStats(req?.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiếu gia công / chế tạo' })
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('technicianId') technicianId?: string,
    @Req() req?: any,
  ) {
    return this.fabricationService.findAll({ status, category, search, technicianId }, req?.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phiếu gia công / chế tạo' })
  async findOne(@Param('id') id: string) {
    return this.fabricationService.findOne(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Lịch sử nhật ký & Audit trail của phiếu gia công' })
  async getHistory(@Param('id') id: string) {
    return this.fabricationService.getHistory(id);
  }

  @Get(':id/progress-logs')
  @ApiOperation({ summary: 'Lấy danh sách nhật ký tiến độ thực hiện' })
  async getProgressLogs(@Param('id') id: string) {
    return this.fabricationService.getProgressLogs(id);
  }

  @Post(':id/progress-logs')
  @ApiOperation({ summary: 'Thêm bản ghi nhật ký tiến độ theo tài khoản đăng nhập' })
  async createProgressLog(
    @Param('id') id: string,
    @Body() dto: CreateProgressLogDto,
    @Req() req: any,
  ) {
    return this.fabricationService.createProgressLog(id, dto, req.user);
  }

  @Delete(':id/progress-logs/:logId')
  @ApiOperation({ summary: 'Xóa bản ghi nhật ký tiến độ' })
  async deleteProgressLog(
    @Param('id') id: string,
    @Param('logId') logId: string,
    @Req() req: any,
  ) {
    return this.fabricationService.deleteProgressLog(id, logId, req.user);
  }

  @Get(':id/sessions/active')
  @ApiOperation({ summary: 'Lấy thông tin phiên làm việc đang chạy (cá nhân và nhóm)' })
  async getActiveSession(@Param('id') id: string, @Req() req: any) {
    return this.fabricationService.getActiveSession(id, req.user);
  }

  @Post(':id/sessions/start')
  @ApiOperation({ summary: 'Bắt đầu phiên làm việc (Check-in bấm giờ tự động)' })
  async startSession(
    @Param('id') id: string,
    @Body() dto: StartWorkSessionDto,
    @Req() req: any,
  ) {
    return this.fabricationService.startWorkSession(id, dto, req.user);
  }

  @Post(':id/sessions/:sessionId/stop')
  @ApiOperation({ summary: 'Kết thúc phiên làm việc (Check-out bấm giờ tự động, tự cộng dồn giờ công)' })
  async stopSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: StopWorkSessionDto,
    @Req() req: any,
  ) {
    return this.fabricationService.stopWorkSession(id, sessionId, dto, req.user);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử các phiên làm việc và thống kê theo từng người' })
  async getWorkSessions(@Param('id') id: string) {
    return this.fabricationService.getWorkSessions(id);
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

