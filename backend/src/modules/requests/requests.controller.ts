import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { RequestsService } from './requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-request.dto';
import { ApproveMaintenanceRequestDto } from './dto/approve-request.dto';
import { RejectMaintenanceRequestDto } from './dto/reject-request.dto';
import { ReturnRequestDto } from './dto/return-request.dto';
import { ResubmitRequestDto } from './dto/resubmit-request.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Requests (Yêu cầu sự cố / Bảo trì)')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách yêu cầu sự cố / bảo trì', method: 'GET', path: '/requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc trạng thái: SUBMITTED, APPROVED, IN_PROGRESS, COMPLETED, REJECTED, RETURNED, CANCELLED' })
  @ApiQuery({ name: 'priority', required: false, description: 'Độ ưu tiên: LOW, MEDIUM, HIGH, URGENT' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo mã, nội dung yêu cầu, tên máy' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.requestsService.findAll({ status, priority, search, page, limit }, req?.user);
  }

  @ApiStandardResponse({ summary: 'Xem chi tiết yêu cầu bảo trì theo ID', method: 'GET', path: '/requests/{id}' })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.requestsService.findOne(id, req.user);
  }

  @ApiStandardResponse({ summary: 'Lịch sử xử lý và chuyển trạng thái của yêu cầu', method: 'GET', path: '/requests/{id}/history' })
  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.requestsService.getHistory(id, req.user);
  }

  @ApiStandardResponse({ summary: 'Tạo mới yêu cầu báo sự cố / bảo dưỡng', method: 'POST', path: '/requests' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() data: CreateMaintenanceRequestDto, @Req() req: any) {
    return this.requestsService.create(data, req?.user);
  }

  @ApiStandardResponse({ summary: 'Cập nhật thông tin yêu cầu sự cố', method: 'PATCH', path: '/requests/{id}' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateMaintenanceRequestDto, @Req() req: any) {
    return this.requestsService.update(id, body, req?.user);
  }

  @ApiStandardResponse({ summary: 'Xóa yêu cầu bảo trì', method: 'DELETE', path: '/requests/{id}' })
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.requestsService.delete(id, req?.user);
  }

  @ApiStandardResponse({ summary: 'Phê duyệt yêu cầu và giao việc cho kỹ thuật viên', method: 'POST', path: '/requests/{id}/approve' })
  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() body: ApproveMaintenanceRequestDto, @Req() req: any) {
    return this.requestsService.approve(id, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Từ chối yêu cầu sự cố (kèm lý do)', method: 'POST', path: '/requests/{id}/reject' })
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: RejectMaintenanceRequestDto, @Req() req: any) {
    return this.requestsService.reject(id, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Trả lại yêu cầu để người gửi bổ sung thông tin', method: 'POST', path: '/requests/{id}/return' })
  @Post(':id/return')
  returnRequest(@Param('id') id: string, @Body() body: ReturnRequestDto, @Req() req: any) {
    return this.requestsService.returnRequest(id, body, req.user.id);
  }

  @ApiStandardResponse({ summary: 'Gửi lại yêu cầu sau khi đã chỉnh sửa bổ sung', method: 'POST', path: '/requests/{id}/resubmit' })
  @Post(':id/resubmit')
  resubmitRequest(@Param('id') id: string, @Body() body: ResubmitRequestDto, @Req() req: any) {
    return this.requestsService.resubmitRequest(id, body, req.user);
  }

  @ApiStandardResponse({ summary: 'Hủy yêu cầu bảo trì', method: 'POST', path: '/requests/{id}/cancel' })
  @Post(':id/cancel')
  cancelRequest(@Param('id') id: string, @Body() body: CancelRequestDto, @Req() req: any) {
    return this.requestsService.cancelRequest(id, body, req.user);
  }
}
