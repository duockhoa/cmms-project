import { Module } from '@nestjs/common';
import { FabricationController } from './fabrication.controller';
import { FabricationService } from './fabrication.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FabricationController],
  providers: [FabricationService],
  exports: [FabricationService],
})
export class FabricationModule {}
