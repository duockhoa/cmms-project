import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { EquipmentModule } from '../equipment/equipment.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [EquipmentModule, NotificationsModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
