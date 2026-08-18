import { Module } from '@nestjs/common';
import { ChecklistTemplatesService } from './checklist-templates.service';
import { ChecklistTemplatesController } from './checklist-templates.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChecklistTemplatesController],
  providers: [ChecklistTemplatesService],
  exports: [ChecklistTemplatesService],
})
export class ChecklistTemplatesModule {}
