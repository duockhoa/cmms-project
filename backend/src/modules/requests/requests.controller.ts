import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-request.dto';
import { ApproveMaintenanceRequestDto } from './dto/approve-request.dto';
import { RejectMaintenanceRequestDto } from './dto/reject-request.dto';
import { ReturnRequestDto } from './dto/return-request.dto';
import { ResubmitRequestDto } from './dto/resubmit-request.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';

@Controller('api/requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.requestsService.findAll({ status, priority, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.requestsService.getHistory(id);
  }

  @Post()
  create(@Body() data: CreateMaintenanceRequestDto) {
    return this.requestsService.create(data);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: ApproveMaintenanceRequestDto) {
    return this.requestsService.approve(id, body);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: RejectMaintenanceRequestDto) {
    return this.requestsService.reject(id, body);
  }

  @Post(':id/return')
  returnRequest(@Param('id') id: string, @Body() body: ReturnRequestDto) {
    return this.requestsService.returnRequest(id, body);
  }

  @Post(':id/resubmit')
  resubmitRequest(@Param('id') id: string, @Body() body: ResubmitRequestDto) {
    return this.requestsService.resubmitRequest(id, body);
  }

  @Post(':id/cancel')
  cancelRequest(@Param('id') id: string, @Body() body: CancelRequestDto) {
    return this.requestsService.cancelRequest(id, body);
  }
}
