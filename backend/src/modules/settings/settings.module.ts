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
import { StandardTechnicalSpecsService } from './standard-technical-specs.service';
import { StandardTechnicalSpecsController } from './standard-technical-specs.controller';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { ChecklistLibraryService } from './checklist-library.service';
import { ChecklistLibraryController } from './checklist-library.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    EquipmentCategoryController,
    LocationController,
    ProductionLineController,
    SystemSettingController,
    StandardParametersController,
    StandardTechnicalSpecsController,
    RolesController,
    ChecklistLibraryController,
  ],
  providers: [
    SettingsService, 
    StandardParametersService, 
    StandardTechnicalSpecsService,
    RolesService, 
    ChecklistLibraryService
  ],
  exports: [
    SettingsService, 
    StandardParametersService, 
    StandardTechnicalSpecsService,
    RolesService, 
    ChecklistLibraryService
  ],
})
export class SettingsModule {}
