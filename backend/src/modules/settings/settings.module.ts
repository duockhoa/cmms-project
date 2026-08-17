import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { StandardParametersService } from './standard-parameters.service';
import {
  EquipmentCategoryController,
  LocationController,
  ProductionLineController,
  SystemSettingController,
} from './settings.controller';
import { StandardParametersController } from './standard-parameters.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    EquipmentCategoryController,
    LocationController,
    ProductionLineController,
    SystemSettingController,
    StandardParametersController,
  ],
  providers: [SettingsService, StandardParametersService],
  exports: [SettingsService, StandardParametersService],
})
export class SettingsModule {}
