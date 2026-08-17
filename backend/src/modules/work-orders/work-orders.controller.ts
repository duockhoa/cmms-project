import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkOrdersService } from './work-orders.service';
import { InventoryService } from '../inventory/inventory.service';
import { MaterialReturnDto } from '../inventory/dto/inventory.dto';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
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
  CreateExecutionLogDto,
  EscalateWorkOrderDto,
  ClassifyWorkOrderDto,
  SubmitHandoverDto,
  RejectHandoverDto,
} from './dto/work-orders.dto';

@ApiTags('Work Orders')
@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly inventoryService: InventoryService,
  ) {}

  @ApiStandardResponse({ summary: 'Lấy work order theo QR code thiết bị', method: 'GET', path: '/work-orders/by-equipment-qr/{qrToken}' })
  @Get('by-equipment-qr/:qrToken')
  findByEquipmentQr(
    @Param('qrToken') qrToken: string,
    @Query('scanMethod') scanMethod: string = 'QR_SCAN',
    @Req() req: any
  ) {
    return this.workOrdersService.findByEquipmentQr(qrToken, req.user.id, scanMethod);
  }

  @ApiStandardResponse({ summary: 'Lấy danh sách log thực hiện', method: 'GET', path: '/work-orders/{id}/execution-logs' })
  @Get(':id/execution-logs')
  getExecutionLogs(@Param('id') id: string) {
    return this.workOrdersService.getExecutionLogs(id);
  }

  @ApiStandardResponse({ summary: 'Tạo log thực hiện mới', method: 'POST', path: '/work-orders/{id}/execution-logs' })
  @Post(':id/execution-logs')
  createExecutionLog(
    @Param('id') id: string,
    @Body() body: CreateExecutionLogDto,
    @Req() req: any
  ) {
    return this.workOrdersService.createExecutionLog(id, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Lấy danh sách work orders', method: 'GET', path: '/work-orders' })
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

  @ApiStandardResponse({ summary: 'Lấy chi tiết work order', method: 'GET', path: '/work-orders/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Lấy lịch sử giao dịch kho của work order', method: 'GET', path: '/work-orders/{workOrderId}/inventory-transactions' })
  @Get(':workOrderId/inventory-transactions')
  getWorkOrderTransactions(@Param('workOrderId') workOrderId: string) {
    return this.inventoryService.getWorkOrderTransactions(workOrderId);
  }

  @ApiStandardResponse({ summary: 'Tạo work order mới', method: 'POST', path: '/work-orders' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateWorkOrderDto) {
    return this.workOrdersService.create(data);
  }

  /**
   * @deprecated Use PATCH :id with { status: '...' } instead
   */
  @ApiStandardResponse({ summary: 'Cập nhật trạng thái work order (Legacy)', method: 'PATCH', path: '/work-orders/{id}/status' })
  @Patch(':id/status')
  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.workOrdersService.updateStatusLegacy(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Phân công work order', method: 'POST', path: '/work-orders/{id}/assign' })
  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() body: AssignWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.assign(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Bắt đầu work order', method: 'POST', path: '/work-orders/{id}/start' })
  @Post(':id/start')
  start(@Param('id') id: string, @Body() body: StartWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.start(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Tạm dừng work order', method: 'POST', path: '/work-orders/{id}/pause' })
  @Post(':id/pause')
  pause(@Param('id') id: string, @Body() body: PauseWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.pause(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Tiếp tục work order', method: 'POST', path: '/work-orders/{id}/resume' })
  @Post(':id/resume')
  resume(@Param('id') id: string, @Body() body: ResumeWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.resume(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Hoàn thành work order', method: 'POST', path: '/work-orders/{id}/complete' })
  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() body: CompleteWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.complete(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Báo cáo leo thang (escalate) work order', method: 'POST', path: '/work-orders/{id}/escalate' })
  @Post(':id/escalate')
  escalate(@Param('id') id: string, @Body() body: EscalateWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.escalate(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Phân loại work order', method: 'POST', path: '/work-orders/{id}/classify' })
  @Post(':id/classify')
  classify(@Param('id') id: string, @Body() body: ClassifyWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.classify(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Phân công người thực hiện', method: 'POST', path: '/work-orders/{id}/assign-executor' })
  @Post(':id/assign-executor')
  assignExecutor(@Param('id') id: string, @Body() body: AssignWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.assignExecutor(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Nộp báo cáo bàn giao', method: 'POST', path: '/work-orders/{id}/submit-handover' })
  @Post(':id/submit-handover')
  submitHandover(@Param('id') id: string, @Body() body: SubmitHandoverDto, @Req() req: any) {
    return this.workOrdersService.submitHandover(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Chấp nhận bàn giao', method: 'POST', path: '/work-orders/{id}/accept-handover' })
  @Post(':id/accept-handover')
  acceptHandover(@Param('id') id: string, @Body() body: { expectedVersion: number }, @Req() req: any) {
    return this.workOrdersService.acceptHandover(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Từ chối bàn giao', method: 'POST', path: '/work-orders/{id}/reject-handover' })
  @Post(':id/reject-handover')
  rejectHandover(@Param('id') id: string, @Body() body: RejectHandoverDto, @Req() req: any) {
    return this.workOrdersService.rejectHandover(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Xác minh work order', method: 'POST', path: '/work-orders/{id}/verify' })
  @Post(':id/verify')
  verify(@Param('id') id: string, @Body() body: VerifyWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.verify(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Đóng work order', method: 'POST', path: '/work-orders/{id}/close' })
  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: CloseWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.close(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Hủy work order', method: 'POST', path: '/work-orders/{id}/cancel' })
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: CancelWorkOrderDto, @Req() req: any) {
    return this.workOrdersService.cancel(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Thêm vật tư vào work order', method: 'POST', path: '/work-orders/{id}/items' })
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() itemDto: AddWorkOrderItemDto) {
    return this.workOrdersService.addItem(id, itemDto);
  }

  @ApiStandardResponse({ summary: 'Hoàn trả vật tư work order', method: 'POST', path: '/work-orders/{workOrderId}/material-returns' })
  @Post(':workOrderId/material-returns')
  @HttpCode(HttpStatus.CREATED)
  materialReturn(
    @Param('workOrderId') workOrderId: string,
    @Body() body: MaterialReturnDto,
    @Req() req: any,
  ) {
    return this.inventoryService.materialReturn(workOrderId, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Xóa work order', method: 'DELETE', path: '/work-orders/{id}' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.workOrdersService.remove(id);
  }
}
