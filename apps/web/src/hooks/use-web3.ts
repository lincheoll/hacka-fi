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
    return getContractAddress(contractName);
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

  /**
   * Format token amounts with proper decimals and currency symbol
   */
  const formatTokenAmount = (
    amount: string | bigint,
    decimals: number = 18,
    symbol = "KAIA",
  ) => {
    const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const whole = amountBigInt / divisor;
    const fraction = amountBigInt % divisor;

    if (whole === BigInt(0) && fraction === BigInt(0)) return `0 ${symbol}`;

    // Show more precision for smaller amounts
    const precisionDigits = whole === BigInt(0) ? 6 : 4;
    const fractionStr = fraction
      .toString()
      .padStart(decimals, "0")
      .slice(0, precisionDigits);
    const trimmedFraction = fractionStr.replace(/0+$/, "");

    if (trimmedFraction) {
      return `${whole}.${trimmedFraction} ${symbol}`;
    } else {
      return `${whole} ${symbol}`;
    }
  };

  /**
   * Calculate platform fee amounts
   */
  const calculatePlatformFee = (
    prizePoolAmount: string | bigint,
    feeRateBasisPoints: number,
  ) => {
    const amount =
      typeof prizePoolAmount === "string"
        ? BigInt(prizePoolAmount)
        : prizePoolAmount;
    const feeAmount = (amount * BigInt(feeRateBasisPoints)) / BigInt(10000);
    const distributionAmount = amount - feeAmount;

    return {
      totalPrizePool: amount.toString(),
      platformFee: feeAmount.toString(),
      distributionAmount: distributionAmount.toString(),
      feeRate: feeRateBasisPoints,
      feePercentage: (feeRateBasisPoints / 100).toFixed(2),
    };
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
    formatTokenAmount,
    calculatePlatformFee,

    // Validation
    isSupported: isCorrectNetwork,
  };
}
