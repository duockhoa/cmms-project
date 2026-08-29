import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Góp ý & Báo lỗi ứng dụng')
@ApiBearerAuth()
@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới góp ý / báo lỗi ứng dụng' })
  async create(@Body() dto: CreateFeedbackDto, @Req() req: any) {
    return this.feedbacksService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách góp ý / báo lỗi' })
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.feedbacksService.findAll({ status, type, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết góp ý / báo lỗi' })
  async findOne(@Param('id') id: string) {
    return this.feedbacksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phản hồi, người xử lý, trạng thái báo cáo' })
  async update(@Param('id') id: string, @Body() dto: UpdateFeedbackDto) {
    return this.feedbacksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa góp ý / báo lỗi' })
  async remove(@Param('id') id: string) {
    return this.feedbacksService.remove(id);
  }
}
