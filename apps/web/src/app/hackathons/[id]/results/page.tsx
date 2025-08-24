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
import {
  fetchHackathon,
  fetchVotingResults,
  getWinners,
  areWinnersFinalized,
} from "@/lib/api-functions";
import { HackathonStatusBadge } from "@/components/features/hackathon/hackathon-status-badge";
import { PrizeDistributionChart } from "@/components/features/hackathon/prize-distribution-chart";
import { WinnersPodium } from "@/components/features/hackathon/winners-podium";
import { WinnerAnnouncement } from "@/components/features/hackathon/winner-announcement";
import { ResultsExport } from "@/components/features/hackathon/results-export";

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

  // Fetch winner information
  const { data: winnerData, isLoading: isLoadingWinners } = useQuery({
    queryKey: ["winners", id],
    queryFn: () => getWinners(id),
    enabled: !!id && mounted,
    retry: false, // Don't retry if winners aren't available yet
  });

  // Fetch winner status
  const { data: winnerStatus, isLoading: isLoadingWinnerStatus } = useQuery({
    queryKey: ["winner-status", id],
    queryFn: () => areWinnersFinalized(id),
    enabled: !!id && mounted,
    retry: false,
  });

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <div className="space-y-4 animate-pulse">
            <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
            <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (
    isLoadingHackathon ||
    isLoadingResults ||
    isLoadingWinners ||
    isLoadingWinnerStatus
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <div className="space-y-4 animate-pulse">
            <div className="w-1/2 h-8 bg-gray-200 rounded"></div>
            <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (hackathonError || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
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
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="flex items-center justify-center w-6 h-6 font-bold text-gray-500">
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="text-white bg-yellow-500">🥇 1st Place</Badge>;
      case 2:
        return <Badge className="text-white bg-gray-400">🥈 2nd Place</Badge>;
      case 3:
        return <Badge className="text-white bg-amber-600">🥉 3rd Place</Badge>;
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container px-4 py-8 mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hackathon
          </Button>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Results & Rankings
              </h1>
              <h2 className="mb-2 text-xl text-gray-700">{hackathon.title}</h2>
              <p className="text-gray-600">
                Final voting results and winner announcements
              </p>
            </div>
            <HackathonStatusBadge status={hackathon.status} size="lg" />
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-4">
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

        {/* Winner Announcement & Podium */}
        {winnerData && winnerData.winners && winnerData.winners.length > 0 && (
          <div className="mb-8 space-y-6">
            <WinnerAnnouncement
              winners={winnerData.winners}
              hackathonTitle={hackathon.title}
              hackathonId={id}
              totalPrizePool={winnerData.totalPrizePool || "0"}
              currency="KAIA"
              showAnimation={false}
            />
          </div>
        )}

        {/* Winners Podium (fallback to basic results if no winner data) */}
        {winnerData?.winners && winnerData.winners.length > 0 ? (
          <div className="mb-8">
            <WinnersPodium
              winners={winnerData.winners}
              prizeDistribution={winnerData.prizeDistribution}
              currency="KAIA"
            />
          </div>
        ) : (
          winners.length > 0 && (
            <Card className="mb-8 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Winners
                </CardTitle>
                <CardDescription>
                  Congratulations to our top performers!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {winners.map((participant, index) => (
                    <div
                      key={participant.participantId}
                      className="text-center"
                    >
                      <div className="mb-4">{getRankIcon(index + 1)}</div>
                      <div className="mb-2 text-lg font-medium">
                        {participant.walletAddress.slice(0, 6)}...
                        {participant.walletAddress.slice(-4)}
                      </div>
                      {getRankBadge(index + 1)}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold">
                            {participant.weightedScore !== undefined
                              ? participant.weightedScore.toFixed(1)
                              : participant.averageScore.toFixed(1)}
                            /10
                          </span>
                        </div>
                        {participant.weightedScore !== undefined && (
                          <div className="text-xs text-gray-500">
                            Raw: {participant.averageScore.toFixed(1)} |
                            Weighted Score
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
                          className="inline-flex items-center mt-2 text-sm text-blue-600 hover:underline"
                        >
                          View Project
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Prize Distribution Chart */}
        {winnerData &&
          winnerData.prizeDistribution &&
          winnerData.prizeDistribution.length > 0 && (
            <div className="mb-8">
              <PrizeDistributionChart
                prizeDistribution={winnerData.prizeDistribution}
                totalPrizePool={winnerData.totalPrizePool || "0"}
                currency="KAIA"
              />
            </div>
          )}

        {/* Results Export */}
        <div className="mb-8">
          <ResultsExport
            hackathonId={id}
            hackathonTitle={hackathon.title}
            isCompleted={winnerStatus?.finalized || false}
          />
        </div>

        {/* Full Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
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
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
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
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            View Submission
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-lg font-bold">
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
                    <div className="pt-3 mb-3 border-t">
                      <div className="mb-2 text-sm font-medium">
                        Score Breakdown:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                        <div className="p-2 text-center rounded bg-blue-50">
                          <div className="font-medium">
                            {participant.scoreBreakdown.simple.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Simple Avg</div>
                        </div>
                        <div className="p-2 text-center rounded bg-green-50">
                          <div className="font-medium">
                            {participant.scoreBreakdown.weighted.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Weighted</div>
                        </div>
                        <div className="p-2 text-center rounded bg-purple-50">
                          <div className="font-medium">
                            {participant.scoreBreakdown.normalized.toFixed(1)}
                          </div>
                          <div className="text-gray-600">Normalized</div>
                        </div>
                        <div className="p-2 text-center rounded bg-orange-50">
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
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-1 mb-2 text-sm font-medium">
                        <MessageSquare className="w-3 h-3" />
                        Judge Votes:
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        {participant.votes.map((vote) => (
                          <div key={vote.id} className="p-2 rounded bg-gray-50">
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
                              <p className="text-xs text-gray-700">
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
                <BarChart3 className="w-5 h-5" />
                Ranking Statistics
              </CardTitle>
              <CardDescription>
                Statistical analysis of the voting results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 text-center rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-600">
                    {results.rankingMetrics.averageParticipation.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Avg Votes/Participant
                  </div>
                </div>

                <div className="p-4 text-center rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-600">
                    {results.rankingMetrics.scoreDistribution.mean.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Mean Score</div>
                </div>

                <div className="p-4 text-center rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-600">
                    {results.rankingMetrics.scoreDistribution.median.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">Median Score</div>
                </div>

                <div className="p-4 text-center rounded-lg bg-orange-50">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.rankingMetrics.scoreDistribution.standardDeviation.toFixed(
                      1,
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Std Deviation</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="mb-1 text-sm font-medium">Score Range</div>
                  <div className="text-lg font-bold">
                    {results.rankingMetrics.scoreDistribution.min.toFixed(1)} -{" "}
                    {results.rankingMetrics.scoreDistribution.max.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">
                    Minimum to Maximum Score
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50">
                  <div className="mb-1 text-sm font-medium">Vote Coverage</div>
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
            <BarChart3 className="w-4 h-4" />
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
