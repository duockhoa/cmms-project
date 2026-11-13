import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StandardParametersService } from './standard-parameters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Settings (Cài đặt danh mục)')
@Controller('standard-parameters')
@UseGuards(JwtAuthGuard)
export class StandardParametersController {
  constructor(private readonly service: StandardParametersService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
