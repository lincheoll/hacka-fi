import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LeaderboardService, LeaderboardCategory } from './leaderboard.service';

@ApiTags('Leaderboards')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':category')
  @ApiOperation({
    summary: 'Get leaderboard by category',
  })
  @ApiParam({
    name: 'category',
    description: 'Leaderboard category',
    enum: [
      'total-earnings',
      'total-wins',
      'win-rate',
      'total-participations',
      'average-rank',
      'created-hackathons',
      'achievements-count',
    ],
    example: 'total-earnings',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of entries to return (max 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of entries to skip',
    example: 0,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for the leaderboard',
    enum: ['all-time', 'monthly', 'weekly'],
    example: 'all-time',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid category or parameters',
  })
  async getLeaderboard(
    @Param('category', new ParseEnumPipe({
      'total-earnings': 'total-earnings',
      'total-wins': 'total-wins',
      'win-rate': 'win-rate',
      'total-participations': 'total-participations',
      'average-rank': 'average-rank',
      'created-hackathons': 'created-hackathons',
      'achievements-count': 'achievements-count',
    })) category: LeaderboardCategory,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('period', new DefaultValuePipe('all-time')) period: 'all-time' | 'monthly' | 'weekly',
  ) {
    try {
      // Validate and cap limits
      const cappedLimit = Math.min(Math.max(limit, 1), 100);
      const validOffset = Math.max(offset, 0);

      const leaderboard = await this.leaderboardService.getLeaderboard(
        category,
        cappedLimit,
        validOffset,
        period,
      );

      return {
        success: true,
        data: {
          ...leaderboard,
          request: {
            category,
            limit: cappedLimit,
            offset: validOffset,
            period,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve leaderboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('earnings/top')
  @ApiOperation({
    summary: 'Get top earners leaderboard (shortcut)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of entries to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Top earners leaderboard retrieved successfully',
  })
  async getTopEarners(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.getLeaderboard('total-earnings', limit, 0, 'all-time');
  }

  @Get('wins/top')
  @ApiOperation({
    summary: 'Get top winners leaderboard (shortcut)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of entries to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Top winners leaderboard retrieved successfully',
  })
  async getTopWinners(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.getLeaderboard('total-wins', limit, 0, 'all-time');
  }

  @Get('participation/most-active')
  @ApiOperation({
    summary: 'Get most active participants leaderboard (shortcut)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of entries to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Most active participants leaderboard retrieved successfully',
  })
  async getMostActiveParticipants(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.getLeaderboard('total-participations', limit, 0, 'all-time');
  }

  @Get('user/:address/rankings')
  @ApiOperation({
    summary: 'Get user rankings across all categories',
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'User rankings retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User profile not found',
  })
  async getUserRankings(@Param('address') address: string) {
    try {
      const rankings = await this.leaderboardService.getUserRankings(address);

      return {
        success: true,
        data: rankings,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve user rankings',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('me/rankings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user rankings across all categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user rankings retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserRankings(@Req() req: any) {
    const userAddress = req.user.walletAddress;
    return this.getUserRankings(userAddress);
  }

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get leaderboard overview statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard overview statistics retrieved successfully',
  })
  async getLeaderboardOverview() {
    try {
      // Get top entries from each category for overview
      const [
        topEarners,
        topWinners,
        bestWinRates,
        mostActive,
        bestPerformers,
        topCreators,
      ] = await Promise.all([
        this.leaderboardService.getLeaderboard('total-earnings', 5, 0),
        this.leaderboardService.getLeaderboard('total-wins', 5, 0),
        this.leaderboardService.getLeaderboard('win-rate', 5, 0),
        this.leaderboardService.getLeaderboard('total-participations', 5, 0),
        this.leaderboardService.getLeaderboard('average-rank', 5, 0),
        this.leaderboardService.getLeaderboard('created-hackathons', 5, 0),
      ]);

      return {
        success: true,
        data: {
          overview: {
            topEarners: {
              category: 'Total Earnings',
              entries: topEarners.entries,
              total: topEarners.total,
            },
            topWinners: {
              category: 'Total Wins',
              entries: topWinners.entries,
              total: topWinners.total,
            },
            bestWinRates: {
              category: 'Win Rate',
              entries: bestWinRates.entries,
              total: bestWinRates.total,
            },
            mostActive: {
              category: 'Most Active',
              entries: mostActive.entries,
              total: mostActive.total,
            },
            bestPerformers: {
              category: 'Best Average Rank',
              entries: bestPerformers.entries,
              total: bestPerformers.total,
            },
            topCreators: {
              category: 'Top Creators',
              entries: topCreators.entries,
              total: topCreators.total,
            },
          },
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve leaderboard overview',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('refresh-cache')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force refresh all leaderboard caches (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard caches refreshed successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async refreshLeaderboardCache(@Req() req: any) {
    try {
      const adminAddress = req.user.walletAddress;
      
      await this.leaderboardService.refreshAllCaches();

      return {
        success: true,
        message: 'All leaderboard caches have been refreshed',
        data: {
          refreshedBy: adminAddress,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to refresh leaderboard caches',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('compare/:address1/:address2')
  @ApiOperation({
    summary: 'Compare rankings between two users',
  })
  @ApiParam({
    name: 'address1',
    description: 'First user wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiParam({
    name: 'address2',
    description: 'Second user wallet address',
    example: '0x8ba1f109551bD432803012645Hac136c',
  })
  @ApiResponse({
    status: 200,
    description: 'User comparison retrieved successfully',
  })
  async compareUsers(
    @Param('address1') address1: string,
    @Param('address2') address2: string,
  ) {
    try {
      const [rankings1, rankings2] = await Promise.all([
        this.leaderboardService.getUserRankings(address1),
        this.leaderboardService.getUserRankings(address2),
      ]);

      const comparison = {
        user1: rankings1,
        user2: rankings2,
        comparison: {
          totalEarnings: {
            winner: this.compareValues(
              rankings1.rankings.totalEarnings.value,
              rankings2.rankings.totalEarnings.value,
              'higher'
            ),
            difference: BigInt(rankings1.rankings.totalEarnings.value) - BigInt(rankings2.rankings.totalEarnings.value),
          },
          totalWins: {
            winner: this.compareValues(
              rankings1.rankings.totalWins.value,
              rankings2.rankings.totalWins.value,
              'higher'
            ),
            difference: rankings1.rankings.totalWins.value - rankings2.rankings.totalWins.value,
          },
          winRate: {
            winner: this.compareValues(
              rankings1.rankings.winRate.value,
              rankings2.rankings.winRate.value,
              'higher'
            ),
            difference: rankings1.rankings.winRate.value - rankings2.rankings.winRate.value,
          },
          totalParticipations: {
            winner: this.compareValues(
              rankings1.rankings.totalParticipations.value,
              rankings2.rankings.totalParticipations.value,
              'higher'
            ),
            difference: rankings1.rankings.totalParticipations.value - rankings2.rankings.totalParticipations.value,
          },
          averageRank: {
            winner: this.compareValues(
              rankings1.rankings.averageRank.value,
              rankings2.rankings.averageRank.value,
              'lower' // Lower average rank is better
            ),
            difference: rankings1.rankings.averageRank.value - rankings2.rankings.averageRank.value,
          },
        },
      };

      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to compare users',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private compareValues(value1: any, value2: any, betterWhen: 'higher' | 'lower'): 'user1' | 'user2' | 'tie' {
    const val1 = typeof value1 === 'string' ? parseFloat(value1) : Number(value1);
    const val2 = typeof value2 === 'string' ? parseFloat(value2) : Number(value2);

    if (val1 === val2) return 'tie';

    if (betterWhen === 'higher') {
      return val1 > val2 ? 'user1' : 'user2';
    } else {
      return val1 < val2 ? 'user1' : 'user2';
    }
  }
}