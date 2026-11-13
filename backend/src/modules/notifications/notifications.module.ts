import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { UserConnectionsService } from './user-connections.service';
import { UserConnectionsController } from './user-connections.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController, UserConnectionsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationEventListener,
    UserConnectionsService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    NotificationEventListener,
    UserConnectionsService,
  ],
})
export class NotificationsModule {}
