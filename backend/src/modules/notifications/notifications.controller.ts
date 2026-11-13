import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications (Thông báo)')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiStandardResponse({ summary: 'Lấy danh sách thông báo của người dùng hiện tại', method: 'GET', path: '/notifications' })
  @Get()
  async getNotifications(@Req() req: any) {
    // req.user has: id, name, email, role, status, isActive, department
    return this.notificationsService.getNotificationsForUser(req.user);
  }

  @ApiStandardResponse({ summary: 'Đánh dấu thông báo đã đọc', method: 'PATCH', path: '/notifications/{id}/read' })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
