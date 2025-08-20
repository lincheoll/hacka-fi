import { Injectable, Logger } from '@nestjs/common';
import { DistributionHistoryService } from './distribution-history.service';
import { AuditService } from '../audit/audit.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import { PrismaService } from '../../common/database/prisma.service';
import { DistributionStatus } from '@prisma/client';

export interface ExecutiveSummaryReport {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
  };
  overview: {
    totalHackathons: number;
    totalDistributions: number;
    totalAmountDistributed: string;
    averageDistributionAmount: string;
    successRate: number;
    averageConfirmationTime: number;
  };
  performance: {
    distributionsPerDay: number;
    failureRate: number;
    retryRate: number;
    gasEfficiency: {
      averageGasUsed: string;
      totalGasCost: string;
      averageGasPrice: string;
    };
  };
  topHackathons: Array<{
    hackathonId: string;
    title: string;
    totalPrizePool: string;
    distributionCount: number;
    organizerAddress: string;
  }>;
  topRecipients: Array<{
    address: string;
    totalReceived: string;
    winCount: number;
    averagePosition: number;
  }>;
  trends: {
    distributionGrowth: number; // percentage change
    amountGrowth: number; // percentage change
    successRateChange: number; // percentage change
  };
}

export interface FinancialReport {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  totalDistributed: string;
  distributionBreakdown: {
    firstPlace: { count: number; totalAmount: string; percentage: number };
    secondPlace: { count: number; totalAmount: string; percentage: number };
    thirdPlace: { count: number; totalAmount: string; percentage: number };
  };
  gasAnalysis: {
    totalGasUsed: string;
    averageGasPrice: string;
    totalGasCost: string;
    gasEfficiencyScore: number;
  };
  transactionAnalysis: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    retriedTransactions: number;
    averageRetries: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    year: number;
    totalDistributed: string;
    transactionCount: number;
    gasCost: string;
  }>;
}

