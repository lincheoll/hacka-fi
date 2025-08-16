import HackathonRegistryABI from './HackathonRegistry.json';
import PrizePoolABI from './PrizePool.json';

// Export ABIs
export { HackathonRegistryABI, PrizePoolABI };

// Export types
export * from './types';

// Contract addresses will be loaded from environment variables
export const CONTRACT_ADDRESSES = {
  HACKATHON_REGISTRY: process.env.HACKATHON_REGISTRY_ADDRESS as `0x${string}`,
  PRIZE_POOL: process.env.PRIZE_POOL_ADDRESS as `0x${string}`,
};

// ABI type definitions for viem
export const HACKATHON_REGISTRY_ABI = HackathonRegistryABI;
export const PRIZE_POOL_ABI = PrizePoolABI;
