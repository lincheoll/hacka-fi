import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { UserProfile, Prisma } from '@prisma/client';

export interface UserProfileWithStats {
  walletAddress: string;
  username: string | undefined;
  bio: string | undefined;
  avatarUrl: string | undefined;
  createdAt: Date;
  updatedAt: Date;
  stats: {
    totalParticipations: number;
    totalWins: number;
    totalPrizeEarnings: string;
    winRate: number;
    averageRank: number;
    createdHackathons: number;
    judgedHackathons: number;
    totalVotesCast: number;
  };
}

export interface UserParticipationHistory {
  hackathonId: string;
  hackathonTitle: string;
  hackathonStatus: string;
  submissionUrl: string | undefined;
  rank: number | undefined;
  prizeAmount: string | undefined;
  participatedAt: Date;
  isWinner: boolean;
}

export interface CreateUserProfileDto {
  walletAddress: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateUserProfileDto {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user profile
   */
  async createProfile(data: CreateUserProfileDto): Promise<UserProfile> {
    try {
      // Check if username is already taken (if provided)
      if (data.username) {
        const existingUser = await this.prisma.userProfile.findUnique({
          where: { username: data.username },
        });

        if (existingUser) {
          throw new BadRequestException('Username already taken');
        }
      }

      const profile = await this.prisma.userProfile.create({
        data: {
          walletAddress: data.walletAddress.toLowerCase(),
          username: data.username ?? null,
          bio: data.bio ?? null,
          avatarUrl: data.avatarUrl ?? null,
        },
      });

      this.logger.log(`User profile created for ${data.walletAddress}`);
      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to create user profile for ${data.walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<UserProfile | null> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
      });

      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to get user profile for ${walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user profile with comprehensive statistics
   */
  async getProfileWithStats(
    walletAddress: string,
  ): Promise<UserProfileWithStats | null> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      const profile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: normalizedAddress },
        include: {
          participations: {
            include: {
              hackathon: true,
            },
          },
          createdHackathons: true,
          votes: true,
          achievements: true,
          judgeRoles: true,
        },
      });

      if (!profile) {
        return null;
      }

      // Calculate statistics
      const stats = await this.calculateUserStats(normalizedAddress, profile);

