import { Module } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentStatusService } from './equipment-status.service';
import { EquipmentParametersService } from './equipment-parameters.service';
import { EquipmentParametersController } from './equipment-parameters.controller';
import { EquipmentTechnicalSpecsService } from './equipment-technical-specs.service';
import { EquipmentTechnicalSpecsController } from './equipment-technical-specs.controller';
import { OperationLogsService } from './operation-logs.service';
import { OperationLogsController, GlobalOperationLogsController } from './operation-logs.controller';
import { OeeRecordsService } from './oee-records.service';
import { EquipmentOeeRecordsController, GlobalOeeRecordsController } from './oee-records.controller';
import { FunctionalUnitsService } from './functional-units.service';
import { FunctionalUnitsController, FunctionalUnitLibraryController } from './functional-units.controller';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  controllers: [
    EquipmentController, 
    EquipmentParametersController, 
    EquipmentTechnicalSpecsController,
    OperationLogsController, 
    GlobalOperationLogsController,
    EquipmentOeeRecordsController,
    GlobalOeeRecordsController,
    FunctionalUnitsController,
    FunctionalUnitLibraryController,
  ],
  providers: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService,
    OeeRecordsService,
    FunctionalUnitsService,
    PermissionsGuard,
  ],
  exports: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService,
    OeeRecordsService,
    FunctionalUnitsService,
  ],
})
export class EquipmentModule {}

