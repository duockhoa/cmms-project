import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  EquipmentCategoryController,
  LocationController,
  ProductionLineController,
  SystemSettingController,
} from './settings.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    EquipmentCategoryController,
    LocationController,
    ProductionLineController,
    SystemSettingController,
  ],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
