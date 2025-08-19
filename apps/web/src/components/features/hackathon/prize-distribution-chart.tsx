"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Coins } from "lucide-react";
import type { PrizeDistribution } from "@/types/api";

interface PrizeDistributionChartProps {
  prizeDistribution: PrizeDistribution[];
  totalPrizePool: string;
  currency?: string;
}

export function PrizeDistributionChart({
  prizeDistribution,
  totalPrizePool,
  currency = "KAIA",
}: PrizeDistributionChartProps) {
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num === 0) return "0";

    // Format with appropriate precision
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toFixed(2);
    }
  };

  const formatPercentage = (percentage: number) => {
    return `${(percentage * 100).toFixed(1)}%`;
  };

  const getRankIcon = (position: number, size = "h-6 w-6") => {
    switch (position) {
      case 1:
        return <Trophy className={`${size} text-yellow-500`} />;
      case 2:
        return <Medal className={`${size} text-gray-400`} />;
      case 3:
        return <Award className={`${size} text-amber-600`} />;
      default:
        return (
          <div
            className={`${size} flex items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold`}
          >
            {position}
          </div>
        );
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1:
        return "from-yellow-50 to-yellow-100 border-yellow-200";
      case 2:
        return "from-gray-50 to-gray-100 border-gray-200";
      case 3:
        return "from-amber-50 to-amber-100 border-amber-200";
      default:
        return "from-blue-50 to-blue-100 border-blue-200";
    }
  };

  const totalPoolNum = parseFloat(totalPrizePool);

  if (prizeDistribution.length === 0 || totalPoolNum === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-gray-500" />
            Prize Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500">No prize distribution available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Prize Distribution
          </div>
          <Badge variant="outline" className="text-lg font-semibold">
            Total: {formatAmount(totalPrizePool)} {currency}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visual Chart */}
          <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden">
            {prizeDistribution.map((prize, index) => {
              const width = prize.percentage * 100;
              const left = prizeDistribution
                .slice(0, index)
                .reduce((sum, p) => sum + p.percentage * 100, 0);

              return (
                <div
                  key={prize.position}
                  className={`absolute h-full transition-all duration-300 ${
                    prize.position === 1
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                      : prize.position === 2
                        ? "bg-gradient-to-r from-gray-400 to-gray-500"
                        : prize.position === 3
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-gradient-to-r from-blue-400 to-blue-500"
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  title={`${prize.position}${
                    prize.position === 1
                      ? "st"
                      : prize.position === 2
                        ? "nd"
                        : prize.position === 3
                          ? "rd"
                          : "th"
                  } Place: ${formatPercentage(prize.percentage)}`}
                />
              );
            })}
          </div>

          {/* Prize Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prizeDistribution.map((prize) => (
              <div
                key={prize.position}
                className={`bg-gradient-to-r ${getRankColor(prize.position)} rounded-lg p-4 border`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getRankIcon(prize.position, "h-5 w-5")}
                    <span className="font-semibold">
                      {prize.position === 1
                        ? "1st Place"
                        : prize.position === 2
                          ? "2nd Place"
                          : prize.position === 3
                            ? "3rd Place"
                            : `${prize.position}th Place`}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatPercentage(prize.percentage)}
                  </Badge>
                </div>

                <div className="text-lg font-bold mb-1">
                  {formatAmount(prize.amount)} {currency}
                </div>

                {prize.winner && (
                  <div className="text-xs text-gray-600">
                    Winner: {prize.winner.walletAddress.slice(0, 6)}...
                    {prize.winner.walletAddress.slice(-4)}
                    <div className="text-xs text-gray-500">
                      Score: {prize.winner.averageScore.toFixed(1)}/10
                    </div>
                  </div>
                )}

                {!prize.winner && (
                  <div className="text-xs text-gray-500">
                    No winner assigned
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Prize Pool:</span>
                <span className="font-semibold">
                  {formatAmount(totalPrizePool)} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Number of Winners:</span>
                <span className="font-semibold">
                  {prizeDistribution.filter((p) => p.winner).length} of{" "}
                  {prizeDistribution.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Distribution Model:</span>
                <span className="font-semibold">
                  {prizeDistribution.length === 1
                    ? "Winner takes all"
                    : prizeDistribution.length === 3
                      ? "Top 3 distribution"
                      : `Top ${prizeDistribution.length} distribution`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
