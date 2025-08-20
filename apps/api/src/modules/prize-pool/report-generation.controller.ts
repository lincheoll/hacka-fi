import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportGenerationService } from './report-generation.service';

@ApiTags('Report Generation')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportGenerationController {
  constructor(
    private readonly reportGenerationService: ReportGenerationService,
  ) {}

  @Get('executive-summary')
  @ApiOperation({ summary: 'Generate executive summary report' })
  @ApiQuery({
    name: 'startDate',
    description: 'Report start date (ISO string)',
  })
  @ApiQuery({ name: 'endDate', description: 'Report end date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Executive summary report generated successfully',
  })
  @ApiBearerAuth()
  async generateExecutiveSummaryReport(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    // Parse and validate dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO string format.',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const report =
      await this.reportGenerationService.generateExecutiveSummaryReport(
        startDate,
        endDate,
      );

    return {
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('financial')
  @ApiOperation({ summary: 'Generate financial report' })
  @ApiQuery({
    name: 'startDate',
    description: 'Report start date (ISO string)',
  })
  @ApiQuery({ name: 'endDate', description: 'Report end date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Financial report generated successfully',
  })
  @ApiBearerAuth()
  async generateFinancialReport(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    // Parse and validate dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO string format.',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const report = await this.reportGenerationService.generateFinancialReport(
      startDate,
      endDate,
    );

    return {
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiQuery({
    name: 'startDate',
    description: 'Report start date (ISO string)',
  })
  @ApiQuery({ name: 'endDate', description: 'Report end date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Compliance report generated successfully',
  })
  @ApiBearerAuth()
  async generateComplianceReport(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    // Parse and validate dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO string format.',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const report = await this.reportGenerationService.generateComplianceReport(
      startDate,
      endDate,
    );

    return {
      success: true,
      report,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('export/json')
  @ApiOperation({ summary: 'Export report as JSON file' })
  @ApiQuery({
    name: 'type',
    description: 'Report type',
    enum: ['executive', 'financial', 'compliance'],
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Report start date (ISO string)',
  })
  @ApiQuery({ name: 'endDate', description: 'Report end date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'JSON report file generated successfully',
    headers: {
      'Content-Type': {
        description: 'application/json',
      },
      'Content-Disposition': {
        description: 'attachment; filename="report.json"',
      },
    },
  })
  @ApiBearerAuth()
  @Header('Content-Type', 'application/json')
  async exportReportToJSON(
    @Query('type') reportType: 'executive' | 'financial' | 'compliance',
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ): Promise<string> {
    // Validate report type
    if (!['executive', 'financial', 'compliance'].includes(reportType)) {
      throw new BadRequestException(
        'Invalid report type. Must be: executive, financial, or compliance',
      );
    }

    // Parse and validate dates
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Use ISO string format.',
      );
    }

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Set appropriate filename based on report type
    const filename = `${reportType}-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`;

    return this.reportGenerationService.exportReportToJSON(
      reportType,
      startDate,
      endDate,
    );
  }

  @Get('quick-stats')
  @ApiOperation({ summary: 'Get quick statistics for report previews' })
  @ApiResponse({
    status: 200,
    description: 'Quick statistics retrieved successfully',
  })
  @ApiBearerAuth()
  async getQuickStats() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    try {
      const [thisMonthReport, lastMonthReport, thisYearReport] =
        await Promise.all([
          this.reportGenerationService.generateExecutiveSummaryReport(
            thisMonth,
            now,
          ),
          this.reportGenerationService.generateExecutiveSummaryReport(
            lastMonth,
            thisMonth,
          ),
          this.reportGenerationService.generateExecutiveSummaryReport(
            thisYear,
            now,
          ),
        ]);

      return {
        success: true,
        quickStats: {
          thisMonth: {
            totalDistributions: thisMonthReport.overview.totalDistributions,
            totalAmount: thisMonthReport.overview.totalAmountDistributed,
            successRate: thisMonthReport.overview.successRate,
            avgConfirmationTime:
              thisMonthReport.overview.averageConfirmationTime,
          },
          lastMonth: {
            totalDistributions: lastMonthReport.overview.totalDistributions,
            totalAmount: lastMonthReport.overview.totalAmountDistributed,
            successRate: lastMonthReport.overview.successRate,
            avgConfirmationTime:
              lastMonthReport.overview.averageConfirmationTime,
          },
          yearToDate: {
            totalDistributions: thisYearReport.overview.totalDistributions,
            totalAmount: thisYearReport.overview.totalAmountDistributed,
            successRate: thisYearReport.overview.successRate,
            avgConfirmationTime:
              thisYearReport.overview.averageConfirmationTime,
          },
          trends: {
            distributionChange: thisMonthReport.trends.distributionGrowth,
            amountChange: thisMonthReport.trends.amountGrowth,
            successRateChange: thisMonthReport.trends.successRateChange,
          },
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        generatedAt: new Date().toISOString(),
      };
    }
  }

  @Get('templates')
  @ApiOperation({
    summary: 'Get available report templates and their descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Report templates retrieved successfully',
  })
  @ApiBearerAuth()
  async getReportTemplates() {
    return {
      success: true,
      templates: [
        {
          id: 'executive',
          name: 'Executive Summary Report',
          description:
            'High-level overview of distribution performance, trends, and key metrics',
          features: [
            'Total distributions and amounts',
            'Success rate and performance metrics',
            'Top hackathons and recipients',
            'Growth trends and comparisons',
            'Gas efficiency analysis',
          ],
          recommendedFor: ['Executives', 'Stakeholders', 'Board members'],
        },
        {
          id: 'financial',
          name: 'Financial Report',
          description:
            'Detailed financial analysis of prize distributions and associated costs',
          features: [
            'Total amounts distributed by position',
            'Gas cost analysis and trends',
            'Transaction success and retry statistics',
            'Monthly financial breakdown',
            'Cost efficiency metrics',
          ],
          recommendedFor: ['Finance teams', 'Accountants', 'Budget managers'],
        },
        {
          id: 'compliance',
          name: 'Compliance Report',
          description:
            'Audit trail analysis and compliance metrics for regulatory requirements',
          features: [
            'Audit log analysis and categorization',
            'Transaction verification metrics',
            'Security and compliance scores',
            'Manual intervention tracking',
            'Compliance recommendations',
          ],
          recommendedFor: ['Compliance officers', 'Auditors', 'Legal teams'],
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check report generation service health' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  @ApiBearerAuth()
  async getHealthStatus() {
    try {
      // Test report generation with minimal data
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const testReport =
        await this.reportGenerationService.generateExecutiveSummaryReport(
          oneHourAgo,
          now,
        );

      return {
        success: true,
        healthy: true,
        status: 'operational',
        checks: {
          reportGeneration: 'functional',
          database: 'connected',
          lastTestGeneration: new Date().toISOString(),
          testReportMetrics: {
            totalDistributions: testReport.overview.totalDistributions,
            totalHackathons: testReport.overview.totalHackathons,
          },
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
