import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiStandardResponse({ summary: 'Kiểm tra trạng thái máy chủ và kết nối Cơ sở dữ liệu', method: 'GET', path: '/health', isPublic: true })
  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    try {
      // Execute a quick raw query to verify database connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          api: 'up',
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          api: 'up',
        },
      };
    }
  }
}
