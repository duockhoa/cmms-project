import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  AdjustInventoryStockDto,
  AdjustInDto,
  AdjustOutDto,
  UpdateInventoryItemDto,
  CreateInventoryReceiptDto,
  DirectIssueDto,
  InventoryReportQueryDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Inventory (Kho vật tư & Phụ tùng)')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiStandardResponse({ summary: 'Báo cáo tổng hợp nhập - xuất - tồn kho', method: 'GET', path: '/inventory/report' })
  @Get('report')
  getInventoryReport(@Query() query: InventoryReportQueryDto) {
    return this.inventoryService.getInventoryReport(query);
  }

  @ApiStandardResponse({ summary: 'Lấy danh sách phiếu nhập kho', method: 'GET', path: '/inventory/receipts' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @Get('receipts')
  findAllReceipts(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.findAllReceipts({ search, page, limit, startDate, endDate });
  }

  @ApiStandardResponse({ summary: 'Xem chi tiết phiếu nhập kho', method: 'GET', path: '/inventory/receipts/{id}' })
  @Get('receipts/:id')
  findReceiptOne(@Param('id') id: string) {
    return this.inventoryService.findReceiptOne(id);
  }

  @ApiStandardResponse({ summary: 'Tạo phiếu nhập kho vật tư / phụ tùng', method: 'POST', path: '/inventory/receipts' })
  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  createReceipt(@Body() body: CreateInventoryReceiptDto, @Req() req: any) {
    return this.inventoryService.createReceipt(body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Xuất kho vật tư trực tiếp cho công việc / thiết bị', method: 'POST', path: '/inventory/direct-issue' })
  @Post('direct-issue')
  @HttpCode(HttpStatus.CREATED)
  directIssue(@Body() body: DirectIssueDto, @Req() req: any) {
    return this.inventoryService.directIssue(body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Lấy danh sách tồn kho phụ tùng', method: 'GET', path: '/inventory' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAll({ category, search, page, limit });
  }

  @ApiStandardResponse({ summary: 'Lấy chi tiết phụ tùng theo ID', method: 'GET', path: '/inventory/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Lịch sử giao dịch nhập/xuất/điều chỉnh của một phụ tùng', method: 'GET', path: '/inventory/{id}/transactions' })
  @Get(':id/transactions')
  getItemTransactions(
    @Param('id') id: string,
    @Query() query: any,
  ) {
    return this.inventoryService.getItemTransactions(id, query);
  }

  @ApiStandardResponse({ summary: 'Tạo mới một mặt hàng / phụ tùng trong kho', method: 'POST', path: '/inventory' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateInventoryItemDto) {
    return this.inventoryService.create(data);
  }

  @ApiStandardResponse({ summary: 'Cập nhật thông tin phụ tùng', method: 'PATCH', path: '/inventory/{id}' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, data);
  }

  @ApiStandardResponse({ summary: 'Điều chỉnh số lượng tồn kho (kiểm kê)', method: 'POST', path: '/inventory/{id}/adjust' })
  @Post(':id/adjust')
  adjustStock(@Param('id') id: string, @Body() body: AdjustInventoryStockDto) {
    return this.inventoryService.adjustStock(id, body);
  }

  // Adjust In (Phase 3.6)
  @ApiStandardResponse({ summary: 'Nhập điều chỉnh kho', method: 'POST', path: '/inventory/{id}/adjust-in' })
  @Post(':id/adjust-in')
  @HttpCode(HttpStatus.CREATED)
  adjustIn(@Param('id') id: string, @Body() body: AdjustInDto, @Req() req: any) {
    return this.inventoryService.adjustIn(id, body, req.user.id);
  }

  // Adjust Out (Phase 3.6)
  @ApiStandardResponse({ summary: 'Xuất điều chỉnh kho', method: 'POST', path: '/inventory/{id}/adjust-out' })
  @Post(':id/adjust-out')
  @HttpCode(HttpStatus.CREATED)
  adjustOut(@Param('id') id: string, @Body() body: AdjustOutDto, @Req() req: any) {
    return this.inventoryService.adjustOut(id, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Xóa phụ tùng khỏi danh mục kho', method: 'DELETE', path: '/inventory/{id}' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
