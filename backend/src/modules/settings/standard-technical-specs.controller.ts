import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { StandardTechnicalSpecsService } from './standard-technical-specs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('standard-technical-specs')
@UseGuards(JwtAuthGuard)
export class StandardTechnicalSpecsController {
  constructor(private readonly service: StandardTechnicalSpecsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; unit?: string; category?: string; description?: string; isActive?: boolean }) {
    return this.service.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; unit?: string; category?: string; description?: string; isActive?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
