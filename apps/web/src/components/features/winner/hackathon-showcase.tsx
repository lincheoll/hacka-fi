"use client";

import { PublicHackathon } from "@/types/public-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WinnerCard } from "./winner-card";
import { Calendar, Users, DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { OptimizedImage } from "@/components/common/optimized-image";

interface HackathonShowcaseProps {
  hackathon: PublicHackathon;
  showAllWinners?: boolean;
}

export function HackathonShowcase({
  hackathon,
  showAllWinners = false,
}: HackathonShowcaseProps) {
  const formatPrizeAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 1000000) {
      return `$${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `$${(numAmount / 1000).toFixed(1)}K`;
    }
    return `$${numAmount.toLocaleString()}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const displayedWinners = showAllWinners
    ? hackathon.winners
    : hackathon.winners.slice(0, 3);
  const totalPrizeDistributed = hackathon.winners.reduce(
    (sum, winner) => sum + parseFloat(winner.prizeAmount),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Hackathon Header */}
      <Card className="overflow-hidden">
        <div className="relative">
          {hackathon.coverImageUrl && (
            <div className="h-48 w-full">
              <OptimizedImage
                src={hackathon.coverImageUrl}
                alt={hackathon.title}
                width={800}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl font-bold mb-2">{hackathon.title}</h1>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>
                  Completed{" "}
                  {format(new Date(hackathon.votingDeadline), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{hackathon.participantCount} participants</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span>
                  {formatPrizeAmount(hackathon.prizeAmount)} prize pool
                </span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-gray-600 leading-relaxed">
                {hackathon.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Organizer:</span>
                  <span className="ml-1">
                    {formatAddress(hackathon.organizerAddress)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Winners:</span>
                  <span className="ml-1">{hackathon.winners.length}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {formatPrizeAmount(totalPrizeDistributed.toString())}{" "}
                  Distributed
                </Badge>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  Completed
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winners Section */}
      {hackathon.winners.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                🏆 Winners ({hackathon.winners.length})
              </CardTitle>
              {!showAllWinners && hackathon.winners.length > 3 && (
                <Link
                  href={`/hackathons/${hackathon.id}/showcase`}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <span>View all winners</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedWinners.map((winner) => (
                <WinnerCard
                  key={`${winner.walletAddress}-${winner.rank}`}
                  winner={winner}
                />
              ))}
            </div>

            {showAllWinners && hackathon.winners.length > 6 && (
              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hackathon.winners.slice(6).map((winner) => (
                    <WinnerCard
                      key={`${winner.walletAddress}-${winner.rank}`}
                      winner={winner}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prize Distribution */}
      {hackathon.winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prize Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hackathon.winners.map((winner) => (
                <div
                  key={`${winner.walletAddress}-${winner.rank}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        winner.rank === 1
                          ? "bg-yellow-100 text-yellow-600"
                          : winner.rank === 2
                            ? "bg-gray-100 text-gray-600"
                            : winner.rank === 3
                              ? "bg-orange-100 text-orange-600"
                              : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      #{winner.rank}
                    </div>
                    <div>
                      <div className="font-medium">
                        {winner.username || formatAddress(winner.walletAddress)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Score: {winner.averageScore.toFixed(1)}/10
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatPrizeAmount(winner.prizeAmount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(
                        (parseFloat(winner.prizeAmount) /
                          parseFloat(hackathon.prizeAmount)) *
                        100
                      ).toFixed(1)}
                      % of pool
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Total Distributed:</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatPrizeAmount(totalPrizeDistributed.toString())}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
                  <span>Distribution Rate:</span>
                  <span>
                    {(
                      (totalPrizeDistributed /
                        parseFloat(hackathon.prizeAmount)) *
                      100
                    ).toFixed(1)}
                    % of total prize pool
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
