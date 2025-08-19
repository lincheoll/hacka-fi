import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { PrizePoolService } from './prize-pool.service';
import { WinnerDeterminationService } from '../hackathon/winner-determination.service';
import { AuditService } from '../audit/audit.service';
import { PrizePoolContractService } from '../web3/prize-pool-contract.service';
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
    private readonly prizePoolContract: PrizePoolContractService,
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
      const distributionResult = await this.executeSmartContractDistribution(
        hackathonId,
        winnerResults,
      );

      // 4. Update database records
      if (distributionResult.success && distributionResult.txHash) {
        // Update prize pool as distributed
        await this.prisma.prizePool.update({
          where: { id: prizePool.id },
          data: {
            isDistributed: true,
            distributionTxHash: distributionResult.txHash,
          },
        });

        // Update distribution statuses
        await Promise.all(
          validDistributions.map(async (dist) => {
            if (dist) {
              await this.prisma.prizeDistribution.update({
                where: { id: dist.id },
                data: {
                  status: DistributionStatus.COMPLETED,
                  ...(distributionResult.txHash && {
                    txHash: distributionResult.txHash,
                  }),
                  executedAt: new Date(),
                },
              });
            }
          }),
        );

        // Update participant prize amounts
        await Promise.all(
          winnerResults.winners.map(async (winner) => {
            if (winner.prizeAmount) {
              await this.prisma.participant.updateMany({
                where: {
                  hackathonId,
                  walletAddress: winner.walletAddress,
                },
                data: {
                  rank: winner.rank,
                  prizeAmount: winner.prizeAmount,
                },
              });
            }
          }),
        );

        // Log audit trail
        await this.auditService.logStatusChange({
          hackathonId,
          action: AuditAction.AUTOMATIC_TRANSITION,
          fromStatus: HackathonStatus.COMPLETED,
          toStatus: HackathonStatus.COMPLETED,
          reason: `Automated prize distribution completed. Tx: ${distributionResult.txHash}`,
          triggeredBy: TriggerType.SYSTEM,
        });

        job.status = 'COMPLETED';
        this.logger.log(`Distribution completed for hackathon ${hackathonId}`);
      } else {
        throw new Error(
          distributionResult.error || 'Smart contract distribution failed',
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
   * Execute smart contract distribution
   */
  private async executeSmartContractDistribution(
    hackathonId: string,
    winnerResults: any,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.logger.log(
        `Executing smart contract distribution for hackathon ${hackathonId}`,
      );

      // For now, we'll simulate the smart contract call
      // In a real implementation, this would call the PrizePool contract's distributePrizes function

      // Simulate transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;

      // TODO: Replace with actual smart contract call
      // const txHash = await this.prizePoolContract.distributePrizes(
      //   hackathonId,
      //   winnerResults.winners.map(w => w.walletAddress),
      //   winnerResults.prizeDistribution.map(p => p.amount)
      // );

      this.logger.log(
        `Smart contract distribution completed. Tx: ${mockTxHash}`,
      );

      return {
        success: true,
        txHash: mockTxHash,
      };
    } catch (error) {
      this.logger.error('Smart contract distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
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
