import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChecklistExecutionsController } from './checklist-executions.controller';
import { ChecklistExecutionsService } from './checklist-executions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChecklistExecutionsController],
  providers: [ChecklistExecutionsService],
  exports: [ChecklistExecutionsService],
})
export class ChecklistExecutionsModule {}
