import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DistributionStatus, HackathonStatus, Prisma } from '@prisma/client';

export interface DistributionHistoryFilter {
  hackathonId?: string;
  status?: DistributionStatus[];
  recipientAddress?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: string;
  maxAmount?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'executedAt' | 'amount' | 'position';
  sortOrder?: 'asc' | 'desc';
}

export interface DistributionHistoryEntry {
  id: number;
  hackathonId: string;
  hackathonTitle: string;
  organizerAddress: string;
  recipientAddress: string;
  position: number;
  amount: string;
  percentage: number;
  status: DistributionStatus;
  txHash?: string;
  blockNumber?: number;
  executedAt?: Date;
  createdAt: Date;
  error?: string;
  prizePool: {
    id: number;
    totalAmount: string;
    isDistributed: boolean;
    distributionTxHash?: string;
  };
}

export interface DistributionSummary {
  totalDistributions: number;
  totalAmount: string;
  completedDistributions: number;
  pendingDistributions: number;
  failedDistributions: number;
  uniqueRecipients: number;
  uniqueHackathons: number;
  averageDistributionTime?: number; // in minutes
  successRate: number; // percentage
  periodStart?: Date;
  periodEnd?: Date;
}

export interface HackathonDistributionReport {
  hackathonId: string;
  hackathonTitle: string;
  organizerAddress: string;
  status: HackathonStatus;
  totalPrizePool: string;
  totalDistributed: string;
  distributionCount: number;
  completedAt?: Date;
  distributionTxHash?: string;
  distributions: Array<{
    position: number;
    recipientAddress: string;
    amount: string;
    percentage: number;
    status: DistributionStatus;
    txHash?: string;
    executedAt?: Date;
    error?: string;
  }>;
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    triggeredBy: string;
    reason: string;
    userAddress?: string;
  }>;
  transactionHistory: Array<{
    txHash: string;
    status: DistributionStatus;
    submittedAt: Date;
    confirmedAt?: Date;
    gasUsed?: string;
    retryCount: number;
  }>;
}

export interface RecipientDistributionHistory {
  recipientAddress: string;
  totalReceived: string;
  distributionCount: number;
  hackathonsWon: number;
  averagePosition: number;
  distributions: Array<{
    hackathonId: string;
    hackathonTitle: string;
    position: number;
    amount: string;
    percentage: number;
    status: DistributionStatus;
    executedAt?: Date;
    txHash?: string;
  }>;
  winningStreak: number;
  lastWin?: Date;
}

@Injectable()
export class DistributionHistoryService {
  private readonly logger = new Logger(DistributionHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get distribution history with filtering and pagination
   */
  async getDistributionHistory(
    filter: DistributionHistoryFilter = {},
  ): Promise<{
    distributions: DistributionHistoryEntry[];
    total: number;
    hasMore: boolean;
    summary: DistributionSummary;
  }> {
    const {
      hackathonId,
      status,
      recipientAddress,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    try {
      // Build where clause
      const where: Prisma.PrizeDistributionWhereInput = {};

      if (hackathonId) {
        where.hackathonId = hackathonId;
      }

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      if (recipientAddress) {
        where.recipientAddress = recipientAddress;
      }

      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) {
          where.createdAt.gte = fromDate;
        }
        if (toDate) {
          where.createdAt.lte = toDate;
        }
      }

      if (minAmount) {
        where.amount = { gte: minAmount };
      }

      if (maxAmount) {
        if (where.amount && typeof where.amount === 'object') {
          (where.amount as any).lte = maxAmount;
        } else {
          where.amount = { lte: maxAmount };
        }
      }

      // Get total count
      const total = await this.prisma.prizeDistribution.count({ where });

      // Get paginated results
      const distributions = await this.prisma.prizeDistribution.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        include: {
          prizePool: {
            include: {
              hackathon: {
                select: {
                  title: true,
                  organizerAddress: true,
                },
              },
            },
          },
        },
      });

      const distributionEntries: DistributionHistoryEntry[] = distributions.map(
        (dist) => ({
          id: dist.id,
          hackathonId: dist.hackathonId,
          hackathonTitle: dist.prizePool.hackathon.title,
          organizerAddress: dist.prizePool.hackathon.organizerAddress,
          recipientAddress: dist.recipientAddress,
          position: dist.position,
          amount: dist.amount,
          percentage: dist.percentage,
          status: dist.status,
          ...(dist.txHash && { txHash: dist.txHash }),
          ...(dist.blockNumber && { blockNumber: dist.blockNumber }),
          ...(dist.executedAt && { executedAt: dist.executedAt }),
          createdAt: dist.createdAt,
          ...(dist.error && { error: dist.error }),
          prizePool: {
            id: dist.prizePool.id,
            totalAmount: dist.prizePool.totalAmount,
            isDistributed: dist.prizePool.isDistributed,
            ...(dist.prizePool.distributionTxHash && {
              distributionTxHash: dist.prizePool.distributionTxHash,
            }),
          },
        }),
      );

