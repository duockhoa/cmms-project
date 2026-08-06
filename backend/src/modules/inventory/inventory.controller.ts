import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, AdjustInventoryStockDto, AdjustInDto, AdjustOutDto, UpdateInventoryItemDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAll({ category, search, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Get(':id/transactions')
  getItemTransactions(
    @Param('id') id: string,
    @Query() query: any,
  ) {
    return this.inventoryService.getItemTransactions(id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateInventoryItemDto) {
    return this.inventoryService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, data);
  }

  @Post(':id/adjust')
  adjustStock(@Param('id') id: string, @Body() body: AdjustInventoryStockDto) {
    return this.inventoryService.adjustStock(id, body);
  }

  // Adjust In (Phase 3.6)
  @Post(':id/adjust-in')
  @HttpCode(HttpStatus.CREATED)
  adjustIn(@Param('id') id: string, @Body() body: AdjustInDto, @Req() req: any) {
    return this.inventoryService.adjustIn(id, body, req.user.id);
  }

  // Adjust Out (Phase 3.6)
  @Post(':id/adjust-out')
  @HttpCode(HttpStatus.CREATED)
  adjustOut(@Param('id') id: string, @Body() body: AdjustOutDto, @Req() req: any) {
    return this.inventoryService.adjustOut(id, body, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}
