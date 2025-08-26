"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Coins, Receipt } from "lucide-react";
import { useWeb3 } from "@/hooks/use-web3";
import type { HackathonFeeInfo } from "@/types/global";

interface PlatformFeeDisplayProps {
  feeInfo?: HackathonFeeInfo;
  isLoading?: boolean;
  showBreakdown?: boolean;
  variant?: "compact" | "detailed";
}

export function PlatformFeeDisplay({
  feeInfo,
  isLoading = false,
  showBreakdown = true,
  variant = "detailed",
}: PlatformFeeDisplayProps) {
  const { formatTokenAmount } = useWeb3();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!feeInfo) {
    return null;
  }

  const feePercentage = (feeInfo.lockedFeeRate / 100).toFixed(2);
  const tokenSymbol = feeInfo.tokenAddress ? "ERC20" : "KAIA";

  if (variant === "compact") {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Platform Fee: {feePercentage}%
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {formatTokenAmount(feeInfo.platformFee, 18, tokenSymbol)}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-blue-600" />
          Platform Fee Information
          <Badge variant="outline" className="ml-auto">
            {feePercentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Fee Rate Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">
                  Locked Fee Rate
                </h4>
                <p className="text-sm text-blue-700">
                  The platform fee rate of <strong>{feePercentage}%</strong> was
                  locked at hackathon creation and cannot be changed. This
                  ensures transparency and prevents fee manipulation after
                  participants register.
                </p>
              </div>
            </div>
          </div>

          {showBreakdown && (
            <>
              {/* Prize Pool Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">
                    Total Prize Pool
                  </div>
                  <div className="font-semibold text-lg">
                    {formatTokenAmount(feeInfo.totalPrizePool, 18, tokenSymbol)}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-600 mb-1">
                    Platform Fee ({feePercentage}%)
                  </div>
                  <div className="font-semibold text-lg text-red-700">
                    {feeInfo.platformFeeFormatted ||
                      formatTokenAmount(feeInfo.platformFee, 18, tokenSymbol)}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">
                    Winner Distribution
                  </div>
                  <div className="font-semibold text-lg text-green-700">
                    {feeInfo.distributionAmountFormatted ||
                      formatTokenAmount(
                        feeInfo.distributionAmount,
                        18,
                        tokenSymbol,
                      )}
                  </div>
                </div>
              </div>

              {/* Visual Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Distribution Breakdown
                </div>
                <div className="relative h-6 bg-gray-200 rounded-lg overflow-hidden">
                  {/* Winner portion */}
                  <div
                    className="absolute h-full bg-gradient-to-r from-green-400 to-green-500"
                    style={{
                      width: `${100 - feeInfo.lockedFeeRate / 100}%`,
                    }}
                    title={`Winners: ${(100 - feeInfo.lockedFeeRate / 100).toFixed(2)}%`}
                  />
                  {/* Platform fee portion */}
                  <div
                    className="absolute h-full bg-gradient-to-r from-red-400 to-red-500 right-0"
                    style={{
                      width: `${feeInfo.lockedFeeRate / 100}%`,
                    }}
                    title={`Platform Fee: ${feePercentage}%`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    Winners: {(100 - feeInfo.lockedFeeRate / 100).toFixed(2)}%
                  </span>
                  <span>Platform Fee: {feePercentage}%</span>
                </div>
              </div>
            </>
          )}

          {/* Token Information */}
          {feeInfo.tokenAddress && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Coins className="h-4 w-4" />
                <span>Prize Token:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {feeInfo.tokenAddress.slice(0, 6)}...
                  {feeInfo.tokenAddress.slice(-4)}
                </code>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple fee badge component for displaying platform fee rate
 */
export function PlatformFeeBadge({ feeRate }: { feeRate: number }) {
  const feePercentage = (feeRate / 100).toFixed(2);

  return (
    <Badge
      variant="outline"
      className="text-xs bg-blue-50 text-blue-700 border-blue-200"
    >
      <Receipt className="h-3 w-3 mr-1" />
      Fee: {feePercentage}%
    </Badge>
  );
}
