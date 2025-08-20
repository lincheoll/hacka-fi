import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  AnalyticsQueryDto,
  ExportQueryDto,
  ExportFormat,
  AnalyticsDateRange,
  ComprehensiveAnalyticsDto,
  ExportDataDto,
} from './dto/analytics.dto';

@ApiTags('Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get comprehensive analytics overview',
    description:
      'Retrieve comprehensive analytics including participation trends, voting statistics, and prize distribution. Admin access required.',
  })
  @ApiQuery({
    name: 'dateRange',
    enum: AnalyticsDateRange,
    required: false,
    description: 'Date range for analytics data',
  })
  @ApiQuery({
    name: 'startDate',
    type: 'string',
    required: false,
    description: 'Start date for custom range (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    type: 'string',
    required: false,
    description: 'End date for custom range (ISO string)',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved analytics data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          description:
            'Comprehensive analytics data including overview, participation trends, voting statistics, and prize distribution',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async getComprehensiveAnalytics(@Query() query: AnalyticsQueryDto) {
    const analytics =
      await this.analyticsService.getComprehensiveAnalytics(query);
    return { success: true, data: analytics };
  }

  @Get('participation-trends')
  @ApiOperation({
    summary: 'Get participation trends',
    description:
      'Retrieve detailed participation trends including registration velocity and submission rates. Admin access required.',
  })
  @ApiQuery({
    name: 'dateRange',
    enum: AnalyticsDateRange,
    required: false,
    description: 'Date range for trends data',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved participation trends',
  })
  async getParticipationTrends(@Query() query: AnalyticsQueryDto) {
    const dateRange = this.getDateRange(query);
    const trends = await this.analyticsService.getParticipationTrends(
      dateRange,
      query.hackathonId,
    );
    return { success: true, data: trends };
  }

  @Get('voting-statistics')
  @ApiOperation({
    summary: 'Get voting statistics',
    description:
      'Retrieve detailed voting statistics including score distributions and judge participation. Admin access required.',
  })
  @ApiQuery({
    name: 'dateRange',
    enum: AnalyticsDateRange,
    required: false,
    description: 'Date range for voting statistics',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved voting statistics',
  })
  async getVotingStatistics(@Query() query: AnalyticsQueryDto) {
    const dateRange = this.getDateRange(query);
    const statistics = await this.analyticsService.getVotingStatistics(
      dateRange,
      query.hackathonId,
    );
    return { success: true, data: statistics };
  }

  @Get('prize-distribution')
  @ApiOperation({
    summary: 'Get prize distribution analytics',
    description:
      'Retrieve prize distribution analytics including utilization rates and winner categories. Admin access required.',
  })
  @ApiQuery({
    name: 'dateRange',
    enum: AnalyticsDateRange,
    required: false,
    description: 'Date range for prize distribution data',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved prize distribution analytics',
  })
  async getPrizeDistributionAnalytics(@Query() query: AnalyticsQueryDto) {
    const dateRange = this.getDateRange(query);
    const analytics = await this.analyticsService.getPrizeDistributionAnalytics(
      dateRange,
      query.hackathonId,
    );
    return { success: true, data: analytics };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description:
      'Export comprehensive analytics data in CSV or JSON format. Admin access required.',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Export format (CSV or JSON)',
  })
  @ApiQuery({
    name: 'dateRange',
    enum: AnalyticsDateRange,
    required: false,
    description: 'Date range for export data',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully exported data',
    headers: {
      'Content-Type': {
        description: 'MIME type of the exported file',
      },
      'Content-Disposition': {
        description: 'Attachment with filename',
      },
    },
  })
  async exportData(@Query() query: ExportQueryDto, @Res() res: Response) {
    const exportData = await this.analyticsService.exportData(query);
    const format = query.format || ExportFormat.JSON;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hacka-fi-analytics-${timestamp}.${format}`;

    if (format === ExportFormat.CSV) {
      // Convert to CSV format
      const csvData = this.convertToCSV(exportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(csvData);
    } else {
      // Return JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.json(exportData);
    }
  }

  @Get('export/participants')
  @ApiOperation({
    summary: 'Export participants data',
    description:
      'Export participant data in CSV or JSON format. Admin access required.',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Export format (CSV or JSON)',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  async exportParticipants(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const exportData = await this.analyticsService.exportData(query);
    const format = query.format || ExportFormat.JSON;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hacka-fi-participants-${timestamp}.${format}`;

    if (format === ExportFormat.CSV) {
      const csvData = this.convertArrayToCSV(
        exportData.participants || [],
        'Participants',
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.json({
        participants: exportData.participants,
        metadata: exportData.metadata,
      });
    }
  }

  @Get('export/votes')
  @ApiOperation({
    summary: 'Export voting data',
    description:
      'Export voting and scoring data in CSV or JSON format. Admin access required.',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Export format (CSV or JSON)',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  async exportVotes(@Query() query: ExportQueryDto, @Res() res: Response) {
    const exportData = await this.analyticsService.exportData(query);
    const format = query.format || ExportFormat.JSON;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hacka-fi-votes-${timestamp}.${format}`;

    if (format === ExportFormat.CSV) {
      const csvData = this.convertArrayToCSV(exportData.votes || [], 'Votes');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.json({
        votes: exportData.votes,
        metadata: exportData.metadata,
      });
    }
  }

  @Get('export/winners')
  @ApiOperation({
    summary: 'Export winners data',
    description:
      'Export winner and prize distribution data in CSV or JSON format. Admin access required.',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Export format (CSV or JSON)',
  })
  @ApiQuery({
    name: 'hackathonId',
    type: 'string',
    required: false,
    description: 'Filter by specific hackathon',
  })
  async exportWinners(@Query() query: ExportQueryDto, @Res() res: Response) {
    const exportData = await this.analyticsService.exportData(query);
    const format = query.format || ExportFormat.JSON;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `hacka-fi-winners-${timestamp}.${format}`;

    if (format === ExportFormat.CSV) {
      const csvData = this.convertArrayToCSV(
        exportData.winners || [],
        'Winners',
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.json({
        winners: exportData.winners,
        metadata: exportData.metadata,
      });
    }
  }

  private getDateRange(query: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();

    switch (query.dateRange) {
      case AnalyticsDateRange.LAST_7_DAYS:
        start.setDate(now.getDate() - 7);
        break;
      case AnalyticsDateRange.LAST_30_DAYS:
        start.setDate(now.getDate() - 30);
        break;
      case AnalyticsDateRange.LAST_90_DAYS:
        start.setDate(now.getDate() - 90);
        break;
      case AnalyticsDateRange.LAST_YEAR:
        start.setFullYear(now.getFullYear() - 1);
        break;
      case AnalyticsDateRange.CUSTOM:
        if (query.startDate && query.endDate) {
          return {
            start: new Date(query.startDate),
            end: new Date(query.endDate),
          };
        }
        // Fall back to last 30 days
        start.setDate(now.getDate() - 30);
        break;
      case AnalyticsDateRange.ALL_TIME:
      default:
        start.setFullYear(2020); // Set to a very early date
        break;
    }

    return { start, end: now };
  }

  private convertToCSV(data: ExportDataDto): string {
    let csvContent = '';

    // Add metadata header
    csvContent += `Export Metadata\n`;
    csvContent += `Exported At,${data.metadata.exportedAt.toISOString()}\n`;
    csvContent += `Format,${data.metadata.format}\n`;
    csvContent += `Date Range,${data.metadata.dateRange}\n`;
    csvContent += `Total Records,${data.metadata.totalRecords}\n\n`;

    // Add each section
    if (data.participants && data.participants.length > 0) {
      csvContent += this.convertArrayToCSV(data.participants, 'Participants');
      csvContent += '\n';
    }

    if (data.votes && data.votes.length > 0) {
      csvContent += this.convertArrayToCSV(data.votes, 'Votes');
      csvContent += '\n';
    }

    if (data.hackathons && data.hackathons.length > 0) {
      csvContent += this.convertArrayToCSV(data.hackathons, 'Hackathons');
      csvContent += '\n';
    }

    if (data.winners && data.winners.length > 0) {
      csvContent += this.convertArrayToCSV(data.winners, 'Winners');
      csvContent += '\n';
    }

    return csvContent;
  }

  private convertArrayToCSV(array: any[], sectionName: string): string {
    if (array.length === 0) return '';

    let csv = `${sectionName}\n`;

    // Get headers from first object
    const headers = Object.keys(array[0]);
    csv += headers.join(',') + '\n';

    // Add data rows
    array.forEach((item) => {
      const row = headers.map((header) => {
        let value = item[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"'))
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }
}
