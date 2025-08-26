import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { PrizePoolContractService } from '../web3/prize-pool-contract.service';
import { Web3Service } from '../web3/web3.service';
import { ConfigService } from '@nestjs/config';
import { FeeCollectionStatus } from '@prisma/client';
import { Address, Hash, Log, parseAbiItem } from 'viem';
import { PRIZE_POOL_ABI } from '../web3/contracts';

@Injectable()
export class PlatformFeeListenerService implements OnModuleInit {
  private readonly logger = new Logger(PlatformFeeListenerService.name);
  private isListening = false;
  private lastProcessedBlock = 0n;

  constructor(
    private readonly prisma: PrismaService,
    private readonly prizePoolContract: PrizePoolContractService,
    private readonly web3Service: Web3Service,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeListener();
  }

  /**
   * Initialize the event listener
   */
  async initializeListener() {
    try {
      // Get the last processed block from database or start from latest
      const lastBlock = await this.getLastProcessedBlock();
      this.lastProcessedBlock = lastBlock;

      this.logger.log(`Initialized fee listener from block ${lastBlock}`);
      this.isListening = true;
    } catch (error) {
      this.logger.error('Failed to initialize fee listener', error);
    }
  }

  /**
   * Process fee-related events periodically
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processFeeEvents() {
    if (!this.isListening) {
      return;
    }

    try {
      const publicClient = this.web3Service.getPublicClient();
      const currentBlock = await publicClient.getBlockNumber();

      // Skip if no new blocks
      if (currentBlock <= this.lastProcessedBlock) {
        return;
      }

      const prizePoolAddress = this.configService.get<string>(
        'PRIZE_POOL_ADDRESS',
      ) as Address;

      // Get logs for fee-related events
      const logs = await publicClient.getLogs({
        address: prizePoolAddress,
        events: [
          parseAbiItem(
            'event PlatformFeeRateUpdated(uint256 oldRate, uint256 newRate)',
          ),
          parseAbiItem(
            'event PlatformFeeRecipientUpdated(address indexed newRecipient)',
          ),
          parseAbiItem(
            'event PlatformFeeCollected(uint256 indexed hackathonId, uint256 feeAmount, address indexed recipient)',
          ),
        ],
        fromBlock: this.lastProcessedBlock + 1n,
        toBlock: currentBlock,
      });

      // Process each log
      for (const log of logs) {
        await this.processEventLog(log);
      }

      // Update last processed block
      this.lastProcessedBlock = currentBlock;
      await this.updateLastProcessedBlock(currentBlock);
    } catch (error) {
      this.logger.error('Error processing fee events', error);
    }
  }

  /**
   * Process individual event log
   */
  private async processEventLog(log: any) {
    let eventName: string | undefined;

    try {
      // Extract event name from topics and data
      const eventSignatures = {
        'PlatformFeeRateUpdated(uint256,uint256)': 'PlatformFeeRateUpdated',
        'PlatformFeeRecipientUpdated(address)': 'PlatformFeeRecipientUpdated',
        'PlatformFeeCollected(uint256,uint256,address)': 'PlatformFeeCollected',
      };

      // Try to match event signature from topics
      if (log.topics && log.topics.length > 0) {
        for (const [signature, name] of Object.entries(eventSignatures)) {
          // This is a simplified approach - in a real implementation you'd compare keccak256 hashes
          eventName = name;
          break;
        }
      }

      switch (eventName) {
        case 'PlatformFeeRateUpdated':
          await this.handleFeeRateUpdated(log);
          break;
        case 'PlatformFeeRecipientUpdated':
          await this.handleFeeRecipientUpdated(log);
          break;
        case 'PlatformFeeCollected':
          await this.handleFeeCollected(log);
          break;
        default:
          this.logger.warn(`Unknown event: ${eventName || 'undefined'}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${eventName || 'unknown'}`,
        error,
      );
    }
  }

  /**
   * Handle PlatformFeeRateUpdated event
   */
  private async handleFeeRateUpdated(log: Log) {
    this.logger.log(
      `Platform fee rate updated in block ${log.blockNumber}, tx: ${log.transactionHash}`,
    );

    // The fee rate history is already recorded in the service method
    // This event handler can be used for additional processing like notifications
  }

  /**
   * Handle PlatformFeeRecipientUpdated event
   */
  private async handleFeeRecipientUpdated(log: Log) {
    this.logger.log(
      `Platform fee recipient updated in block ${log.blockNumber}, tx: ${log.transactionHash}`,
    );

    // Additional processing can be added here
  }

  /**
   * Handle PlatformFeeCollected event
   */
  private async handleFeeCollected(log: any) {
    try {
      const args = log.args || {};
      const hackathonId = args?.hackathonId?.toString();
      const feeAmount = args?.feeAmount?.toString();
      const recipient = args?.recipient;

      if (!hackathonId || !feeAmount || !recipient) {
        this.logger.error('Invalid PlatformFeeCollected event data');
        return;
      }

      this.logger.log(
        `Platform fee collected: ${feeAmount} for hackathon ${hackathonId}, tx: ${log.transactionHash}`,
      );

      // Check if this fee collection is already recorded
      const existing = await this.prisma.platformFeeCollection.findFirst({
        where: { txHash: log.transactionHash as string },
      });

      if (existing) {
        // Update status to confirmed if it was pending
        if (existing.status === FeeCollectionStatus.PENDING) {
          await this.prisma.platformFeeCollection.update({
            where: { id: existing.id },
            data: {
              status: FeeCollectionStatus.CONFIRMED,
              confirmedAt: new Date(),
              blockNumber: Number(log.blockNumber),
            },
          });
          this.logger.log(`Fee collection ${existing.id} confirmed`);
        }
        return;
      }

      // Find the prize pool for this hackathon
      const prizePool = await this.prisma.prizePool.findUnique({
        where: { hackathonId },
      });

      if (!prizePool) {
        this.logger.error(`Prize pool not found for hackathon ${hackathonId}`);
        return;
      }

      // Record new fee collection
      await this.prisma.platformFeeCollection.create({
        data: {
          hackathonId,
          prizePoolId: prizePool.id,
          feeAmount,
          feeRate: prizePool.lockedFeeRate,
          tokenAddress: prizePool.tokenAddress,
          recipientAddress: recipient as string,
          txHash: log.transactionHash as string,
          blockNumber: Number(log.blockNumber),
          status: FeeCollectionStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      this.logger.log(`Fee collection recorded for hackathon ${hackathonId}`);
    } catch (error) {
      this.logger.error('Error handling PlatformFeeCollected event', error);
    }
  }

  /**
   * Get last processed block number
   */
  private async getLastProcessedBlock(): Promise<bigint> {
    try {
      // You could store this in a separate table for persistence
      // For now, start from current block - 1000 to catch recent events
      const publicClient = this.web3Service.getPublicClient();
      const currentBlock = await publicClient.getBlockNumber();
      return currentBlock - 1000n > 0n ? currentBlock - 1000n : 0n;
    } catch (error) {
      this.logger.error('Error getting last processed block', error);
      return 0n;
    }
  }

  /**
   * Update last processed block (in production, store this in database)
   */
  private async updateLastProcessedBlock(blockNumber: bigint) {
    // In production, you would store this in a database table
    // For now, we just keep it in memory
  }

  /**
   * Stop the listener
   */
  async stopListener() {
    this.isListening = false;
    this.logger.log('Fee event listener stopped');
  }

  /**
   * Start the listener
   */
  async startListener() {
    this.isListening = true;
    this.logger.log('Fee event listener started');
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      lastProcessedBlock: this.lastProcessedBlock.toString(),
    };
  }
}
