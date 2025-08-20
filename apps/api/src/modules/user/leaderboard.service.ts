import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface LeaderboardEntry {
  rank: number;
  userAddress: string;
  username?: string;
  avatarUrl?: string;
  value: number | string;
  change?: number; // Position change from previous ranking
  metadata?: Record<string, any>;
}

export interface LeaderboardResponse {
  category: string;
  entries: LeaderboardEntry[];
  total: number;
  lastUpdated: Date;
  period?: 'all-time' | 'monthly' | 'weekly';
}

export interface UserRankingInfo {
  userAddress: string;
  rankings: {
    totalEarnings: { rank: number; value: string; total: number };
    totalWins: { rank: number; value: number; total: number };
    winRate: { rank: number; value: number; total: number };
    totalParticipations: { rank: number; value: number; total: number };
    averageRank: { rank: number; value: number; total: number };
    createdHackathons: { rank: number; value: number; total: number };
  };
}

export type LeaderboardCategory = 
  | 'total-earnings' 
  | 'total-wins' 
  | 'win-rate' 
  | 'total-participations'
  | 'average-rank'
  | 'created-hackathons'
  | 'achievements-count';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private leaderboardCache = new Map<string, { data: LeaderboardResponse; expiry: Date }>();
  private readonly cacheExpiryHours = 1; // Cache for 1 hour

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get leaderboard by category
   */
  async getLeaderboard(
    category: LeaderboardCategory,
    limit = 50,
    offset = 0,
    period: 'all-time' | 'monthly' | 'weekly' = 'all-time',
  ): Promise<LeaderboardResponse> {
    const cacheKey = `${category}-${limit}-${offset}-${period}`;
    
    // Check cache first
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }

    let leaderboard: LeaderboardResponse;

    switch (category) {
      case 'total-earnings':
        leaderboard = await this.getTotalEarningsLeaderboard(limit, offset, period);
        break;
      case 'total-wins':
        leaderboard = await this.getTotalWinsLeaderboard(limit, offset, period);
        break;
      case 'win-rate':
        leaderboard = await this.getWinRateLeaderboard(limit, offset, period);
        break;
      case 'total-participations':
        leaderboard = await this.getTotalParticipationsLeaderboard(limit, offset, period);
        break;
      case 'average-rank':
        leaderboard = await this.getAverageRankLeaderboard(limit, offset, period);
        break;
      case 'created-hackathons':
        leaderboard = await this.getCreatedHackathonsLeaderboard(limit, offset, period);
        break;
      case 'achievements-count':
        leaderboard = await this.getAchievementsCountLeaderboard(limit, offset, period);
        break;
      default:
        throw new Error(`Unknown leaderboard category: ${category}`);
    }

    // Cache the result
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + this.cacheExpiryHours);
    this.leaderboardCache.set(cacheKey, { data: leaderboard, expiry });

    return leaderboard;
  }

  /**
   * Get user's ranking across all categories
   */
  async getUserRankings(userAddress: string): Promise<UserRankingInfo> {
    const normalizedAddress = userAddress.toLowerCase();

    // Get user's statistics first
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { walletAddress: normalizedAddress },
      include: {
        participations: {
          include: { hackathon: true },
        },
        createdHackathons: true,
        achievements: true,
      },
    });

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    const userStats = this.calculateUserStats(userProfile);

    // Get rankings for each category
    const rankings = await Promise.all([
      this.getUserRankInCategory('total-earnings', normalizedAddress, userStats.totalEarnings),
      this.getUserRankInCategory('total-wins', normalizedAddress, userStats.totalWins),
      this.getUserRankInCategory('win-rate', normalizedAddress, userStats.winRate),
      this.getUserRankInCategory('total-participations', normalizedAddress, userStats.totalParticipations),
      this.getUserRankInCategory('average-rank', normalizedAddress, userStats.averageRank),
      this.getUserRankInCategory('created-hackathons', normalizedAddress, userStats.createdHackathons),
    ]);

    return {
      userAddress: normalizedAddress,
      rankings: {
        totalEarnings: rankings[0],
        totalWins: rankings[1],
        winRate: rankings[2],
        totalParticipations: rankings[3],
        averageRank: rankings[4],
        createdHackathons: rankings[5],
      },
    };
  }

  /**
   * Get total earnings leaderboard
   */
  private async getTotalEarningsLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.wallet_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COALESCE(SUM(CAST(p.prize_amount AS DECIMAL)), 0) as totalEarnings
      FROM participants p
      LEFT JOIN user_profiles up ON p.wallet_address = up.wallet_address
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE p.prize_amount IS NOT NULL 
        AND p.prize_amount != '0'
        ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY p.wallet_address, up.username, up.avatar_url
      ORDER BY totalEarnings DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT p.wallet_address) as count
      FROM participants p
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE p.prize_amount IS NOT NULL 
        AND p.prize_amount != '0'
        ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: result.totalEarnings.toString(),
      metadata: { category: 'earnings' },
    }));

    return {
      category: 'total-earnings',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get total wins leaderboard
   */
  private async getTotalWinsLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.wallet_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COUNT(*) as totalWins
      FROM participants p
      LEFT JOIN user_profiles up ON p.wallet_address = up.wallet_address
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE p.rank IS NOT NULL AND p.rank <= 3
        ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY p.wallet_address, up.username, up.avatar_url
      ORDER BY totalWins DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT p.wallet_address) as count
      FROM participants p
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE p.rank IS NOT NULL AND p.rank <= 3
        ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.totalWins),
      metadata: { category: 'wins' },
    }));

    return {
      category: 'total-wins',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get win rate leaderboard (minimum 3 participations required)
   */
  private async getWinRateLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.wallet_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COUNT(*) as totalParticipations,
        SUM(CASE WHEN p.rank IS NOT NULL AND p.rank <= 3 THEN 1 ELSE 0 END) as totalWins,
        ROUND((SUM(CASE WHEN p.rank IS NOT NULL AND p.rank <= 3 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as winRate
      FROM participants p
      LEFT JOIN user_profiles up ON p.wallet_address = up.wallet_address
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY p.wallet_address, up.username, up.avatar_url
      HAVING COUNT(*) >= 3
      ORDER BY winRate DESC, totalWins DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT p.wallet_address
        FROM participants p
        LEFT JOIN hackathons h ON p.hackathon_id = h.id
        WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
        GROUP BY p.wallet_address
        HAVING COUNT(*) >= 3
      ) AS qualified_users
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.winRate),
      metadata: { 
        category: 'winRate',
        totalParticipations: Number(result.totalParticipations),
        totalWins: Number(result.totalWins),
      },
    }));

    return {
      category: 'win-rate',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get total participations leaderboard
   */
  private async getTotalParticipationsLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.wallet_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COUNT(*) as totalParticipations
      FROM participants p
      LEFT JOIN user_profiles up ON p.wallet_address = up.wallet_address
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY p.wallet_address, up.username, up.avatar_url
      ORDER BY totalParticipations DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT p.wallet_address) as count
      FROM participants p
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.totalParticipations),
      metadata: { category: 'participations' },
    }));

    return {
      category: 'total-participations',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get average rank leaderboard (minimum 3 participations, lower is better)
   */
  private async getAverageRankLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        p.wallet_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        ROUND(AVG(CAST(p.rank AS DECIMAL)), 2) as averageRank,
        COUNT(*) as totalRankedParticipations
      FROM participants p
      LEFT JOIN user_profiles up ON p.wallet_address = up.wallet_address
      LEFT JOIN hackathons h ON p.hackathon_id = h.id
      WHERE p.rank IS NOT NULL 
        ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY p.wallet_address, up.username, up.avatar_url
      HAVING COUNT(*) >= 3
      ORDER BY averageRank ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT p.wallet_address
        FROM participants p
        LEFT JOIN hackathons h ON p.hackathon_id = h.id
        WHERE p.rank IS NOT NULL 
          ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
        GROUP BY p.wallet_address
        HAVING COUNT(*) >= 3
      ) AS qualified_users
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.averageRank),
      metadata: { 
        category: 'averageRank',
        totalRankedParticipations: Number(result.totalRankedParticipations),
      },
    }));

    return {
      category: 'average-rank',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get created hackathons leaderboard
   */
  private async getCreatedHackathonsLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        h.organizer_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COUNT(*) as createdHackathons
      FROM hackathons h
      LEFT JOIN user_profiles up ON h.organizer_address = up.wallet_address
      WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
      GROUP BY h.organizer_address, up.username, up.avatar_url
      ORDER BY createdHackathons DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT h.organizer_address) as count
      FROM hackathons h
      WHERE 1=1 ${dateFilter ? `AND h.created_at >= ${dateFilter}` : ''}
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.createdHackathons),
      metadata: { category: 'creator' },
    }));

    return {
      category: 'created-hackathons',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get achievements count leaderboard
   */
  private async getAchievementsCountLeaderboard(
    limit: number,
    offset: number,
    period: string,
  ): Promise<LeaderboardResponse> {
    const dateFilter = this.getPeriodFilter(period);

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        a.user_address as userAddress,
        up.username,
        up.avatar_url as avatarUrl,
        COUNT(*) as achievementsCount
      FROM user_achievements a
      LEFT JOIN user_profiles up ON a.user_address = up.wallet_address
      WHERE 1=1 ${dateFilter ? `AND a.earned_at >= ${dateFilter}` : ''}
      GROUP BY a.user_address, up.username, up.avatar_url
      ORDER BY achievementsCount DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT a.user_address) as count
      FROM user_achievements a
      WHERE 1=1 ${dateFilter ? `AND a.earned_at >= ${dateFilter}` : ''}
    `;

    const entries: LeaderboardEntry[] = results.map((result, index) => ({
      rank: offset + index + 1,
      userAddress: result.userAddress,
      username: result.username,
      avatarUrl: result.avatarUrl,
      value: Number(result.achievementsCount),
      metadata: { category: 'achievements' },
    }));

    return {
      category: 'achievements-count',
      entries,
      total: Number(total[0]?.count || 0),
      lastUpdated: new Date(),
      period: period as any,
    };
  }

  /**
   * Get user's rank in a specific category
   */
  private async getUserRankInCategory(
    category: string,
    userAddress: string,
    userValue: any,
  ): Promise<{ rank: number; value: any; total: number }> {
    // This is a simplified implementation - in a real app you'd want to optimize these queries
    const leaderboard = await this.getLeaderboard(category as LeaderboardCategory, 1000, 0);
    
    const userEntry = leaderboard.entries.find(entry => entry.userAddress === userAddress);
    
    return {
      rank: userEntry?.rank || leaderboard.entries.length + 1,
      value: userValue,
      total: leaderboard.total,
    };
  }

  /**
   * Calculate user statistics
   */
  private calculateUserStats(userProfile: any) {
    const totalParticipations = userProfile.participations.length;
    const totalWins = userProfile.participations.filter(
      (p: any) => p.rank !== null && p.rank <= 3,
    ).length;
    
    const totalEarnings = userProfile.participations
      .filter((p: any) => p.prizeAmount)
      .reduce((sum: bigint, p: any) => sum + BigInt(p.prizeAmount || '0'), BigInt(0))
      .toString();

    const winRate = totalParticipations > 0 ? (totalWins / totalParticipations) * 100 : 0;
    
    const rankedParticipations = userProfile.participations.filter((p: any) => p.rank !== null);
    const averageRank = rankedParticipations.length > 0
      ? rankedParticipations.reduce((sum: number, p: any) => sum + p.rank, 0) / rankedParticipations.length
      : 0;

    return {
      totalParticipations,
      totalWins,
      totalEarnings,
      winRate,
      averageRank,
      createdHackathons: userProfile.createdHackathons.length,
      achievementsCount: userProfile.achievements.length,
    };
  }

  /**
   * Get period filter for SQL queries
   */
  private getPeriodFilter(period: string): string | null {
    const now = new Date();
    
    switch (period) {
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `'${weekAgo.toISOString()}'`;
      case 'monthly':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return `'${monthAgo.toISOString()}'`;
      case 'all-time':
      default:
        return null;
    }
  }

  /**
   * Clear leaderboard cache (scheduled task)
   */
  @Cron(CronExpression.EVERY_HOUR)
  private clearExpiredCache() {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.leaderboardCache.entries()) {
      if (cached.expiry <= now) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.leaderboardCache.delete(key));

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleared ${expiredKeys.length} expired leaderboard cache entries`);
    }
  }

  /**
   * Force refresh all leaderboard caches
   */
  async refreshAllCaches(): Promise<void> {
    this.leaderboardCache.clear();
    this.logger.log('All leaderboard caches have been cleared');
  }
}