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

@Module({
  controllers: [
    EquipmentController, 
    EquipmentParametersController, 
    EquipmentTechnicalSpecsController,
    OperationLogsController, 
    GlobalOperationLogsController
  ],
  providers: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService
  ],
  exports: [
    EquipmentService, 
    EquipmentStatusService, 
    EquipmentParametersService, 
    EquipmentTechnicalSpecsService,
    OperationLogsService
  ],
})
export class EquipmentModule {}
