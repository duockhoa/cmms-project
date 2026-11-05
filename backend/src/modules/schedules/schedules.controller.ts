import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
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

@Controller('maintenance-schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.schedulesService.findAll(query, req.user);
  }

  @Post('process-due')
  processDueSchedules(@Req() req: any, @Body('referenceTime') referenceTime?: string) {
    return this.schedulesService.processDueSchedules(req.user.id, referenceTime);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.schedulesService.getHistory(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateScheduleDto, @Req() req: any) {
    return this.schedulesService.create({ ...dto, createdById: req.user.id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto, @Req() req: any) {
    return this.schedulesService.update(id, { ...dto, actedById: req.user.id });
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateScheduleDto, @Req() req: any) {
    return this.schedulesService.activate(id, { ...dto, actedById: req.user.id });
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Body() dto: PauseScheduleDto, @Req() req: any) {
    return this.schedulesService.pause(id, { ...dto, actedById: req.user.id });
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteScheduleDto, @Req() req: any) {
    return this.schedulesService.complete(id, { ...dto, actedById: req.user.id });
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelScheduleDto, @Req() req: any) {
    return this.schedulesService.cancel(id, { ...dto, actedById: req.user.id }, req.user);
  }

  @Post(':id/generate-work-order')
  @HttpCode(HttpStatus.CREATED)
  generateWorkOrder(@Param('id') id: string, @Body() dto: GenerateWorkOrderDto, @Req() req: any) {
    return this.schedulesService.generateWorkOrder(id, { ...dto, actedById: req.user.id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
