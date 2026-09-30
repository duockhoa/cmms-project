import { Module } from '@nestjs/common';
import { FabricationController } from './fabrication.controller';
import { FabricationService } from './fabrication.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FabricationController],
  providers: [FabricationService],
  exports: [FabricationService],
})
export class FabricationModule {}
