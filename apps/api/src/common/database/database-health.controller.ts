import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';
import { Public } from '../../modules/auth/decorators';

@ApiTags('Health')
@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Public()
  @Get('database')
  @ApiOperation({
    summary: 'Check database connection health',
    description: 'Verify database connectivity and return connection status',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is healthy',
    schema: {
      example: {
        status: 'healthy',
        database: {
          connected: true,
          provider: 'sqlite',
          url: 'file:./dev.db',
        },
        timestamp: '2025-08-16T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unhealthy',
    schema: {
      example: {
        status: 'unhealthy',
        database: {
          connected: false,
          provider: 'sqlite',
          url: 'file:./dev.db',
        },
        timestamp: '2025-08-16T12:00:00.000Z',
      },
    },
  })
  async checkDatabase(): Promise<any> {
    const isHealthy = await this.prismaService.healthCheck();
    const dbInfo = this.prismaService.getDatabaseInfo();

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: {
        connected: isHealthy,
        provider: dbInfo.provider,
        url: dbInfo.url,
      },
      timestamp: new Date().toISOString(),
    };

    return response;
  }
}