      return {
        walletAddress: profile.walletAddress,
        username: profile.username || undefined,
        bio: profile.bio || undefined,
        avatarUrl: profile.avatarUrl || undefined,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        stats,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user profile with stats for ${walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    walletAddress: string,
    data: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      // Check if the profile exists
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      if (!existingProfile) {
        throw new NotFoundException('User profile not found');
      }

      // Check username uniqueness (if being updated)
      if (data.username && data.username !== existingProfile.username) {
        const usernameExists = await this.prisma.userProfile.findUnique({
          where: { username: data.username },
        });

        if (usernameExists) {
          throw new BadRequestException('Username already taken');
        }
      }

      const updatedProfile = await this.prisma.userProfile.update({
        where: { walletAddress: normalizedAddress },
        data: {
          ...(data.username !== undefined && { username: data.username }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        },
      });

      this.logger.log(`User profile updated for ${walletAddress}`);
      return updatedProfile;
    } catch (error) {
      this.logger.error(
        `Failed to update user profile for ${walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user participation history
   */
  async getParticipationHistory(
    walletAddress: string,
    limit = 10,
    offset = 0,
  ): Promise<{
    history: UserParticipationHistory[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      const participations = await this.prisma.participant.findMany({
        where: { walletAddress: normalizedAddress },
        include: {
          hackathon: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const total = await this.prisma.participant.count({
        where: { walletAddress: normalizedAddress },
      });

      const history: UserParticipationHistory[] = participations.map(
        (participation) => ({
          hackathonId: participation.hackathonId,
          hackathonTitle: participation.hackathon.title,
          hackathonStatus: participation.hackathon.status,
          submissionUrl: participation.submissionUrl || undefined,
          rank: participation.rank || undefined,
          prizeAmount: participation.prizeAmount || undefined,
          participatedAt: participation.createdAt,
          isWinner: participation.rank !== null && participation.rank <= 3,
        }),
      );

      return {
        history,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get participation history for ${walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get or create user profile (useful for authentication)
   */
  async getOrCreateProfile(walletAddress: string): Promise<UserProfile> {
    try {
      const normalizedAddress = walletAddress.toLowerCase();

      let profile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: normalizedAddress },
      });

      if (!profile) {
        profile = await this.createProfile({
          walletAddress: normalizedAddress,
        });
      }

      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to get or create user profile for ${walletAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(
    username: string,
    excludeAddress?: string,
  ): Promise<boolean> {
    try {
      const existingUser = await this.prisma.userProfile.findUnique({
        where: { username },
      });

      if (!existingUser) {
        return true;
      }

      // If excludeAddress is provided, allow the username if it belongs to that address
      return excludeAddress
        ? existingUser.walletAddress === excludeAddress.toLowerCase()
        : false;
    } catch (error) {
      this.logger.error(
        `Failed to check username availability for ${username}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Search users by username or address
   */
  async searchUsers(
    query: string,
    limit = 10,
    offset = 0,
  ): Promise<{
    users: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const searchQuery = query.toLowerCase();

      const whereClause: Prisma.UserProfileWhereInput = {
        OR: [
          {
            username: {
              contains: searchQuery,
            },
          },
          {
            walletAddress: {
              startsWith: searchQuery,
            },
          },
        ],
      };

      const users = await this.prisma.userProfile.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: [{ username: 'asc' }, { walletAddress: 'asc' }],
      });

      const total = await this.prisma.userProfile.count({
        where: whereClause,
      });

      return {
        users,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error(`Failed to search users with query ${query}:`, error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive user statistics
   */
  private async calculateUserStats(
    walletAddress: string,
    profile: any,
  ): Promise<UserProfileWithStats['stats']> {
    // Total participations
    const totalParticipations = profile.participations.length;

    // Total wins (rank 1-3)
    const totalWins = profile.participations.filter(
      (p: any) => p.rank !== null && p.rank <= 3,
    ).length;

    // Calculate total prize earnings
    const totalPrizeEarnings = profile.participations
      .filter((p: any) => p.prizeAmount)
      .reduce((sum: bigint, p: any) => {
        return sum + BigInt(p.prizeAmount || '0');
      }, BigInt(0))
      .toString();

    // Win rate (percentage of participations that resulted in top 3)
    const winRate =
      totalParticipations > 0 ? (totalWins / totalParticipations) * 100 : 0;

    // Calculate average rank (only for completed hackathons where rank is assigned)
    const rankedParticipations = profile.participations.filter(
      (p: any) => p.rank !== null,
    );
    const averageRank =
      rankedParticipations.length > 0
        ? rankedParticipations.reduce(
            (sum: number, p: any) => sum + p.rank,
            0,
          ) / rankedParticipations.length
        : 0;

    // Created hackathons
    const createdHackathons = profile.createdHackathons.length;

    // Judged hackathons
    const judgedHackathons = profile.judgeRoles.length;

    // Total votes cast
    const totalVotesCast = profile.votes.length;

    return {
      totalParticipations,
      totalWins,
      totalPrizeEarnings,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      averageRank: Math.round(averageRank * 100) / 100,
      createdHackathons,
      judgedHackathons,
      totalVotesCast,
    };
  }

  async getUserParticipations(walletAddress: string) {
    this.logger.debug(`Getting participations for user: ${walletAddress}`);

    try {
      const participations = await this.prisma.participant.findMany({
        where: {
          walletAddress: walletAddress,
        },
        include: {
          hackathon: {
            select: {
              id: true,
              title: true,
              status: true,
              prizeAmount: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return participations.map((participation: any) => ({
        id: participation.id,
        hackathonId: participation.hackathonId,
        hackathonTitle: participation.hackathon.title,
        hackathonStatus: participation.hackathon.status,
        submissionUrl: participation.submissionUrl,
        rank: participation.rank,
        prizeAmount: participation.prizeAmount,
        registeredAt: participation.createdAt,
        walletAddress: participation.walletAddress,
        isWinner: participation.rank !== null && participation.rank <= 3,
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to get user participations: ${error?.message || 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to retrieve user participations');
    }
  }

  async getUserHackathons(walletAddress: string) {
    this.logger.debug(`Getting hackathons created by user: ${walletAddress}`);

    try {
      const hackathons = await this.prisma.hackathon.findMany({
        where: {
          organizerAddress: walletAddress,
        },
        include: {
          participants: {
            select: {
              id: true,
              walletAddress: true,
              createdAt: true,
              submissionUrl: true,
            },
          },
          judges: {
            select: {
              id: true,
              judgeAddress: true,
            },
          },
          _count: {
            select: {
              participants: true,
              judges: true,
              votes: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return hackathons.map((hackathon: any) => ({
        id: hackathon.id,
        title: hackathon.title,
        description: hackathon.description,
        status: hackathon.status,
        organizerAddress: hackathon.organizerAddress,
        prizeAmount: hackathon.prizeAmount,
        entryFee: hackathon.entryFee,
        maxParticipants: hackathon.maxParticipants,
        registrationDeadline: hackathon.registrationDeadline,
        submissionDeadline: hackathon.submissionDeadline,
        votingDeadline: hackathon.votingDeadline,
        coverImageUrl: hackathon.coverImageUrl,
        createdAt: hackathon.createdAt,
        updatedAt: hackathon.updatedAt,
        participants: hackathon.participants.map((p: any) => ({
          id: p.id,
          userAddress: p.walletAddress,
          registeredAt: p.createdAt,
          submissionUrl: p.submissionUrl,
        })),
        participantCount: hackathon._count.participants,
        judgeCount: hackathon._count.judges,
        voteCount: hackathon._count.votes,
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to get user hackathons: ${error?.message || 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to retrieve user hackathons');
    }
  }
}
