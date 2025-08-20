import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  ParseEnumPipe,
  ParseArrayPipe,
  DefaultValuePipe,
  BadRequestException,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import {
  DistributionHistoryService,
  DistributionHistoryFilter,
} from './distribution-history.service';
import { DistributionStatus } from '@prisma/client';

@ApiTags('Distribution History')
@Controller('distribution-history')
@UseGuards(JwtAuthGuard)
export class DistributionHistoryController {
  constructor(
    private readonly distributionHistoryService: DistributionHistoryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get distribution history with filtering and pagination',
  })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    description: 'Filter by hackathon ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (can be multiple)',
    type: [String],
  })
  @ApiQuery({
    name: 'recipientAddress',
    required: false,
    description: 'Filter by recipient address',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiQuery({
    name: 'minAmount',
    required: false,
    description: 'Minimum amount filter',
  })
  @ApiQuery({
    name: 'maxAmount',
    required: false,
    description: 'Maximum amount filter',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results per page',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of results to skip',
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field',
    enum: ['createdAt', 'executedAt', 'amount', 'position'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Distribution history retrieved successfully',
  })
  @ApiBearerAuth()
  async getDistributionHistory(
    @Query('hackathonId') hackathonId?: string,
    @Query(
      'status',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    status?: string[],
    @Query('recipientAddress') recipientAddress?: string,
    @Query('fromDate') fromDateStr?: string,
    @Query('toDate') toDateStr?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    @Query('sortBy', new DefaultValuePipe('createdAt'))
    sortBy?: 'createdAt' | 'executedAt' | 'amount' | 'position',
    @Query('sortOrder', new DefaultValuePipe('desc'))
    sortOrder?: 'asc' | 'desc',
  ) {
    // Parse dates
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    // Validate dates
    if (fromDate && isNaN(fromDate.getTime())) {
      throw new BadRequestException('Invalid fromDate format');
    }
    if (toDate && isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid toDate format');
    }

    // Parse status array
    const statusEnums = status?.map((s) => {
      if (
        !Object.values(DistributionStatus).includes(s as DistributionStatus)
      ) {
        throw new BadRequestException(`Invalid status: ${s}`);
      }
      return s as DistributionStatus;
    });

    const filter: DistributionHistoryFilter = {
      ...(hackathonId && { hackathonId }),
      ...(statusEnums && { status: statusEnums }),
      ...(recipientAddress && { recipientAddress }),
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
      ...(minAmount && { minAmount }),
      ...(maxAmount && { maxAmount }),
      ...(limit && { limit }),
      ...(offset && { offset }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder }),
    };

    const result =
      await this.distributionHistoryService.getDistributionHistory(filter);

    return {
      success: true,
      data: {
        distributions: result.distributions,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: result.hasMore,
        },
        summary: result.summary,
      },
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get distribution summary statistics' })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    description: 'Filter by hackathon ID',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribution summary retrieved successfully',
  })
  @ApiBearerAuth()
  async getDistributionSummary(
    @Query('hackathonId') hackathonId?: string,
    @Query('fromDate') fromDateStr?: string,
    @Query('toDate') toDateStr?: string,
  ) {
    // Parse dates
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    const filter: DistributionHistoryFilter = {
      ...(hackathonId && { hackathonId }),
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
    };

    const summary =
      await this.distributionHistoryService.generateDistributionSummary(filter);

    return {
      success: true,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('hackathon/:hackathonId/report')
  @Public()
  @ApiOperation({ summary: 'Get comprehensive hackathon distribution report' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Hackathon distribution report retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Hackathon not found' })
  async getHackathonDistributionReport(
    @Param('hackathonId') hackathonId: string,
  ) {
    const report =
      await this.distributionHistoryService.getHackathonDistributionReport(
        hackathonId,
      );

    return {
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('recipient/:address')
  @Public()
  @ApiOperation({
    summary: 'Get recipient distribution history across all hackathons',
  })
  @ApiParam({ name: 'address', description: 'Recipient wallet address' })
  @ApiResponse({
    status: 200,
    description: 'Recipient distribution history retrieved successfully',
  })
  async getRecipientDistributionHistory(@Param('address') address: string) {
    const history =
      await this.distributionHistoryService.getRecipientDistributionHistory(
        address,
      );

    return {
      success: true,
      history,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export distribution history to CSV' })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    description: 'Filter by hackathon ID',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file generated successfully',
    headers: {
      'Content-Type': {
        description: 'text/csv',
      },
      'Content-Disposition': {
        description: 'attachment; filename="distribution-history.csv"',
      },
    },
  })
  @ApiBearerAuth()
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="distribution-history.csv"',
  )
  async exportDistributionHistoryToCSV(
    @Query('hackathonId') hackathonId?: string,
    @Query('fromDate') fromDateStr?: string,
    @Query('toDate') toDateStr?: string,
  ): Promise<string> {
    // Parse dates
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;

    const filter: DistributionHistoryFilter = {
      ...(hackathonId && { hackathonId }),
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
    };

    return this.distributionHistoryService.exportDistributionHistoryToCSV(
      filter,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get distribution statistics for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  @ApiBearerAuth()
  async getDistributionDashboardStats() {
    const stats =
      await this.distributionHistoryService.getDistributionDashboardStats();

    return {
      success: true,
      stats,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('recipients/top')
  @Public()
  @ApiOperation({ summary: 'Get top recipients by total winnings' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top recipients to return',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Top recipients retrieved successfully',
  })
  async getTopRecipients(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const dashboardStats =
      await this.distributionHistoryService.getDistributionDashboardStats();

    return {
      success: true,
      topRecipients: dashboardStats.topRecipients.slice(0, limit),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get distribution analytics and trends' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to analyze',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Distribution analytics retrieved successfully',
  })
  @ApiBearerAuth()
  async getDistributionAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - (days || 30) * 24 * 60 * 60 * 1000,
    );

    // Get daily distribution data for the period
    const distributionsInPeriod =
      await this.distributionHistoryService.getDistributionHistory({
        fromDate: startDate,
        toDate: endDate,
        limit: 10000, // Get all for analytics
      });

    // Group by date
    const dailyData = new Map<
      string,
      {
        date: string;
        distributions: number;
        totalAmount: string;
        successRate: number;
      }
    >();

    // Initialize all dates in range
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData.set(dateStr, {
        date: dateStr,
        distributions: 0,
        totalAmount: '0',
        successRate: 0,
      });
    }

    // Populate with actual data
    distributionsInPeriod.distributions.forEach((dist) => {
      const dateStr = dist.createdAt.toISOString().split('T')[0];
      const existing = dailyData.get(dateStr);
      if (existing) {
        existing.distributions += 1;
        if (dist.status === DistributionStatus.COMPLETED) {
          existing.totalAmount = (
            BigInt(existing.totalAmount) + BigInt(dist.amount)
          ).toString();
        }
      }
    });

    // Calculate success rates
    dailyData.forEach((data, dateStr) => {
      if (data.distributions > 0) {
        const completedCount = distributionsInPeriod.distributions.filter(
          (d) =>
            d.createdAt.toISOString().split('T')[0] === dateStr &&
            d.status === DistributionStatus.COMPLETED,
        ).length;
        data.successRate = (completedCount / data.distributions) * 100;
      }
    });

    const analytics = Array.from(dailyData.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      success: true,
      analytics: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
        dailyData: analytics,
        summary: distributionsInPeriod.summary,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Check distribution history service health' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  async getHealthStatus() {
    try {
      // Test basic functionality by getting a summary
      const summary =
        await this.distributionHistoryService.generateDistributionSummary({
          limit: 1,
        });

      return {
        success: true,
        healthy: true,
        status: 'operational',
        checks: {
          database: 'connected',
          distributionHistory: 'accessible',
          totalDistributions: summary.totalDistributions,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }
}
