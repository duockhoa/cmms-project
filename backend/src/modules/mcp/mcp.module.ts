import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { WellKnownController } from './well-known.controller';
import { McpService } from './mcp.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [McpController, WellKnownController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
