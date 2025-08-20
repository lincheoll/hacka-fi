import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { PrizePoolContractService } from '../web3/prize-pool-contract.service';
import { AuditService } from '../audit/audit.service';
import {
  DistributionStatus,
  TriggerType,
  HackathonStatus,
  AuditAction,
} from '@prisma/client';
import { createPublicClient, http, parseEther } from 'viem';
import { mainnet } from 'viem/chains';

export interface TransactionDetails {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  blockNumber?: bigint;
  blockHash?: string;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  timestamp?: Date;
  confirmations: number;
  error?: string;
}

export interface MonitoringConfig {
  confirmationBlocks: number;
  timeoutMinutes: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
  gasLimitMultiplier: number;
}

export interface DistributionTransaction {
  id: number;
  hackathonId: string;
  txHash: string;
  status: DistributionStatus;
  submittedAt: Date;
  confirmedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  gasPrice?: string;
  gasLimit?: string;
  gasUsed?: string;
  blockNumber?: string;
  error?: string;
  recipients: string[];
  amounts: string[];
  totalAmount: string;
}

@Injectable()
export class TransactionMonitorService implements OnModuleInit {
  private readonly logger = new Logger(TransactionMonitorService.name);
  private readonly publicClient;
  private readonly config: MonitoringConfig = {
    confirmationBlocks: 12, // Wait for 12 confirmations
    timeoutMinutes: 30, // Timeout after 30 minutes
    maxRetryAttempts: 3,
    retryDelayMs: 60000, // 1 minute delay between retries
    gasLimitMultiplier: 1.2, // 20% buffer on gas limit
  };

