import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ChecklistTemplatesService } from './checklist-templates.service';

@Controller('checklist-templates')
export class ChecklistTemplatesController {
  constructor(private readonly checklistTemplatesService: ChecklistTemplatesService) {}

  @Get()
  findAll() {
    return this.checklistTemplatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checklistTemplatesService.findOne(id);
  }

  @Post()
  create(@Body() dto: { code: string; name: string; description?: string; category?: string }) {
    return this.checklistTemplatesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; description?: string; category?: string; isActive?: boolean }) {
    return this.checklistTemplatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.checklistTemplatesService.remove(id);
  }

  @Post(':id/items')
  addItems(@Param('id') id: string, @Body() items: { itemText: string; isRequired?: boolean }[]) {
    return this.checklistTemplatesService.addItems(id, items);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.checklistTemplatesService.removeItem(id, itemId);
  }

  @Put(':id/items/reorder')
  reorderItems(@Param('id') id: string, @Body() items: { id: string; itemIndex: number }[]) {
    return this.checklistTemplatesService.reorderItems(id, items);
  }
}
