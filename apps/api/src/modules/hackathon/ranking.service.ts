import { Injectable, Logger } from '@nestjs/common';

export interface VoteData {
  id: number;
  judgeAddress: string;
  participantId: number;
  score: number;
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipantData {
  id: number;
  walletAddress: string;
  submissionUrl?: string | null;
  votes: VoteData[];
}

export interface RankingResult {
  participantId: number;
  walletAddress: string;
  submissionUrl?: string | null;
  totalVotes: number;
  averageScore: number;
  weightedScore: number;
  normalizedScore: number;
  rank: number;
  rankTier: 'winner' | 'runner-up' | 'participant';
  scoreBreakdown: {
    simple: number;
    weighted: number;
    normalized: number;
    consensus: number;
  };
  votes: VoteData[];
}

export interface RankingMetrics {
  totalParticipants: number;
  totalJudges: number;
  averageParticipation: number; // Average votes per participant
  scoreDistribution: {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDeviation: number;
  };
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  /**
   * Calculate comprehensive rankings for hackathon participants
   */
  calculateRankings(
    participants: ParticipantData[],
    totalJudges: number,
    options: {
      useWeightedScoring?: boolean;
      useNormalizedScoring?: boolean;
      penalizeIncompleteVoting?: boolean;
      minimumVotesThreshold?: number;
    } = {}
  ): { rankings: RankingResult[]; metrics: RankingMetrics } {
    const {
      useWeightedScoring = true,
      useNormalizedScoring = true,
      penalizeIncompleteVoting = true,
      minimumVotesThreshold = Math.ceil(totalJudges * 0.5), // At least 50% of judges must vote
    } = options;

    this.logger.log(`Calculating rankings for ${participants.length} participants with ${totalJudges} judges`);

    // Filter out participants without submissions
    const eligibleParticipants = participants.filter(p => p.submissionUrl);

    // Calculate base scores for all participants
    const baseResults = eligibleParticipants.map(participant => {
      const votes = participant.votes;
      const voteCount = votes.length;
      
      // Basic average score
      const simpleAverage = voteCount > 0 
        ? votes.reduce((sum, vote) => sum + vote.score, 0) / voteCount 
        : 0;

      // Weighted score considering vote participation
      let weightedScore = simpleAverage;
      if (useWeightedScoring && penalizeIncompleteVoting) {
        const participationRate = voteCount / totalJudges;
        const participationPenalty = Math.max(0.5, participationRate); // Minimum 50% penalty
        weightedScore = simpleAverage * participationPenalty;
      }

      // Score variance (consensus measure)
      const scoreVariance = voteCount > 1 
        ? votes.reduce((sum, vote) => sum + Math.pow(vote.score - simpleAverage, 2), 0) / voteCount
        : 0;
      const consensusScore = simpleAverage * (1 - (scoreVariance / 25)); // 25 is max possible variance (5^2)

      return {
        participantId: participant.id,
        walletAddress: participant.walletAddress,
        submissionUrl: participant.submissionUrl,
        totalVotes: voteCount,
        averageScore: simpleAverage,
        weightedScore,
        consensusScore,
        scoreVariance,
        votes: participant.votes,
      };
    });

    // Calculate normalized scores if enabled
    if (useNormalizedScoring) {
      const allScores = baseResults.map(r => r.weightedScore).filter(s => s > 0);
      if (allScores.length > 0) {
        const minScore = Math.min(...allScores);
        const maxScore = Math.max(...allScores);
        const scoreRange = maxScore - minScore;

        baseResults.forEach(result => {
          if (scoreRange > 0) {
            result.normalizedScore = ((result.weightedScore - minScore) / scoreRange) * 10;
          } else {
            result.normalizedScore = result.weightedScore;
          }
        });
      }
    }

    // Sort participants by final score (weighted + normalized + consensus)
    const sortedResults = baseResults
      .filter(result => result.totalVotes >= minimumVotesThreshold)
      .sort((a, b) => {
        // Primary sort: weighted score
        if (Math.abs(b.weightedScore - a.weightedScore) > 0.01) {
          return b.weightedScore - a.weightedScore;
        }
        
        // Tie-breaker 1: consensus (lower variance is better)
        if (Math.abs(a.scoreVariance - b.scoreVariance) > 0.01) {
          return a.scoreVariance - b.scoreVariance;
        }
        
        // Tie-breaker 2: total votes (more votes is better)
        if (b.totalVotes !== a.totalVotes) {
          return b.totalVotes - a.totalVotes;
        }
        
        // Tie-breaker 3: simple average
        return b.averageScore - a.averageScore;
      });

    // Assign ranks and tiers
    const rankedResults: RankingResult[] = sortedResults.map((result, index) => {
      let rank = index + 1;
      
      // Handle tied ranks
      if (index > 0) {
        const prevResult = sortedResults[index - 1];
        if (Math.abs(result.weightedScore - prevResult.weightedScore) < 0.01) {
          // Same score as previous participant
          rank = rankedResults[index - 1].rank;
        }
      }

      // Determine rank tier
      let rankTier: 'winner' | 'runner-up' | 'participant' = 'participant';
      if (rank === 1) rankTier = 'winner';
      else if (rank <= 3) rankTier = 'runner-up';

      return {
        participantId: result.participantId,
        walletAddress: result.walletAddress,
        submissionUrl: result.submissionUrl,
        totalVotes: result.totalVotes,
        averageScore: Math.round(result.averageScore * 100) / 100,
        weightedScore: Math.round(result.weightedScore * 100) / 100,
        normalizedScore: Math.round((result.normalizedScore || result.weightedScore) * 100) / 100,
        rank,
        rankTier,
        scoreBreakdown: {
          simple: Math.round(result.averageScore * 100) / 100,
          weighted: Math.round(result.weightedScore * 100) / 100,
          normalized: Math.round((result.normalizedScore || result.weightedScore) * 100) / 100,
          consensus: Math.round(result.consensusScore * 100) / 100,
        },
        votes: result.votes,
      };
    });

    // Calculate metrics
    const metrics = this.calculateMetrics(rankedResults, totalJudges);

    this.logger.log(`Rankings calculated: ${rankedResults.length} ranked participants`);
    
    return {
      rankings: rankedResults,
      metrics,
    };
  }

