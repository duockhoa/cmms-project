import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
  findAll(@Query() query: any) {
    return this.schedulesService.findAll(query);
  }

  @Post('process-due')
  processDueSchedules(@Body('actedById') actedById?: string, @Body('referenceTime') referenceTime?: string) {
    return this.schedulesService.processDueSchedules(actedById, referenceTime);
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
  create(@Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateScheduleDto) {
    return this.schedulesService.activate(id, dto);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Body() dto: PauseScheduleDto) {
    return this.schedulesService.pause(id, dto);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteScheduleDto) {
    return this.schedulesService.complete(id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelScheduleDto) {
    return this.schedulesService.cancel(id, dto);
  }

  @Post(':id/generate-work-order')
  @HttpCode(HttpStatus.CREATED)
  generateWorkOrder(@Param('id') id: string, @Body() dto: GenerateWorkOrderDto) {
    return this.schedulesService.generateWorkOrder(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(id);
  }
}
