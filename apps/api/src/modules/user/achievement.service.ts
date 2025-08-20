import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { UserAchievement, AchievementType, HackathonStatus } from '@prisma/client';

export interface AchievementDefinition {
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  condition: (userStats: any) => boolean;
  metadata?: Record<string, any>;
}

export interface UserAchievementWithDetails extends UserAchievement {
  definition: AchievementDefinition;
  progress?: number; // For achievements with progressive requirements
}

export interface AchievementProgressInfo {
  achievementType: AchievementType;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  isEarned: boolean;
  earnedAt?: Date;
  progress: number; // 0-100
  requirement: string;
  currentValue: number;
  targetValue: number;
}

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);
  
  // Achievement definitions - these could be moved to a config file or database
  private readonly achievementDefinitions: AchievementDefinition[] = [
    // Participation Achievements
    {
      type: AchievementType.PARTICIPANT,
      title: 'First Steps',
      description: 'Participate in your first hackathon',
      icon: '🎯',
      rarity: 'common',
      condition: (stats) => stats.totalParticipations >= 1,
    },
    {
      type: AchievementType.PARTICIPANT,
      title: 'Regular Competitor',
      description: 'Participate in 5 hackathons',
      icon: '⚡',
      rarity: 'uncommon',
      condition: (stats) => stats.totalParticipations >= 5,
      metadata: { requiredParticipations: 5 },
    },
    {
      type: AchievementType.PARTICIPANT,
      title: 'Dedicated Hacker',
      description: 'Participate in 10 hackathons',
      icon: '🔥',
      rarity: 'rare',
      condition: (stats) => stats.totalParticipations >= 10,
      metadata: { requiredParticipations: 10 },
    },
    {
      type: AchievementType.PARTICIPANT,
      title: 'Hackathon Legend',
      description: 'Participate in 25 hackathons',
      icon: '👑',
      rarity: 'epic',
      condition: (stats) => stats.totalParticipations >= 25,
      metadata: { requiredParticipations: 25 },
    },

    // Winner Achievements
    {
      type: AchievementType.WINNER,
      title: 'First Victory',
      description: 'Win your first hackathon (1st-3rd place)',
      icon: '🏆',
      rarity: 'uncommon',
      condition: (stats) => stats.totalWins >= 1,
    },
    {
      type: AchievementType.WINNER,
      title: 'Champion',
      description: 'Win 3 hackathons',
      icon: '🥇',
      rarity: 'rare',
      condition: (stats) => stats.totalWins >= 3,
      metadata: { requiredWins: 3 },
    },
    {
      type: AchievementType.WINNER,
      title: 'Serial Winner',
      description: 'Win 5 hackathons',
      icon: '🌟',
      rarity: 'epic',
      condition: (stats) => stats.totalWins >= 5,
      metadata: { requiredWins: 5 },
    },
    {
      type: AchievementType.WINNER,
      title: 'Unstoppable',
      description: 'Win 10 hackathons',
      icon: '💎',
      rarity: 'legendary',
      condition: (stats) => stats.totalWins >= 10,
      metadata: { requiredWins: 10 },
    },

    // Win Rate Achievements
    {
      type: AchievementType.WINNER,
      title: 'High Performer',
      description: 'Achieve 50% win rate with at least 4 participations',
      icon: '📈',
      rarity: 'rare',
      condition: (stats) => stats.winRate >= 50 && stats.totalParticipations >= 4,
    },
    {
      type: AchievementType.WINNER,
      title: 'Elite Competitor',
      description: 'Achieve 70% win rate with at least 5 participations',
      icon: '⭐',
      rarity: 'epic',
      condition: (stats) => stats.winRate >= 70 && stats.totalParticipations >= 5,
    },

    // Judge Achievements
    {
      type: AchievementType.JUDGE,
      title: 'Wise Judge',
      description: 'Judge your first hackathon',
      icon: '⚖️',
      rarity: 'uncommon',
      condition: (stats) => stats.judgedHackathons >= 1,
    },
    {
      type: AchievementType.JUDGE,
      title: 'Expert Evaluator',
      description: 'Judge 5 hackathons',
      icon: '🧠',
      rarity: 'rare',
      condition: (stats) => stats.judgedHackathons >= 5,
      metadata: { requiredJudgements: 5 },
    },

    // Creator Achievements
    {
      type: AchievementType.CREATOR,
      title: 'Event Organizer',
      description: 'Create your first hackathon',
      icon: '🎪',
      rarity: 'uncommon',
      condition: (stats) => stats.createdHackathons >= 1,
    },
    {
      type: AchievementType.CREATOR,
      title: 'Community Builder',
      description: 'Create 3 hackathons',
      icon: '🏗️',
      rarity: 'rare',
      condition: (stats) => stats.createdHackathons >= 3,
      metadata: { requiredCreations: 3 },
    },

    // Special Achievements
    {
      type: AchievementType.PARTICIPANT,
      title: 'Consistent Performer',
      description: 'Maintain average rank of 3 or better with 5+ participations',
      icon: '🎯',
      rarity: 'rare',
      condition: (stats) => stats.averageRank > 0 && stats.averageRank <= 3 && stats.totalParticipations >= 5,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userAddress: string): Promise<UserAchievementWithDetails[]> {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      
      const achievements = await this.prisma.userAchievement.findMany({
        where: { userAddress: normalizedAddress },
        orderBy: { earnedAt: 'desc' },
      });

      return achievements.map(achievement => ({
        ...achievement,
        definition: this.getAchievementDefinition(achievement.achievementType),
      }));
    } catch (error) {
      this.logger.error(`Failed to get user achievements for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get achievement progress for a user (earned + available achievements)
   */
  async getUserAchievementProgress(userAddress: string): Promise<AchievementProgressInfo[]> {
    try {
      const normalizedAddress = userAddress.toLowerCase();

      // Get user statistics
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: normalizedAddress },
        include: {
          participations: {
            include: { hackathon: true },
          },
          createdHackathons: true,
          votes: true,
          judgeRoles: true,
        },
      });

      if (!userProfile) {
        return [];
      }

      const stats = this.calculateUserStatsForAchievements(userProfile);

      // Get earned achievements
      const earnedAchievements = await this.prisma.userAchievement.findMany({
        where: { userAddress: normalizedAddress },
      });

      const earnedAchievementMap = new Map(
        earnedAchievements.map(a => [`${a.achievementType}`, a])
      );

      // Generate progress info for all achievements
      const progressInfo: AchievementProgressInfo[] = [];

      // Group definitions by type to avoid duplicates
      const definitionsByType = new Map<string, AchievementDefinition>();
      
      for (const def of this.achievementDefinitions) {
        const key = `${def.type}-${def.title}`;
        definitionsByType.set(key, def);
      }

      for (const [key, definition] of definitionsByType) {
        const earned = earnedAchievementMap.get(definition.type);
        const progress = this.calculateAchievementProgress(definition, stats);

        progressInfo.push({
          achievementType: definition.type,
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          rarity: definition.rarity,
          isEarned: !!earned,
          earnedAt: earned?.earnedAt,
          progress: progress.percentage,
          requirement: progress.requirement,
          currentValue: progress.currentValue,
          targetValue: progress.targetValue,
        });
      }

      return progressInfo.sort((a, b) => {
        // Sort by earned status first, then by progress
        if (a.isEarned && !b.isEarned) return -1;
        if (!a.isEarned && b.isEarned) return 1;
        return b.progress - a.progress;
      });
    } catch (error) {
      this.logger.error(`Failed to get achievement progress for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Check and award achievements for a user based on their current stats
   */
  async checkAndAwardAchievements(userAddress: string, hackathonId?: string): Promise<UserAchievement[]> {
    try {
      const normalizedAddress = userAddress.toLowerCase();

      // Get user profile with stats
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { walletAddress: normalizedAddress },
        include: {
          participations: {
            include: { hackathon: true },
          },
          createdHackathons: true,
          votes: true,
          judgeRoles: true,
          achievements: true,
        },
      });

      if (!userProfile) {
        this.logger.warn(`No user profile found for ${userAddress}`);
        return [];
      }

      const stats = this.calculateUserStatsForAchievements(userProfile);
      const existingAchievements = new Set(
        userProfile.achievements.map(a => `${a.achievementType}-${a.hackathonId || 'global'}`)
      );

      const newAchievements: UserAchievement[] = [];

      // Check each achievement definition
      for (const definition of this.achievementDefinitions) {
        const achievementKey = `${definition.type}-${hackathonId || 'global'}`;
        
        // Skip if already earned
        if (existingAchievements.has(achievementKey)) {
          continue;
        }

        // Check if condition is met
        if (definition.condition(stats)) {
          const achievement = await this.awardAchievement(
            normalizedAddress,
            definition.type,
            hackathonId,
          );
          
          if (achievement) {
            newAchievements.push(achievement);
            this.logger.log(
              `Achievement "${definition.title}" awarded to ${userAddress}${hackathonId ? ` for hackathon ${hackathonId}` : ''}`
            );
          }
        }
      }

      // Emit event for new achievements
      if (newAchievements.length > 0) {
        this.eventEmitter.emit('achievements.awarded', {
          userAddress: normalizedAddress,
          achievements: newAchievements,
          hackathonId,
        });
      }

      return newAchievements;
    } catch (error) {
      this.logger.error(`Failed to check achievements for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Award a specific achievement to a user
   */
  async awardAchievement(
    userAddress: string,
    achievementType: AchievementType,
    hackathonId?: string,
    rank?: number,
    prizeAmount?: string,
  ): Promise<UserAchievement | null> {
    try {
      const normalizedAddress = userAddress.toLowerCase();

      // Check if already exists
      const existing = await this.prisma.userAchievement.findFirst({
        where: {
          userAddress: normalizedAddress,
          achievementType,
          ...(hackathonId && { hackathonId }),
        },
      });

      if (existing) {
        this.logger.debug(`Achievement ${achievementType} already exists for ${userAddress}`);
        return existing;
      }

      const achievement = await this.prisma.userAchievement.create({
        data: {
          userAddress: normalizedAddress,
          achievementType,
          hackathonId,
          rank,
          prizeAmount,
        },
      });

      return achievement;
    } catch (error) {
      this.logger.error(`Failed to award achievement ${achievementType} to ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Handle hackathon completion events to award achievements
   */
  @OnEvent('hackathon.completed')
  async handleHackathonCompleted(event: { hackathonId: string; results: any[] }) {
    this.logger.log(`Processing achievements for completed hackathon: ${event.hackathonId}`);

    try {
      // Award participation achievements to all participants
      const participants = await this.prisma.participant.findMany({
        where: { hackathonId: event.hackathonId },
        include: { user: true },
      });

      for (const participant of participants) {
        // Award participation achievement
        await this.awardAchievement(
          participant.walletAddress,
          AchievementType.PARTICIPANT,
          event.hackathonId,
        );

        // Award winner achievements for top 3
        if (participant.rank && participant.rank <= 3) {
          await this.awardAchievement(
            participant.walletAddress,
            AchievementType.WINNER,
            event.hackathonId,
            participant.rank,
            participant.prizeAmount,
          );
        }

        // Check for other achievements based on updated stats
        await this.checkAndAwardAchievements(participant.walletAddress, event.hackathonId);
      }

      // Award creator achievement
      const hackathon = await this.prisma.hackathon.findUnique({
        where: { id: event.hackathonId },
      });

      if (hackathon) {
        await this.awardAchievement(
          hackathon.organizerAddress,
          AchievementType.CREATOR,
          event.hackathonId,
        );
      }

      this.logger.log(`Achievement processing completed for hackathon: ${event.hackathonId}`);
    } catch (error) {
      this.logger.error(`Failed to process achievements for hackathon ${event.hackathonId}:`, error);
    }
  }

  /**
   * Get achievement definition by type
   */
  private getAchievementDefinition(type: AchievementType): AchievementDefinition {
    const definition = this.achievementDefinitions.find(d => d.type === type);
    
    return definition || {
      type,
      title: 'Unknown Achievement',
      description: 'Achievement definition not found',
      icon: '❓',
      rarity: 'common',
      condition: () => false,
    };
  }

  /**
   * Calculate user statistics for achievement evaluation
   */
  private calculateUserStatsForAchievements(userProfile: any) {
    const totalParticipations = userProfile.participations.length;
    const totalWins = userProfile.participations.filter(
      (p: any) => p.rank !== null && p.rank <= 3
    ).length;
    
    const winRate = totalParticipations > 0 ? (totalWins / totalParticipations) * 100 : 0;
    
    const rankedParticipations = userProfile.participations.filter((p: any) => p.rank !== null);
    const averageRank = rankedParticipations.length > 0
      ? rankedParticipations.reduce((sum: number, p: any) => sum + p.rank, 0) / rankedParticipations.length
      : 0;

    return {
      totalParticipations,
      totalWins,
      winRate,
      averageRank,
      createdHackathons: userProfile.createdHackathons.length,
      judgedHackathons: userProfile.judgeRoles.length,
      totalVotesCast: userProfile.votes.length,
    };
  }

  /**
   * Calculate achievement progress
   */
  private calculateAchievementProgress(definition: AchievementDefinition, stats: any) {
    let currentValue = 0;
    let targetValue = 1;
    let requirement = definition.description;

    // Determine current and target values based on achievement type and metadata
    if (definition.metadata?.requiredParticipations) {
      currentValue = stats.totalParticipations;
      targetValue = definition.metadata.requiredParticipations;
      requirement = `Participate in ${targetValue} hackathons`;
    } else if (definition.metadata?.requiredWins) {
      currentValue = stats.totalWins;
      targetValue = definition.metadata.requiredWins;
      requirement = `Win ${targetValue} hackathons`;
    } else if (definition.metadata?.requiredJudgements) {
      currentValue = stats.judgedHackathons;
      targetValue = definition.metadata.requiredJudgements;
      requirement = `Judge ${targetValue} hackathons`;
    } else if (definition.metadata?.requiredCreations) {
      currentValue = stats.createdHackathons;
      targetValue = definition.metadata.requiredCreations;
      requirement = `Create ${targetValue} hackathons`;
    } else {
      // For simple boolean achievements
      currentValue = definition.condition(stats) ? 1 : 0;
      targetValue = 1;
    }

    const percentage = Math.min(100, Math.round((currentValue / targetValue) * 100));

    return {
      currentValue,
      targetValue,
      percentage,
      requirement,
    };
  }
}