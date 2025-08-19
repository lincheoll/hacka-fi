"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Star, Crown, Sparkles } from "lucide-react";
import type { WinnerResult, PrizeDistribution } from "@/types/api";

interface WinnersPodiumProps {
  winners: WinnerResult[];
  prizeDistribution?: PrizeDistribution[];
  currency?: string;
  showAnimation?: boolean;
}

export function WinnersPodium({
  winners,
  prizeDistribution = [],
  currency = "KAIA",
  showAnimation = false,
}: WinnersPodiumProps) {
  const formatAmount = (amount: string | null | undefined) => {
    if (!amount || amount === "0") return "0";

    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toFixed(2);
    }
  };

  const getRankIcon = (rank: number, size = "h-8 w-8") => {
    switch (rank) {
      case 1:
        return <Trophy className={`${size} text-yellow-500`} />;
      case 2:
        return <Medal className={`${size} text-gray-400`} />;
      case 3:
        return <Award className={`${size} text-amber-600`} />;
      default:
        return (
          <div
            className={`${size} flex items-center justify-center rounded-full bg-blue-500 text-white text-lg font-bold`}
          >
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg">
            <Crown className="h-3 w-3 mr-1" />
            🥇 Champion
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg">
            🥈 Runner-up
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-lg">
            🥉 Third Place
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-blue-300">
            #{rank} Place
          </Badge>
        );
    }
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return "h-32";
      case 2:
        return "h-24";
      case 3:
        return "h-20";
      default:
        return "h-16";
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-t from-yellow-100 to-yellow-50 border-yellow-300";
      case 2:
        return "bg-gradient-to-t from-gray-100 to-gray-50 border-gray-300";
      case 3:
        return "bg-gradient-to-t from-amber-100 to-amber-50 border-amber-300";
      default:
        return "bg-gradient-to-t from-blue-100 to-blue-50 border-blue-300";
    }
  };

  if (winners.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-500">No winners announced yet</div>
        </CardContent>
      </Card>
    );
  }

  // Sort winners by rank for proper podium display
  const sortedWinners = [...winners].sort((a, b) => a.rank - b.rank);

  // For podium display, we want to show top 3 in a special arrangement (2nd, 1st, 3rd)
  const top3Winners = sortedWinners.slice(0, 3);
  const otherWinners = sortedWinners.slice(3);

  const renderWinnerCard = (winner: WinnerResult, isMain = false) => {
    const prizeInfo = prizeDistribution.find((p) => p.position === winner.rank);

    return (
      <div
        key={winner.participantId}
        className={`${
          showAnimation ? "animate-in fade-in-50 duration-1000" : ""
        } ${isMain ? "order-2" : winner.rank === 2 ? "order-1" : "order-3"}`}
        style={{
          animationDelay: showAnimation ? `${winner.rank * 200}ms` : "0ms",
        }}
      >
        <div
          className={`relative ${getPodiumColor(
            winner.rank,
          )} border-2 rounded-lg p-6 text-center ${getPodiumHeight(winner.rank)} ${
            isMain ? "scale-105 shadow-lg" : ""
          } transition-all duration-300 hover:shadow-xl`}
        >
          {/* Sparkling effect for winner */}
          {winner.rank === 1 && showAnimation && (
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
            </div>
          )}

          <div className="space-y-3">
            {/* Rank Icon */}
            <div className="flex justify-center">
              {getRankIcon(winner.rank)}
            </div>

            {/* Rank Badge */}
            <div className="flex justify-center">
              {getRankBadge(winner.rank)}
            </div>

            {/* Winner Address */}
            <div className="font-semibold text-lg">
              {winner.walletAddress.slice(0, 6)}...
              {winner.walletAddress.slice(-4)}
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">
                {winner.weightedScore !== undefined
                  ? winner.weightedScore.toFixed(1)
                  : winner.averageScore.toFixed(1)}
                /10
              </span>
            </div>

            {/* Prize Amount */}
            {winner.prizeAmount && winner.prizeAmount !== "0" && (
              <div className="text-lg font-bold text-green-600">
                {formatAmount(winner.prizeAmount)} {currency}
              </div>
            )}

            {/* Percentage of total prize */}
            {prizeInfo && (
              <div className="text-xs text-gray-600">
                {(prizeInfo.percentage * 100).toFixed(1)}% of total prize
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Podium (Top 3) */}
      {top3Winners.length > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 via-white to-amber-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                🏆 Winner&apos;s Podium 🏆
              </h3>
              <p className="text-gray-600 mt-2">
                Congratulations to our champions!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {top3Winners.map((winner) =>
                renderWinnerCard(winner, winner.rank === 1),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Winners (4th place and beyond) */}
      {otherWinners.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Other Winners
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherWinners.map((winner) => (
                <div
                  key={winner.participantId}
                  className={`${getPodiumColor(
                    winner.rank,
                  )} border rounded-lg p-4 text-center transition-all duration-300 hover:shadow-md`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      {getRankIcon(winner.rank, "h-6 w-6")}
                    </div>
                    <div className="font-medium">
                      {winner.walletAddress.slice(0, 6)}...
                      {winner.walletAddress.slice(-4)}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">
                        {winner.weightedScore !== undefined
                          ? winner.weightedScore.toFixed(1)
                          : winner.averageScore.toFixed(1)}
                        /10
                      </span>
                    </div>
                    {winner.prizeAmount && winner.prizeAmount !== "0" && (
                      <div className="text-sm font-semibold text-green-600">
                        {formatAmount(winner.prizeAmount)} {currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Case: Single Winner */}
      {winners.length === 1 && winners[0].rank === 1 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🏆</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                Winner Takes All!
              </h2>
              <div className="text-xl font-semibold">
                {winners[0].walletAddress.slice(0, 6)}...
                {winners[0].walletAddress.slice(-4)}
              </div>
              <div className="flex items-center justify-center gap-2 text-2xl">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">
                  {winners[0].weightedScore !== undefined
                    ? winners[0].weightedScore.toFixed(1)
                    : winners[0].averageScore.toFixed(1)}
                  /10
                </span>
              </div>
              {winners[0].prizeAmount && winners[0].prizeAmount !== "0" && (
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(winners[0].prizeAmount)} {currency}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
