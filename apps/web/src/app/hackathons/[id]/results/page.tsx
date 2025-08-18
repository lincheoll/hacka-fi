"use client";
export const dynamic = "force-dynamic";

import { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Award,
  Star,
  MessageSquare,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { fetchHackathon, fetchVotingResults } from "@/lib/api-functions";
import { HackathonStatusBadge } from "@/components/features/hackathon/hackathon-status-badge";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch hackathon details
  const {
    data: hackathon,
    isLoading: isLoadingHackathon,
    error: hackathonError,
  } = useQuery({
    queryKey: ["hackathon", id],
    queryFn: () => fetchHackathon(id),
    enabled: !!id && mounted,
  });

  // Fetch voting results
  const {
    data: results,
    isLoading: isLoadingResults,
    error: resultsError,
  } = useQuery({
    queryKey: ["voting-results", id],
    queryFn: () => fetchVotingResults(id),
    enabled: !!id && mounted,
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingHackathon || isLoadingResults) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (hackathonError || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-700">
              {hackathonError?.message || "Hackathon not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (resultsError || !results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hackathon
          </Button>

          <Alert className="border-yellow-500 bg-yellow-50">
            <AlertDescription className="text-yellow-700">
              Voting results are not yet available. Please check back later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Sort participants by ranking data (if available) or average score
  const sortedParticipants = [...results.participants].sort((a, b) => {
    // If ranking data is available, use rank
    if (a.rank !== undefined && b.rank !== undefined) {
      return a.rank - b.rank;
    }
    // If weighted scores are available, prefer them
    if (a.weightedScore !== undefined && b.weightedScore !== undefined) {
      return b.weightedScore - a.weightedScore;
    }
    // Fallback to average score
    return b.averageScore - a.averageScore;
  });

  // Get top 3 winners
  const winners = sortedParticipants.slice(0, 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="h-6 w-6 flex items-center justify-center text-gray-500 font-bold">
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">🥇 1st Place</Badge>;
      case 2:
        return <Badge className="bg-gray-400 text-white">🥈 2nd Place</Badge>;
      case 3:
        return <Badge className="bg-amber-600 text-white">🥉 3rd Place</Badge>;
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hackathon
          </Button>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Results & Rankings
              </h1>
              <h2 className="text-xl text-gray-700 dark:text-gray-300 mb-2">
                {hackathon.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Final voting results and winner announcements
              </p>
            </div>
            <HackathonStatusBadge status={hackathon.status} size="lg" />
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.totalParticipants}
                </div>
                <div className="text-sm text-gray-600">Total Participants</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.participants.filter((p) => p.submissionUrl).length}
                </div>
                <div className="text-sm text-gray-600">Submissions</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.totalJudges}
                </div>
                <div className="text-sm text-gray-600">Judges</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {results.participants.reduce(
                    (sum, p) => sum + p.totalVotes,
                    0,
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Votes</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Winners Podium */}
        {winners.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Winners
              </CardTitle>
              <CardDescription>
                Congratulations to our top performers!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {winners.map((participant, index) => (
                  <div key={participant.participantId} className="text-center">
                    <div className="mb-4">{getRankIcon(index + 1)}</div>
                    <div className="font-medium text-lg mb-2">
                      {participant.walletAddress.slice(0, 6)}...
                      {participant.walletAddress.slice(-4)}
                    </div>
                    {getRankBadge(index + 1)}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">
                          {participant.weightedScore !== undefined
                            ? participant.weightedScore.toFixed(1)
                            : participant.averageScore.toFixed(1)}
                          /10
                        </span>
                      </div>
                      {participant.weightedScore !== undefined && (
                        <div className="text-xs text-gray-500">
                          Raw: {participant.averageScore.toFixed(1)} | Weighted
                          Score
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        {participant.totalVotes} votes
                      </div>
                    </div>
                    {participant.submissionUrl && (
                      <a
                        href={participant.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline text-sm mt-2"
                      >
                        View Project
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Complete Results
            </CardTitle>
            <CardDescription>
              All participants ranked by average score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedParticipants.map((participant, index) => (
                <div
                  key={participant.participantId}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        {index < 3 ? (
                          getRankIcon(index + 1)
                        ) : (
                          <span className="text-sm font-bold text-gray-600">
                            #{index + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {participant.walletAddress.slice(0, 6)}...
                          {participant.walletAddress.slice(-4)}
                        </div>
                        {participant.submissionUrl && (
                          <a
                            href={participant.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            View Submission
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-lg">
                          {participant.weightedScore !== undefined
                            ? participant.weightedScore.toFixed(1)
                            : participant.averageScore.toFixed(1)}
                          /10
                        </span>
                      </div>
                      {participant.rankTier && (
                        <Badge
                          variant={
                            participant.rankTier === "winner"
                              ? "default"
                              : "outline"
                          }
                          className={`text-xs mb-1 ${
                            participant.rankTier === "winner"
                              ? "bg-yellow-500 text-white"
                              : participant.rankTier === "runner-up"
                                ? "bg-gray-400 text-white"
                                : ""
                          }`}
                        >
                          {participant.rankTier === "winner"
                            ? "🏆 Winner"
                            : participant.rankTier === "runner-up"
                              ? "🥈 Runner-up"
                              : "Participant"}
                        </Badge>
                      )}
                      <div className="text-sm text-gray-600">
                        {participant.totalVotes} votes
                        {participant.rank && (
                          <div className="text-xs">
                            Rank #{participant.rank}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Advanced Score Breakdown */}
                  {participant.scoreBreakdown && (
                    <div className="border-t pt-3 mb-3">
                      <div className="text-sm font-medium mb-2">
                        Score Breakdown:
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <div className="font-medium">
                            {participant.scoreBreakdown.simple.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Simple Avg</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded text-center">
                          <div className="font-medium">
                            {participant.scoreBreakdown.weighted.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Weighted</div>
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-center">
                          <div className="font-medium">
                            {participant.scoreBreakdown.normalized.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Normalized</div>
                        </div>
                        <div className="bg-orange-50 p-2 rounded text-center">
                          <div className="font-medium">
                            {participant.scoreBreakdown.consensus.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Consensus</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Individual Votes */}
                  {participant.votes.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-2 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Judge Votes:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {participant.votes.map((vote) => (
                          <div key={vote.id} className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-600">
                                {vote.judgeAddress.slice(0, 6)}...
                                {vote.judgeAddress.slice(-4)}
                              </span>
                              <span className="font-medium">
                                {vote.score}/10
                              </span>
                            </div>
                            {vote.comment && (
                              <p className="text-gray-700 text-xs">
                                {vote.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ranking Metrics */}
        {results.rankingMetrics && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ranking Statistics
              </CardTitle>
              <CardDescription>
                Statistical analysis of the voting results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.rankingMetrics.averageParticipation.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Avg Votes/Participant
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {results.rankingMetrics.scoreDistribution.mean.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Mean Score</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.rankingMetrics.scoreDistribution.median.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Median Score</div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.rankingMetrics.scoreDistribution.standardDeviation.toFixed(
                      1,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Std Deviation</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-1">Score Range</div>
                  <div className="text-lg font-bold">
                    {results.rankingMetrics.scoreDistribution.min.toFixed(1)} -{" "}
                    {results.rankingMetrics.scoreDistribution.max.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Minimum to Maximum Score
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-1">Vote Coverage</div>
                  <div className="text-lg font-bold">
                    {(
                      (results.rankingMetrics.averageParticipation /
                        results.rankingMetrics.totalJudges) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-xs text-gray-600">
                    Average Participation Rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="mt-8">
          <Alert className="border-blue-500 bg-blue-50">
            <BarChart3 className="h-4 w-4" />
            <AlertDescription className="text-blue-700">
              <strong>Advanced Ranking System:</strong> Scores use weighted
              algorithms considering voting participation, consensus among
              judges, and normalized scoring to ensure fair rankings. The final
              rank is determined by weighted scores with tie-breaking logic.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
