import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { EquipmentModule } from '../equipment/equipment.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EquipmentModule, NotificationsModule],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
