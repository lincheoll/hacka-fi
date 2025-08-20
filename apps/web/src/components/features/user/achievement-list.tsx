"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Award,
  Trophy,
  Star,
  Calendar,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Achievement {
  id: string;
  achievementType: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  earnedAt: string | null;
  isEarned: boolean;
  progress?: number;
  metadata?: Record<string, any>;
}

interface AchievementProgress {
  address: string;
  summary: {
    totalAchievements: number;
    earnedCount: number;
    availableCount: number;
    inProgressCount: number;
    completionRate: number;
  };
  achievements: {
    earned: Achievement[];
    inProgress: Achievement[];
    available: Achievement[];
  };
}

interface AchievementListProps {
  userAddress: string;
  showProgress?: boolean;
}

export function AchievementList({
  userAddress,
  showProgress = true,
}: AchievementListProps) {
  const [data, setData] = useState<AchievementProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [userAddress]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const url = showProgress
        ? `/api/achievements/progress/${userAddress}`
        : `/api/achievements/user/${userAddress}?includeProgress=true`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || "Failed to load achievements");
      }
    } catch (err) {
      setError("Failed to load achievements");
      console.error("Achievement load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "epic":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "rare":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "uncommon":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return "shadow-lg shadow-yellow-200";
      case "epic":
        return "shadow-lg shadow-purple-200";
      case "rare":
        return "shadow-lg shadow-blue-200";
      case "uncommon":
        return "shadow-md shadow-green-200";
      default:
        return "";
    }
  };

  const filterAchievements = (achievements: Achievement[]) => {
    return achievements.filter((achievement) => {
      const matchesSearch =
        searchTerm === "" ||
        achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        achievement.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesRarity =
        selectedRarity === null ||
        achievement.rarity.toLowerCase() === selectedRarity.toLowerCase();

      return matchesSearch && matchesRarity;
    });
  };

  const renderAchievementCard = (achievement: Achievement) => {
    return (
      <Card
        key={achievement.id}
        className={`relative overflow-hidden transition-all duration-200 hover:scale-102 ${
          achievement.isEarned
            ? getRarityGlow(achievement.rarity)
            : "opacity-75"
        }`}
      >
        <CardContent className="p-4">
          {/* Achievement Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className={`text-3xl ${achievement.isEarned ? "" : "grayscale opacity-50"}`}
            >
              {achievement.icon}
            </div>
            <div className="flex-1">
              <h3
                className={`font-semibold ${achievement.isEarned ? "text-gray-900" : "text-gray-500"}`}
              >
                {achievement.title}
              </h3>
              <p
                className={`text-sm ${achievement.isEarned ? "text-gray-600" : "text-gray-400"}`}
              >
                {achievement.description}
              </p>
            </div>
          </div>

          {/* Achievement Footer */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={getRarityColor(achievement.rarity)}
            >
              {achievement.rarity}
            </Badge>

            <div className="text-right">
              {achievement.isEarned && achievement.earnedAt ? (
                <div className="text-xs text-gray-500">
                  Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                </div>
              ) : achievement.progress !== undefined ? (
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">
                    Progress: {achievement.progress}%
                  </div>
                  <Progress value={achievement.progress} className="w-16 h-1" />
                </div>
              ) : (
                <div className="text-xs text-gray-400">Not earned</div>
              )}
            </div>
          </div>

          {/* Earned Achievement Overlay */}
          {achievement.isEarned && (
            <div className="absolute top-2 right-2">
              <Award className="w-5 h-5 text-yellow-500" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="w-1/3 h-8 mb-4 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
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
          <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Failed to Load Achievements
          </h3>
          <p className="mb-4 text-gray-600">{error}</p>
          <Button onClick={loadAchievements}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {showProgress && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.earnedCount}
              </div>
              <div className="text-sm text-gray-600">Earned</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.inProgressCount}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.totalAchievements}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="relative mb-2">
                <Progress value={data.summary.completionRate} className="h-2" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.completionRate}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <Input
              placeholder="Search achievements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedRarity === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRarity(null)}
          >
            All
          </Button>
          {["Common", "Uncommon", "Rare", "Epic", "Legendary"].map((rarity) => (
            <Button
              key={rarity}
              variant={selectedRarity === rarity ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedRarity(selectedRarity === rarity ? null : rarity)
              }
            >
              {rarity}
            </Button>
          ))}
        </div>
      </div>

      {/* Achievement Tabs */}
      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earned">
            Earned ({data.summary.earnedCount})
          </TabsTrigger>
          <TabsTrigger value="progress">
            In Progress ({data.summary.inProgressCount})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({data.summary.availableCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="mt-6">
          {filterAchievements(data.achievements.earned).length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterAchievements(data.achievements.earned).map(
                renderAchievementCard,
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No Earned Achievements
                </h3>
                <p className="text-gray-600">
                  Start participating in hackathons to earn your first
                  achievement!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          {filterAchievements(data.achievements.inProgress).length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterAchievements(data.achievements.inProgress).map(
                renderAchievementCard,
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No Achievements in Progress
                </h3>
                <p className="text-gray-600">
                  Keep participating to make progress on achievements!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          {filterAchievements(data.achievements.available).length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterAchievements(data.achievements.available).map(
                renderAchievementCard,
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No Available Achievements
                </h3>
                <p className="text-gray-600">
                  You&apos;ve discovered all available achievements!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
