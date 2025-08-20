import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { PrizePoolService } from './prize-pool.service';
import { WinnerDeterminationService } from '../hackathon/winner-determination.service';
import { AuditService } from '../audit/audit.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import {
  HackathonStatus,
  DistributionStatus,
  AuditAction,
  TriggerType,
} from '@prisma/client';
import { parseEther } from 'viem';

export interface DistributionJob {
  hackathonId: string;
  hackathonTitle: string;
  totalPrizePool: string;
  scheduledAt: Date;
  status: 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  retryCount: number;
  lastError?: string;
}

export interface DistributionResult {
  hackathonId: string;
  success: boolean;
  distributionId?: number;
  txHash?: string;
  error?: string;
  winners: {
    position: number;
    walletAddress: string;
    amount: string;
    percentage: number;
  }[];
}

@Injectable()
export class AutomatedDistributionService {
  private readonly logger = new Logger(AutomatedDistributionService.name);
  private readonly distributionJobs = new Map<string, DistributionJob>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 30000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly prizePoolService: PrizePoolService,
    private readonly winnerDeterminationService: WinnerDeterminationService,
    private readonly auditService: AuditService,
    private readonly transactionMonitor: TransactionMonitorService,
  ) {}

  /**
   * Cron job that runs every 5 minutes to check for hackathons ready for distribution
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scanForCompletedHackathons() {
    this.logger.log('Scanning for hackathons ready for prize distribution...');

    try {
      // Find hackathons that just completed voting
      const completedHackathons = await this.prisma.hackathon.findMany({
        where: {
          status: HackathonStatus.COMPLETED,
          prizeAmount: { not: null },
          // Has prize pool but not yet distributed
          prizePool: {
            isDistributed: false,
            isDeposited: true, // Must have funds deposited
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

      this.logger.log(
        `Found ${completedHackathons.length} hackathons ready for distribution`,
      );

      for (const hackathon of completedHackathons) {
        await this.scheduleDistribution(hackathon.id);
      }
    } catch (error) {
      this.logger.error('Error scanning for completed hackathons:', error);
    }
  }

  /**
   * Schedule a distribution job for a hackathon
   */
  async scheduleDistribution(hackathonId: string): Promise<void> {
    this.logger.log(`Scheduling distribution for hackathon ${hackathonId}`);

    // Check if already scheduled
    if (this.distributionJobs.has(hackathonId)) {
      this.logger.log(
        `Distribution already scheduled for hackathon ${hackathonId}`,
      );
      return;
    }

    // Get hackathon details
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: { prizePool: true },
    });

    if (!hackathon) {
      this.logger.error(`Hackathon ${hackathonId} not found`);
      return;
    }

    if (!hackathon.prizePool) {
      this.logger.error(`No prize pool found for hackathon ${hackathonId}`);
      return;
    }

    // Validate balance before scheduling
    const isBalanceValid =
      await this.prizePoolService.validateBalanceForDistribution(hackathonId);
    if (!isBalanceValid) {
      this.logger.error(
        `Insufficient balance for distribution in hackathon ${hackathonId}`,
      );
      return;
    }

    // Create distribution job
    const job: DistributionJob = {
      hackathonId,
      hackathonTitle: hackathon.title,
      totalPrizePool: hackathon.prizePool.totalAmount,
      scheduledAt: new Date(),
      status: 'SCHEDULED',
      retryCount: 0,
    };

    this.distributionJobs.set(hackathonId, job);

    // Execute immediately (in background)
    this.executeDistribution(hackathonId).catch((error) => {
      this.logger.error(
        `Failed to execute distribution for ${hackathonId}:`,
        error,
      );
    });
  }

  /**
   * Execute prize distribution for a hackathon
   */
  async executeDistribution(hackathonId: string): Promise<DistributionResult> {
    const job = this.distributionJobs.get(hackathonId);
    if (!job) {
      throw new Error(`No distribution job found for hackathon ${hackathonId}`);
    }

    job.status = 'PROCESSING';
    this.logger.log(`Executing distribution for hackathon ${hackathonId}`);

    try {
      // 1. Calculate winners and prize distribution
      const winnerResults =
        await this.winnerDeterminationService.calculateWinners(hackathonId);

      if (winnerResults.winners.length === 0) {
        throw new Error('No winners found for distribution');
      }

      // 2. Create prize distributions in database
      const prizePool = await this.prisma.prizePool.findUnique({
        where: { hackathonId },
      });

      if (!prizePool) {
        throw new Error('Prize pool not found');
      }

      const distributions = await Promise.all(
        winnerResults.prizeDistribution.map(async (dist) => {
          if (!dist.winner) return null;

          return this.prisma.prizeDistribution.create({
            data: {
              prizePoolId: prizePool.id,
              hackathonId,
              recipientAddress: dist.winner.walletAddress,
              position: dist.position,
              amount: dist.amount,
              percentage: dist.percentage * 100, // Convert to basis points
              status: DistributionStatus.PENDING,
            },
          });
        }),
      );

      const validDistributions = distributions.filter(Boolean);

      // 3. Execute smart contract distribution
      const recipients = winnerResults.winners.map((w: any) => w.walletAddress);
      const amounts = winnerResults.prizeDistribution.map((p: any) => p.amount);

      const distributionResult =
        await this.transactionMonitor.submitDistributionTransaction(
          hackathonId,
          recipients,
          amounts,
          prizePool.id,
        );

      // 4. Update database records
      if (distributionResult.success && distributionResult.txHash) {
        // Update distribution statuses as pending (waiting for confirmation)
        await Promise.all(
          validDistributions.map(async (dist) => {
            if (dist) {
              await this.prisma.prizeDistribution.update({
                where: { id: dist.id },
                data: {
                  status: DistributionStatus.PENDING, // Still pending confirmation
                  ...(distributionResult.txHash && {
                    txHash: distributionResult.txHash,
                  }),
                },
              });
            }
          }),
        );

        // Update participant prize amounts
        await Promise.all(
          winnerResults.winners.map(async (winner: any) => {
            if (winner.prizeAmount && winner.rank && winner.walletAddress) {
              await this.prisma.participant.updateMany({
                where: {
                  hackathonId,
                  walletAddress: winner.walletAddress,
                },
                data: {
                  ...(winner.rank && { rank: winner.rank }),
                  ...(winner.prizeAmount && {
                    prizeAmount: winner.prizeAmount,
                  }),
                },
              });
            }
          }),
        );

        // Log audit trail for transaction submission
        await this.auditService.logStatusChange({
          hackathonId,
          action: AuditAction.AUTOMATIC_TRANSITION,
          fromStatus: HackathonStatus.COMPLETED,
          toStatus: HackathonStatus.COMPLETED,
          reason: `Prize distribution transaction submitted. Tx: ${distributionResult.txHash} (pending confirmation)`,
          triggeredBy: TriggerType.SYSTEM,
          metadata: {
            transactionHash: distributionResult.txHash,
            recipients: recipients.length,
            totalAmount: amounts.reduce(
              (sum, amount) => (BigInt(sum) + BigInt(amount)).toString(),
              '0',
            ),
          },
        });

        job.status = 'PROCESSING'; // Transaction submitted but not confirmed
        this.logger.log(
          `Distribution transaction submitted for hackathon ${hackathonId}: ${distributionResult.txHash}`,
        );
      } else {
        throw new Error(
          distributionResult.error || 'Transaction submission failed',
        );
      }

      const result: DistributionResult = {
        hackathonId,
        success: true,
        txHash: distributionResult.txHash,
        winners: winnerResults.prizeDistribution.map((dist) => ({
          position: dist.position,
          walletAddress: dist.winner?.walletAddress || '',
          amount: dist.amount,
          percentage: dist.percentage,
        })),
      };

      // Remove from job queue
      this.distributionJobs.delete(hackathonId);

      return result;
    } catch (error) {
      this.logger.error(
        `Distribution failed for hackathon ${hackathonId}:`,
        error,
      );

      job.status = 'FAILED';
      job.lastError = error instanceof Error ? error.message : String(error);
      job.retryCount++;

      // Schedule retry if under max attempts
      if (job.retryCount < this.MAX_RETRY_ATTEMPTS) {
        this.logger.log(
          `Scheduling retry ${job.retryCount}/${this.MAX_RETRY_ATTEMPTS} for hackathon ${hackathonId}`,
        );
        setTimeout(() => {
          this.executeDistribution(hackathonId).catch((retryError) => {
            this.logger.error(`Retry failed for ${hackathonId}:`, retryError);
          });
        }, this.RETRY_DELAY_MS * job.retryCount); // Exponential backoff
      } else {
        this.logger.error(
          `Max retry attempts reached for hackathon ${hackathonId}`,
        );
        // Remove from job queue after max retries
        this.distributionJobs.delete(hackathonId);
      }

      return {
        hackathonId,
        success: false,
        error: job.lastError,
        winners: [],
      };
    }
  }

  /**
   * Manual trigger for distribution (for testing or emergency use)
   */
  async manualDistribution(
    hackathonId: string,
    userAddress?: string,
  ): Promise<DistributionResult> {
    this.logger.log(
      `Manual distribution triggered for hackathon ${hackathonId} by ${userAddress}`,
    );

    // Validate hackathon status
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: { prizePool: true },
    });

    if (!hackathon) {
      throw new Error(`Hackathon ${hackathonId} not found`);
    }

    if (hackathon.status !== HackathonStatus.COMPLETED) {
      throw new Error(
        `Hackathon must be completed for distribution. Current status: ${hackathon.status}`,
      );
    }

    if (!hackathon.prizePool?.isDeposited) {
      throw new Error('Prize pool must be deposited before distribution');
    }

    if (hackathon.prizePool?.isDistributed) {
      throw new Error('Prize pool has already been distributed');
    }

    // Log manual trigger
    if (userAddress) {
      await this.auditService.logManualOverride(
        hackathonId,
        HackathonStatus.COMPLETED,
        HackathonStatus.COMPLETED,
        `Manual prize distribution triggered by ${userAddress}`,
        userAddress,
      );
    }

    // Execute distribution
    return this.executeDistribution(hackathonId);
  }

  /**
   * Get distribution job status
   */
  getDistributionStatus(hackathonId: string): DistributionJob | null {
    return this.distributionJobs.get(hackathonId) || null;
  }

  /**
   * Get all active distribution jobs
   */
  getAllDistributionJobs(): DistributionJob[] {
    return Array.from(this.distributionJobs.values());
  }

  /**
   * Cancel a scheduled distribution
   */
  async cancelDistribution(
    hackathonId: string,
    userAddress?: string,
  ): Promise<boolean> {
    const job = this.distributionJobs.get(hackathonId);

    if (!job) {
      return false;
    }

    if (job.status === 'PROCESSING') {
      throw new Error(
        'Cannot cancel distribution that is currently processing',
      );
    }

    this.distributionJobs.delete(hackathonId);

    if (userAddress) {
      await this.auditService.logManualOverride(
        hackathonId,
        HackathonStatus.COMPLETED,
        HackathonStatus.COMPLETED,
        `Distribution cancelled by ${userAddress}`,
        userAddress,
      );
    }

    this.logger.log(`Distribution cancelled for hackathon ${hackathonId}`);
    return true;
  }
}
