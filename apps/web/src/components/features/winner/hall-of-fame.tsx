"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PublicTopWinner, PaginatedResponse } from "@/types/public-api";
import { publicApi } from "@/lib/public-api";
import { Trophy, Medal, Award, ChevronLeft, ChevronRight } from "lucide-react";

export function HallOfFame() {
  const [winners, setWinners] =
    useState<PaginatedResponse<PublicTopWinner> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadWinners = async (page: number, order: "asc" | "desc" = "desc") => {
    try {
      setLoading(true);
      const data = await publicApi.getHallOfFame({
        page,
        limit: 20,
        sortOrder: order,
      });
      setWinners(data);
      setCurrentPage(page);
      setSortOrder(order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load hall of fame",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWinners(1);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (numAmount >= 1000000) {
      return `$${(numAmount / 1000000).toFixed(1)}M`;
    } else if (numAmount >= 1000) {
      return `$${(numAmount / 1000).toFixed(1)}K`;
    }
    return `$${numAmount.toLocaleString()}`;
  };

  const getRankIcon = (index: number, page: number) => {
    const globalRank = (page - 1) * 20 + index + 1;
    if (globalRank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (globalRank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (globalRank === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return (
      <span className="text-sm font-bold text-gray-600">#{globalRank}</span>
    );
  };

  const getRankBadge = (index: number, page: number) => {
    const globalRank = (page - 1) * 20 + index + 1;
    if (globalRank === 1)
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (globalRank === 2) return "bg-gray-100 text-gray-800 border-gray-300";
    if (globalRank === 3)
      return "bg-orange-100 text-orange-800 border-orange-300";
    if (globalRank <= 10) return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-gray-50 text-gray-600 border-gray-200";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 animate-pulse"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !winners) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Failed to load hall of fame</p>
        <Button onClick={() => loadWinners(1)} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-3">
          <Trophy className="w-10 h-10 text-yellow-500" />
          <span>Hall of Fame</span>
        </h1>
        <p className="text-gray-600 mb-6">
          Top performers across all hackathons on Hacka-Fi
        </p>

        <div className="flex justify-center space-x-2">
          <Button
            variant={sortOrder === "desc" ? "default" : "outline"}
            size="sm"
            onClick={() => loadWinners(1, "desc")}
          >
            Highest Earnings
          </Button>
          <Button
            variant={sortOrder === "asc" ? "default" : "outline"}
            size="sm"
            onClick={() => loadWinners(1, "asc")}
          >
            Lowest Earnings
          </Button>
        </div>
      </div>

      {/* Top 3 Podium */}
      {currentPage === 1 && winners.data.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {winners.data.slice(0, 3).map((winner, index) => (
            <Card
              key={winner.walletAddress}
              className={`relative overflow-hidden ${
                index === 0
                  ? "ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100"
                  : index === 1
                    ? "ring-2 ring-gray-400 bg-gradient-to-br from-gray-50 to-gray-100"
                    : "ring-2 ring-orange-400 bg-gradient-to-br from-orange-50 to-orange-100"
              }`}
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  index === 0
                    ? "bg-yellow-400"
                    : index === 1
                      ? "bg-gray-400"
                      : "bg-orange-400"
                }`}
              ></div>

              <CardContent className="p-6 text-center">
                <div className="mb-4">{getRankIcon(index, 1)}</div>

                <Avatar className="w-16 h-16 mx-auto mb-4">
                  <img
                    src={
                      winner.avatarUrl ||
                      `https://avatar.iran.liara.run/public/${winner.walletAddress.slice(-1)}`
                    }
                    alt={winner.username || "User avatar"}
                    className="w-full h-full object-cover"
                  />
                </Avatar>

                <h3 className="font-bold text-lg mb-1">
                  {winner.username || formatAddress(winner.walletAddress)}
                </h3>

                {winner.username && (
                  <p className="text-sm text-gray-500 mb-3">
                    {formatAddress(winner.walletAddress)}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(winner.totalEarnings)}
                  </div>
                  <div className="flex justify-center space-x-4 text-sm text-gray-600">
                    <span>{winner.totalWins} wins</span>
                    <span>{(winner.winRate * 100).toFixed(1)}% rate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Complete Rankings</span>
            <Badge variant="outline">{winners.total} total winners</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {winners.data.map((winner, index) => (
              <div
                key={winner.walletAddress}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
                  (currentPage - 1) * 20 + index < 3
                    ? "bg-gradient-to-r from-yellow-50 via-gray-50 to-orange-50"
                    : "bg-white"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    {getRankIcon(index, currentPage)}
                  </div>

                  <Avatar className="w-10 h-10">
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
                    <div className="font-medium">
                      {winner.username || formatAddress(winner.walletAddress)}
                    </div>
                    {winner.username && (
                      <div className="text-sm text-gray-500">
                        {formatAddress(winner.walletAddress)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {winner.totalWins}
                    </div>
                    <div className="text-xs text-gray-500">Wins</div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {(winner.winRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Rate</div>
                  </div>

                  <div className="text-center">
                    <Badge className={getRankBadge(index, currentPage)}>
                      #{(currentPage - 1) * 20 + index + 1}
                    </Badge>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(winner.totalEarnings)}
                    </div>
                    <div className="text-xs text-gray-500">Total earned</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {winners.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 20 + 1} to{" "}
                {Math.min(currentPage * 20, winners.total)} of {winners.total}{" "}
                winners
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadWinners(currentPage - 1, sortOrder)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, winners.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => loadWinners(page, sortOrder)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadWinners(currentPage + 1, sortOrder)}
                  disabled={currentPage >= winners.totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