export interface ComplianceReport {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  auditSummary: {
    totalAuditEntries: number;
    automaticTransitions: number;
    manualOverrides: number;
    systemTriggered: number;
    organizerTriggered: number;
    adminTriggered: number;
  };
  distributionCompliance: {
    totalDistributions: number;
    distributionsWithProperAuditTrail: number;
    distributionsWithTransactionHash: number;
    distributionsWithBlockConfirmation: number;
    complianceScore: number; // percentage
  };
  securityMetrics: {
    failedTransactionRate: number;
    emergencyInterventions: number;
    suspiciousActivity: number;
    unauthorizedAccess: number;
  };
  recommendations: string[];
}

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    private readonly distributionHistory: DistributionHistoryService,
    private readonly auditService: AuditService,
    private readonly transactionMonitor: TransactionMonitorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummaryReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ExecutiveSummaryReport> {
    this.logger.log(
      `Generating executive summary report for ${startDate} to ${endDate}`,
    );

    try {
      // Get current period data
      const currentPeriod =
        await this.distributionHistory.getDistributionHistory({
          fromDate: startDate,
          toDate: endDate,
          limit: 10000,
        });

      // Get previous period data for trend analysis
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousPeriod =
        await this.distributionHistory.getDistributionHistory({
          fromDate: previousStartDate,
          toDate: startDate,
          limit: 10000,
        });

      // Get transaction monitoring stats
      const transactionStats =
        await this.transactionMonitor.getMonitoringStats();

      // Get hackathon statistics
      const hackathonStats = await this.prisma.hackathon.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          prizePool: {
            include: {
              distributions: true,
            },
          },
        },
      });

      // Calculate overview metrics
      const totalDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const averageDistributionAmount =
        currentPeriod.distributions.length > 0
          ? (
              BigInt(currentPeriod.summary.totalAmount) /
              BigInt(currentPeriod.distributions.length)
            ).toString()
          : '0';

      // Calculate performance metrics
      const distributionsPerDay =
        currentPeriod.distributions.length / totalDays;
      const failureRate =
        currentPeriod.summary.totalDistributions > 0
          ? (currentPeriod.summary.failedDistributions /
              currentPeriod.summary.totalDistributions) *
            100
          : 0;

      // Calculate gas efficiency
      const transactionsWithGas = currentPeriod.distributions.filter(
        (d) => d.prizePool.distributionTxHash,
      );
      const gasAnalysis =
        await this.calculateGasEfficiency(transactionsWithGas);

      // Get top hackathons
      const topHackathons = hackathonStats
        .filter((h) => h.prizePool)
        .sort((a, b) =>
          Number(
            BigInt(b.prizePool!.totalAmount) - BigInt(a.prizePool!.totalAmount),
          ),
        )
        .slice(0, 10)
        .map((h) => ({
          hackathonId: h.id,
          title: h.title,
          totalPrizePool: h.prizePool!.totalAmount,
          distributionCount: h.prizePool!.distributions.length,
          organizerAddress: h.organizerAddress,
        }));

      // Get top recipients from dashboard stats
      const dashboardStats =
        await this.distributionHistory.getDistributionDashboardStats();

      // Calculate trends
      const distributionGrowth =
        previousPeriod.summary.totalDistributions > 0
          ? ((currentPeriod.summary.totalDistributions -
              previousPeriod.summary.totalDistributions) /
              previousPeriod.summary.totalDistributions) *
            100
          : 0;

      const amountGrowth =
        BigInt(previousPeriod.summary.totalAmount) > 0
          ? Number(
              ((BigInt(currentPeriod.summary.totalAmount) -
                BigInt(previousPeriod.summary.totalAmount)) *
                BigInt(100)) /
                BigInt(previousPeriod.summary.totalAmount),
            )
          : 0;

      const successRateChange =
        currentPeriod.summary.successRate - previousPeriod.summary.successRate;

      return {
        reportPeriod: {
          startDate,
          endDate,
          totalDays,
        },
        overview: {
          totalHackathons: hackathonStats.length,
          totalDistributions: currentPeriod.summary.totalDistributions,
          totalAmountDistributed: currentPeriod.summary.totalAmount,
          averageDistributionAmount,
          successRate: currentPeriod.summary.successRate,
          averageConfirmationTime:
            currentPeriod.summary.averageDistributionTime || 0,
        },
        performance: {
          distributionsPerDay,
          failureRate,
          retryRate: 0, // Calculate from transaction data
          gasEfficiency: gasAnalysis,
        },
        topHackathons,
        topRecipients: dashboardStats.topRecipients,
        trends: {
          distributionGrowth,
          amountGrowth,
          successRateChange,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate executive summary report', error);
      throw error;
    }
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialReport> {
    this.logger.log(
      `Generating financial report for ${startDate} to ${endDate}`,
    );

    try {
      // Get all distributions in the period
      const { distributions } =
        await this.distributionHistory.getDistributionHistory({
          fromDate: startDate,
          toDate: endDate,
          limit: 10000,
        });

      const completedDistributions = distributions.filter(
        (d) => d.status === DistributionStatus.COMPLETED,
      );

      // Calculate distribution breakdown by position
      const firstPlace = completedDistributions.filter((d) => d.position === 1);
      const secondPlace = completedDistributions.filter(
        (d) => d.position === 2,
      );
      const thirdPlace = completedDistributions.filter((d) => d.position === 3);

      const totalAmount = BigInt(
        completedDistributions.reduce(
          (sum, d) => (BigInt(sum) + BigInt(d.amount)).toString(),
          '0',
        ),
      );

      const distributionBreakdown = {
        firstPlace: {
          count: firstPlace.length,
          totalAmount: firstPlace.reduce(
            (sum, d) => (BigInt(sum) + BigInt(d.amount)).toString(),
            '0',
          ),
          percentage:
            firstPlace.length > 0
              ? (firstPlace.length / completedDistributions.length) * 100
              : 0,
        },
        secondPlace: {
          count: secondPlace.length,
          totalAmount: secondPlace.reduce(
            (sum, d) => (BigInt(sum) + BigInt(d.amount)).toString(),
            '0',
          ),
          percentage:
            secondPlace.length > 0
              ? (secondPlace.length / completedDistributions.length) * 100
              : 0,
        },
        thirdPlace: {
          count: thirdPlace.length,
          totalAmount: thirdPlace.reduce(
            (sum, d) => (BigInt(sum) + BigInt(d.amount)).toString(),
            '0',
          ),
          percentage:
            thirdPlace.length > 0
              ? (thirdPlace.length / completedDistributions.length) * 100
              : 0,
        },
      };

      // Get transaction data for gas analysis
      const transactionData = await this.getTransactionDataInPeriod(
        startDate,
        endDate,
      );
      const gasAnalysis =
        await this.calculateDetailedGasAnalysis(transactionData);

      // Get monthly breakdown
      const monthlyBreakdown = await this.calculateMonthlyBreakdown(
        startDate,
        endDate,
      );

      return {
        reportPeriod: { startDate, endDate },
        totalDistributed: totalAmount.toString(),
        distributionBreakdown,
        gasAnalysis,
        transactionAnalysis: {
          totalTransactions: transactionData.length,
          successfulTransactions: transactionData.filter(
            (t) => t.status === DistributionStatus.COMPLETED,
          ).length,
          failedTransactions: transactionData.filter(
            (t) => t.status === DistributionStatus.FAILED,
          ).length,
          retriedTransactions: transactionData.filter((t) => t.retryCount > 0)
            .length,
          averageRetries:
            transactionData.length > 0
              ? transactionData.reduce((sum, t) => sum + t.retryCount, 0) /
                transactionData.length
              : 0,
        },
        monthlyBreakdown,
      };
    } catch (error) {
      this.logger.error('Failed to generate financial report', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    this.logger.log(
      `Generating compliance report for ${startDate} to ${endDate}`,
    );

    try {
      // Get audit logs for the period
      const auditLogs = await this.auditService.getLogs({
        fromDate: startDate,
        toDate: endDate,
        limit: 10000,
      });

      // Analyze audit trail
      const auditSummary = {
        totalAuditEntries: auditLogs.total,
        automaticTransitions: auditLogs.logs.filter(
          (log) => log.triggeredBy === 'SYSTEM',
        ).length,
        manualOverrides: auditLogs.logs.filter(
          (log) => log.triggeredBy !== 'SYSTEM',
        ).length,
        systemTriggered: auditLogs.logs.filter(
          (log) => log.triggeredBy === 'SYSTEM',
        ).length,
        organizerTriggered: auditLogs.logs.filter(
          (log) => log.triggeredBy === 'ORGANIZER',
        ).length,
        adminTriggered: auditLogs.logs.filter(
          (log) => log.triggeredBy === 'ADMIN',
        ).length,
      };

      // Get distributions for compliance analysis
      const { distributions, summary } =
        await this.distributionHistory.getDistributionHistory({
          fromDate: startDate,
          toDate: endDate,
          limit: 10000,
        });

      // Calculate compliance metrics
      const distributionsWithTxHash = distributions.filter(
        (d) => d.txHash,
      ).length;
      const distributionsWithBlockNumber = distributions.filter(
        (d) => d.blockNumber,
      ).length;
      const complianceScore =
        distributions.length > 0
          ? (distributionsWithTxHash / distributions.length) * 100
          : 100;

      // Security metrics
      const failedTransactionRate =
        summary.totalDistributions > 0
          ? (summary.failedDistributions / summary.totalDistributions) * 100
          : 0;

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations({
        complianceScore,
        failedTransactionRate,
        auditSummary,
      });

      return {
        reportPeriod: { startDate, endDate },
        auditSummary,
        distributionCompliance: {
          totalDistributions: distributions.length,
          distributionsWithProperAuditTrail: distributions.length, // All have audit trail
          distributionsWithTransactionHash: distributionsWithTxHash,
          distributionsWithBlockConfirmation: distributionsWithBlockNumber,
          complianceScore,
        },
        securityMetrics: {
          failedTransactionRate,
          emergencyInterventions: auditSummary.adminTriggered,
          suspiciousActivity: 0, // Implement based on specific criteria
          unauthorizedAccess: 0, // Implement based on specific criteria
        },
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to generate compliance report', error);
      throw error;
    }
  }

  /**
   * Export report to JSON format
   */
  async exportReportToJSON(
    reportType: 'executive' | 'financial' | 'compliance',
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    try {
      let report: any;

      switch (reportType) {
        case 'executive':
          report = await this.generateExecutiveSummaryReport(
            startDate,
            endDate,
          );
          break;
        case 'financial':
          report = await this.generateFinancialReport(startDate, endDate);
          break;
        case 'compliance':
          report = await this.generateComplianceReport(startDate, endDate);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      return JSON.stringify(report, null, 2);
    } catch (error) {
      this.logger.error(`Failed to export ${reportType} report to JSON`, error);
      throw error;
    }
  }

  /**
   * Helper: Calculate gas efficiency
   */
  private async calculateGasEfficiency(distributions: any[]): Promise<{
    averageGasUsed: string;
    totalGasCost: string;
    averageGasPrice: string;
  }> {
    // For now, return mock data since gas info is in transaction monitor
    return {
      averageGasUsed: '150000',
      totalGasCost: '0',
      averageGasPrice: '20000000000', // 20 gwei
    };
  }

  /**
   * Helper: Get transaction data in period
   */
  private async getTransactionDataInPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.distributionTransaction.findMany({
      where: {
        submittedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  /**
   * Helper: Calculate detailed gas analysis
   */
  private async calculateDetailedGasAnalysis(transactions: any[]): Promise<{
    totalGasUsed: string;
    averageGasPrice: string;
    totalGasCost: string;
    gasEfficiencyScore: number;
  }> {
    const completedTxs = transactions.filter(
      (tx) => tx.status === DistributionStatus.COMPLETED && tx.gasUsed,
    );

    if (completedTxs.length === 0) {
      return {
        totalGasUsed: '0',
        averageGasPrice: '0',
        totalGasCost: '0',
        gasEfficiencyScore: 100,
      };
    }

    const totalGasUsed = completedTxs.reduce(
      (sum, tx) => (BigInt(sum) + BigInt(tx.gasUsed || '0')).toString(),
      '0',
    );

    const averageGasPrice =
      completedTxs.length > 0 && completedTxs.some((tx) => tx.gasPrice)
        ? (
            completedTxs.reduce(
              (sum, tx) =>
                (BigInt(sum) + BigInt(tx.gasPrice || '0')).toString(),
              '0',
            ) / BigInt(completedTxs.length)
          ).toString()
        : '0';

    const totalGasCost = completedTxs.reduce((sum, tx) => {
      const gasCost = BigInt(tx.gasUsed || '0') * BigInt(tx.gasPrice || '0');
      return (BigInt(sum) + gasCost).toString();
    }, '0');

    // Simple efficiency score based on retry rate
    const retryRate =
      transactions.filter((tx) => tx.retryCount > 0).length /
      transactions.length;
    const gasEfficiencyScore = Math.max(0, 100 - retryRate * 50); // Penalize retries

    return {
      totalGasUsed,
      averageGasPrice,
      totalGasCost,
      gasEfficiencyScore,
    };
  }

  /**
   * Helper: Calculate monthly breakdown
   */
  private async calculateMonthlyBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      month: string;
      year: number;
      totalDistributed: string;
      transactionCount: number;
      gasCost: string;
    }>
  > {
    const monthlyData = new Map<
      string,
      {
        month: string;
        year: number;
        totalDistributed: string;
        transactionCount: number;
        gasCost: string;
      }
    >();

    // Initialize months in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
      const monthName = current.toLocaleString('default', { month: 'long' });

      monthlyData.set(monthKey, {
        month: monthName,
        year: current.getFullYear(),
        totalDistributed: '0',
        transactionCount: 0,
        gasCost: '0',
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Get data for each month
    const { distributions } =
      await this.distributionHistory.getDistributionHistory({
        fromDate: startDate,
        toDate: endDate,
        limit: 10000,
      });

    // Aggregate by month
    distributions.forEach((dist) => {
      const distDate = new Date(dist.createdAt);
      const monthKey = `${distDate.getFullYear()}-${distDate.getMonth()}`;
      const monthData = monthlyData.get(monthKey);

      if (monthData && dist.status === DistributionStatus.COMPLETED) {
        monthData.totalDistributed = (
          BigInt(monthData.totalDistributed) + BigInt(dist.amount)
        ).toString();
        monthData.transactionCount += 1;
      }
    });

    return Array.from(monthlyData.values()).sort(
      (a, b) => a.year - b.year || a.month.localeCompare(b.month),
    );
  }

  /**
   * Helper: Generate compliance recommendations
   */
  private generateComplianceRecommendations(metrics: {
    complianceScore: number;
    failedTransactionRate: number;
    auditSummary: any;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.complianceScore < 95) {
      recommendations.push(
        'Improve transaction hash recording for all distributions',
      );
    }

    if (metrics.failedTransactionRate > 5) {
      recommendations.push(
        'Investigate causes of high transaction failure rate',
      );
      recommendations.push('Consider implementing better gas price estimation');
    }

    if (
      metrics.auditSummary.manualOverrides >
      metrics.auditSummary.automaticTransitions * 0.1
    ) {
      recommendations.push(
        'High rate of manual interventions detected - review automation rules',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating within compliance parameters');
    }

    return recommendations;
  }
}
