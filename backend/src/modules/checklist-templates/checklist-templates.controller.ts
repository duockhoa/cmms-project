import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { ChecklistTemplatesService } from './checklist-templates.service';

@ApiTags('Checklist Templates (Biểu mẫu Checklist)')
@Controller('checklist-templates')
export class ChecklistTemplatesController {
  constructor(private readonly checklistTemplatesService: ChecklistTemplatesService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách các biểu mẫu kiểm tra định kỳ', method: 'GET', path: '/checklist-templates' })
  @Get()
  findAll() {
    return this.checklistTemplatesService.findAll();
  }

  @ApiStandardResponse({ summary: 'Xem chi tiết mẫu checklist theo ID', method: 'GET', path: '/checklist-templates/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checklistTemplatesService.findOne(id);
  }

  @ApiStandardResponse({ summary: 'Tạo mới biểu mẫu kiểm tra', method: 'POST', path: '/checklist-templates' })
  @Post()
  create(@Body() dto: { code: string; name: string; description?: string; category?: string }) {
    return this.checklistTemplatesService.create(dto);
  }

  @ApiStandardResponse({ summary: 'Cập nhật biểu mẫu kiểm tra', method: 'PUT', path: '/checklist-templates/{id}' })
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; description?: string; category?: string; isActive?: boolean }) {
    return this.checklistTemplatesService.update(id, dto);
  }

  @ApiStandardResponse({ summary: 'Xóa biểu mẫu kiểm tra', method: 'DELETE', path: '/checklist-templates/{id}' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.checklistTemplatesService.remove(id);
  }

  @ApiStandardResponse({ summary: 'Thêm các tiêu chí/đầu mục vào mẫu checklist', method: 'POST', path: '/checklist-templates/{id}/items' })
  @Post(':id/items')
  addItems(@Param('id') id: string, @Body() items: { itemText: string; isRequired?: boolean }[]) {
    return this.checklistTemplatesService.addItems(id, items);
  }

  @ApiStandardResponse({ summary: 'Xóa tiêu chí khỏi mẫu checklist', method: 'DELETE', path: '/checklist-templates/{id}/items/{itemId}' })
  @Delete(':id/items/:itemId')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.checklistTemplatesService.removeItem(id, itemId);
  }

  @ApiStandardResponse({ summary: 'Sắp xếp lại thứ tự các tiêu chí', method: 'PUT', path: '/checklist-templates/{id}/items/reorder' })
  @Put(':id/items/reorder')
  reorderItems(@Param('id') id: string, @Body() items: { id: string; itemIndex: number }[]) {
    return this.checklistTemplatesService.reorderItems(id, items);
  }
}
