"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, Target, ExternalLink, Star, Award } from "lucide-react";

interface UserStats {
  totalParticipations: number;
  totalWins: number;
  winRate: number;
  totalEarnings: string;
  achievementsCount: number;
}

interface UserProfileCardProps {
  walletAddress: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  skills?: string[];
  stats?: UserStats;
  compact?: boolean;
  showViewProfile?: boolean;
  onViewProfile?: () => void;
}

export function UserProfileCard({
  walletAddress,
  username,
  bio,
  avatarUrl,
  skills = [],
  stats,
  compact = false,
  showViewProfile = true,
  onViewProfile,
}: UserProfileCardProps) {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile();
    } else {
      window.location.href = `/profile/${walletAddress}`;
    }
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={username || "User"} />
              <AvatarFallback className="text-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {username?.[0]?.toUpperCase() ||
                  walletAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {username || "Anonymous User"}
              </h3>
              <p className="text-sm text-gray-500 font-mono">
                {formatAddress(walletAddress)}
              </p>
            </div>

            {stats && (
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {stats.totalWins}
                  </div>
                  <div className="text-gray-500">Wins</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {stats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-gray-500">Rate</div>
                </div>
              </div>
            )}

            {showViewProfile && (
              <Button variant="outline" size="sm" onClick={handleViewProfile}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar and Basic Info */}
          <div className="space-y-2">
            <Avatar className="h-16 w-16 border-2 border-white shadow-md">
              <AvatarImage src={avatarUrl} alt={username || "User"} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {username?.[0]?.toUpperCase() ||
                  walletAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {username || "Anonymous User"}
              </h3>
              <p className="text-sm text-gray-500 font-mono">
                {formatAddress(walletAddress)}
              </p>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">{bio}</p>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 max-w-xs">
              {skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{skills.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="w-full space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <Users className="h-4 w-4 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {stats.totalParticipations}
                  </div>
                  <div className="text-xs text-gray-500">Participations</div>
                </div>

                <div>
                  <div className="flex items-center justify-center text-yellow-600 mb-1">
                    <Trophy className="h-4 w-4 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {stats.totalWins}
                  </div>
                  <div className="text-xs text-gray-500">Wins</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center text-green-600 mb-1">
                    <Target className="h-4 w-4 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {stats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Win Rate</div>
                </div>

                <div>
                  <div className="flex items-center justify-center text-purple-600 mb-1">
                    <Award className="h-4 w-4 mr-1" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {stats.achievementsCount}
                  </div>
                  <div className="text-xs text-gray-500">Achievements</div>
                </div>
              </div>

              {stats.totalEarnings !== "0" && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600 mb-1">
                    Total Earnings
                  </div>
                  <div className="font-mono text-lg font-bold text-green-600">
                    {parseFloat(stats.totalEarnings).toLocaleString()} ETH
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Profile Button */}
          {showViewProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewProfile}
              className="w-full"
            >
              View Profile
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
