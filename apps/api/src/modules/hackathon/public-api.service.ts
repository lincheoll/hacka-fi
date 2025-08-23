import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { HackathonStatus, Prisma } from '@prisma/client';
import {
  PublicHackathonQueryDto,
  PublicHackathonResponseDto,
  PublicWinnerResponseDto,
  PublicPlatformStatsResponseDto,
  PublicTopWinnerDto,
  PublicHallOfFameQueryDto,
  PublicHallOfFameResponseDto,
  PublicFilterBy,
  PublicSortOrder,
} from './dto/public-api.dto';

@Injectable()
export class PublicApiService {
  private readonly logger = new Logger(PublicApiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCompletedHackathons(query: PublicHackathonQueryDto): Promise<{
    data: PublicHackathonResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      filterBy,
      sortOrder = PublicSortOrder.DESC,
      search,
      minPrizeAmount,
      maxPrizeAmount,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.HackathonWhereInput = {
      status: HackathonStatus.COMPLETED,
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(minPrizeAmount && {
        prizeAmount: { gte: minPrizeAmount.toString() },
      }),
      ...(maxPrizeAmount && {
        prizeAmount: { lte: maxPrizeAmount.toString() },
      }),
    };

    // Build order by clause
    let orderBy: Prisma.HackathonOrderByWithRelationInput = {
      createdAt: sortOrder,
    };

    if (filterBy === PublicFilterBy.PRIZE_AMOUNT) {
      orderBy = { prizeAmount: sortOrder };
    } else if (filterBy === PublicFilterBy.DATE_CREATED) {
      orderBy = { createdAt: sortOrder };
    }

    const [hackathons, total] = await Promise.all([
      this.prisma.hackathon.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        include: {
          participants: {
            where: {
              rank: { not: null },
            },
            orderBy: {
              rank: 'asc',
            },
            take: 3, // Top 3 winners
            include: {
              user: {
                select: {
                  username: true,
                  avatarUrl: true,
                },
              },
              votes: true,
            },
          },
          _count: {
            select: {
              participants: true,
            },
          },
        },
      }),
      this.prisma.hackathon.count({ where: whereClause }),
    ]);

