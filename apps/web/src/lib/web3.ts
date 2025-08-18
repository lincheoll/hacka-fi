import { createConfig } from "wagmi";
import { klaytn, klaytnBaobab } from "wagmi/chains";
import { http } from "viem";
import { injected, walletConnect } from "wagmi/connectors";

// Kaia Network Configurations
export const KAIA_NETWORKS = {
  mainnet: klaytn,
  testnet: klaytnBaobab,
} as const;

// RPC Endpoints
export const RPC_URLS = {
  [klaytn.id]: "https://public-en-cypress.klaytn.net",
  [klaytnBaobab.id]: "https://public-en-baobab.klaytn.net",
} as const;

// Contract Addresses (from smart contracts deployment)
export const CONTRACT_ADDRESSES = {
  [klaytn.id]: {
    hackathonRegistry: "0x0000000000000000000000000000000000000000", // Replace with actual mainnet address
    prizePool: "0x0000000000000000000000000000000000000000", // Replace with actual mainnet address
  },
  [klaytnBaobab.id]: {
    hackathonRegistry: "0x0000000000000000000000000000000000000000", // Replace with actual testnet address
    prizePool: "0x0000000000000000000000000000000000000000", // Replace with actual testnet address
  },
} as const;

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = [klaytn.id, klaytnBaobab.id] as const;
export const DEFAULT_CHAIN_ID = klaytnBaobab.id; // Use testnet as default

// WalletConnect Project ID (should be set in environment variables)
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Wagmi Configuration
export const wagmiConfig = createConfig({
  chains: [klaytnBaobab, klaytn],
  connectors: [
    injected({
      target: "metaMask",
    }),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: "Hacka-Fi",
        description: "Blockchain Hackathon Platform",
        url: "https://hacka-fi.vercel.app",
        icons: ["https://hacka-fi.vercel.app/favicon.ico"],
      },
    }),
  ],
  transports: {
    [klaytn.id]: http(RPC_URLS[klaytn.id]),
    [klaytnBaobab.id]: http(RPC_URLS[klaytnBaobab.id]),
  },
});

// Helper function to get contract address for current network
export function getContractAddress(
  chainId: number,
  contract: "hackathonRegistry" | "prizePool",
) {
  const addresses =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return addresses?.[contract];
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(
    chainId as (typeof SUPPORTED_CHAIN_IDS)[number],
  );
}

// Network display names
export const NETWORK_NAMES = {
  [klaytn.id]: "Kaia Mainnet",
  [klaytnBaobab.id]: "Kaia Testnet (Baobab)",
} as const;

// Get network name by chain ID
export function getNetworkName(chainId: number): string {
  return (
    NETWORK_NAMES[chainId as keyof typeof NETWORK_NAMES] ||
    `Unknown Network (${chainId})`
  );
}