      // Generate summary
      const summary = await this.generateDistributionSummary(filter);

      return {
        distributions: distributionEntries,
        total,
        hasMore: offset + distributions.length < total,
        summary,
      };
    } catch (error) {
      this.logger.error('Failed to get distribution history', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  /**
   * Generate distribution summary statistics
   */
  async generateDistributionSummary(
    filter: DistributionHistoryFilter = {},
  ): Promise<DistributionSummary> {
    const {
      hackathonId,
      status,
      recipientAddress,
      fromDate,
      toDate,
      minAmount,
      maxAmount,
    } = filter;

    try {
      // Build where clause for summary
      const where: Prisma.PrizeDistributionWhereInput = {};

      if (hackathonId) where.hackathonId = hackathonId;
      if (status && status.length > 0) where.status = { in: status };
      if (recipientAddress) where.recipientAddress = recipientAddress;

      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt.gte = fromDate;
        if (toDate) where.createdAt.lte = toDate;
      }

      if (minAmount) where.amount = { gte: minAmount };
      if (maxAmount) {
        if (where.amount && typeof where.amount === 'object') {
          (where.amount as any).lte = maxAmount;
        } else {
          where.amount = { lte: maxAmount };
        }
      }

      // Get aggregated statistics
      const [
        totalDistributions,
        statusCounts,
        uniqueRecipients,
        uniqueHackathons,
        avgDistributionTime,
        amounts,
      ] = await Promise.all([
        // Total distributions
        this.prisma.prizeDistribution.count({ where }),

        // Status breakdown
        this.prisma.prizeDistribution.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),

        // Unique recipients
        this.prisma.prizeDistribution
          .findMany({
            where,
            select: { recipientAddress: true },
            distinct: ['recipientAddress'],
          })
          .then((results) => results.length),

        // Unique hackathons
        this.prisma.prizeDistribution
          .findMany({
            where,
            select: { hackathonId: true },
            distinct: ['hackathonId'],
          })
          .then((results) => results.length),

        // Average distribution time for completed distributions
        this.prisma.prizeDistribution
          .findMany({
            where: {
              ...where,
              status: DistributionStatus.COMPLETED,
              executedAt: { not: null },
            },
            select: {
              createdAt: true,
              executedAt: true,
            },
          })
          .then((distributions) => {
            if (distributions.length === 0) return undefined;

            const totalMinutes = distributions.reduce((sum, dist) => {
              const timeDiff =
                dist.executedAt!.getTime() - dist.createdAt.getTime();
              return sum + timeDiff / (1000 * 60); // Convert to minutes
            }, 0);

            return totalMinutes / distributions.length;
          }),

        // Amount calculations
        this.prisma.prizeDistribution
          .findMany({
            where: {
              ...where,
              status: DistributionStatus.COMPLETED,
            },
            select: { amount: true },
          })
          .then((distributions) => {
            const totalAmount = distributions.reduce(
              (sum, dist) => (BigInt(sum) + BigInt(dist.amount)).toString(),
              '0',
            );
            return totalAmount;
          }),
      ]);

      // Calculate status counts
      const completedCount =
        statusCounts.find((s) => s.status === DistributionStatus.COMPLETED)
          ?._count.status || 0;
      const pendingCount =
        statusCounts.find((s) => s.status === DistributionStatus.PENDING)
          ?._count.status || 0;
      const failedCount =
        statusCounts.find((s) => s.status === DistributionStatus.FAILED)?._count
          .status || 0;

      const successRate =
        totalDistributions > 0
          ? (completedCount / totalDistributions) * 100
          : 0;

      return {
        totalDistributions,
        totalAmount: amounts,
        completedDistributions: completedCount,
        pendingDistributions: pendingCount,
        failedDistributions: failedCount,
        uniqueRecipients,
        uniqueHackathons,
        ...(avgDistributionTime && {
          averageDistributionTime: avgDistributionTime,
        }),
        successRate,
        ...(fromDate && { periodStart: fromDate }),
        ...(toDate && { periodEnd: toDate }),
      };
    } catch (error) {
      this.logger.error('Failed to generate distribution summary', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  /**
   * Get comprehensive hackathon distribution report
   */
  async getHackathonDistributionReport(
    hackathonId: string,
  ): Promise<HackathonDistributionReport> {
    try {
      // Get hackathon with all related data
      const hackathon = await this.prisma.hackathon.findUnique({
        where: { id: hackathonId },
        include: {
          prizePool: {
            include: {
              distributions: {
                orderBy: { position: 'asc' },
              },
              distributionTransactions: {
                orderBy: { submittedAt: 'desc' },
              },
            },
          },
        },
      });

      if (!hackathon) {
        throw new Error(`Hackathon ${hackathonId} not found`);
      }

      // Get audit trail
      const auditTrail =
        await this.auditService.getHackathonAuditTrail(hackathonId);

      // Calculate totals
      const totalDistributed =
        hackathon.prizePool?.distributions.reduce(
          (sum, dist) =>
            dist.status === DistributionStatus.COMPLETED
              ? (BigInt(sum) + BigInt(dist.amount)).toString()
              : sum,
          '0',
        ) || '0';

      // Map distributions
      const distributions =
        hackathon.prizePool?.distributions.map((dist) => ({
          position: dist.position,
          recipientAddress: dist.recipientAddress,
          amount: dist.amount,
          percentage: dist.percentage,
          status: dist.status,
          txHash: dist.txHash || undefined,
          executedAt: dist.executedAt || undefined,
          error: dist.error || undefined,
        })) || [];

      // Map audit trail
      const auditTrailMapped = auditTrail.map((entry) => ({
        timestamp: entry.timestamp,
        action: entry.action,
        triggeredBy: entry.triggeredBy,
        reason: entry.reason,
        userAddress: entry.userAddress || undefined,
      }));

      // Map transaction history
      const transactionHistory =
        hackathon.prizePool?.distributionTransactions.map((tx) => ({
          txHash: tx.txHash,
          status: tx.status,
          submittedAt: tx.submittedAt,
          confirmedAt: tx.confirmedAt || undefined,
          gasUsed: tx.gasUsed || undefined,
          retryCount: tx.retryCount,
        })) || [];

      // Find completion date
      const completedAt =
        hackathon.prizePool?.distributions.find((dist) => dist.executedAt)
          ?.executedAt || undefined;

      return {
        hackathonId,
        hackathonTitle: hackathon.title,
        organizerAddress: hackathon.organizerAddress,
        status: hackathon.status,
        totalPrizePool: hackathon.prizePool?.totalAmount || '0',
        totalDistributed,
        distributionCount: distributions.length,
        ...(completedAt && { completedAt }),
        ...(hackathon.prizePool?.distributionTxHash && {
          distributionTxHash: hackathon.prizePool.distributionTxHash,
        }),
        distributions: distributions.map((dist) => ({
          position: dist.position,
          recipientAddress: dist.recipientAddress,
          amount: dist.amount,
          percentage: dist.percentage,
          status: dist.status,
          ...(dist.txHash && { txHash: dist.txHash }),
          ...(dist.executedAt && { executedAt: dist.executedAt }),
          ...(dist.error && { error: dist.error }),
        })),
        auditTrail: auditTrailMapped.map((entry) => ({
          timestamp: entry.timestamp,
          action: entry.action.toString(),
          triggeredBy: entry.triggeredBy.toString(),
          reason: entry.reason,
          ...(entry.userAddress && { userAddress: entry.userAddress }),
        })),
        transactionHistory: transactionHistory.map((tx) => ({
          txHash: tx.txHash,
          status: tx.status,
          submittedAt: tx.submittedAt,
          retryCount: tx.retryCount,
          ...(tx.confirmedAt && { confirmedAt: tx.confirmedAt }),
          ...(tx.gasUsed && { gasUsed: tx.gasUsed }),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get hackathon distribution report for ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get recipient's distribution history across all hackathons
   */
  async getRecipientDistributionHistory(
    recipientAddress: string,
  ): Promise<RecipientDistributionHistory> {
    try {
      // Get all distributions for this recipient
      const distributions = await this.prisma.prizeDistribution.findMany({
        where: {
          recipientAddress,
          status: DistributionStatus.COMPLETED, // Only completed distributions
        },
        include: {
          prizePool: {
            include: {
              hackathon: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { executedAt: 'desc' },
      });

      if (distributions.length === 0) {
        return {
          recipientAddress,
          totalReceived: '0',
          distributionCount: 0,
          hackathonsWon: 0,
          averagePosition: 0,
          distributions: [],
          winningStreak: 0,
        };
      }

      // Calculate statistics
      const totalReceived = distributions.reduce(
        (sum, dist) => (BigInt(sum) + BigInt(dist.amount)).toString(),
        '0',
      );

      const hackathonsWon = new Set(distributions.map((d) => d.hackathonId))
        .size;
      const averagePosition =
        distributions.reduce((sum, dist) => sum + dist.position, 0) /
        distributions.length;

      // Calculate winning streak (consecutive hackathons with wins)
      const sortedByDate = [...distributions].sort(
        (a, b) =>
          (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0),
      );

      let winningStreak = 0;
      const winDates = sortedByDate.map((d) => d.executedAt?.toDateString());
      const uniqueWinDates = [...new Set(winDates)];

      for (const date of uniqueWinDates) {
        if (date) {
          winningStreak++;
        } else {
          break;
        }
      }

      // Map distribution data
      const distributionHistory = distributions.map((dist) => ({
        hackathonId: dist.hackathonId,
        hackathonTitle: dist.prizePool.hackathon.title,
        position: dist.position,
        amount: dist.amount,
        percentage: dist.percentage,
        status: dist.status,
        ...(dist.executedAt && { executedAt: dist.executedAt }),
        ...(dist.txHash && { txHash: dist.txHash }),
      }));

      const lastWin = distributions[0]?.executedAt || undefined;

      return {
        recipientAddress,
        totalReceived,
        distributionCount: distributions.length,
        hackathonsWon,
        averagePosition: Math.round(averagePosition * 100) / 100, // Round to 2 decimals
        distributions: distributionHistory,
        winningStreak,
        ...(lastWin && { lastWin }),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get recipient distribution history for ${recipientAddress}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Export distribution data to CSV format
   */
  async exportDistributionHistoryToCSV(
    filter: DistributionHistoryFilter = {},
  ): Promise<string> {
    try {
      const { distributions } = await this.getDistributionHistory({
        ...filter,
        limit: 10000, // Large limit for export
      });

      const headers = [
        'Distribution ID',
        'Hackathon ID',
        'Hackathon Title',
        'Organizer Address',
        'Recipient Address',
        'Position',
        'Amount (Wei)',
        'Percentage (Basis Points)',
        'Status',
        'Transaction Hash',
        'Block Number',
        'Executed At',
        'Created At',
        'Error',
        'Prize Pool Total',
        'Distribution TX Hash',
      ];

      const csvContent = [
        headers.join(','),
        ...distributions.map((dist) =>
          [
            dist.id,
            dist.hackathonId,
            `"${dist.hackathonTitle}"`, // Quote titles to handle commas
            dist.organizerAddress,
            dist.recipientAddress,
            dist.position,
            dist.amount,
            dist.percentage,
            dist.status,
            dist.txHash || '',
            dist.blockNumber || '',
            dist.executedAt?.toISOString() || '',
            dist.createdAt.toISOString(),
            dist.error ? `"${dist.error}"` : '',
            dist.prizePool.totalAmount,
            dist.prizePool.distributionTxHash || '',
          ].join(','),
        ),
      ].join('\n');

      return csvContent;
    } catch (error) {
      this.logger.error('Failed to export distribution history to CSV', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  /**
   * Get distribution statistics for dashboard
   */
  async getDistributionDashboardStats(): Promise<{
    today: DistributionSummary;
    thisWeek: DistributionSummary;
    thisMonth: DistributionSummary;
    allTime: DistributionSummary;
    recentDistributions: DistributionHistoryEntry[];
    topRecipients: Array<{
      address: string;
      totalReceived: string;
      winCount: number;
      averagePosition: number;
    }>;
  }> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const [today, thisWeek, thisMonth, allTime, recentDistributions] =
        await Promise.all([
          this.generateDistributionSummary({ fromDate: todayStart }),
          this.generateDistributionSummary({ fromDate: weekStart }),
          this.generateDistributionSummary({ fromDate: monthStart }),
          this.generateDistributionSummary(),
          this.getDistributionHistory({ limit: 10 }).then(
            (result) => result.distributions,
          ),
        ]);

      // Get top recipients (simplified implementation)
      const topRecipients: Array<{
        address: string;
        totalReceived: string;
        winCount: number;
        averagePosition: number;
      }> = [];

      return {
        today,
        thisWeek,
        thisMonth,
        allTime,
        recentDistributions,
        topRecipients,
      };
    } catch (error) {
      this.logger.error('Failed to get distribution dashboard stats', error);
      throw error;
    }
  }
}
