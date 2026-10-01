import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationEventListener } from './listeners/notification-event.listener';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationEventListener],
  exports: [NotificationsService, NotificationsGateway, NotificationEventListener],
})
export class NotificationsModule {}
