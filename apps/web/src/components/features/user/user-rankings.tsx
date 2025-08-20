"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Users,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal,
} from "lucide-react";

interface RankingData {
  rank: number;
  value: any;
  total: number;
}

interface UserRankingInfo {
  userAddress: string;
  rankings: {
    totalEarnings: RankingData & { value: string };
    totalWins: RankingData & { value: number };
    winRate: RankingData & { value: number };
    totalParticipations: RankingData & { value: number };
    averageRank: RankingData & { value: number };
    createdHackathons: RankingData & { value: number };
  };
}

interface UserRankingsProps {
  userAddress: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function UserRankings({
  userAddress,
  showTitle = true,
  compact = false,
}: UserRankingsProps) {
  const [rankings, setRankings] = useState<UserRankingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRankings();
  }, [userAddress]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leaderboard/user/${userAddress}/rankings`,
      );
      const data = await response.json();

      if (data.success) {
        setRankings(data.data);
      } else {
        setError(data.message || "Failed to load rankings");
      }
    } catch (err) {
      setError("Failed to load rankings");
      console.error("Rankings load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number, total: number) => {
    const percentile = (rank / total) * 100;

    if (rank === 1) {
      return {
        icon: Crown,
        color: "text-yellow-500",
        bg: "bg-yellow-50",
        label: "1st",
      };
    } else if (rank === 2) {
      return {
        icon: Medal,
        color: "text-gray-500",
        bg: "bg-gray-50",
        label: "2nd",
      };
    } else if (rank === 3) {
      return {
        icon: Award,
        color: "text-amber-600",
        bg: "bg-amber-50",
        label: "3rd",
      };
    } else if (percentile <= 10) {
      return {
        icon: Trophy,
        color: "text-blue-500",
        bg: "bg-blue-50",
        label: "Top 10%",
      };
    } else if (percentile <= 25) {
      return {
        icon: Target,
        color: "text-green-500",
        bg: "bg-green-50",
        label: "Top 25%",
      };
    } else {
      return {
        icon: Users,
        color: "text-gray-500",
        bg: "bg-gray-50",
        label: `${percentile.toFixed(0)}%`,
      };
    }
  };

  const formatValue = (value: any, type: string) => {
    switch (type) {
      case "totalEarnings":
        return `${parseFloat(value).toLocaleString()} ETH`;
      case "winRate":
        return `${value.toFixed(1)}%`;
      case "averageRank":
        return `#${value.toFixed(1)}`;
      default:
        return value.toString();
    }
  };

  const rankingItems = [
    {
      key: "totalEarnings",
      label: "Total Earnings",
      icon: Trophy,
      color: "text-yellow-600",
    },
    {
      key: "totalWins",
      label: "Total Wins",
      icon: Crown,
      color: "text-purple-600",
    },
    {
      key: "winRate",
      label: "Win Rate",
      icon: Target,
      color: "text-green-600",
    },
    {
      key: "totalParticipations",
      label: "Participations",
      icon: Users,
      color: "text-blue-600",
    },
    {
      key: "averageRank",
      label: "Average Rank",
      icon: Medal,
      color: "text-orange-600",
    },
    {
      key: "createdHackathons",
      label: "Created Hackathons",
      icon: Award,
      color: "text-indigo-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !rankings) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Rankings Not Available
          </h3>
          <p className="text-gray-600">
            {error || "Unable to load user rankings"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900">Rankings</h3>
        )}
        <div className="grid grid-cols-2 gap-3">
          {rankingItems.slice(0, 4).map((item) => {
            const rankingData =
              rankings.rankings[item.key as keyof typeof rankings.rankings];
            const badge = getRankBadge(rankingData.rank, rankingData.total);

            return (
              <div key={item.key} className={`p-3 rounded-lg ${badge.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">
                    #{rankingData.rank}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {badge.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-500" />
          User Rankings
        </h3>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rankingItems.map((item) => {
          const rankingData =
            rankings.rankings[item.key as keyof typeof rankings.rankings];
          const badge = getRankBadge(rankingData.rank, rankingData.total);
          const percentile = (rankingData.rank / rankingData.total) * 100;

          return (
            <Card key={item.key} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Rank Display */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        #{rankingData.rank}
                      </div>
                      <div className="text-sm text-gray-500">
                        of {rankingData.total.toLocaleString()}
                      </div>
                    </div>

                    <div className={`p-2 rounded-full ${badge.bg}`}>
                      <badge.icon className={`h-6 w-6 ${badge.color}`} />
                    </div>
                  </div>

                  {/* Value */}
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Current Value
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formatValue(rankingData.value, item.key)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Percentile</span>
                      <span>{percentile.toFixed(1)}%</span>
                    </div>
                    <Progress value={100 - percentile} className="h-2" />
                  </div>

                  {/* Badge */}
                  <Badge
                    variant="outline"
                    className={`${badge.bg} ${badge.color} border-current`}
                  >
                    {badge.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {
                  Object.values(rankings.rankings).filter((r) => r.rank <= 10)
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Top 10 Rankings</div>
            </div>

            <div>
              <div className="text-2xl font-bold text-blue-600">
                {
                  Object.values(rankings.rankings).filter((r) => r.rank <= 3)
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Podium Finishes</div>
            </div>

            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  Object.values(rankings.rankings).reduce(
                    (sum, r) => sum + (100 - (r.rank / r.total) * 100),
                    0,
                  ) / Object.values(rankings.rankings).length,
                )}
                %
              </div>
              <div className="text-sm text-gray-600">Avg Percentile</div>
            </div>

            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(
                  Object.values(rankings.rankings).reduce(
                    (sum, r) => sum + r.rank,
                    0,
                  ) / Object.values(rankings.rankings).length,
                )}
              </div>
              <div className="text-sm text-gray-600">Avg Rank</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
