import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, Hash } from 'viem';
import { Web3Service } from './web3.service';
import { PRIZE_POOL_ABI, PrizePool, PrizeDistribution } from './contracts';

@Injectable()
export class PrizePoolContractService {
  private readonly logger = new Logger(PrizePoolContractService.name);
  private readonly prizePoolAddress: Address;

  constructor(
    private readonly web3Service: Web3Service,
    private readonly configService: ConfigService,
  ) {
    this.prizePoolAddress = this.configService.get<string>(
      'PRIZE_POOL_ADDRESS',
    ) as Address;

    if (!this.prizePoolAddress) {
      throw new Error('PRIZE_POOL_ADDRESS is required');
    }
  }

  /**
   * Read Operations
   */

  async getPrizePool(hackathonId: bigint): Promise<PrizePool> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'prizePools',
        args: [hackathonId],
      });

      const [
        hackathonIdResult,
        totalAmount,
        isDistributed,
        firstPlace,
        secondPlace,
        thirdPlace,
      ] = result as [bigint, bigint, boolean, bigint, bigint, bigint];

      return {
        hackathonId: hackathonIdResult,
        totalAmount,
        isDistributed,
        firstPlace,
        secondPlace,
        thirdPlace,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prize pool for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getPrizeDistribution(
    hackathonId: bigint,
  ): Promise<PrizeDistribution | null> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'prizeDistributions',
        args: [hackathonId],
      });

      const [
        hackathonIdResult,
        firstPlace,
        secondPlace,
        thirdPlace,
        firstPrize,
        secondPrize,
        thirdPrize,
        timestamp,
      ] = result as [
        bigint,
        Address,
        Address,
        Address,
        bigint,
        bigint,
        bigint,
        bigint,
      ];

      // Check if distribution exists (timestamp > 0)
      if (timestamp === 0n) {
        return null;
      }

      return {
        hackathonId: hackathonIdResult,
        firstPlace,
        secondPlace,
        thirdPlace,
        firstPrize,
        secondPrize,
        thirdPrize,
        timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get prize distribution for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getTotalPrizePool(hackathonId: bigint): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'getTotalPrizePool',
        args: [hackathonId],
      });

      return result as bigint;
    } catch (error) {
      this.logger.error(
        `Failed to get total prize pool for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async isPrizeDistributed(hackathonId: bigint): Promise<boolean> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'isPrizeDistributed',
        args: [hackathonId],
      });

      return result as boolean;
    } catch (error) {
      this.logger.error(
        `Failed to check if prize is distributed for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getContractBalance(): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const balance = await publicClient.getBalance({
        address: this.prizePoolAddress,
      });

      return balance;
    } catch (error) {
      this.logger.error('Failed to get contract balance', error);
      throw error;
    }
  }

  /**
   * Write Operations (require wallet)
   */

  async createPrizePool(hackathonId: bigint, amount: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'createPrizePool',
        args: [hackathonId],
        value: amount,
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Prize pool creation transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to create prize pool for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async addToPrizePool(hackathonId: bigint, amount: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'addToPrizePool',
        args: [hackathonId],
        value: amount,
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Prize pool addition transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to add to prize pool for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async distributePrizes(
    hackathonId: string,
    recipients: string[],
    amounts: string[],
    options?: {
      gasPrice?: string;
      gasLimit?: string;
    },
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      // Validate inputs
      if (recipients.length !== amounts.length) {
        throw new Error(
          'Recipients and amounts arrays must have the same length',
        );
      }

      // Convert amounts to BigInt array
      const amountsBigInt = amounts.map((amount) => BigInt(amount));

      // Prepare transaction parameters
      const txParams: any = {
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'distributePrizes',
        args: [BigInt(hackathonId), recipients as Address[], amountsBigInt],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      };

      // Add gas parameters if provided
      if (options?.gasPrice) {
        txParams.gasPrice = BigInt(options.gasPrice);
      }
      if (options?.gasLimit) {
        txParams.gas = BigInt(options.gasLimit);
      }

      const hash = await walletClient.writeContract(txParams);

      this.logger.log(`Prize distribution transaction submitted: ${hash}`);
      return {
        success: true,
        txHash: hash,
      };
    } catch (error) {
      this.logger.error(
        `Failed to distribute prizes for hackathon ${hackathonId}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async emergencyWithdraw(hackathonId: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'emergencyWithdraw',
        args: [hackathonId],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Emergency withdrawal transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to emergency withdraw for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Utility Methods
   */

  async estimateGasForCreatePrizePool(
    hackathonId: bigint,
    amount: bigint,
  ): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();
    const walletClient = this.web3Service.getWalletClient();

    try {
      const gas = await publicClient.estimateContractGas({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'createPrizePool',
        args: [hackathonId],
        value: amount,
        account: walletClient.account,
      });

      return gas;
    } catch (error) {
      this.logger.error(`Failed to estimate gas for create prize pool`, error);
      throw error;
    }
  }

  async estimateGasForDistributePrizes(hackathonId: bigint): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();
    const walletClient = this.web3Service.getWalletClient();

    try {
      const gas = await publicClient.estimateContractGas({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'distributePrizes',
        args: [hackathonId],
        account: walletClient.account,
      });

      return gas;
    } catch (error) {
      this.logger.error(`Failed to estimate gas for distribute prizes`, error);
      throw error;
    }
  }

  async estimateDistributionGas(
    recipients: string[],
    amounts: string[],
  ): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();
    const walletClient = this.web3Service.getWalletClient();

    try {
      // Use a mock hackathon ID for gas estimation
      const mockHackathonId = BigInt(1);
      const amountsBigInt = amounts.map((amount) => BigInt(amount));

      const gas = await publicClient.estimateContractGas({
        address: this.prizePoolAddress,
        abi: PRIZE_POOL_ABI,
        functionName: 'distributePrizes',
        args: [mockHackathonId, recipients as Address[], amountsBigInt],
        account: walletClient.account,
      });

      return gas;
    } catch (error) {
      this.logger.error(`Failed to estimate gas for distribution`, error);
      // Return a reasonable fallback
      const baseGas = 100000n;
      const perRecipientGas = 50000n;
      return baseGas + perRecipientGas * BigInt(recipients.length);
    }
  }
}
