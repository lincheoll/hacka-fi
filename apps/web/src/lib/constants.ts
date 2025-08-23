// App constants
export const APP_NAME = "Hacka-Fi";
export const APP_DESCRIPTION = "Blockchain hackathon platform";

// API endpoints
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010";

// Re-export blockchain constants from web3.ts to avoid duplication
export { SUPPORTED_CHAIN_IDS, DEFAULT_CHAIN_ID } from "./web3";

// Contract addresses
export const HACKATHON_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS;
export const PRIZE_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIZE_POOL_ADDRESS;
