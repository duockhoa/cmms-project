import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ChecklistLibraryService } from './checklist-library.service';

@Controller('checklist-library')
export class ChecklistLibraryController {
  constructor(private readonly checklistLibraryService: ChecklistLibraryService) {}

  @Get()
  findAll() {
    return this.checklistLibraryService.findAll();
  }

  @Post()
  create(@Body() dto: { category: string; itemText: string; description?: string }) {
    return this.checklistLibraryService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: { category?: string; itemText?: string; description?: string; isActive?: boolean },
  ) {
    return this.checklistLibraryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.checklistLibraryService.remove(id);
  }
}