  private readonly pendingTransactions = new Map<
    string,
    DistributionTransaction
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly prizePoolContract: PrizePoolContractService,
    private readonly auditService: AuditService,
  ) {
    // Initialize viem client for transaction monitoring
    this.publicClient = createPublicClient({
      chain: mainnet, // Use appropriate chain for your deployment
      transport: http(),
    });
  }

  /**
   * Initialize monitoring when module starts
   */
  async onModuleInit() {
    await this.initializeMonitoring();
  }

  /**
   * Submit a distribution transaction to the blockchain
   */
  async submitDistributionTransaction(
    hackathonId: string,
    recipients: string[],
    amounts: string[],
    prizePoolId: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    this.logger.log(
      `Submitting distribution transaction for hackathon ${hackathonId}`,
    );

    try {
      // Validate inputs
      if (recipients.length !== amounts.length) {
        throw new Error(
          'Recipients and amounts arrays must have the same length',
        );
      }

      if (recipients.length === 0) {
        throw new Error('No recipients provided for distribution');
      }

      // Calculate total amount
      const totalAmount = amounts.reduce((sum, amount) => {
        return (BigInt(sum) + BigInt(amount)).toString();
      }, '0');

      // Get current gas price with buffer
      const gasPrice = await this.estimateOptimalGasPrice();

      // Estimate gas limit
      const gasLimit = await this.estimateGasLimit(recipients, amounts);

      // Submit transaction to smart contract
      const txResult = await this.prizePoolContract.distributePrizes(
        hackathonId,
        recipients,
        amounts,
        {
          gasPrice: gasPrice.toString(),
          gasLimit: gasLimit.toString(),
        },
      );

      if (!txResult.success || !txResult.txHash) {
        throw new Error(txResult.error || 'Transaction submission failed');
      }

      // Create transaction record in database
      const distributionTx = await this.prisma.distributionTransaction.create({
        data: {
          hackathonId,
          txHash: txResult.txHash,
          status: DistributionStatus.PENDING,
          submittedAt: new Date(),
          retryCount: 0,
          gasPrice: gasPrice.toString(),
          gasLimit: gasLimit.toString(),
          recipients: recipients,
          amounts: amounts,
          totalAmount,
          prizePoolId,
        },
      });

      // Add to monitoring queue
      this.pendingTransactions.set(txResult.txHash, {
        id: distributionTx.id,
        hackathonId,
        txHash: txResult.txHash,
        status: DistributionStatus.PENDING,
        submittedAt: new Date(),
        retryCount: 0,
        recipients,
        amounts,
        totalAmount,
      });

      this.logger.log(
        `Transaction submitted: ${txResult.txHash} for hackathon ${hackathonId}`,
      );

      return {
        success: true,
        txHash: txResult.txHash,
      };
    } catch (error) {
      this.logger.error(
        `Failed to submit distribution transaction for hackathon ${hackathonId}:`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Monitor pending transactions every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorPendingTransactions() {
    if (this.pendingTransactions.size === 0) {
      return;
    }

    this.logger.log(
      `Monitoring ${this.pendingTransactions.size} pending transactions`,
    );

    for (const [txHash, distributionTx] of this.pendingTransactions.entries()) {
      try {
        await this.checkTransactionStatus(txHash);
      } catch (error) {
        this.logger.error(`Error monitoring transaction ${txHash}:`, error);
      }
    }
  }

  /**
   * Check the status of a specific transaction
   */
  async checkTransactionStatus(txHash: string): Promise<TransactionDetails> {
    const distributionTx = this.pendingTransactions.get(txHash);
    if (!distributionTx) {
      throw new Error(`Transaction ${txHash} not found in monitoring queue`);
    }

    try {
      // Get transaction receipt
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt) {
        // Transaction not yet mined, check for timeout
        const timeElapsed = Date.now() - distributionTx.submittedAt.getTime();
        const timeoutMs = this.config.timeoutMinutes * 60 * 1000;

        if (timeElapsed > timeoutMs) {
          await this.handleTransactionTimeout(txHash);
          return {
            hash: txHash,
            status: 'timeout',
            confirmations: 0,
            error: 'Transaction timeout',
          };
        }

        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0,
        };
      }

      // Get current block number for confirmation count
      const currentBlock = await this.publicClient.getBlockNumber();
      const confirmations = Number(currentBlock - receipt.blockNumber);

      // Transaction details
      const transactionDetails: TransactionDetails = {
        hash: txHash,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        confirmations,
        timestamp: new Date(),
      };

      if (receipt.status === 'success') {
        if (confirmations >= this.config.confirmationBlocks) {
          // Transaction is confirmed
          await this.handleTransactionSuccess(txHash, transactionDetails);
        }
        // Still waiting for more confirmations
      } else {
        // Transaction failed
        await this.handleTransactionFailure(txHash, transactionDetails);
      }

      return transactionDetails;
    } catch (error) {
      this.logger.error(
        `Error checking transaction status for ${txHash}:`,
        error,
      );

      return {
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle successful transaction confirmation
   */
  private async handleTransactionSuccess(
    txHash: string,
    details: TransactionDetails,
  ): Promise<void> {
    const distributionTx = this.pendingTransactions.get(txHash);
    if (!distributionTx) return;

    this.logger.log(
      `Transaction confirmed: ${txHash} for hackathon ${distributionTx.hackathonId}`,
    );

    try {
      // Update database record
      await this.prisma.distributionTransaction.update({
        where: { id: distributionTx.id },
        data: {
          status: DistributionStatus.COMPLETED,
          confirmedAt: new Date(),
          ...(details.blockNumber && {
            blockNumber: details.blockNumber.toString(),
          }),
          ...(details.gasUsed && { gasUsed: details.gasUsed.toString() }),
        },
      });

      // Update prize pool as distributed
      await this.prisma.prizePool.update({
        where: { hackathonId: distributionTx.hackathonId },
        data: {
          isDistributed: true,
          distributionTxHash: txHash,
        },
      });

      // Update all related prize distributions
      await this.prisma.prizeDistribution.updateMany({
        where: {
          hackathonId: distributionTx.hackathonId,
          txHash: null,
        },
        data: {
          status: DistributionStatus.COMPLETED,
          txHash: txHash,
          executedAt: new Date(),
        },
      });

      // Log audit trail
      await this.auditService.logStatusChange({
        hackathonId: distributionTx.hackathonId,
        action: AuditAction.AUTOMATIC_TRANSITION,
        fromStatus: HackathonStatus.COMPLETED,
        toStatus: HackathonStatus.COMPLETED,
        reason: `Prize distribution confirmed on blockchain. Block: ${details.blockNumber}, Gas used: ${details.gasUsed}`,
        triggeredBy: TriggerType.SYSTEM,
        metadata: {
          txHash,
          blockNumber: details.blockNumber?.toString(),
          gasUsed: details.gasUsed?.toString(),
          confirmations: details.confirmations,
        },
      });

      // Remove from monitoring queue
      this.pendingTransactions.delete(txHash);
    } catch (error) {
      this.logger.error(
        `Error handling transaction success for ${txHash}:`,
        error,
      );
    }
  }

  /**
   * Handle transaction failure
   */
  private async handleTransactionFailure(
    txHash: string,
    details: TransactionDetails,
  ): Promise<void> {
    const distributionTx = this.pendingTransactions.get(txHash);
    if (!distributionTx) return;

    this.logger.error(
      `Transaction failed: ${txHash} for hackathon ${distributionTx.hackathonId}`,
    );

    try {
      // Update database record
      await this.prisma.distributionTransaction.update({
        where: { id: distributionTx.id },
        data: {
          status: DistributionStatus.FAILED,
          failedAt: new Date(),
          error: details.error || 'Transaction failed on blockchain',
          ...(details.blockNumber && {
            blockNumber: details.blockNumber.toString(),
          }),
          ...(details.gasUsed && { gasUsed: details.gasUsed.toString() }),
        },
      });

      // Check if we should retry
      if (distributionTx.retryCount < this.config.maxRetryAttempts) {
        await this.scheduleRetryTransaction(distributionTx);
      } else {
        // Max retries reached, mark distributions as failed
        await this.prisma.prizeDistribution.updateMany({
          where: {
            hackathonId: distributionTx.hackathonId,
            status: DistributionStatus.PENDING,
          },
          data: {
            status: DistributionStatus.FAILED,
            error: `Transaction failed after ${this.config.maxRetryAttempts} attempts`,
          },
        });

        // Log final failure
        await this.auditService.logStatusChange({
          hackathonId: distributionTx.hackathonId,
          action: AuditAction.AUTOMATIC_TRANSITION,
          fromStatus: HackathonStatus.COMPLETED,
          toStatus: HackathonStatus.COMPLETED,
          reason: `Prize distribution failed after ${this.config.maxRetryAttempts} retry attempts`,
          triggeredBy: TriggerType.SYSTEM,
          metadata: {
            originalTxHash: txHash,
            error: details.error,
            retryCount: distributionTx.retryCount,
          },
        });
      }

      // Remove from monitoring queue
      this.pendingTransactions.delete(txHash);
    } catch (error) {
      this.logger.error(
        `Error handling transaction failure for ${txHash}:`,
        error,
      );
    }
  }

  /**
   * Handle transaction timeout
   */
  private async handleTransactionTimeout(txHash: string): Promise<void> {
    const distributionTx = this.pendingTransactions.get(txHash);
    if (!distributionTx) return;

    this.logger.warn(
      `Transaction timeout: ${txHash} for hackathon ${distributionTx.hackathonId}`,
    );

    try {
      // Update database record
      await this.prisma.distributionTransaction.update({
        where: { id: distributionTx.id },
        data: {
          status: DistributionStatus.FAILED,
          failedAt: new Date(),
          error: `Transaction timeout after ${this.config.timeoutMinutes} minutes`,
        },
      });

      // Schedule retry if under max attempts
      if (distributionTx.retryCount < this.config.maxRetryAttempts) {
        await this.scheduleRetryTransaction(distributionTx);
      }

      // Remove from monitoring queue
      this.pendingTransactions.delete(txHash);
    } catch (error) {
      this.logger.error(
        `Error handling transaction timeout for ${txHash}:`,
        error,
      );
    }
  }

  /**
   * Schedule a retry for a failed transaction
   */
  private async scheduleRetryTransaction(
    distributionTx: DistributionTransaction,
  ): Promise<void> {
    const retryDelay =
      this.config.retryDelayMs * (distributionTx.retryCount + 1); // Exponential backoff

    this.logger.log(
      `Scheduling retry ${distributionTx.retryCount + 1}/${this.config.maxRetryAttempts} for hackathon ${distributionTx.hackathonId} in ${retryDelay}ms`,
    );

    setTimeout(async () => {
      try {
        const retryResult = await this.submitDistributionTransaction(
          distributionTx.hackathonId,
          distributionTx.recipients,
          distributionTx.amounts,
          distributionTx.id,
        );

        if (retryResult.success && retryResult.txHash) {
          // Update retry count for the new transaction
          const newTx = this.pendingTransactions.get(retryResult.txHash);
          if (newTx) {
            newTx.retryCount = distributionTx.retryCount + 1;
          }
        }
      } catch (error) {
        this.logger.error(
          `Retry failed for hackathon ${distributionTx.hackathonId}:`,
          error,
        );
      }
    }, retryDelay);
  }

  /**
   * Estimate optimal gas price
   */
  private async estimateOptimalGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.publicClient.getGasPrice();
      // Add 10% buffer to ensure transaction gets mined
      return gasPrice + (gasPrice * BigInt(10)) / BigInt(100);
    } catch (error) {
      this.logger.error('Error estimating gas price:', error);
      // Fallback to 20 gwei
      return parseEther('0.00000002'); // 20 gwei
    }
  }

  /**
   * Estimate gas limit for distribution transaction
   */
  private async estimateGasLimit(
    recipients: string[],
    amounts: string[],
  ): Promise<bigint> {
    try {
      const estimatedGas = await this.prizePoolContract.estimateDistributionGas(
        recipients,
        amounts,
      );

      // Apply multiplier for safety
      return BigInt(
        Math.floor(Number(estimatedGas) * this.config.gasLimitMultiplier),
      );
    } catch (error) {
      this.logger.error('Error estimating gas limit:', error);
      // Fallback based on recipient count
      const baseGas = 100000n; // Base gas
      const perRecipientGas = 50000n; // Gas per recipient
      return baseGas + perRecipientGas * BigInt(recipients.length);
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(
    txHash: string,
  ): Promise<DistributionTransaction | null> {
    try {
      const tx = await this.prisma.distributionTransaction.findUnique({
        where: { txHash },
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

      return tx ? this.mapToDistributionTransaction(tx) : null;
    } catch (error) {
      this.logger.error(
        `Error getting transaction details for ${txHash}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all transactions for a hackathon
   */
  async getHackathonTransactions(
    hackathonId: string,
  ): Promise<DistributionTransaction[]> {
    try {
      const transactions = await this.prisma.distributionTransaction.findMany({
        where: { hackathonId },
        orderBy: { submittedAt: 'desc' },
      });

      return transactions.map((tx) => this.mapToDistributionTransaction(tx));
    } catch (error) {
      this.logger.error(
        `Error getting transactions for hackathon ${hackathonId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get transaction monitoring statistics
   */
  async getMonitoringStats(): Promise<{
    pendingCount: number;
    totalTransactions: number;
    successRate: number;
    averageConfirmationTime: number;
  }> {
    const pendingCount = this.pendingTransactions.size;

    const stats = await this.prisma.distributionTransaction.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const totalTransactions = stats.reduce(
      (sum, stat) => sum + stat._count.status,
      0,
    );
    const completedTransactions =
      stats.find((s) => s.status === DistributionStatus.COMPLETED)?._count
        .status || 0;
    const successRate =
      totalTransactions > 0
        ? (completedTransactions / totalTransactions) * 100
        : 0;

    // Calculate average confirmation time for completed transactions
    const completedTxs = await this.prisma.distributionTransaction.findMany({
      where: {
        status: DistributionStatus.COMPLETED,
        confirmedAt: { not: null },
      },
      select: {
        submittedAt: true,
        confirmedAt: true,
      },
    });

    const averageConfirmationTime =
      completedTxs.length > 0
        ? completedTxs.reduce((sum, tx) => {
            const confirmationTime =
              tx.confirmedAt!.getTime() - tx.submittedAt.getTime();
            return sum + confirmationTime;
          }, 0) /
          completedTxs.length /
          1000 // Convert to seconds
        : 0;

    return {
      pendingCount,
      totalTransactions,
      successRate,
      averageConfirmationTime,
    };
  }

  /**
   * Map database model to service interface
   */
  private mapToDistributionTransaction(tx: any): DistributionTransaction {
    return {
      id: tx.id,
      hackathonId: tx.hackathonId,
      txHash: tx.txHash,
      status: tx.status,
      submittedAt: tx.submittedAt,
      confirmedAt: tx.confirmedAt,
      failedAt: tx.failedAt,
      retryCount: tx.retryCount,
      gasPrice: tx.gasPrice,
      gasLimit: tx.gasLimit,
      gasUsed: tx.gasUsed,
      blockNumber: tx.blockNumber,
      error: tx.error,
      recipients: tx.recipients,
      amounts: tx.amounts,
      totalAmount: tx.totalAmount,
    };
  }

  /**
   * Initialize monitoring by loading pending transactions from database
   */
  async initializeMonitoring(): Promise<void> {
    try {
      const pendingTxs = await this.prisma.distributionTransaction.findMany({
        where: {
          status: DistributionStatus.PENDING,
          confirmedAt: null,
        },
      });

      for (const tx of pendingTxs) {
        this.pendingTransactions.set(
          tx.txHash,
          this.mapToDistributionTransaction(tx),
        );
      }

      this.logger.log(
        `Initialized monitoring for ${pendingTxs.length} pending transactions`,
      );
    } catch (error) {
      this.logger.error('Error initializing transaction monitoring:', error);
    }
  }
}
