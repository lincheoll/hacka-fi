'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Trophy, Medal, Award, DollarSign, Users, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateWinners, finalizeWinners, getWinners, areWinnersFinalized } from '@/lib/api-functions';
import { useToast } from '@/hooks/use-toast';
import { formatEther } from 'viem';
import React from 'react';
import type { WinnerDeterminationResponse } from '@/types/api';

interface WinnerManagementProps {
  hackathonId: string;
  isOrganizer: boolean;
  hackathonStatus: string;
}

export function WinnerManagement({
  hackathonId,
  isOrganizer,
  hackathonStatus
}: WinnerManagementProps) {
  const [winnerResult, setWinnerResult] = useState<WinnerDeterminationResponse | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if hackathon is completed
  const isCompleted = hackathonStatus === 'COMPLETED';

  // Load existing winners on component mount
  const loadWinners = async () => {
    if (!isCompleted) return;
    
    setIsLoading(true);
    try {
      const [winners, finalized] = await Promise.all([
        getWinners(hackathonId),
        areWinnersFinalized(hackathonId)
      ]);

      if (winners) {
        setWinnerResult(winners);
      }
      setIsFinalized(finalized.finalized);
    } catch (error) {
      console.error('Failed to load winners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate winners without finalizing
  const handleCalculateWinners = async () => {
    if (!isCompleted) {
      toast({
        title: "Cannot Calculate Winners",
        description: "Winners can only be calculated for completed hackathons.",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateWinners(hackathonId);
      setWinnerResult(result);
      
      toast({
        title: "Winners Calculated",
        description: "Winners have been calculated based on voting results.",
      });
    } catch (error) {
      toast({
        title: "Failed to Calculate Winners",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Finalize winners (permanent database update)
  const handleFinalizeWinners = async () => {
    if (!isOrganizer) {
      toast({
        title: "Unauthorized",
        description: "Only the hackathon organizer can finalize winners.",
        variant: "destructive",
      });
      return;
    }

    if (isFinalized) {
      toast({
        title: "Already Finalized",
        description: "Winners have already been finalized for this hackathon.",
        variant: "destructive",
      });
      return;
    }

    setIsFinalizing(true);
    try {
      const result = await finalizeWinners(hackathonId);
      setWinnerResult(result);
      setIsFinalized(true);
      
      toast({
        title: "Winners Finalized",
        description: "Winners have been permanently saved to the database.",
      });
    } catch (error) {
      toast({
        title: "Failed to Finalize Winners",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-600" />;
      default:
        return <Target className="h-6 w-6 text-blue-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 2:
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 3:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Load winners when component mounts
  React.useEffect(() => {
    loadWinners();
  }, [hackathonId, isCompleted]);

  if (!isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Winner Determination
          </CardTitle>
          <CardDescription>
            Winners will be available once the hackathon is completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The hackathon must be in COMPLETED status before winners can be calculated.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Winner Management
            {isFinalized && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Finalized
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Calculate and finalize winners based on voting results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleCalculateWinners}
              disabled={isCalculating || isLoading}
              variant="outline"
              className="flex-1"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Winners'}
            </Button>
            
            {isOrganizer && winnerResult && !isFinalized && (
              <Button
                onClick={handleFinalizeWinners}
                disabled={isFinalizing}
                className="flex-1"
              >
                {isFinalizing ? 'Finalizing...' : 'Finalize Winners'}
              </Button>
            )}
            
            <Button
              onClick={loadWinners}
              disabled={isLoading}
              variant="ghost"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {isFinalized && (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Winners have been finalized and saved to the database. Prize distribution can now proceed.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Winners Display */}
      {winnerResult && (
        <>
          {/* Prize Pool Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Prize Pool Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatEther(BigInt(winnerResult.totalPrizePool))} ETH
                  </div>
                  <div className="text-sm text-gray-500">Total Prize Pool</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{winnerResult.winners.length}</div>
                  <div className="text-sm text-gray-500">Prize Winners</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{winnerResult.prizeDistribution.length}</div>
                  <div className="text-sm text-gray-500">Prize Positions</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-3">
                {winnerResult.prizeDistribution.map((prize) => (
                  <div
                    key={prize.position}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getRankIcon(prize.position)}
                      <div>
                        <div className="font-medium">
                          {prize.position === 1 ? '1st Place' : 
                           prize.position === 2 ? '2nd Place' :
                           prize.position === 3 ? '3rd Place' :
                           `${prize.position}th Place`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(prize.percentage * 100).toFixed(1)}% of pool
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatEther(BigInt(prize.amount))} ETH
                      </div>
                      {prize.winner && (
                        <div className="text-sm text-gray-500">
                          {prize.winner.walletAddress.slice(0, 6)}...{prize.winner.walletAddress.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Winners List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Winner Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {winnerResult.winners.map((winner) => (
                  <div
                    key={winner.participantId}
                    className={`p-4 rounded-lg border-2 ${getRankColor(winner.rank)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getRankIcon(winner.rank)}
                        <div>
                          <div className="font-semibold">
                            Rank #{winner.rank}
                          </div>
                          <div className="text-sm opacity-75">
                            {winner.walletAddress}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {winner.prizeAmount ? formatEther(BigInt(winner.prizeAmount)) : '0'} ETH
                        </div>
                        <div className="text-sm opacity-75">
                          Score: {winner.weightedScore.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Average Score:</span> {winner.averageScore.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Weighted Score:</span> {winner.weightedScore.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ranking Metrics */}
          {winnerResult.rankingMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Ranking Metrics</CardTitle>
                <CardDescription>Statistical information about the voting results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {winnerResult.rankingMetrics.totalParticipants}
                    </div>
                    <div className="text-sm text-gray-500">Participants</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {winnerResult.rankingMetrics.totalJudges}
                    </div>
                    <div className="text-sm text-gray-500">Judges</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {(winnerResult.rankingMetrics.averageParticipation * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Participation</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {winnerResult.rankingMetrics.scoreDistribution?.mean?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">Avg Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}