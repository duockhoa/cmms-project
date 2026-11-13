import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserConnectionsService } from './user-connections.service';
import { NotificationsGateway } from './notifications.gateway';

@ApiTags('Settings (Lịch sử kết nối & Phiên người dùng)')
@Controller('user-connections')
@UseGuards(JwtAuthGuard)
export class UserConnectionsController {
  constructor(
    private readonly connectionsService: UserConnectionsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @ApiStandardResponse({
    summary: 'Lấy danh sách và thống kê các phiên kết nối người dùng',
    method: 'GET',
    path: '/user-connections',
  })
  @Get()
  async getConnections(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.connectionsService.getLogs({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @ApiStandardResponse({
    summary: 'Ngắt kết nối phiên người dùng (Force disconnect)',
    method: 'POST',
    path: '/user-connections/{id}/disconnect',
  })
  @Post(':id/disconnect')
  async forceDisconnect(@Param('id') id: string) {
    const session = await this.connectionsService.forceDisconnect(id);
    if (session && session.socketId && this.gateway.server) {
      const client = this.gateway.server.sockets?.sockets?.get(session.socketId);
      if (client) {
        client.emit('session:terminated', { message: 'Phiên kết nối của bạn đã được quản trị viên ngắt.' });
        client.disconnect(true);
      }
    }
    return { success: true, message: 'Đã ngắt phiên kết nối thành công.' };
  }
}

