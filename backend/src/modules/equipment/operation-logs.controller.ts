import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { OperationLogsService } from './operation-logs.service';
import { SubmitOperationLogsDto } from './dto/operation-log.dto';
import { VoidOperationLogSessionDto } from './dto/void-operation-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Nhật ký vận hành thiết bị')
@Controller('equipment/:equipmentId/operation-logs')
@UseGuards(JwtAuthGuard)
export class OperationLogsController {
  constructor(private readonly service: OperationLogsService) {}

  @ApiStandardResponse({ summary: 'Lấy nhật ký vận hành của thiết bị', method: 'GET', path: '/equipment/{equipmentId}/operation-logs' })
  @Get()
  async getLogs(@Param('equipmentId') equipmentId: string) {
    return this.service.getLogsByEquipment(equipmentId);
  }

  @ApiStandardResponse({ summary: 'Ghi nhật ký vận hành cho thiết bị', method: 'POST', path: '/equipment/{equipmentId}/operation-logs' })
  @Post()
  async submitLogs(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: SubmitOperationLogsDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.submitLogs(equipmentId, userId, dto);
  }

  @ApiStandardResponse({ summary: 'Hủy phiên ghi nhật ký vận hành', method: 'POST', path: '/equipment/{equipmentId}/operation-logs/void-session' })
  @Post('void-session')
  async voidSession(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: VoidOperationLogSessionDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.voidSessionLogs(equipmentId, userId, dto);
  }
}

@ApiTags('Nhật ký vận hành thiết bị')
@Controller('operation-logs')
@UseGuards(JwtAuthGuard)
export class GlobalOperationLogsController {
  constructor(private readonly service: OperationLogsService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách nhật ký vận hành toàn hệ thống', method: 'GET', path: '/operation-logs' })
  @Get()
  getAllLogs(@Req() req: any) {
    return this.service.getAllLogs(100, req.user);
  }
}
