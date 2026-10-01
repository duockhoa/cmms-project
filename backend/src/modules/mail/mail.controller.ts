import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Mail Notifications')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối SMTP Mail Server' })
  async getStatus() {
    return this.mailService.verifyConnection();
  }

  @Post('test-send')
  @ApiOperation({ summary: 'Gửi thử nghiệm email thông báo DK Pharma' })
  async testSend(@Body() body: { email: string; name?: string }) {
    if (!body.email) {
      return { success: false, message: 'Vui lòng cung cấp địa chỉ email nhận' };
    }

    const sent = await this.mailService.sendDkPharmaEmail({
      to: body.email,
      recipientName: body.name || 'Cán bộ kỹ thuật DK Pharma',
      subject: '[TEST] Thử nghiệm hệ thống thông báo Email CMMS Dược Khoa',
      title: 'Kiểm tra cấu hình Hệ thống Email Thông báo',
      badgeText: 'THỬ NGHIỆM',
      badgeColor: 'blue',
      summaryMessage: 'Đây là email gửi thử nghiệm để kiểm tra khả năng phân phát thông báo tự động từ Hệ thống Quản lý Thiết bị DK Pharma.',
      metadata: [
        { label: 'Hệ thống gửi', value: 'CMMS Backend (NestJS Mailer)' },
        { label: 'Thời gian gửi', value: new Date().toLocaleString('vi-VN') },
        { label: 'Trạng thái', value: 'Hoạt động bình thường', isHighlight: true },
      ],
      notes: 'Nếu bạn nhận được email này, tính năng gửi thông báo qua mail đã được thiết lập thành công.',
      actionText: 'Truy cập Hệ thống CMMS',
      actionPath: '/',
    });

    return {
      success: sent,
      message: sent ? `Đã gửi email thử nghiệm tới ${body.email}` : `Không thể gửi email tới ${body.email}. Kiểm tra log hệ thống.`,
    };
  }
}
