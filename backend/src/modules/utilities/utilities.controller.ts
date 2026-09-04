import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('utilities')
@UseGuards(JwtAuthGuard)
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  // ==========================================
  // 1. ĐIỂM ĐO & HỆ THỐNG
  // ==========================================
  @Get('points')
  async getPoints(
    @Query('type') type?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.utilitiesService.getPoints({
      type,
      location,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('points/:idOrCode')
  async getPointByIdOrCode(@Param('idOrCode') idOrCode: string) {
    return this.utilitiesService.getPointByIdOrCode(idOrCode);
  }

  @Post('points')
  async createPoint(@Body() body: any) {
    return this.utilitiesService.createPoint(body);
  }

  @Put('points/:id')
  async updatePoint(@Param('id') id: string, @Body() body: any) {
    return this.utilitiesService.updatePoint(id, body);
  }

  @Delete('points/:id')
  async deletePoint(@Param('id') id: string) {
    return this.utilitiesService.deletePoint(id);
  }

  // ==========================================
  // 2. GHI NHẬN CHỈ SỐ ĐIỆN & NƯỚC
  // ==========================================
  @Post('readings')
  async recordReading(@Body() body: any, @Req() req: any) {
    return this.utilitiesService.recordReading(body, req.user);
  }

  @Get('readings')
  async getReadings(
    @Query('pointId') pointId?: string,
    @Query('type') type?: string,
    @Query('shift') shift?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.utilitiesService.getReadings({
      pointId,
      type,
      shift,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // ==========================================
  // 3. THEO DÕI BẬT / TẮT HỆ THỐNG
  // ==========================================
  @Post('system-status')
  async recordSystemStatus(@Body() body: any, @Req() req: any) {
    return this.utilitiesService.recordSystemStatus(body, req.user);
  }

  @Get('system-status/history')
  async getStatusLogs(
    @Query('pointId') pointId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.utilitiesService.getStatusLogs({
      pointId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  // ==========================================
  // 4. BÁO CÁO & PHÂN TÍCH TIÊU THỤ
  // ==========================================
  @Get('analytics')
  async getAnalytics(@Query('days') days?: string) {
    return this.utilitiesService.getAnalytics({
      days: days ? parseInt(days, 10) : 7,
    });
  }

  // ==========================================
  // 5. BÁO CÁO TÍCH LŨY THEO KỲ (ĐIỆN & NƯỚC)
  // ==========================================
  @Get('reports/cumulative')
  async getCumulativeReport(
    @Query('type') type?: 'ELECTRICITY' | 'WATER',
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.utilitiesService.getCumulativeReport({
      type,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }
}
