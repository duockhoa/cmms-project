import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChecklistExecutionsController } from './checklist-executions.controller';
import { ChecklistExecutionsService } from './checklist-executions.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [PrismaModule, WorkOrdersModule],
  controllers: [ChecklistExecutionsController],
  providers: [ChecklistExecutionsService],
  exports: [ChecklistExecutionsService],
})
export class ChecklistExecutionsModule {}
