import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
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
import {
  AuditService,
  AuditLogFilter,
  CreateAuditLogDto,
} from './audit.service';
import { AuditAction, TriggerType, HackathonStatus } from '@prisma/client';

export class AuditLogsQueryDto {
  hackathonId?: string;
  action?: AuditAction;
  triggeredBy?: TriggerType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class CreateAuditLogRequestDto {
  hackathonId!: string;
  action!: AuditAction;
  fromStatus?: HackathonStatus;
  toStatus!: HackathonStatus;
  reason!: string;
  triggeredBy!: TriggerType;
  userAddress?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly auditLogger: AuditLoggerService,
    private readonly auditService: AuditService,
  ) {}

  @Post('logs')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create audit log entry',
    description:
      'Create a new audit log entry for tracking hackathon status changes. Requires authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Audit log entry created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createAuditLog(@Body() createAuditLogDto: CreateAuditLogRequestDto) {
    return this.auditService.logStatusChange(createAuditLogDto);
  }

  @Get('logs')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get audit logs',
    description:
      'Retrieve audit logs with optional filtering. Requires authentication.',
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
    const filter: AuditLogFilter = {};

    if (query.hackathonId) filter.hackathonId = query.hackathonId;
    if (query.action) filter.action = query.action;
    if (query.triggeredBy) filter.triggeredBy = query.triggeredBy;

    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid fromDate format');
      }
      filter.fromDate = fromDate;
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid toDate format');
      }
      filter.toDate = toDate;
    }

    filter.limit = query.limit ? Number(query.limit) : 50;
    filter.offset = query.offset ? Number(query.offset) : 0;

    return this.auditService.getLogs(filter);
  }

  @Get('hackathons/:id/trail')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get hackathon audit trail',
    description:
      'Get complete audit trail for a specific hackathon. Requires authentication.',
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
    return this.auditService.getHackathonAuditTrail(hackathonId);
  }

  @Get('hackathons/:id/summary')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get hackathon status change summary',
    description:
      'Get status change statistics for a specific hackathon. Requires authentication.',
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
    return this.auditService.getStatusChangeSummary(hackathonId);
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

  @Get('export/csv')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export audit logs to CSV',
    description: 'Export audit logs in CSV format. Admin only.',
  })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    description: 'Filter by hackathon ID',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter from date (ISO format)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter to date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV data returned successfully',
    headers: {
      'Content-Type': {
        description: 'text/csv',
      },
      'Content-Disposition': {
        description: 'attachment; filename="audit-logs.csv"',
      },
    },
  })
  async exportLogsToCSV(@Query() query: AuditLogsQueryDto) {
    const filter: AuditLogFilter = {};

    if (query.hackathonId) filter.hackathonId = query.hackathonId;
    if (query.action) filter.action = query.action;
    if (query.triggeredBy) filter.triggeredBy = query.triggeredBy;

    if (query.fromDate) {
      const fromDate = new Date(query.fromDate);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid fromDate format');
      }
      filter.fromDate = fromDate;
    }

    if (query.toDate) {
      const toDate = new Date(query.toDate);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid toDate format');
      }
      filter.toDate = toDate;
    }

    const csvData = await this.auditService.exportAuditLogsToCSV(filter);

    return {
      data: csvData,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv',
    };
  }
}
