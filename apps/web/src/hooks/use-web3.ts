"use client";

import { useAccount, useChainId, useSwitchChain, useBalance } from "wagmi";
import { useWeb3Store } from "@/store/web3";
import { useEffect } from "react";
import {
  isSupportedChain,
  getNetworkName,
  getContractAddress,
  DEFAULT_CHAIN_ID,
} from "@/lib/web3";

export function useWeb3() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  const {
    setWallet,
    setConnecting,
    disconnect: storeDisconnect,
  } = useWeb3Store();

  // Update store when wallet state changes
  useEffect(() => {
    if (isConnected && address) {
      setWallet({
        address,
        isConnected: true,
        chainId,
      });
    } else {
      storeDisconnect();
    }
  }, [isConnected, address, chainId, setWallet, storeDisconnect]);

  // Helper functions
  const isCorrectNetwork = isSupportedChain(chainId);
  const networkName = getNetworkName(chainId);

  const switchToDefaultNetwork = async () => {
    try {
      setConnecting(true);
      await switchChain({ chainId: DEFAULT_CHAIN_ID });
    } catch (error) {
      console.error("Failed to switch network:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const switchToNetwork = async (targetChainId: number) => {
    try {
      setConnecting(true);
      await switchChain({ chainId: targetChainId });
    } catch (error) {
      console.error("Failed to switch network:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const getContract = (contractName: "hackathonRegistry" | "prizePool") => {
    return getContractAddress(chainId, contractName);
  };

  const formatAddress = (addr?: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance?: bigint, decimals: number = 18) => {
    if (!balance) return "0";
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fraction = balance % divisor;
    const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionStr}`;
  };

  return {
    // Basic wallet info
    address,
    isConnected,
    connector,
    chainId,
    balance,

    // Network helpers
    isCorrectNetwork,
    networkName,
    switchToDefaultNetwork,
    switchToNetwork,

    // Contract helpers
    getContract,

    // Formatting helpers
    formatAddress: () => formatAddress(address),
    formatBalance: () => formatBalance(balance?.value, balance?.decimals),

    // Validation
    isSupported: isCorrectNetwork,
  };
}
