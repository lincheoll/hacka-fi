"use client";

import { PublicWinner } from "@/types/public-api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ExternalLink, Trophy } from "lucide-react";
import Link from "next/link";

interface WinnerCardProps {
  winner: PublicWinner;
  showHackathonInfo?: boolean;
}

export function WinnerCard({
  winner,
  showHackathonInfo = false,
}: WinnerCardProps) {
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-orange-500";
      default:
        return "text-gray-600";
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-300";
      case 3:
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPrizeAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 1000) {
      return `$${(numAmount / 1000).toFixed(1)}K`;
    }
    return `$${numAmount.toLocaleString()}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 ${getRankColor(winner.rank)}`}
          >
            {winner.rank <= 3 ? (
              <Trophy className="w-4 h-4" />
            ) : (
              <span className="text-sm font-bold">#{winner.rank}</span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <img
                  src={
                    winner.avatarUrl ||
                    `https://avatar.iran.liara.run/public/${winner.walletAddress.slice(-1)}`
                  }
                  alt={winner.username || "User avatar"}
                  className="w-full h-full object-cover"
                />
              </Avatar>
              <div>
                <h4 className="font-medium text-sm">
                  {winner.username || formatAddress(winner.walletAddress)}
                </h4>
                {winner.username && (
                  <p className="text-xs text-gray-500">
                    {formatAddress(winner.walletAddress)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <Badge className={getRankBadgeColor(winner.rank)}>
          {winner.rank === 1
            ? "🥇 1st"
            : winner.rank === 2
              ? "🥈 2nd"
              : winner.rank === 3
                ? "🥉 3rd"
                : `#${winner.rank}`}
        </Badge>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Score:{" "}
              <span className="font-medium">
                {winner.averageScore.toFixed(1)}/10
              </span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatPrizeAmount(winner.prizeAmount)}
            </div>
          </div>

          {winner.submissionUrl && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Project:</span>
              <Link
                href={winner.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
              >
                <span>View Submission</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(winner.averageScore / 10) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
