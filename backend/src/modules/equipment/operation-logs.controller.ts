import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';
import { SubmitOperationLogsDto } from './dto/operation-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('equipment/:equipmentId/operation-logs')
@UseGuards(JwtAuthGuard)
export class OperationLogsController {
  constructor(private readonly service: OperationLogsService) {}

  @Get()
  async getLogs(@Param('equipmentId') equipmentId: string) {
    return this.service.getLogsByEquipment(equipmentId);
  }

  @Post()
  async submitLogs(
    @Param('equipmentId') equipmentId: string,
    @Body() dto: SubmitOperationLogsDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.submitLogs(equipmentId, userId, dto);
  }
}

@Controller('operation-logs')
@UseGuards(JwtAuthGuard)
export class GlobalOperationLogsController {
  constructor(private readonly service: OperationLogsService) {}

  @Get()
  getAllLogs() {
    return this.service.getAllLogs();
  }
}
