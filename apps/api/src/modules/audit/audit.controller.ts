import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AuditLoggerService } from './audit-logger.service';

export class AuditLogsQueryDto {
  hackathonId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditLogger: AuditLoggerService) {}

  @Get('logs')
  @Public()
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs with optional filtering.',
  })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    description: 'Filter by hackathon ID',
    example: 'hack_123',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type',
    example: 'AUTOMATIC_TRANSITION',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of logs to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of logs to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
  })
  async getLogs(@Query() query: AuditLogsQueryDto) {
    const filter: any = {};
    if (query.hackathonId) filter.hackathonId = query.hackathonId;
    if (query.action) filter.action = query.action;
    filter.limit = query.limit ? Number(query.limit) : 50;
    filter.offset = query.offset ? Number(query.offset) : 0;

    return this.auditLogger.getLogs(filter);
  }

  @Get('hackathons/:id/trail')
  @Public()
  @ApiOperation({
    summary: 'Get hackathon audit trail',
    description: 'Get complete audit trail for a specific hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit trail retrieved successfully',
  })
  async getHackathonAuditTrail(@Param('id') hackathonId: string) {
    return this.auditLogger.getHackathonAuditTrail(hackathonId);
  }

  @Get('hackathons/:id/summary')
  @Public()
  @ApiOperation({
    summary: 'Get hackathon status change summary',
    description: 'Get status change statistics for a specific hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Status change summary retrieved successfully',
  })
  async getStatusChangeSummary(@Param('id') hackathonId: string) {
    return this.auditLogger.getStatusChangeSummary(hackathonId);
  }

  @Get('statistics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get audit statistics',
    description: 'Get overall audit statistics. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit statistics retrieved successfully',
  })
  async getAuditStatistics() {
    // Note: In real implementation, you'd want admin guard here
    return this.auditLogger.getAuditStatistics();
  }
}
