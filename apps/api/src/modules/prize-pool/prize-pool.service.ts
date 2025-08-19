import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { PrizePoolContractService } from '../web3/prize-pool-contract.service';
import {
  PrizePool,
  PrizePoolDeposit,
  PrizeDistribution,
  DepositStatus,
  DistributionStatus,
  HackathonStatus,
} from '@prisma/client';
import { parseEther, formatEther, Address, Hash } from 'viem';

export interface CreatePrizePoolDto {
  hackathonId: string;
  totalAmount: string; // Amount in KAIA (e.g., "100.0")
}

export interface DepositToPrizePoolDto {
  amount: string; // Amount in KAIA
  depositorAddress: string;
}

export interface PrizePoolInfo {
  id: number;
  hackathonId: string;
  totalAmount: string;
  totalAmountFormatted: string; // Formatted for display
  isDeposited: boolean;
  isDistributed: boolean;
  depositTxHash?: string | undefined;
  distributionTxHash?: string | undefined;
  contractPoolId?: string | undefined;
  deposits: PrizePoolDepositInfo[];
  distributions: PrizeDistributionInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PrizePoolDepositInfo {
  id: number;
  depositorAddress: string;
  amount: string;
  amountFormatted: string;
  txHash: string;
  status: DepositStatus;
  createdAt: Date;
  confirmedAt?: Date | undefined;
}

export interface PrizeDistributionInfo {
  id: number;
  recipientAddress: string;
  position: number;
  amount: string;
  amountFormatted: string;
  percentage: number; // In basis points
  txHash?: string | undefined;
  status: DistributionStatus;
  executedAt?: Date | undefined;
  createdAt: Date;
}

@Injectable()
export class PrizePoolService {
  private readonly logger = new Logger(PrizePoolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prizePoolContract: PrizePoolContractService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new prize pool for a hackathon
   */
  async createPrizePool(dto: CreatePrizePoolDto): Promise<PrizePoolInfo> {
    this.logger.log(`Creating prize pool for hackathon ${dto.hackathonId}`);

    // Validate hackathon exists and is in correct status
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: dto.hackathonId },
      include: { prizePool: true },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon ${dto.hackathonId} not found`);
    }

    if (hackathon.prizePool) {
      throw new ConflictException(
        `Prize pool already exists for hackathon ${dto.hackathonId}`,
      );
    }

    // Only allow prize pool creation for hackathons that haven't started voting yet
    const allowedStatuses: HackathonStatus[] = [
      HackathonStatus.DRAFT,
      HackathonStatus.REGISTRATION_OPEN,
      HackathonStatus.REGISTRATION_CLOSED,
      HackathonStatus.SUBMISSION_OPEN,
      HackathonStatus.SUBMISSION_CLOSED,
    ];

    if (!allowedStatuses.includes(hackathon.status)) {
      throw new BadRequestException(
        `Cannot create prize pool for hackathon in status ${hackathon.status}`,
      );
    }

    // Validate amount
    const totalAmountWei = parseEther(dto.totalAmount);
    if (totalAmountWei <= 0n) {
      throw new BadRequestException('Prize pool amount must be greater than 0');
    }

    // Create prize pool in database
    const prizePool = await this.prisma.prizePool.create({
      data: {
        hackathonId: dto.hackathonId,
        totalAmount: totalAmountWei.toString(),
      },
      include: {
        deposits: true,
        distributions: true,
      },
    });

    // Update hackathon prize amount
    await this.prisma.hackathon.update({
      where: { id: dto.hackathonId },
      data: { prizeAmount: totalAmountWei.toString() },
    });

    this.logger.log(
      `Prize pool created with ID ${prizePool.id} for hackathon ${dto.hackathonId}`,
    );

    return this.formatPrizePoolInfo(prizePool);
  }

  /**
   * Get prize pool information for a hackathon
   */
  async getPrizePool(hackathonId: string): Promise<PrizePoolInfo | null> {
    const prizePool = await this.prisma.prizePool.findUnique({
      where: { hackathonId },
      include: {
        deposits: {
          orderBy: { createdAt: 'desc' },
        },
        distributions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!prizePool) {
      return null;
    }

    return this.formatPrizePoolInfo(prizePool);
  }

  /**
   * Deposit funds to prize pool (track deposit transaction)
   */
  async recordDeposit(
    hackathonId: string,
    dto: DepositToPrizePoolDto,
    txHash: string,
  ): Promise<PrizePoolDepositInfo> {
    this.logger.log(
      `Recording deposit for hackathon ${hackathonId}, tx: ${txHash}`,
    );

    const prizePool = await this.prisma.prizePool.findUnique({
      where: { hackathonId },
    });

    if (!prizePool) {
      throw new NotFoundException(
        `Prize pool not found for hackathon ${hackathonId}`,
      );
    }

    if (prizePool.isDeposited) {
      throw new ConflictException('Prize pool is already deposited');
    }

    const amountWei = parseEther(dto.amount);

    const deposit = await this.prisma.prizePoolDeposit.create({
      data: {
        prizePoolId: prizePool.id,
        depositorAddress: dto.depositorAddress,
        amount: amountWei.toString(),
        txHash,
      },
    });

    this.logger.log(`Deposit recorded with ID ${deposit.id}`);

    return this.formatDepositInfo(deposit);
  }

  /**
   * Confirm deposit transaction (when it's confirmed on blockchain)
   */
  async confirmDeposit(
    txHash: string,
    blockNumber?: number,
  ): Promise<PrizePoolDepositInfo> {
    const deposit = await this.prisma.prizePoolDeposit.findFirst({
      where: { txHash },
    });

    if (!deposit) {
      throw new NotFoundException(`Deposit with tx hash ${txHash} not found`);
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new BadRequestException(
        `Deposit is already in status ${deposit.status}`,
      );
    }

    const updatedDeposit = await this.prisma.prizePoolDeposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.CONFIRMED,
        confirmedAt: new Date(),
        ...(blockNumber && { blockNumber }),
      },
    });

    // Update prize pool as deposited
    await this.prisma.prizePool.update({
      where: { id: deposit.prizePoolId },
      data: {
        isDeposited: true,
        depositTxHash: txHash,
      },
    });

    this.logger.log(`Deposit ${deposit.id} confirmed`);

    return this.formatDepositInfo(updatedDeposit);
  }

  /**
   * Mark deposit as failed
   */
  async failDeposit(txHash: string): Promise<PrizePoolDepositInfo> {
    const deposit = await this.prisma.prizePoolDeposit.findFirst({
      where: { txHash },
    });

    if (!deposit) {
      throw new NotFoundException(`Deposit with tx hash ${txHash} not found`);
    }

    const updatedDeposit = await this.prisma.prizePoolDeposit.update({
      where: { id: deposit.id },
      data: {
        status: DepositStatus.FAILED,
      },
    });

    this.logger.warn(`Deposit ${deposit.id} marked as failed`);

    return this.formatDepositInfo(updatedDeposit);
  }

  /**
   * Check if prize pool has sufficient balance for distribution
   */
  async validateBalanceForDistribution(hackathonId: string): Promise<boolean> {
    const prizePool = await this.prisma.prizePool.findUnique({
      where: { hackathonId },
      include: {
        deposits: {
          where: { status: DepositStatus.CONFIRMED },
        },
      },
    });

    if (!prizePool) {
      return false;
    }

    if (!prizePool.isDeposited) {
      return false;
    }

    // Check if total confirmed deposits meet the required amount
    const totalDeposited = prizePool.deposits.reduce(
      (sum, deposit) => sum + BigInt(deposit.amount),
      0n,
    );

    const requiredAmount = BigInt(prizePool.totalAmount);

    return totalDeposited >= requiredAmount;
  }

  /**
   * Get prize pool balance summary
   */
  async getBalanceSummary(hackathonId: string): Promise<{
    totalRequired: string;
    totalDeposited: string;
    totalConfirmed: string;
    isReadyForDistribution: boolean;
    formattedSummary: {
      totalRequired: string;
      totalDeposited: string;
      totalConfirmed: string;
    };
  }> {
    const prizePool = await this.prisma.prizePool.findUnique({
      where: { hackathonId },
      include: {
        deposits: true,
      },
    });

    if (!prizePool) {
      throw new NotFoundException(
        `Prize pool not found for hackathon ${hackathonId}`,
      );
    }

    const totalRequired = BigInt(prizePool.totalAmount);

    const totalDeposited = prizePool.deposits.reduce(
      (sum, deposit) => sum + BigInt(deposit.amount),
      0n,
    );

    const totalConfirmed = prizePool.deposits
      .filter((deposit) => deposit.status === DepositStatus.CONFIRMED)
      .reduce((sum, deposit) => sum + BigInt(deposit.amount), 0n);

    const isReadyForDistribution = totalConfirmed >= totalRequired;

    return {
      totalRequired: totalRequired.toString(),
      totalDeposited: totalDeposited.toString(),
      totalConfirmed: totalConfirmed.toString(),
      isReadyForDistribution,
      formattedSummary: {
        totalRequired: formatEther(totalRequired),
        totalDeposited: formatEther(totalDeposited),
        totalConfirmed: formatEther(totalConfirmed),
      },
    };
  }

  /**
   * Format prize pool info for response
   */
  private formatPrizePoolInfo(
    prizePool: PrizePool & {
      deposits: PrizePoolDeposit[];
      distributions: PrizeDistribution[];
    },
  ): PrizePoolInfo {
    return {
      id: prizePool.id,
      hackathonId: prizePool.hackathonId,
      totalAmount: prizePool.totalAmount,
      totalAmountFormatted: formatEther(BigInt(prizePool.totalAmount)),
      isDeposited: prizePool.isDeposited,
      isDistributed: prizePool.isDistributed,
      depositTxHash: prizePool.depositTxHash || undefined,
      distributionTxHash: prizePool.distributionTxHash || undefined,
      contractPoolId: prizePool.contractPoolId || undefined,
      deposits: prizePool.deposits.map((d) => this.formatDepositInfo(d)),
      distributions: prizePool.distributions.map((d) =>
        this.formatDistributionInfo(d),
      ),
      createdAt: prizePool.createdAt,
      updatedAt: prizePool.updatedAt,
    };
  }

  /**
   * Format deposit info for response
   */
  private formatDepositInfo(deposit: PrizePoolDeposit): PrizePoolDepositInfo {
    return {
      id: deposit.id,
      depositorAddress: deposit.depositorAddress,
      amount: deposit.amount,
      amountFormatted: formatEther(BigInt(deposit.amount)),
      txHash: deposit.txHash,
      status: deposit.status,
      createdAt: deposit.createdAt,
      confirmedAt: deposit.confirmedAt || undefined,
    };
  }

  /**
   * Format distribution info for response
   */
  private formatDistributionInfo(
    distribution: PrizeDistribution,
  ): PrizeDistributionInfo {
    return {
      id: distribution.id,
      recipientAddress: distribution.recipientAddress,
      position: distribution.position,
      amount: distribution.amount,
      amountFormatted: formatEther(BigInt(distribution.amount)),
      percentage: distribution.percentage,
      txHash: distribution.txHash || undefined,
      status: distribution.status,
      executedAt: distribution.executedAt || undefined,
      createdAt: distribution.createdAt,
    };
  }
}
