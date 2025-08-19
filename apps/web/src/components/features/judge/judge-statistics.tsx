"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Vote, Trophy, MessageSquare, BarChart3, Clock } from "lucide-react";
import { type JudgeVotingStatistics } from "@/lib/api-functions";

interface JudgeStatisticsProps {
  statistics: JudgeVotingStatistics;
}

export function JudgeStatistics({ statistics }: JudgeStatisticsProps) {
  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return "No recent activity";

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  const getScoreDistributionData = () => {
    const ranges = ["1-2", "3-4", "5-6", "7-8", "9-10"];
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
      "bg-green-500",
    ];

    const totalVotes = Object.values(statistics.scoreDistribution).reduce(
      (sum, count) => sum + count,
      0,
    );

    return ranges.map((range, index) => ({
      range,
      count: statistics.scoreDistribution[range] || 0,
      percentage:
        totalVotes > 0
          ? ((statistics.scoreDistribution[range] || 0) / totalVotes) * 100
          : 0,
      color: colors[index],
    }));
  };

  const distributionData = getScoreDistributionData();
  const maxCount = Math.max(...distributionData.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Judge Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Vote className="h-4 w-4 mr-1" />
            </div>
            <div className="text-2xl font-bold">
              {statistics.totalVotesCast}
            </div>
            <div className="text-xs text-muted-foreground">Total Votes</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Trophy className="h-4 w-4 mr-1" />
            </div>
            <div className="text-2xl font-bold">
              {statistics.totalHackathonsJudged}
            </div>
            <div className="text-xs text-muted-foreground">Hackathons</div>
          </div>
        </div>

        {/* Average Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Average Score</span>
            <Badge variant="secondary">
              {statistics.averageScore.toFixed(1)}/10
            </Badge>
          </div>
          <Progress value={statistics.averageScore * 10} className="h-2" />
        </div>

        {/* Comment Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Comments Rate</span>
            </div>
            <span className="text-sm">
              {statistics.commentPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={statistics.commentPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {statistics.votesWithComments} of {statistics.totalVotesCast} votes
            with comments
          </div>
        </div>

        {/* Score Distribution */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Score Distribution</span>
          </div>
          <div className="space-y-2">
            {distributionData.map((data) => (
              <div key={data.range} className="flex items-center gap-3">
                <div className="w-8 text-xs text-muted-foreground">
                  {data.range}
                </div>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${data.color} transition-all duration-300`}
                    style={{
                      width: `${maxCount > 0 ? (data.count / maxCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="w-8 text-xs text-right">{data.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Activity */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Last activity: {formatLastActivity(statistics.lastVotingActivity)}
            </span>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="font-medium text-sm mb-2">Performance Insights</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            {statistics.averageScore > 7 && (
              <div>• You tend to give higher scores than average</div>
            )}
            {statistics.averageScore < 5 && (
              <div>• You tend to be more critical in scoring</div>
            )}
            {statistics.commentPercentage > 80 && (
              <div>
                • Excellent feedback rate - keep providing detailed comments!
              </div>
            )}
            {statistics.commentPercentage < 50 && (
              <div>
                • Consider adding more detailed comments to help participants
              </div>
            )}
            {statistics.totalHackathonsJudged > 10 && (
              <div>
                • Experienced judge with {statistics.totalHackathonsJudged}{" "}
                hackathons
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
