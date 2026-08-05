import { Module } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentStatusService } from './equipment-status.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentStatusService],
  exports: [EquipmentService, EquipmentStatusService],
})
export class EquipmentModule {}