    const data = hackathons.map((hackathon) => ({
      id: hackathon.id,
      title: hackathon.title,
      description: hackathon.description,
      prizeAmount: hackathon.prizeAmount || '0',
      participantCount: hackathon._count.participants,
      votingDeadline: hackathon.votingDeadline,
      createdAt: hackathon.createdAt,
      coverImageUrl: hackathon.coverImageUrl,
      organizerAddress: hackathon.organizerAddress,
      winners: hackathon.participants.map((participant) => {
        const averageScore =
          participant.votes.length > 0
            ? participant.votes.reduce((sum, vote) => sum + vote.score, 0) /
              participant.votes.length
            : 0;

        return {
          rank: participant.rank || 0,
          walletAddress: participant.walletAddress,
          username: participant.user?.username || null,
          submissionUrl: participant.submissionUrl || '',
          averageScore,
          prizeAmount: participant.prizeAmount || '0',
          avatarUrl: participant.user?.avatarUrl || null,
        };
      }),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHackathonWinners(
    hackathonId: string,
  ): Promise<PublicWinnerResponseDto[]> {
    const winners = await this.prisma.participant.findMany({
      where: {
        hackathonId,
        rank: { not: null },
      },
      orderBy: {
        rank: 'asc',
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
        votes: true,
      },
    });

    return winners.map((winner) => {
      const averageScore =
        winner.votes.length > 0
          ? winner.votes.reduce((sum, vote) => sum + vote.score, 0) /
            winner.votes.length
          : 0;

      return {
        rank: winner.rank!,
        walletAddress: winner.walletAddress,
        username: winner.user?.username || null,
        submissionUrl: winner.submissionUrl || '',
        averageScore,
        prizeAmount: winner.prizeAmount || '0',
        avatarUrl: winner.user?.avatarUrl || null,
      };
    });
  }

  async getPlatformStatistics(): Promise<PublicPlatformStatsResponseDto> {
    const [
      totalHackathons,
      completedHackathons,
      uniqueParticipants,
      prizeStats,
      topWinners,
    ] = await Promise.all([
      this.prisma.hackathon.count(),
      this.prisma.hackathon.count({
        where: { status: HackathonStatus.COMPLETED },
      }),
      this.prisma.participant.groupBy({
        by: ['walletAddress'],
        _count: true,
      }),
      // Calculate total prize distributed
      this.prisma.participant.findMany({
        where: {
          prizeAmount: { not: null },
        },
        select: {
          prizeAmount: true,
        },
      }),
      this.getTopWinners(5),
    ]);

    const totalParticipants = uniqueParticipants.length;

    // Calculate total prize distributed
    const totalPrizeDistributed = prizeStats
      .reduce((sum, p) => sum + parseFloat(p.prizeAmount || '0'), 0)
      .toString();

    // Calculate average prize per winner
    const winnersCount = prizeStats.length;
    const averagePrizeAmount =
      winnersCount > 0
        ? (parseFloat(totalPrizeDistributed) / winnersCount).toString()
        : '0';

    return {
      totalHackathons,
      completedHackathons,
      totalParticipants,
      totalPrizeDistributed,
      averagePrizeAmount,
      topWinners,
    };
  }

  async getHallOfFame(
    query: PublicHallOfFameQueryDto,
  ): Promise<PublicHallOfFameResponseDto> {
    const { page = 1, limit = 20, sortOrder = PublicSortOrder.DESC } = query;
    const skip = (page - 1) * limit;

    const winners = await this.getTopWinners(1000); // Get all winners first

    // Sort winners based on sortOrder
    const sortedWinners = winners.sort((a, b) => {
      const aValue = parseFloat(a.totalEarnings);
      const bValue = parseFloat(b.totalEarnings);
      return sortOrder === PublicSortOrder.DESC
        ? bValue - aValue
        : aValue - bValue;
    });

    const paginatedWinners = sortedWinners.slice(skip, skip + limit);
    const total = sortedWinners.length;

    return {
      data: paginatedWinners,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getTopWinners(limit: number): Promise<PublicTopWinnerDto[]> {
    // Get all participants with prizes and group by wallet address
    const winnerData = await this.prisma.participant.findMany({
      where: {
        prizeAmount: { not: null },
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Group by wallet address and calculate statistics
    const winnerStatsMap = new Map<
      string,
      {
        walletAddress: string;
        username: string | null;
        avatarUrl: string | null;
        totalWins: number;
        totalEarnings: number;
        totalParticipations: number;
      }
    >();

    // First pass: collect all participations
    const allParticipants = await this.prisma.participant.findMany({
      select: {
        walletAddress: true,
      },
    });

    // Count total participations per wallet
    const participationCounts = new Map<string, number>();
    allParticipants.forEach((p) => {
      participationCounts.set(
        p.walletAddress,
        (participationCounts.get(p.walletAddress) || 0) + 1,
      );
    });

    // Process winners
    winnerData.forEach((winner) => {
      const existing = winnerStatsMap.get(winner.walletAddress);
      const prizeAmount = parseFloat(winner.prizeAmount || '0');

      if (existing) {
        existing.totalWins += 1;
        existing.totalEarnings += prizeAmount;
      } else {
        winnerStatsMap.set(winner.walletAddress, {
          walletAddress: winner.walletAddress,
          username: winner.user?.username || null,
          avatarUrl: winner.user?.avatarUrl || null,
          totalWins: 1,
          totalEarnings: prizeAmount,
          totalParticipations:
            participationCounts.get(winner.walletAddress) || 1,
        });
      }
    });

    // Convert to array, calculate win rates, and sort
    const result = Array.from(winnerStatsMap.values())
      .map((winner) => ({
        walletAddress: winner.walletAddress,
        username: winner.username,
        avatarUrl: winner.avatarUrl,
        totalWins: winner.totalWins,
        totalEarnings: winner.totalEarnings.toString(),
        winRate:
          winner.totalParticipations > 0
            ? winner.totalWins / winner.totalParticipations
            : 0,
      }))
      .sort((a, b) => parseFloat(b.totalEarnings) - parseFloat(a.totalEarnings))
      .slice(0, limit);

    return result;
  }
}
