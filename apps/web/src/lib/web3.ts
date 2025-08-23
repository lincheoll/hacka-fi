import { createConfig } from "wagmi";
import * as chains from "wagmi/chains";
import { http } from "viem";
import { injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";

// Simple chain IDs array from environment - supports future multi-chain
const CHAIN_IDS = [parseInt(process.env.NEXT_PUBLIC_KAIA_CHAIN_ID || "1001")];

// Dynamic chain mapping using wagmi chains by chainId
const getChainById = (chainId: number): Chain => {
  const chainMap = Object.fromEntries(
    Object.values(chains).map((chain) => [chain.id, chain]),
  );
  const chain = chainMap[chainId as keyof typeof chainMap];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
};

// Get chains array for wagmi config
const SUPPORTED_CHAINS = CHAIN_IDS.map(getChainById);

// Ensure we have at least one chain for wagmi's tuple type
if (SUPPORTED_CHAINS.length === 0) {
  throw new Error("No chain IDs configured");
}

// Contract addresses (simple fallback to env vars)
const CONTRACT_ADDRESSES = {
  hackathonRegistry:
    process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
  prizePool:
    process.env.NEXT_PUBLIC_PRIZE_POOL_ADDRESS ||
    "0x0000000000000000000000000000000000000000",
};

export const DEFAULT_CHAIN_ID = CHAIN_IDS[0];

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// Get transports - uses viem default RPC with optional override
const getTransports = () => {
  const transports: Record<number, any> = {};

  CHAIN_IDS.forEach((chainId) => {
    const customRpc = process.env.NEXT_PUBLIC_RPC_URL;
    // Use custom RPC if provided, otherwise viem uses default RPC for the chain
    transports[chainId] = customRpc ? http(customRpc) : http();
  });

  return transports;
};

// Wagmi Configuration - simple and clean
export const wagmiConfig = createConfig({
  chains: [SUPPORTED_CHAINS[0], ...SUPPORTED_CHAINS.slice(1)] as const,
  connectors: [
    injected({ target: "metaMask" }),
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
  transports: getTransports(),
});

// Helper functions
export function getContractAddress(
  contract: "hackathonRegistry" | "prizePool",
): string {
  return CONTRACT_ADDRESSES[contract];
}

export function isSupportedChain(chainId: number): boolean {
  return CHAIN_IDS.includes(chainId);
}

export function getNetworkName(chainId: number): string {
  try {
    return getChainById(chainId).name;
  } catch {
    return `Chain ${chainId}`;
  }
}

// Exports for easy access
export { CHAIN_IDS as SUPPORTED_CHAIN_IDS };
export { SUPPORTED_CHAINS };
export { getChainById };
