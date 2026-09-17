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
import { FunctionalUnitsService } from './functional-units.service';
import { FunctionalUnitsController, FunctionalUnitLibraryController } from './functional-units.controller';

@Module({
  controllers: [
    EquipmentController, 
    EquipmentParametersController, 
    EquipmentTechnicalSpecsController,
    OperationLogsController, 
    GlobalOperationLogsController,
    FunctionalUnitsController,
    FunctionalUnitLibraryController,
  ],
  providers: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService,
    FunctionalUnitsService,
  ],
  exports: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService,
    FunctionalUnitsService,
  ],
})
export class EquipmentModule {}

