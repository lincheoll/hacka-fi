// App constants
export const APP_NAME = "Hacka-Fi";
export const APP_DESCRIPTION = "Blockchain hackathon platform";

// API endpoints
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Blockchain constants
export const SUPPORTED_CHAIN_IDS = [1001, 8217] as const; // Kaia Testnet, Kaia Mainnet
export const DEFAULT_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_KAIA_CHAIN_ID || "1001");

// Contract addresses
export const HACKATHON_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS;
export const PRIZE_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIZE_POOL_ADDRESS;
