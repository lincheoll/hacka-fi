import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  Chain,
  PublicClient,
  WalletClient,
  parseEther,
  formatEther,
  Address,
  Hash,
  parseGwei,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { kaia, kairos } from 'viem/chains';

@Injectable()
export class Web3Service {
  private readonly logger = new Logger(Web3Service.name);
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;
  private readonly chain: Chain;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const chainId = this.configService.get<number>('CHAIN_ID');
    const privateKey = this.configService.get<string>('PRIVATE_KEY');

    if (!rpcUrl) {
      throw new Error('RPC_URL is required');
    }

    if (!chainId) {
      throw new Error('CHAIN_ID is required');
    }

    // Determine chain based on chain ID
    this.chain = this.getChainByChainId(chainId);

    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    });

    // Create wallet client for sending transactions (if private key is provided)
    if (privateKey) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(rpcUrl),
      });
      this.logger.log(
        `Web3Service initialized for ${this.chain.name} with wallet`,
      );
    } else {
      this.logger.warn(
        'PRIVATE_KEY not provided. Write operations will not be available.',
      );
    }

    this.logger.log(`Web3Service initialized for ${this.chain.name}`);
  }

  /**
   * Get chain configuration by chain ID
   */
  private getChainByChainId(chainId: number): Chain {
    switch (chainId) {
      case 1001: // Kaia Kairos Testnet
        return kairos;
      case 8217: // Kaia Mainnet
        return kaia;
      default:
        throw new Error(
          `Unsupported chain ID: ${chainId}. Supported chains: 1001 (Kaia Kairos Testnet), 8217 (Kaia Mainnet)`,
        );
    }
  }

  /**
   * Get public client for read operations
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * Get wallet client for write operations
   */
  getWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new Error(
        'Wallet client not initialized. PRIVATE_KEY is required for write operations.',
      );
    }
    return this.walletClient;
  }

  /**
   * Get current chain information
   */
  getChain(): Chain {
    return this.chain;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): Address {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet client not initialized');
    }
    return this.walletClient.account.address;
  }

  /**
   * Get wallet account
   */
  getWalletAccount() {
    if (!this.walletClient || !this.walletClient.account) {
      throw new Error('Wallet client not initialized');
    }
    return this.walletClient.account;
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: Address): Promise<string> {
    const balance = await this.publicClient.getBalance({ address });
    return formatEther(balance);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: Hash) {
    return await this.publicClient.getTransactionReceipt({ hash });
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransactionReceipt(hash: Hash) {
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(request: any): Promise<bigint> {
    return await this.publicClient.estimateGas(request);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    return await this.publicClient.getGasPrice();
  }

  /**
   * Convert KAIA to wei
   */
  parseKaia(amount: string): bigint {
    return parseEther(amount);
  }

  /**
   * Convert wei to KAIA
   */
  formatKaia(amount: bigint): string {
    return formatEther(amount);
  }

  /**
   * Convert Gwei to wei
   */
  parseGwei(amount: string): bigint {
    return parseGwei(amount);
  }

  /**
   * Health check for Web3 connection
   */
  async healthCheck(): Promise<{
    connected: boolean;
    chainId: number;
    blockNumber: bigint;
    gasPrice: bigint;
  }> {
    try {
      const [blockNumber, gasPrice] = await Promise.all([
        this.getCurrentBlockNumber(),
        this.getGasPrice(),
      ]);

      return {
        connected: true,
        chainId: this.chain.id,
        blockNumber,
        gasPrice,
      };
    } catch (error) {
      this.logger.error('Web3 health check failed', error);
      return {
        connected: false,
        chainId: this.chain.id,
        blockNumber: 0n,
        gasPrice: 0n,
      };
    }
  }
}
