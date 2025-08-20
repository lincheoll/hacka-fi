"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy,
  Award,
  Users,
  Calendar,
  Target,
  Star,
  Edit3,
  Share2,
  ExternalLink,
} from "lucide-react";

interface UserStats {
  totalParticipations: number;
  totalWins: number;
  winRate: number;
  totalEarnings: string;
  averageRank: number;
  createdHackathons: number;
  achievementsCount: number;
}

interface UserProfileData {
  walletAddress: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  twitterHandle?: string;
  githubHandle?: string;
  discordHandle?: string;
  website?: string;
  skills: string[];
  stats: UserStats;
}

interface Achievement {
  id: string;
  achievementType: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  earnedAt: string;
}

interface UserProfileProps {
  address: string;
  isOwnProfile?: boolean;
}

export function UserProfile({
  address,
  isOwnProfile = false,
}: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
    loadUserAchievements();
  }, [address]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/profile/${address}`);
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
      } else {
        setError(data.message || "Failed to load profile");
      }
    } catch (err) {
      setError("Failed to load profile");
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAchievements = async () => {
    try {
      const response = await fetch(`/api/achievements/user/${address}`);
      const data = await response.json();

      if (data.success) {
        setAchievements(data.data.achievements);
      }
    } catch (err) {
      console.error("Achievements load error:", err);
    }
  };

  const handleEditProfile = () => {
    // Navigate to edit profile page or open modal
    window.location.href = "/profile/edit";
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${address}`;
    try {
      await navigator.share({
        title: `${profile?.username || "User"}'s Profile - HackaFi`,
        text: `Check out ${profile?.username || "this user"}'s hackathon profile!`,
        url: profileUrl,
      });
    } catch (err) {
      // Fallback to clipboard
      navigator.clipboard.writeText(profileUrl);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "legendary":
        return "text-yellow-500 border-yellow-500";
      case "epic":
        return "text-purple-500 border-purple-500";
      case "rare":
        return "text-blue-500 border-blue-500";
      case "uncommon":
        return "text-green-500 border-green-500";
      default:
        return "text-gray-500 border-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Profile Not Found
            </h3>
            <p className="text-gray-600">
              {error || "This user profile does not exist."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarImage
                src={profile.avatarUrl}
                alt={profile.username || "User Avatar"}
              />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {profile.username?.[0]?.toUpperCase() ||
                  profile.walletAddress.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {profile.username || "Anonymous User"}
                </h1>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditProfile}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareProfile}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {formatAddress(profile.walletAddress)}
                </code>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {profile.bio && (
                <p className="text-gray-700 max-w-2xl">{profile.bio}</p>
              )}

              {/* Social Links */}
              <div className="flex gap-4 pt-2">
                {profile.twitterHandle && (
                  <a
                    href={`https://twitter.com/${profile.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    @{profile.twitterHandle}
                  </a>
                )}
                {profile.githubHandle && (
                  <a
                    href={`https://github.com/${profile.githubHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-gray-800"
                  >
                    GitHub
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                  >
                    Website
                  </a>
                )}
              </div>

              {/* Skills */}
              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.totalParticipations}
            </div>
            <div className="text-sm text-gray-600">Participations</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.totalWins}
            </div>
            <div className="text-sm text-gray-600">Wins</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-8 w-8 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profile.stats.achievementsCount}
            </div>
            <div className="text-sm text-gray-600">Achievements</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats & Achievements */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Win Rate</span>
                    <span>{profile.stats.winRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={profile.stats.winRate} className="h-2" />
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Earnings:</span>
                    <span className="font-mono">
                      {parseFloat(profile.stats.totalEarnings).toLocaleString()}{" "}
                      ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Rank:</span>
                    <span>#{profile.stats.averageRank.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created Hackathons:</span>
                    <span>{profile.stats.createdHackathons}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievement Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {achievements.length}
                  </div>
                  <p className="text-gray-600">Achievements Unlocked</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <Badge
                            variant="outline"
                            className={getRarityColor(achievement.rarity)}
                          >
                            {achievement.rarity}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(
                              achievement.earnedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Achievements Yet
                </h3>
                <p className="text-gray-600">
                  Participate in hackathons to start earning achievements!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Participation History
              </h3>
              <p className="text-gray-600">
                Detailed participation history coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
