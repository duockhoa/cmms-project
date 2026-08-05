import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, AdjustInventoryStockDto, AdjustInDto, AdjustOutDto } from './dto/inventory.dto';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.findAll({ category, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  // Transactions list for item
  @Get('items/:itemId/transactions')
  getItemTransactions(
    @Param('itemId') itemId: string,
    @Query() query: any,
  ) {
    return this.inventoryService.getItemTransactions(itemId, query);
  }

  @Get(':id/transactions')
  getItemTransactionsAlias(
    @Param('id') id: string,
    @Query() query: any,
  ) {
    return this.inventoryService.getItemTransactions(id, query);
  }

  @Post()
  create(@Body() data: CreateInventoryItemDto) {
    return this.inventoryService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.update(id, data);
  }

  @Post(':id/adjust')
  adjustStock(@Param('id') id: string, @Body() body: AdjustInventoryStockDto) {
    return this.inventoryService.adjustStock(id, body);
  }

  // Adjust In (Phase 3.6)
  @Post('items/:itemId/adjust-in')
  adjustIn(@Param('itemId') itemId: string, @Body() body: AdjustInDto) {
    return this.inventoryService.adjustIn(itemId, body);
  }

  @Post(':id/adjust-in')
  adjustInAlias(@Param('id') id: string, @Body() body: AdjustInDto) {
    return this.inventoryService.adjustIn(id, body);
  }

  // Adjust Out (Phase 3.6)
  @Post('items/:itemId/adjust-out')
  adjustOut(@Param('itemId') itemId: string, @Body() body: AdjustOutDto) {
    return this.inventoryService.adjustOut(itemId, body);
  }

  @Post(':id/adjust-out')
  adjustOutAlias(@Param('id') id: string, @Body() body: AdjustOutDto) {
    return this.inventoryService.adjustOut(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
