import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AutomatedDistributionService } from './automated-distribution.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import { AuditService } from '../audit/audit.service';
import {
  HackathonStatus,
  DistributionStatus,
  AuditAction,
  TriggerType,
} from '@prisma/client';

export interface EmergencyStopResult {
  success: boolean;
  stoppedTransactions: number;
  message: string;
  error?: string;
}

export interface ManualDistributionTriggerResult {
  success: boolean;
  distributionId?: string;
  txHash?: string;
  message: string;
  error?: string;
}

export interface DistributionCancellationResult {
  success: boolean;
  cancelledDistributions: number;
  refundRequired: boolean;
  message: string;
  error?: string;
}

export interface SystemStatusOverride {
  hackathonId: string;
  fromStatus: HackathonStatus;
  toStatus: HackathonStatus;
  reason: string;
  bypassValidation?: boolean;
  adminAddress: string;
}

@Injectable()
export class EmergencyControlsService {
  private readonly logger = new Logger(EmergencyControlsService.name);
  private emergencyStopActive = false;
  private readonly emergencyStopReasons = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly automatedDistribution: AutomatedDistributionService,
    private readonly transactionMonitor: TransactionMonitorService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Emergency stop - immediately halt all automated distribution activities
   */
  async activateEmergencyStop(
    reason: string,
    adminAddress: string,
  ): Promise<EmergencyStopResult> {
    this.logger.error(`Emergency stop activated by ${adminAddress}: ${reason}`);

    try {
      // Set emergency stop flag
      this.emergencyStopActive = true;
      this.emergencyStopReasons.set(adminAddress, reason);

      // Get all active distribution jobs
      const activeJobs = this.automatedDistribution.getAllDistributionJobs();
      let stoppedCount = 0;

      // Cancel all scheduled distributions
      for (const job of activeJobs) {
        if (job.status === 'SCHEDULED' || job.status === 'PROCESSING') {
          try {
            await this.automatedDistribution.cancelDistribution(
              job.hackathonId,
              adminAddress,
            );
            stoppedCount++;
          } catch (error) {
            this.logger.error(
              `Failed to cancel distribution for hackathon ${job.hackathonId}:`,
              error,
            );
          }
        }
      }

      // Mark all pending distributions as emergency stopped
      const updateResult = await this.prisma.prizeDistribution.updateMany({
        where: {
          status: DistributionStatus.PENDING,
        },
        data: {
          status: DistributionStatus.CANCELLED,
          error: `Emergency stop: ${reason}`,
        },
      });

      // Log emergency action
      await this.auditService.logStatusChange({
        hackathonId: 'SYSTEM',
        action: AuditAction.MANUAL_OVERRIDE,
        fromStatus: HackathonStatus.COMPLETED,
        toStatus: HackathonStatus.COMPLETED,
        reason: `EMERGENCY STOP: ${reason}`,
        triggeredBy: TriggerType.ADMIN,
        userAddress: adminAddress,
        metadata: {
          stoppedJobs: stoppedCount,
          cancelledDistributions: updateResult.count,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        stoppedTransactions: stoppedCount + updateResult.count,
        message: `Emergency stop activated. Stopped ${stoppedCount} active jobs and cancelled ${updateResult.count} pending distributions.`,
      };
    } catch (error) {
      this.logger.error('Failed to activate emergency stop:', error);
      return {
        success: false,
        stoppedTransactions: 0,
        message: 'Failed to activate emergency stop',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deactivate emergency stop and resume normal operations
   */
  async deactivateEmergencyStop(
    adminAddress: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Emergency stop deactivated by ${adminAddress}`);

    try {
      this.emergencyStopActive = false;
      this.emergencyStopReasons.clear();

      // Log deactivation
      await this.auditService.logStatusChange({
        hackathonId: 'SYSTEM',
        action: AuditAction.MANUAL_OVERRIDE,
        fromStatus: HackathonStatus.COMPLETED,
        toStatus: HackathonStatus.COMPLETED,
        reason: 'Emergency stop deactivated - normal operations resumed',
        triggeredBy: TriggerType.ADMIN,
        userAddress: adminAddress,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        message: 'Emergency stop deactivated. Normal operations resumed.',
      };
    } catch (error) {
      this.logger.error('Failed to deactivate emergency stop:', error);
      return {
        success: false,
        message: 'Failed to deactivate emergency stop',
      };
    }
  }

  /**
   * Check if emergency stop is currently active
   */
  isEmergencyStopActive(): boolean {
    return this.emergencyStopActive;
  }

  /**
   * Get emergency stop status and reasons
   */
  getEmergencyStopStatus(): {
    active: boolean;
    reasons: Array<{ admin: string; reason: string }>;
  } {
    return {
      active: this.emergencyStopActive,
      reasons: Array.from(this.emergencyStopReasons.entries()).map(
        ([admin, reason]) => ({ admin, reason }),
      ),
    };
  }

  /**
   * Manually trigger distribution for a specific hackathon (bypass automation)
   */
  async manualDistributionTrigger(
    hackathonId: string,
    adminAddress: string,
    reason: string,
    bypassChecks = false,
  ): Promise<ManualDistributionTriggerResult> {
    this.logger.log(
      `Manual distribution triggered for hackathon ${hackathonId} by ${adminAddress}`,
    );

    try {
      // Validate hackathon exists and is eligible
      const hackathon = await this.prisma.hackathon.findUnique({
        where: { id: hackathonId },
        include: { prizePool: true },
      });

      if (!hackathon) {
        throw new BadRequestException('Hackathon not found');
      }

      if (!bypassChecks) {
        if (hackathon.status !== HackathonStatus.COMPLETED) {
          throw new BadRequestException(
            'Hackathon must be completed for distribution',
          );
        }

        if (!hackathon.prizePool?.isDeposited) {
          throw new BadRequestException('Prize pool not deposited');
        }

        if (hackathon.prizePool?.isDistributed) {
          throw new BadRequestException('Prize pool already distributed');
        }
      }

      // Log manual trigger
      await this.auditService.logManualOverride(
        hackathonId,
        hackathon.status,
        hackathon.status,
        `Manual distribution triggered: ${reason}`,
        adminAddress,
      );

      // Execute distribution
      const distributionResult =
        await this.automatedDistribution.manualDistribution(
          hackathonId,
          adminAddress,
        );

      if (distributionResult.success) {
        return {
          success: true,
          distributionId: hackathonId,
          ...(distributionResult.txHash && {
            txHash: distributionResult.txHash,
          }),
          message: `Distribution successfully triggered for hackathon ${hackathonId}`,
        };
      } else {
        return {
          success: false,
          message: 'Distribution trigger failed',
          ...(distributionResult.error && { error: distributionResult.error }),
        };
      }
    } catch (error) {
      this.logger.error(
        `Manual distribution trigger failed for hackathon ${hackathonId}:`,
        error,
      );
      return {
        success: false,
        message: 'Manual distribution trigger failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cancel ongoing distribution and optionally refund
   */
  async cancelDistribution(
    hackathonId: string,
    adminAddress: string,
    reason: string,
    refundPrizePool = false,
  ): Promise<DistributionCancellationResult> {
    this.logger.log(
      `Distribution cancellation requested for hackathon ${hackathonId} by ${adminAddress}`,
    );

    try {
      // Get current distribution status
      const prizePool = await this.prisma.prizePool.findUnique({
        where: { hackathonId },
        include: { distributions: true },
      });

      if (!prizePool) {
        throw new BadRequestException('Prize pool not found');
      }

      if (prizePool.isDistributed) {
        throw new BadRequestException(
          'Cannot cancel distribution that has already been completed',
        );
      }

      // Cancel any scheduled distribution jobs
      const cancelled = await this.automatedDistribution.cancelDistribution(
        hackathonId,
        adminAddress,
      );

      // Cancel all pending distributions
      const cancelResult = await this.prisma.prizeDistribution.updateMany({
        where: {
          hackathonId,
          status: {
            in: [DistributionStatus.PENDING, DistributionStatus.PROCESSING],
          },
        },
        data: {
          status: DistributionStatus.CANCELLED,
          error: `Distribution cancelled by admin: ${reason}`,
        },
      });

      // Handle refund if requested
      if (refundPrizePool && prizePool.isDeposited) {
        // Mark prize pool as requiring refund
        await this.prisma.prizePool.update({
          where: { hackathonId },
          data: {
            isDeposited: false,
            // Note: Actual refund transaction would be handled separately
          },
        });
      }

      // Log cancellation
      await this.auditService.logManualOverride(
        hackathonId,
        HackathonStatus.COMPLETED,
        HackathonStatus.COMPLETED,
        `Distribution cancelled: ${reason}${refundPrizePool ? ' (with refund)' : ''}`,
        adminAddress,
      );

      return {
        success: true,
        cancelledDistributions: cancelResult.count,
        refundRequired: refundPrizePool,
        message: `Successfully cancelled distribution for hackathon ${hackathonId}. ${cancelResult.count} distributions cancelled.${refundPrizePool ? ' Refund initiated.' : ''}`,
      };
    } catch (error) {
      this.logger.error(
        `Distribution cancellation failed for hackathon ${hackathonId}:`,
        error,
      );
      return {
        success: false,
        cancelledDistributions: 0,
        refundRequired: false,
        message: 'Distribution cancellation failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Override hackathon status manually (dangerous operation)
   */
  async overrideHackathonStatus(
    override: SystemStatusOverride,
  ): Promise<{ success: boolean; message: string; error?: string }> {
    this.logger.warn(
      `Status override requested for hackathon ${override.hackathonId}: ${override.fromStatus} -> ${override.toStatus}`,
    );

    try {
      // Validate hackathon exists
      const hackathon = await this.prisma.hackathon.findUnique({
        where: { id: override.hackathonId },
      });

      if (!hackathon) {
        throw new BadRequestException('Hackathon not found');
      }

      // Validate current status matches
      if (
        !(override.bypassValidation || false) &&
        hackathon.status !== override.fromStatus
      ) {
        throw new BadRequestException(
          `Current status (${hackathon.status}) does not match expected status (${override.fromStatus})`,
        );
      }

      // Update status
      await this.prisma.hackathon.update({
        where: { id: override.hackathonId },
        data: { status: override.toStatus },
      });

      // Log override
      await this.auditService.logManualOverride(
        override.hackathonId,
        override.fromStatus,
        override.toStatus,
        `Status override: ${override.reason}`,
        override.adminAddress,
      );

      return {
        success: true,
        message: `Status successfully overridden from ${override.fromStatus} to ${override.toStatus}`,
      };
    } catch (error) {
      this.logger.error(
        `Status override failed for hackathon ${override.hackathonId}:`,
        error,
      );
      return {
        success: false,
        message: 'Status override failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get system health and emergency status
   */
  async getSystemHealthStatus(): Promise<{
    emergencyStop: boolean;
    activeDistributions: number;
    pendingTransactions: number;
    failedTransactions: number;
    systemLoad: {
      distributionJobsInQueue: number;
      transactionsBeingMonitored: number;
    };
    alerts: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      timestamp: Date;
    }>;
  }> {
    try {
      // Get active distribution jobs
      const activeJobs = this.automatedDistribution.getAllDistributionJobs();
      const activeCount = activeJobs.filter(
        (job) => job.status === 'PROCESSING' || job.status === 'SCHEDULED',
      ).length;

      // Get transaction monitoring stats
      const monitoringStats =
        await this.transactionMonitor.getMonitoringStats();

      // Count failed transactions in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const failedTransactions =
        await this.prisma.distributionTransaction.count({
          where: {
            status: DistributionStatus.FAILED,
            submittedAt: { gte: yesterday },
          },
        });

      // Generate alerts based on system metrics
      const alerts: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        timestamp: Date;
      }> = [];

      if (this.emergencyStopActive) {
        alerts.push({
          severity: 'critical',
          message: 'Emergency stop is active - all distributions halted',
          timestamp: new Date(),
        });
      }

      if (monitoringStats.successRate < 90) {
        alerts.push({
          severity: 'high',
          message: `Low success rate: ${monitoringStats.successRate.toFixed(2)}%`,
          timestamp: new Date(),
        });
      }

      if (failedTransactions > 5) {
        alerts.push({
          severity: 'medium',
          message: `High number of failed transactions in last 24h: ${failedTransactions}`,
          timestamp: new Date(),
        });
      }

      if (monitoringStats.pendingCount > 10) {
        alerts.push({
          severity: 'medium',
          message: `Large number of pending transactions: ${monitoringStats.pendingCount}`,
          timestamp: new Date(),
        });
      }

      return {
        emergencyStop: this.emergencyStopActive,
        activeDistributions: activeCount,
        pendingTransactions: monitoringStats.pendingCount,
        failedTransactions,
        systemLoad: {
          distributionJobsInQueue: activeJobs.length,
          transactionsBeingMonitored: monitoringStats.pendingCount,
        },
        alerts,
      };
    } catch (error) {
      this.logger.error('Failed to get system health status:', error);
      return {
        emergencyStop: this.emergencyStopActive,
        activeDistributions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        systemLoad: {
          distributionJobsInQueue: 0,
          transactionsBeingMonitored: 0,
        },
        alerts: [
          {
            severity: 'critical',
            message: 'Failed to retrieve system health status',
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  /**
   * Force retry a failed distribution with custom parameters
   */
  async forceRetryDistribution(
    hackathonId: string,
    adminAddress: string,
    customGasPrice?: string,
    customGasLimit?: string,
  ): Promise<ManualDistributionTriggerResult> {
    this.logger.log(
      `Force retry distribution for hackathon ${hackathonId} by ${adminAddress}`,
    );

    try {
      // Log retry attempt
      await this.auditService.logManualOverride(
        hackathonId,
        HackathonStatus.COMPLETED,
        HackathonStatus.COMPLETED,
        `Force retry distribution with custom gas settings${customGasPrice ? ` (gas price: ${customGasPrice})` : ''}${customGasLimit ? ` (gas limit: ${customGasLimit})` : ''}`,
        adminAddress,
      );

      // Reset any failed distributions to pending
      await this.prisma.prizeDistribution.updateMany({
        where: {
          hackathonId,
          status: DistributionStatus.FAILED,
        },
        data: {
          status: DistributionStatus.PENDING,
          error: null,
        },
      });

      // Trigger manual distribution
      const result = await this.manualDistributionTrigger(
        hackathonId,
        adminAddress,
        'Force retry with custom gas settings',
        true, // bypass checks
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Force retry failed for hackathon ${hackathonId}:`,
        error,
      );
      return {
        success: false,
        message: 'Force retry failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
