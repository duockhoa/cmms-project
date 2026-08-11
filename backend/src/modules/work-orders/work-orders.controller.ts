import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkOrdersService } from './work-orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { MaterialReturnDto } from '../inventory/dto/inventory.dto';
import {
  CreateWorkOrderDto,
  AssignWorkOrderDto,
  StartWorkOrderDto,
  PauseWorkOrderDto,
  ResumeWorkOrderDto,
  CompleteWorkOrderDto,
  VerifyWorkOrderDto,
  CloseWorkOrderDto,
  CancelWorkOrderDto,
  AddWorkOrderItemDto,
} from './dto/work-orders.dto';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('handlerTeam') handlerTeam?: string,
  ) {
    return this.workOrdersService.findAll({ status, priority, search, equipmentId, page, limit, handlerTeam });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @Get(':workOrderId/inventory-transactions')
  getWorkOrderTransactions(@Param('workOrderId') workOrderId: string) {
    return this.inventoryService.getWorkOrderTransactions(workOrderId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateWorkOrderDto) {
    return this.workOrdersService.create(data);
  }

  /**
   * @deprecated Use PATCH :id with { status: '...' } instead
   */
  @Patch(':id/status')
  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.workOrdersService.updateStatusLegacy(id, body, req.user);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() body: AssignWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.assign(id, body, req.user);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Body() body: StartWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.start(id, body, req.user);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @Body() body: PauseWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.pause(id, body, req.user);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @Body() body: ResumeWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.resume(id, body, req.user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() body: CompleteWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.complete(id, body, req.user);
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @Body() body: VerifyWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.verify(id, body, req.user);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: CloseWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.close(id, body, req.user);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: CancelWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.cancel(id, body, req.user);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() itemDto: AddWorkOrderItemDto) {
    return this.workOrdersService.addItem(id, itemDto);
  }

  // Material Return (Phase 3.6)
  @Post(':workOrderId/material-returns')
  @HttpCode(HttpStatus.CREATED)
  materialReturn(
    @Param('workOrderId') workOrderId: string,
    @Body() body: MaterialReturnDto,
    @Req() req: any,
  ) {
    return this.inventoryService.materialReturn(workOrderId, body, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.workOrdersService.remove(id);
  }
}
