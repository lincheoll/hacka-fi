import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { HackathonStatus } from '@prisma/client';
import {
  AnalyticsQueryDto,
  ExportQueryDto,
  ExportFormat,
  AnalyticsDateRange,
  AnalyticsOverviewDto,
  ParticipationTrendsDto,
  VotingStatisticsDto,
  PrizeDistributionAnalyticsDto,
  ComprehensiveAnalyticsDto,
  ExportDataDto,
  TrendDataPoint,
  ScoreDistribution,
  JudgeParticipation,
  WinnerCategory,
  ParticipantExportData,
  VoteExportData,
  HackathonExportData,
  WinnerExportData,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getComprehensiveAnalytics(
    query: AnalyticsQueryDto,
  ): Promise<ComprehensiveAnalyticsDto> {
    const dateRange = this.getDateRange(query);

    const [overview, participation, voting, prizeDistribution] =
      await Promise.all([
        this.getOverviewAnalytics(dateRange, query.hackathonId),
        this.getParticipationTrends(dateRange, query.hackathonId),
        this.getVotingStatistics(dateRange, query.hackathonId),
        this.getPrizeDistributionAnalytics(dateRange, query.hackathonId),
      ]);

    return {
      overview,
      participation,
      voting,
      prizeDistribution,
      timeRange: {
        start: dateRange.start,
        end: dateRange.end,
        range: query.dateRange || AnalyticsDateRange.LAST_30_DAYS,
      },
    };
  }

  async getOverviewAnalytics(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<AnalyticsOverviewDto> {
    const hackathonFilter = {
      ...(hackathonId && { id: hackathonId }),
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const [
      totalHackathons,
      activeHackathons,
      completedHackathons,
      participantStats,
      judgeStats,
      prizeStats,
    ] = await Promise.all([
      this.prisma.hackathon.count({ where: hackathonFilter }),
      this.prisma.hackathon.count({
        where: {
          ...hackathonFilter,
          status: {
            in: [
              HackathonStatus.REGISTRATION_OPEN,
              HackathonStatus.SUBMISSION_OPEN,
              HackathonStatus.VOTING_OPEN,
            ],
          },
        },
      }),
      this.prisma.hackathon.count({
        where: { ...hackathonFilter, status: HackathonStatus.COMPLETED },
      }),
      this.prisma.participant.groupBy({
        by: ['hackathonId'],
        _count: true,
        where: {
          hackathon: hackathonFilter,
        },
      }),
      this.prisma.hackathonJudge.groupBy({
        by: ['hackathonId'],
        _count: true,
        where: {
          hackathon: hackathonFilter,
        },
      }),
      this.prisma.participant.findMany({
        where: {
          prizeAmount: { not: null },
          hackathon: hackathonFilter,
        },
        select: { prizeAmount: true },
      }),
    ]);

    const totalParticipants = participantStats.reduce(
      (sum, stat) => sum + stat._count,
      0,
    );
    const totalJudges = judgeStats.reduce((sum, stat) => sum + stat._count, 0);
    const totalPrizeDistributed = prizeStats
      .reduce((sum, p) => sum + parseFloat(p.prizeAmount || '0'), 0)
      .toString();

    const averageParticipantsPerHackathon =
      totalHackathons > 0 ? totalParticipants / totalHackathons : 0;

    // Calculate average votes per hackathon
    const voteStats = await this.prisma.vote.groupBy({
      by: ['hackathonId'],
      _count: true,
      where: {
        hackathon: hackathonFilter,
      },
    });
    const totalVotes = voteStats.reduce((sum, stat) => sum + stat._count, 0);
    const averageVotesPerHackathon =
      totalHackathons > 0 ? totalVotes / totalHackathons : 0;

    return {
      totalHackathons,
      activeHackathons,
      completedHackathons,
      totalParticipants,
      totalJudges,
      totalPrizeDistributed,
      averageParticipantsPerHackathon:
        Math.round(averageParticipantsPerHackathon * 100) / 100,
      averageVotesPerHackathon:
        Math.round(averageVotesPerHackathon * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  async getParticipationTrends(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<ParticipationTrendsDto> {
    const hackathonFilter = {
      ...(hackathonId && { id: hackathonId }),
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    // Get daily participation data
    const participants = await this.prisma.participant.findMany({
      where: {
        hackathon: hackathonFilter,
      },
      select: {
        createdAt: true,
        submissionUrl: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date for trends
    const registrationTrends = this.groupByDate(participants, 'createdAt');
    const submissionsData = participants.filter((p) => p.submissionUrl);
    const submissionTrends = this.groupByDate(submissionsData, 'updatedAt');

    const totalParticipations = participants.length;
    const totalSubmissions = submissionsData.length;
    const completionRate =
      totalParticipations > 0
        ? (totalSubmissions / totalParticipations) * 100
        : 0;

    // Calculate average submission time (from registration to submission)
    let totalSubmissionTime = 0;
    let submissionCount = 0;

    for (const participant of submissionsData) {
      if (participant.submissionUrl) {
        const timeDiff =
          participant.updatedAt.getTime() - participant.createdAt.getTime();
        totalSubmissionTime += timeDiff / (1000 * 60 * 60); // Convert to hours
        submissionCount++;
      }
    }

    const averageSubmissionTime =
      submissionCount > 0 ? totalSubmissionTime / submissionCount : 0;

    return {
      totalParticipations,
      registrationTrends,
      submissionTrends,
      completionRate: Math.round(completionRate * 100) / 100,
      averageSubmissionTime: Math.round(averageSubmissionTime * 100) / 100,
    };
  }

  async getVotingStatistics(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<VotingStatisticsDto> {
    const hackathonFilter = {
      ...(hackathonId && { id: hackathonId }),
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    const votes = await this.prisma.vote.findMany({
      where: {
        hackathon: hackathonFilter,
      },
      include: {
        judge: {
          select: {
            username: true,
          },
        },
      },
    });

    const totalVotes = votes.length;
    const averageScore =
      totalVotes > 0
        ? votes.reduce((sum, vote) => sum + vote.score, 0) / totalVotes
        : 0;

    // Score distribution (1-10 scale)
    const scoreDistribution: ScoreDistribution[] = [];
    for (let i = 1; i <= 10; i++) {
      const count = votes.filter((v) => v.score === i).length;
      scoreDistribution.push({
        score: i,
        count,
        percentage: totalVotes > 0 ? (count / totalVotes) * 100 : 0,
      });
    }

    // Judge participation statistics
    const judgeStats = new Map<
      string,
      {
        judgeAddress: string;
        judgeName?: string;
        totalVotes: number;
        totalScore: number;
        hackathonsJudged: Set<string>;
        lastVoteDate: Date;
      }
    >();

    votes.forEach((vote) => {
      const existing = judgeStats.get(vote.judgeAddress);
      if (existing) {
        existing.totalVotes += 1;
        existing.totalScore += vote.score;
        existing.hackathonsJudged.add(vote.hackathonId);
        if (vote.createdAt > existing.lastVoteDate) {
          existing.lastVoteDate = vote.createdAt;
        }
      } else {
        const judgeData = {
          judgeAddress: vote.judgeAddress,
          totalVotes: 1,
          totalScore: vote.score,
          hackathonsJudged: new Set([vote.hackathonId]),
          lastVoteDate: vote.createdAt,
        } as {
          judgeAddress: string;
          judgeName?: string;
          totalVotes: number;
          totalScore: number;
          hackathonsJudged: Set<string>;
          lastVoteDate: Date;
        };

        if (vote.judge?.username) {
          judgeData.judgeName = vote.judge.username;
        }

        judgeStats.set(vote.judgeAddress, judgeData);
      }
    });

    const judgeParticipation: JudgeParticipation[] = Array.from(
      judgeStats.values(),
    ).map((judge) => {
      const participation: JudgeParticipation = {
        judgeAddress: judge.judgeAddress,
        totalVotes: judge.totalVotes,
        averageScore:
          judge.totalVotes > 0 ? judge.totalScore / judge.totalVotes : 0,
        hackathonsJudged: judge.hackathonsJudged.size,
        lastVoteDate: judge.lastVoteDate,
      };

      if (judge.judgeName) {
        participation.judgeName = judge.judgeName;
      }

      return participation;
    });

    // Calculate voting completion rate
    const expectedVotes = await this.prisma.hackathonJudge.count({
      where: {
        hackathon: hackathonFilter,
      },
    });
    const participantCount = await this.prisma.participant.count({
      where: {
        hackathon: hackathonFilter,
      },
    });

    const expectedTotalVotes = expectedVotes * participantCount;
    const votingCompletion =
      expectedTotalVotes > 0 ? (totalVotes / expectedTotalVotes) * 100 : 0;

    return {
      totalVotes,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution: scoreDistribution.map((s) => ({
        ...s,
        percentage: Math.round(s.percentage * 100) / 100,
      })),
      judgeParticipation: judgeParticipation.map((j) => ({
        ...j,
        averageScore: Math.round(j.averageScore * 100) / 100,
      })),
      votingCompletion: Math.round(votingCompletion * 100) / 100,
      averageVotingTime: 0, // TODO: Calculate based on voting timestamps
    };
  }

  async getPrizeDistributionAnalytics(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<PrizeDistributionAnalyticsDto> {
    const hackathonFilter = {
      ...(hackathonId && { id: hackathonId }),
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    };

    // Get prize pool data
    const hackathons = await this.prisma.hackathon.findMany({
      where: hackathonFilter,
      select: {
        prizeAmount: true,
      },
    });

    const totalPrizePool = hackathons
      .reduce((sum, h) => sum + parseFloat(h.prizeAmount || '0'), 0)
      .toString();

    // Get distributed prizes
    const winners = await this.prisma.participant.findMany({
      where: {
        prizeAmount: { not: null },
        hackathon: hackathonFilter,
      },
      select: {
        prizeAmount: true,
        rank: true,
      },
    });

    const totalDistributed = winners
      .reduce((sum, w) => sum + parseFloat(w.prizeAmount || '0'), 0)
      .toString();

    const distributionRate =
      parseFloat(totalPrizePool) > 0
        ? (parseFloat(totalDistributed) / parseFloat(totalPrizePool)) * 100
        : 0;

    // Winners by category (rank)
    const winnersByRank = new Map<number, number>();
    const prizeByRank = new Map<number, number>();

    winners.forEach((winner) => {
      const rank = winner.rank || 999;
      const prize = parseFloat(winner.prizeAmount || '0');

      winnersByRank.set(rank, (winnersByRank.get(rank) || 0) + 1);
      prizeByRank.set(rank, (prizeByRank.get(rank) || 0) + prize);
    });

    const winnersByCategory: WinnerCategory[] = Array.from(
      winnersByRank.entries(),
    )
      .map(([rank, count]) => ({
        rank,
        count,
        totalPrize: (prizeByRank.get(rank) || 0).toString(),
        percentage:
          parseFloat(totalDistributed) > 0
            ? ((prizeByRank.get(rank) || 0) / parseFloat(totalDistributed)) *
              100
            : 0,
      }))
      .sort((a, b) => a.rank - b.rank);

    const averagePrizePerWinner =
      winners.length > 0
        ? (parseFloat(totalDistributed) / winners.length).toString()
        : '0';

    return {
      totalPrizePool,
      totalDistributed,
      distributionRate: Math.round(distributionRate * 100) / 100,
      winnersByCategory: winnersByCategory.map((c) => ({
        ...c,
        percentage: Math.round(c.percentage * 100) / 100,
      })),
      prizeUtilizationRate: distributionRate,
      averagePrizePerWinner,
      payoutEfficiency: distributionRate, // Could be calculated differently based on business logic
    };
  }

  async exportData(query: ExportQueryDto): Promise<ExportDataDto> {
    const dateRange = this.getDateRange(query);

    const [participants, votes, hackathons, winners] = await Promise.all([
      this.getParticipantExportData(dateRange, query.hackathonId),
      this.getVoteExportData(dateRange, query.hackathonId),
      this.getHackathonExportData(dateRange, query.hackathonId),
      this.getWinnerExportData(dateRange, query.hackathonId),
    ]);

    return {
      participants,
      votes,
      hackathons,
      winners,
      metadata: {
        exportedAt: new Date(),
        format: query.format || ExportFormat.JSON,
        dateRange: `${dateRange.start.toISOString()} - ${dateRange.end.toISOString()}`,
        totalRecords:
          participants.length +
          votes.length +
          hackathons.length +
          winners.length,
      },
    };
  }

  private getDateRange(query: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();

    switch (query.dateRange) {
      case AnalyticsDateRange.LAST_7_DAYS:
        start.setDate(now.getDate() - 7);
        break;
      case AnalyticsDateRange.LAST_30_DAYS:
        start.setDate(now.getDate() - 30);
        break;
      case AnalyticsDateRange.LAST_90_DAYS:
        start.setDate(now.getDate() - 90);
        break;
      case AnalyticsDateRange.LAST_YEAR:
        start.setFullYear(now.getFullYear() - 1);
        break;
      case AnalyticsDateRange.CUSTOM:
        if (query.startDate && query.endDate) {
          return {
            start: new Date(query.startDate),
            end: new Date(query.endDate),
          };
        }
        // Fall back to last 30 days
        start.setDate(now.getDate() - 30);
        break;
      case AnalyticsDateRange.ALL_TIME:
      default:
        start.setFullYear(2020); // Set to a very early date
        break;
    }

    return { start, end: now };
  }

  private groupByDate(data: any[], dateField: string): TrendDataPoint[] {
    const grouped = new Map<string, number>();

    data.forEach((item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      grouped.set(date, (grouped.get(date) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getParticipantExportData(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<ParticipantExportData[]> {
    const participants = await this.prisma.participant.findMany({
      where: {
        ...(hackathonId && { hackathonId }),
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      include: {
        hackathon: {
          select: { title: true },
        },
        user: {
          select: { username: true },
        },
      },
    });

    return participants.map((p) => {
      const exportData: ParticipantExportData = {
        hackathonId: p.hackathonId,
        hackathonTitle: p.hackathon.title,
        walletAddress: p.walletAddress,
        registeredAt: p.createdAt,
      };

      if (p.user?.username) {
        exportData.username = p.user.username;
      }
      if (p.submissionUrl) {
        exportData.submissionUrl = p.submissionUrl;
        exportData.submittedAt = p.updatedAt;
      }
      if (p.entryFee) {
        exportData.entryFee = p.entryFee;
      }
      if (p.rank !== null && p.rank !== undefined) {
        exportData.rank = p.rank;
      }
      if (p.prizeAmount) {
        exportData.prizeAmount = p.prizeAmount;
      }

      return exportData;
    });
  }

  private async getVoteExportData(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<VoteExportData[]> {
    const votes = await this.prisma.vote.findMany({
      where: {
        ...(hackathonId && { hackathonId }),
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      include: {
        hackathon: {
          select: { title: true },
        },
        judge: {
          select: { username: true },
        },
        participant: {
          include: {
            user: {
              select: { username: true },
            },
          },
        },
      },
    });

    return votes.map((v) => {
      const exportData: VoteExportData = {
        hackathonId: v.hackathonId,
        hackathonTitle: v.hackathon.title,
        judgeAddress: v.judgeAddress,
        participantAddress: v.participant.walletAddress,
        score: v.score,
        votedAt: v.createdAt,
      };

      if (v.judge?.username) {
        exportData.judgeName = v.judge.username;
      }
      if (v.participant.user?.username) {
        exportData.participantName = v.participant.user.username;
      }
      if (v.comment) {
        exportData.comment = v.comment;
      }

      return exportData;
    });
  }

  private async getHackathonExportData(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<HackathonExportData[]> {
    const hackathons = await this.prisma.hackathon.findMany({
      where: {
        ...(hackathonId && { id: hackathonId }),
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      include: {
        _count: {
          select: {
            participants: true,
            votes: true,
          },
        },
      },
    });

    return hackathons.map((h) => {
      const exportData: HackathonExportData = {
        id: h.id,
        title: h.title,
        description: h.description,
        organizerAddress: h.organizerAddress,
        status: h.status,
        participantCount: h._count.participants,
        totalVotes: h._count.votes,
        createdAt: h.createdAt,
      };

      if (h.prizeAmount) {
        exportData.prizeAmount = h.prizeAmount;
      }
      if (h.status === HackathonStatus.COMPLETED) {
        exportData.completedAt = h.updatedAt;
      }

      return exportData;
    });
  }

  private async getWinnerExportData(
    dateRange: { start: Date; end: Date },
    hackathonId?: string,
  ): Promise<WinnerExportData[]> {
    const winners = await this.prisma.participant.findMany({
      where: {
        ...(hackathonId && { hackathonId }),
        rank: { not: null },
        hackathon: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      },
      include: {
        hackathon: {
          select: { title: true, updatedAt: true },
        },
        user: {
          select: { username: true },
        },
        votes: true,
      },
    });

    return winners.map((w) => {
      const averageScore =
        w.votes.length > 0
          ? w.votes.reduce((sum, vote) => sum + vote.score, 0) / w.votes.length
          : 0;

      const exportData: WinnerExportData = {
        hackathonId: w.hackathonId,
        hackathonTitle: w.hackathon.title,
        rank: w.rank!,
        walletAddress: w.walletAddress,
        submissionUrl: w.submissionUrl ?? '',
        averageScore: Math.round(averageScore * 100) / 100,
        prizeAmount: w.prizeAmount ?? '0',
        completedAt: w.hackathon.updatedAt,
      };

      if (w.user?.username) {
        exportData.username = w.user.username;
      }

      return exportData;
    });
  }
}
