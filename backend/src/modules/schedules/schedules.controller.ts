import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { SchedulesService } from './schedules.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ActivateScheduleDto,
  PauseScheduleDto,
  CompleteScheduleDto,
  CancelScheduleDto,
  GenerateWorkOrderDto,
} from './dto/schedules.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Schedules (Kế hoạch bảo trì)')
@Controller('maintenance-schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách lịch bảo trì định kỳ', method: 'GET', path: '/maintenance-schedules' })
  @ApiQuery({ name: 'status', required: false, description: 'Trạng thái: DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED' })
  @ApiQuery({ name: 'equipmentId', required: false })
  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.schedulesService.findAll(query, req.user);
  }

  @ApiStandardResponse({ summary: 'Quét và tự động sinh phiếu công việc cho các lịch bảo trì đến hạn', method: 'POST', path: '/maintenance-schedules/process-due' })
  @Post('process-due')
  processDueSchedules(@Req() req: any, @Body('referenceTime') referenceTime?: string) {
    return this.schedulesService.processDueSchedules(req.user.id, referenceTime);
  }

  @ApiStandardResponse({ summary: 'Xem chi tiết lịch bảo trì theo ID', method: 'GET', path: '/maintenance-schedules/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Xem lịch sử các lần thực thi của kế hoạch bảo trì', method: 'GET', path: '/maintenance-schedules/{id}/history' })
  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.schedulesService.getHistory(id);
  }

  @ApiStandardResponse({ summary: 'Tạo mới kế hoạch bảo trì định kỳ', method: 'POST', path: '/maintenance-schedules' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateScheduleDto, @Req() req: any) {
    return this.schedulesService.create({ ...dto, createdById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Cập nhật kế hoạch bảo trì', method: 'PATCH', path: '/maintenance-schedules/{id}' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: any) {
    return this.schedulesService.update(id, { ...dto, actedById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Kích hoạt kế hoạch bảo trì', method: 'POST', path: '/maintenance-schedules/{id}/activate' })
  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateScheduleDto, @Req() req: any) {
    return this.schedulesService.activate(id, { ...dto, actedById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Tạm dừng kế hoạch bảo trì', method: 'POST', path: '/maintenance-schedules/{id}/pause' })
  @Post(':id/pause')
  pause(@Param('id') id: string, @Body() dto: PauseScheduleDto, @Req() req: any) {
    return this.schedulesService.pause(id, { ...dto, actedById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Hoàn tất kế hoạch bảo trì', method: 'POST', path: '/maintenance-schedules/{id}/complete' })
  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteScheduleDto, @Req() req: any) {
    return this.schedulesService.complete(id, { ...dto, actedById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Hủy kế hoạch bảo trì', method: 'POST', path: '/maintenance-schedules/{id}/cancel' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelScheduleDto, @Req() req: any) {
    return this.schedulesService.cancel(id, { ...dto, actedById: req.user.id }, req.user);
  }

  @ApiStandardResponse({ summary: 'Sinh phiếu công việc (Work Order) ngay lập tức từ kế hoạch này', method: 'POST', path: '/maintenance-schedules/{id}/generate-work-order' })
  @Post(':id/generate-work-order')
  @HttpCode(HttpStatus.CREATED)
  generateWorkOrder(@Param('id') id: string, @Body() dto: GenerateWorkOrderDto, @Req() req: any) {
    return this.schedulesService.generateWorkOrder(id, { ...dto, actedById: req.user.id });
  }

  @ApiStandardResponse({ summary: 'Xóa kế hoạch bảo trì', method: 'DELETE', path: '/maintenance-schedules/{id}' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
