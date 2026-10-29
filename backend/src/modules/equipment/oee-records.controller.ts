import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { OeeRecordsService } from './oee-records.service';
import { CreateOeeRecordDto, UpdateEquipmentOeeConfigDto, VoidOeeRecordDto } from './dto/oee-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('equipment/:equipmentId/oee-records')
@UseGuards(JwtAuthGuard)
export class EquipmentOeeRecordsController {
  constructor(private readonly service: OeeRecordsService) {}

  @Get('shift-context')
  async getShiftContext(
    @Param('equipmentId') equipmentId: string,
    @Query('recordDate') recordDate?: string,
    @Query('shift') shift?: string,
  ) {
    return this.service.getShiftContext(equipmentId, recordDate, shift);
  }

  @Get()
  async getRecordsByEquipment(
    @Param('equipmentId') equipmentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecordsByEquipment(equipmentId, limit ? parseInt(limit, 10) : 50);
  }

  @Post()
  async submitOeeRecord(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateOeeRecordDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.submitOeeRecord(equipmentId, userId, dto);
  }

  @Patch('config')
  async updateOeeConfig(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: UpdateEquipmentOeeConfigDto,
  ) {
    return this.service.updateEquipmentOeeConfig(equipmentId, dto);
  }
}

@Controller('oee-records')
@UseGuards(JwtAuthGuard)
export class GlobalOeeRecordsController {
  constructor(private readonly service: OeeRecordsService) {}

  @Get()
  async getAllRecords(
    @Query('equipmentId') equipmentId?: string,
    @Query('department') department?: string,
    @Query('shift') shift?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAllRecords({
      equipmentId,
      department,
      shift,
      startDate,
      endDate,
      limit,
    });
  }

  @Get('analytics')
  async getOeeAnalyticsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('criticalOnly') criticalOnly?: string,
  ) {
    return this.service.getOeeAnalyticsSummary({
      startDate,
      endDate,
      department,
      equipmentId,
      criticalOnly,
    });
  }

  @Post(':recordId/void')
  async voidRecord(
    @Param('recordId') recordId: string,
    @Body() dto: VoidOeeRecordDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.voidRecord(recordId, userId, dto);
  }
}

