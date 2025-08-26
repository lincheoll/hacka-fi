"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type {
  PlatformFeeInfo,
  FeeDistributionResponse,
  SetFeeRateResponse,
  PlatformFeeHistoryInfo,
  PlatformFeeCollectionInfo,
} from "@/types/api";

/**
 * Hook for platform fee management and information
 */
export function usePlatformFee() {
  const { isAuthenticated } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch current platform fee information (public)
  const {
    data: feeInfo,
    isLoading: isLoadingFeeInfo,
    error: feeInfoError,
    refetch: refetchFeeInfo,
  } = useQuery<PlatformFeeInfo>({
    queryKey: ["platform-fee-info"],
    queryFn: () => apiClient.platformFee.getFeeInfo(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch fee history (admin only)
  const {
    data: feeHistory,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<PlatformFeeHistoryInfo[]>({
    queryKey: ["platform-fee-history"],
    queryFn: () => apiClient.platformFee.getFeeHistory(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch fee collections (admin only)
  const {
    data: feeCollections,
    isLoading: isLoadingCollections,
    error: collectionsError,
    refetch: refetchCollections,
  } = useQuery<PlatformFeeCollectionInfo[]>({
    queryKey: ["platform-fee-collections"],
    queryFn: () => apiClient.platformFee.getFeeCollections(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  /**
   * Get hackathon-specific fee details
   */
  const getHackathonFeeDetails = useCallback(
    async (hackathonId: string): Promise<FeeDistributionResponse> => {
      return apiClient.platformFee.getHackathonFeeDetails(hackathonId);
    },
    [],
  );

  /**
   * Update platform fee rate (admin only)
   */
  const updateFeeRate = useCallback(
    async (feeRate: number, reason?: string): Promise<SetFeeRateResponse> => {
      if (!isAuthenticated) {
        throw new Error("Authentication required");
      }

      setIsUpdating(true);
      try {
        const result = await apiClient.platformFee.setPlatformFeeRate({
          feeRate,
          reason,
        });

        // Refetch fee info and history
        refetchFeeInfo();
        refetchHistory();

        toast.success("Platform Fee Updated", {
          description: `Fee rate updated to ${(feeRate / 100).toFixed(2)}%`,
        });

        return result;
      } catch (error) {
        console.error("Failed to update fee rate:", error);
        toast.error("Update Failed", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to update fee rate",
        });
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, refetchFeeInfo, refetchHistory],
  );

  /**
   * Update platform fee recipient (admin only)
   */
  const updateFeeRecipient = useCallback(
    async (recipient: string): Promise<SetFeeRateResponse> => {
      if (!isAuthenticated) {
        throw new Error("Authentication required");
      }

      setIsUpdating(true);
      try {
        const result = await apiClient.platformFee.setPlatformFeeRecipient({
          recipient,
        });

        // Refetch fee info
        refetchFeeInfo();

        toast.success("Fee Recipient Updated", {
          description: `Recipient updated to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        });

        return result;
      } catch (error) {
        console.error("Failed to update fee recipient:", error);
        toast.error("Update Failed", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to update fee recipient",
        });
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, refetchFeeInfo],
  );

  /**
   * Calculate fee amounts for a given prize pool
   */
  const calculateFeeAmounts = useCallback(
    (prizePoolAmount: string, feeRateOverride?: number) => {
      const amount = BigInt(prizePoolAmount);
      const feeRate = feeRateOverride ?? feeInfo?.currentFeeRate ?? 250; // Default 2.5%

      const feeAmount = (amount * BigInt(feeRate)) / BigInt(10000);
      const distributionAmount = amount - feeAmount;

      return {
        feeAmount: feeAmount.toString(),
        distributionAmount: distributionAmount.toString(),
        feeRate,
        feePercentage: (feeRate / 100).toFixed(2),
      };
    },
    [feeInfo?.currentFeeRate],
  );

  /**
   * Format fee rate for display
   */
  const formatFeeRate = useCallback((basisPoints: number) => {
    return `${(basisPoints / 100).toFixed(2)}%`;
  }, []);

  /**
   * Validate fee rate (must be between 0 and 10%)
   */
  const validateFeeRate = useCallback((basisPoints: number) => {
    const MIN_FEE = 0; // 0%
    const MAX_FEE = 1000; // 10%

    return {
      isValid: basisPoints >= MIN_FEE && basisPoints <= MAX_FEE,
      error:
        basisPoints < MIN_FEE
          ? "Fee rate cannot be negative"
          : basisPoints > MAX_FEE
            ? "Fee rate cannot exceed 10%"
            : null,
      minFee: MIN_FEE,
      maxFee: MAX_FEE,
    };
  }, []);

  /**
   * Get fee collection statistics
   */
  const feeStats = useMemo(() => {
    if (!feeCollections || feeCollections.length === 0) {
      return {
        totalCollected: "0",
        totalCollections: 0,
        averageFeeRate: 0,
        confirmedCollections: 0,
      };
    }

    const totalCollected = feeCollections.reduce(
      (sum, collection) => sum + BigInt(collection.feeAmount),
      BigInt(0),
    );

    const confirmedCollections = feeCollections.filter(
      (c) => c.status === "confirmed",
    ).length;

    const averageFeeRate =
      feeCollections.reduce((sum, collection) => sum + collection.feeRate, 0) /
      feeCollections.length;

    return {
      totalCollected: totalCollected.toString(),
      totalCollections: feeCollections.length,
      averageFeeRate: Math.round(averageFeeRate),
      confirmedCollections,
    };
  }, [feeCollections]);

  return {
    // Data
    feeInfo,
    feeHistory,
    feeCollections,
    feeStats,

    // Loading states
    isLoadingFeeInfo,
    isLoadingHistory,
    isLoadingCollections,
    isUpdating,

    // Errors
    feeInfoError,
    historyError,
    collectionsError,

    // Actions
    getHackathonFeeDetails,
    updateFeeRate,
    updateFeeRecipient,
    calculateFeeAmounts,
    formatFeeRate,
    validateFeeRate,

    // Refetch functions
    refetchFeeInfo,
    refetchHistory,
    refetchCollections,
  };
}

/**
 * Hook for hackathon-specific fee information
 */
export function useHackathonFee(hackathonId: string) {
  const {
    data: hackathonFeeDetails,
    isLoading,
    error,
    refetch,
  } = useQuery<FeeDistributionResponse>({
    queryKey: ["hackathon-fee-details", hackathonId],
    queryFn: () => apiClient.platformFee.getHackathonFeeDetails(hackathonId),
    enabled: !!hackathonId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const feeBreakdown = useMemo(() => {
    if (!hackathonFeeDetails) return null;

    return {
      totalPrizePool: hackathonFeeDetails.totalPrizePool,
      platformFee: hackathonFeeDetails.feeAmount,
      distributionAmount: hackathonFeeDetails.distributionAmount,
      feeRate: hackathonFeeDetails.feeRate,
      feePercentage: (hackathonFeeDetails.feeRate / 100).toFixed(2),
      formatted: {
        totalPrizePool: hackathonFeeDetails.totalPrizePool,
        platformFee: hackathonFeeDetails.feeAmountFormatted,
        distributionAmount: hackathonFeeDetails.distributionAmountFormatted,
      },
    };
  }, [hackathonFeeDetails]);

  return {
    hackathonFeeDetails,
    feeBreakdown,
    isLoading,
    error,
    refetch,
  };
}
