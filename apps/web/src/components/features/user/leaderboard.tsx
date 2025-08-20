"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  Users,
  Target,
  Crown,
  Star,
  TrendingUp,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { UserProfileCard } from "./user-profile-card";

interface LeaderboardEntry {
  rank: number;
  userAddress: string;
  username?: string;
  avatarUrl?: string;
  value: number | string;
  change?: number;
  metadata?: Record<string, any>;
}

interface LeaderboardResponse {
  category: string;
  entries: LeaderboardEntry[];
  total: number;
  lastUpdated: string;
  period?: string;
}

type LeaderboardCategory =
  | "total-earnings"
  | "total-wins"
  | "win-rate"
  | "total-participations"
  | "average-rank"
  | "created-hackathons"
  | "achievements-count";

interface LeaderboardProps {
  defaultCategory?: LeaderboardCategory;
  limit?: number;
  showPeriodFilter?: boolean;
  compact?: boolean;
}

export function Leaderboard({
  defaultCategory = "total-earnings",
  limit = 50,
  showPeriodFilter = true,
  compact = false,
}: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<LeaderboardCategory>(defaultCategory);
  const [period, setPeriod] = useState<"all-time" | "monthly" | "weekly">(
    "all-time",
  );
  const [displayLimit, setDisplayLimit] = useState(limit);

  const categories = useMemo(
    () => [
      {
        id: "total-earnings",
        label: "Top Earners",
        icon: Trophy,
        color: "text-yellow-600",
      },
      {
        id: "total-wins",
        label: "Most Wins",
        icon: Crown,
        color: "text-purple-600",
      },
      {
        id: "win-rate",
        label: "Best Win Rate",
        icon: Target,
        color: "text-green-600",
      },
      {
        id: "total-participations",
        label: "Most Active",
        icon: Users,
        color: "text-blue-600",
      },
      {
        id: "average-rank",
        label: "Best Performers",
        icon: Star,
        color: "text-orange-600",
      },
      {
        id: "created-hackathons",
        label: "Top Creators",
        icon: Medal,
        color: "text-indigo-600",
      },
      {
        id: "achievements-count",
        label: "Achievement Leaders",
        icon: Award,
        color: "text-pink-600",
      } as const,
    ],
    [],
  );

  useEffect(() => {
    loadLeaderboard();
  }, [selectedCategory, period, displayLimit]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: displayLimit.toString(),
        offset: "0",
        period,
      });

      const response = await fetch(
        `/api/leaderboard/${selectedCategory}?${params}`,
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.message || "Failed to load leaderboard");
      }
    } catch (err) {
      setError("Failed to load leaderboard");
      console.error("Leaderboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (
    value: number | string,
    category: LeaderboardCategory,
  ) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    switch (category) {
      case "total-earnings":
        return `${numValue.toLocaleString()} ETH`;
      case "win-rate":
        return `${numValue.toFixed(1)}%`;
      case "average-rank":
        return `#${numValue.toFixed(1)}`;
      default:
        return numValue.toString();
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
      default:
        return rank <= 10
          ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
          : "bg-gray-100 text-gray-700";
    }
  };

  const currentCategory = useMemo(() => {
    return categories.find((cat) => cat.id === selectedCategory);
  }, [categories, selectedCategory]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="w-1/3 h-8 mb-4 bg-gray-200 rounded" />
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Failed to Load Leaderboard
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={loadLeaderboard}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            {currentCategory && (
              <currentCategory.icon
                className={`h-7 w-7 ${currentCategory.color}`}
              />
            )}
            {currentCategory?.label}
          </h2>
          <p className="text-gray-600">
            Showing top {data.entries.length} of {data.total} users
            {showPeriodFilter && <span className="ml-1">• {period}</span>}
          </p>
        </div>

        <div className="flex gap-2">
          {showPeriodFilter && (
            <>
              <Button
                variant={period === "all-time" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("all-time")}
              >
                All Time
              </Button>
              <Button
                variant={period === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={period === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("weekly")}
              >
                Weekly
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(value) =>
          setSelectedCategory(value as LeaderboardCategory)
        }
      >
        <TabsList className="grid w-full h-auto grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex flex-col items-center gap-1 p-2 text-xs"
            >
              <category.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            {/* Top 3 Podium */}
            {data.entries.length >= 3 && !compact && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Second Place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="flex items-end justify-center w-20 h-16 pb-2 rounded-t-lg bg-gradient-to-t from-gray-300 to-gray-400">
                      <span className="text-2xl font-bold text-white">2</span>
                    </div>
                  </div>
                  <UserProfileCard
                    walletAddress={data.entries[1].userAddress}
                    username={data.entries[1].username}
                    avatarUrl={data.entries[1].avatarUrl}
                    compact
                    showViewProfile={false}
                  />
                  <div className="mt-2 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {formatValue(data.entries[1].value, selectedCategory)}
                    </div>
                  </div>
                </div>

                {/* First Place */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="relative mb-4">
                    <div className="flex items-end justify-center w-24 h-20 pb-2 rounded-t-lg bg-gradient-to-t from-yellow-400 to-yellow-500">
                      <span className="text-3xl font-bold text-white">1</span>
                    </div>
                    <Crown className="absolute w-8 h-8 text-yellow-500 transform -translate-x-1/2 -top-8 left-1/2" />
                  </div>
                  <UserProfileCard
                    walletAddress={data.entries[0].userAddress}
                    username={data.entries[0].username}
                    avatarUrl={data.entries[0].avatarUrl}
                    compact
                    showViewProfile={false}
                  />
                  <div className="mt-2 text-center">
                    <div className="text-xl font-bold text-yellow-600">
                      {formatValue(data.entries[0].value, selectedCategory)}
                    </div>
                  </div>
                </div>

                {/* Third Place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="flex items-end justify-center w-16 h-12 pb-2 rounded-t-lg bg-gradient-to-t from-amber-400 to-amber-500">
                      <span className="text-xl font-bold text-white">3</span>
                    </div>
                  </div>
                  <UserProfileCard
                    walletAddress={data.entries[2].userAddress}
                    username={data.entries[2].username}
                    avatarUrl={data.entries[2].avatarUrl}
                    compact
                    showViewProfile={false}
                  />
                  <div className="mt-2 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {formatValue(data.entries[2].value, selectedCategory)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-2">
              {data.entries.map((entry, index) => (
                <Card
                  key={entry.userAddress}
                  className={`transition-all duration-200 hover:shadow-md ${
                    entry.rank <= 3 && !compact ? "border-2 border-dashed" : ""
                  } ${
                    entry.rank === 1
                      ? "border-yellow-300 bg-yellow-50"
                      : entry.rank === 2
                        ? "border-gray-300 bg-gray-50"
                        : entry.rank === 3
                          ? "border-amber-300 bg-amber-50"
                          : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadgeColor(entry.rank)}`}
                      >
                        {entry.rank <= 3 ? (
                          getRankIcon(entry.rank)
                        ) : (
                          <span className="text-lg font-bold">
                            #{entry.rank}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex items-center flex-1 gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={entry.avatarUrl}
                            alt={entry.username || "User"}
                          />
                          <AvatarFallback>
                            {entry.username?.[0]?.toUpperCase() ||
                              entry.userAddress.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {entry.username || "Anonymous User"}
                          </h3>
                          <p className="font-mono text-sm text-gray-500">
                            {entry.userAddress.slice(0, 6)}...
                            {entry.userAddress.slice(-4)}
                          </p>
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {formatValue(entry.value, selectedCategory)}
                        </div>
                        {entry.change !== undefined && (
                          <div
                            className={`text-sm flex items-center gap-1 ${
                              entry.change > 0
                                ? "text-green-600"
                                : entry.change < 0
                                  ? "text-red-600"
                                  : "text-gray-500"
                            }`}
                          >
                            {entry.change > 0 && (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {entry.change !== 0 && Math.abs(entry.change)}
                          </div>
                        )}
                      </div>

                      {/* View Profile */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          (window.location.href = `/profile/${entry.userAddress}`)
                        }
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Load More */}
            {data.entries.length < data.total && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setDisplayLimit((prev) => prev + 25)}
                  disabled={loading}
                >
                  Load More ({data.total - data.entries.length} remaining)
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Last Updated */}
      <div className="text-sm text-center text-gray-500">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