  /**
   * Calculate statistical metrics for the ranking results
   */
  private calculateMetrics(rankings: RankingResult[], totalJudges: number): RankingMetrics {
    const scores = rankings.map(r => r.weightedScore).filter(s => s > 0);
    const votesCounts = rankings.map(r => r.totalVotes);

    // Score distribution
    const sortedScores = [...scores].sort((a, b) => a - b);
    const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    const median = sortedScores.length > 0 
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    const variance = scores.length > 0 
      ? scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length 
      : 0;
    const standardDeviation = Math.sqrt(variance);

    return {
      totalParticipants: rankings.length,
      totalJudges,
      averageParticipation: votesCounts.length > 0 
        ? votesCounts.reduce((sum, c) => sum + c, 0) / votesCounts.length 
        : 0,
      scoreDistribution: {
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
      },
    };
  }

  /**
   * Calculate prize distribution based on rankings
   */
  calculatePrizeDistribution(
    rankings: RankingResult[],
    totalPrizePool: number,
    distribution: { first: number; second: number; third: number } = { first: 0.6, second: 0.25, third: 0.15 }
  ): { participantId: number; rank: number; prizeAmount: number }[] {
    const prizeResults: { participantId: number; rank: number; prizeAmount: number }[] = [];

    // Get unique ranks for top 3
    const topRanks = [...new Set(rankings.slice(0, 3).map(r => r.rank))].sort();
    
    if (topRanks.length >= 1) {
      const firstPlaceWinners = rankings.filter(r => r.rank === topRanks[0]);
      const firstPrize = totalPrizePool * distribution.first / firstPlaceWinners.length;
      
      firstPlaceWinners.forEach(winner => {
        prizeResults.push({
          participantId: winner.participantId,
          rank: 1,
          prizeAmount: firstPrize,
        });
      });
    }

    if (topRanks.length >= 2) {
      const secondPlaceWinners = rankings.filter(r => r.rank === topRanks[1]);
      const secondPrize = totalPrizePool * distribution.second / secondPlaceWinners.length;
      
      secondPlaceWinners.forEach(winner => {
        prizeResults.push({
          participantId: winner.participantId,
          rank: 2,
          prizeAmount: secondPrize,
        });
      });
    }

    if (topRanks.length >= 3) {
      const thirdPlaceWinners = rankings.filter(r => r.rank === topRanks[2]);
      const thirdPrize = totalPrizePool * distribution.third / thirdPlaceWinners.length;
      
      thirdPlaceWinners.forEach(winner => {
        prizeResults.push({
          participantId: winner.participantId,
          rank: 3,
          prizeAmount: thirdPrize,
        });
      });
    }

    return prizeResults;
  }
}