import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { RankingService, RankingResult } from './ranking.service';

export interface WinnerResult {
  participantId: number;
  walletAddress: string;
  rank: number;
  averageScore: number;
  weightedScore: number;
  prizeAmount?: string | null; // Using string for BigInt compatibility
  prizePosition?: number; // 1, 2, 3, etc.
}

export interface WinnerDeterminationResult {
  winners: WinnerResult[];
  totalPrizePool: string;
  prizeDistribution: {
    position: number;
    percentage: number;
    amount: string;
    winner?: WinnerResult;
  }[];
  rankingMetrics: any;
}

@Injectable()
export class WinnerDeterminationService {
  private readonly logger = new Logger(WinnerDeterminationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /**
   * Calculate final winners and prize distribution for a hackathon
   */
  async calculateWinners(
    hackathonId: string,
    prizeDistribution?: { position: number; percentage: number }[],
  ): Promise<WinnerDeterminationResult> {
    this.logger.log(`Calculating winners for hackathon ${hackathonId}`);

    // Get hackathon details including prize amount
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new Error(`Hackathon ${hackathonId} not found`);
    }

    // Get participants with votes for ranking
    const participants = await this.prisma.participant.findMany({
      where: { hackathonId },
      include: {
        votes: {
          include: {
            judge: {
              select: {
                walletAddress: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const totalJudges = await this.prisma.hackathonJudge.count({
      where: { hackathonId },
    });

    // Transform data for ranking service
    const participantData = participants.map((participant) => ({
      id: participant.id,
      walletAddress: participant.walletAddress,
      submissionUrl: participant.submissionUrl,
      votes: participant.votes.map((vote) => ({
        id: vote.id,
        judgeAddress: vote.judgeAddress,
        participantId: vote.participantId,
        score: vote.score,
        comment: vote.comment,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      })),
    }));

    // Calculate advanced rankings
    const { rankings, metrics } = this.rankingService.calculateRankings(
      participantData,
      totalJudges,
      {
        useWeightedScoring: true,
        useNormalizedScoring: true,
        penalizeIncompleteVoting: true,
        minimumVotesThreshold: Math.max(1, Math.ceil(totalJudges * 0.3)),
      },
    );

    // Default prize distribution using basis points (60%, 25%, 15%)
    // This matches the PrizePool contract's basis points system (10000 = 100%)
    const defaultDistribution = [
      { position: 1, percentage: 0.6 }, // 6000 basis points
      { position: 2, percentage: 0.25 }, // 2500 basis points
      { position: 3, percentage: 0.15 }, // 1500 basis points
    ];

    const distribution = prizeDistribution || defaultDistribution;
    const totalPrizePool = hackathon.prizeAmount
      ? BigInt(hackathon.prizeAmount)
      : 0n;

    // Calculate prize amounts for each position
    const prizeDistributionWithAmounts = distribution.map((dist) => {
      const amount =
        (totalPrizePool * BigInt(Math.floor(dist.percentage * 10000))) / 10000n;
      return {
        ...dist,
        amount: amount.toString(),
      };
    });

    // Assign prizes to winners
    const winners: WinnerResult[] = [];
    const winnersWithPrizes = prizeDistributionWithAmounts.map((prize) => {
      const winner = rankings.find((r) => r.rank === prize.position);
      if (winner) {
        const winnerResult: WinnerResult = {
          participantId: winner.participantId,
          walletAddress: winner.walletAddress,
          rank: winner.rank,
          averageScore: winner.averageScore,
          weightedScore: winner.weightedScore,
          prizeAmount: prize.amount,
          prizePosition: prize.position,
        };
        winners.push(winnerResult);
        return { ...prize, winner: winnerResult };
      }
      return prize;
    });

    this.logger.log(
      `Determined ${winners.length} winners for hackathon ${hackathonId}`,
    );

    return {
      winners,
      totalPrizePool: totalPrizePool.toString(),
      prizeDistribution: winnersWithPrizes,
      rankingMetrics: metrics,
    };
  }

  /**
   * Finalize winners by updating participant records in database
   */
  async finalizeWinners(
    hackathonId: string,
  ): Promise<WinnerDeterminationResult> {
    this.logger.log(`Finalizing winners for hackathon ${hackathonId}`);

    // Calculate winners first
    const result = await this.calculateWinners(hackathonId);

    // Update participant records with final rankings and prize amounts
    await this.prisma.$transaction(async (tx) => {
      // Update all participants with their final ranks (clear existing ranks first)
      await tx.participant.updateMany({
        where: { hackathonId },
        data: {
          rank: null,
          prizeAmount: null,
        },
      });

      // Update winners with their ranks and prize amounts
      for (const winner of result.winners) {
        await tx.participant.update({
          where: { id: winner.participantId },
          data: {
            rank: winner.rank,
            prizeAmount: winner.prizeAmount || null,
          },
        });
      }

      this.logger.log(
        `Updated database records for ${result.winners.length} winners`,
      );
    });

    return result;
  }

  /**
   * Get winner information for a completed hackathon
   */
  async getWinners(
    hackathonId: string,
  ): Promise<WinnerDeterminationResult | null> {
    this.logger.log(`Getting winners for hackathon ${hackathonId}`);

    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      return null;
    }

    // Get participants with final rankings
    const winnerParticipants = await this.prisma.participant.findMany({
      where: {
        hackathonId,
        rank: { not: null },
        prizeAmount: { not: null },
      },
      orderBy: { rank: 'asc' },
    });

    if (winnerParticipants.length === 0) {
      // No finalized winners yet, calculate them
      return await this.calculateWinners(hackathonId);
    }

    // Convert participants to winner results
    const winners: WinnerResult[] = winnerParticipants.map((participant) => ({
      participantId: participant.id,
      walletAddress: participant.walletAddress,
      rank: participant.rank!,
      averageScore: 0, // Would need to recalculate from votes
      weightedScore: 0, // Would need to recalculate from votes
      prizeAmount: participant.prizeAmount || null,
      prizePosition: participant.rank!,
    }));

    const totalPrizePool = hackathon.prizeAmount || '0';
    const prizeDistribution = winners.map((winner) => ({
      position: winner.rank,
      percentage: 0, // Would need to calculate from amounts
      amount: winner.prizeAmount || '0',
      winner,
    }));

    return {
      winners,
      totalPrizePool,
      prizeDistribution,
      rankingMetrics: null, // Not available for already finalized results
    };
  }

  /**
   * Check if winners have been finalized for a hackathon
   */
  async areWinnersFinalized(hackathonId: string): Promise<boolean> {
    const winnerCount = await this.prisma.participant.count({
      where: {
        hackathonId,
        rank: { not: null },
      },
    });

    return winnerCount > 0;
  }

  /**
   * Get top 3 winners (for smart contract integration)
   */
  async getTop3Winners(hackathonId: string): Promise<{
    firstPlace?: string;
    secondPlace?: string;
    thirdPlace?: string;
  }> {
    const winners = await this.prisma.participant.findMany({
      where: {
        hackathonId,
        rank: { in: [1, 2, 3] },
      },
      orderBy: { rank: 'asc' },
    });

    const result: {
      firstPlace?: string;
      secondPlace?: string;
      thirdPlace?: string;
    } = {};

    winners.forEach((winner) => {
      if (winner.rank === 1) result.firstPlace = winner.walletAddress;
      else if (winner.rank === 2) result.secondPlace = winner.walletAddress;
      else if (winner.rank === 3) result.thirdPlace = winner.walletAddress;
    });

    return result;
  }
}
