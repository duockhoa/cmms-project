import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { OeeRecordsService } from './oee-records.service';
import { CreateOeeRecordDto, UpdateEquipmentOeeConfigDto, VoidOeeRecordDto } from './dto/oee-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('OEE Records (Hiệu suất thiết bị)')
@Controller('equipment/:equipmentId/oee-records')
@UseGuards(JwtAuthGuard)
export class EquipmentOeeRecordsController {
  constructor(private readonly service: OeeRecordsService) {}

  @ApiStandardResponse({ summary: 'Lấy ngữ cảnh ca sản xuất và sự cố của thiết bị', method: 'GET', path: '/equipment/{equipmentId}/oee-records/shift-context' })
  @ApiQuery({ name: 'recordDate', required: false, description: 'Ngày ghi nhận (YYYY-MM-DD)' })
  @ApiQuery({ name: 'shift', required: false, description: 'Ca làm việc (CA_1, CA_2, CA_3, HANH_CHINH)' })
  @Get('shift-context')
  async getShiftContext(
    @Param('equipmentId') equipmentId: string,
    @Query('recordDate') recordDate?: string,
    @Query('shift') shift?: string,
  ) {
    return this.service.getShiftContext(equipmentId, recordDate, shift);
  }

  @ApiStandardResponse({ summary: 'Lấy lịch sử bản ghi OEE theo thiết bị', method: 'GET', path: '/equipment/{equipmentId}/oee-records' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi tối đa (mặc định 50)' })
  @Get()
  async getRecordsByEquipment(
    @Param('equipmentId') equipmentId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecordsByEquipment(equipmentId, limit ? parseInt(limit, 10) : 50);
  }

  @ApiStandardResponse({
    summary: 'Nhập liệu OEE cho thiết bị (phục vụ App và phần mềm MES/SCADA/IoT bên ngoài đẩy dữ liệu)',
    description: 'Đẩy dữ liệu sản lượng, thời gian dừng, phế phẩm theo ca của máy. Hệ thống tự động tính toán các chỉ số A (Sẵn sàng), P (Hiệu suất), Q (Chất lượng) và OEE.',
    method: 'POST',
    path: '/equipment/{equipmentId}/oee-records',
  })
  @Post()
  async submitOeeRecord(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: CreateOeeRecordDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.submitOeeRecord(equipmentId, userId, dto);
  }

  @ApiStandardResponse({ summary: 'Cấu hình tham số OEE cho thiết bị', method: 'PATCH', path: '/equipment/{equipmentId}/oee-records/config' })
  @Patch('config')
  async updateOeeConfig(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: UpdateEquipmentOeeConfigDto,
  ) {
    return this.service.updateEquipmentOeeConfig(equipmentId, dto);
  }
}

@ApiTags('OEE Records (Hiệu suất thiết bị)')
@Controller('oee-records')
@UseGuards(JwtAuthGuard)
export class GlobalOeeRecordsController {
  constructor(private readonly service: OeeRecordsService) {}

  @ApiStandardResponse({ summary: 'Lấy toàn bộ danh sách bản ghi OEE toàn hệ thống', method: 'GET', path: '/oee-records' })
  @ApiQuery({ name: 'equipmentId', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'shift', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'batchOeeId', required: false })
  @Get()
  async getAllRecords(
    @Query('equipmentId') equipmentId?: string,
    @Query('department') department?: string,
    @Query('shift') shift?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('batchOeeId') batchOeeId?: string,
    @Req() req?: any,
  ) {
    return this.service.getAllRecords({
      equipmentId,
      department,
      shift,
      startDate,
      endDate,
      limit,
      batchOeeId,
    }, req?.user);
  }

  @ApiStandardResponse({ summary: 'Báo cáo tổng hợp phân tích OEE toàn hệ thống', method: 'GET', path: '/oee-records/analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'equipmentId', required: false })
  @ApiQuery({ name: 'criticalOnly', required: false })
  @ApiQuery({ name: 'calculationMethod', required: false })
  @ApiQuery({ name: 'batchOeeId', required: false })
  @Get('analytics')
  async getOeeAnalyticsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('criticalOnly') criticalOnly?: string,
    @Query('calculationMethod') calculationMethod?: string,
    @Query('batchOeeId') batchOeeId?: string,
    @Req() req?: any,
  ) {
    return this.service.getOeeAnalyticsSummary({
      startDate,
      endDate,
      department,
      equipmentId,
      criticalOnly,
      calculationMethod,
      batchOeeId,
    }, req?.user);
  }

  @ApiStandardResponse({ summary: 'Hủy / Vô hiệu hóa một bản ghi OEE', method: 'POST', path: '/oee-records/{recordId}/void' })
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

