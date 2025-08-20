import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AchievementService } from './achievement.service';
import { AchievementType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsEthereumAddress,
  IsInt,
  Min,
} from 'class-validator';

export class ManualAwardAchievementDto {
  @IsEthereumAddress()
  userAddress!: string;

  @IsEnum(AchievementType)
  achievementType!: AchievementType;

  @IsOptional()
  @IsString()
  hackathonId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @IsOptional()
  @IsString()
  prizeAmount?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TriggerAchievementCheckDto {
  @IsEthereumAddress()
  userAddress!: string;

  @IsOptional()
  @IsString()
  hackathonId?: string;
}

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('user/:address')
  @ApiOperation({
    summary: 'Get all achievements for a specific user',
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiQuery({
    name: 'includeProgress',
    required: false,
    description: 'Include achievement progress information',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'User achievements retrieved successfully',
  })
  async getUserAchievements(
    @Param('address') address: string,
    @Query('includeProgress', new DefaultValuePipe(false), ParseBoolPipe)
    includeProgress: boolean,
  ) {
    try {
      if (includeProgress) {
        const achievementProgress =
          await this.achievementService.getUserAchievementProgress(address);
        return {
          success: true,
          data: {
            address,
            achievementProgress,
            total: achievementProgress.length,
            earned: achievementProgress.filter((a) => a.isEarned).length,
          },
        };
      } else {
        const achievements =
          await this.achievementService.getUserAchievements(address);
        return {
          success: true,
          data: {
            address,
            achievements,
            total: achievements.length,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve user achievements',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get achievements for the current authenticated user',
  })
  @ApiQuery({
    name: 'includeProgress',
    required: false,
    description: 'Include achievement progress information',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Current user achievements retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserAchievements(
    @Req() req: any,
    @Query('includeProgress', new DefaultValuePipe(true), ParseBoolPipe)
    includeProgress: boolean,
  ) {
    const userAddress = req.user.walletAddress;
    return this.getUserAchievements(userAddress, includeProgress);
  }

  @Get('progress/:address')
  @ApiOperation({
    summary: 'Get detailed achievement progress for a user',
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'Achievement progress retrieved successfully',
  })
  async getUserAchievementProgress(@Param('address') address: string) {
    try {
      const progress =
        await this.achievementService.getUserAchievementProgress(address);

      const earned = progress.filter((p) => p.isEarned);
      const available = progress.filter((p) => !p.isEarned);
      const inProgress = available.filter((p) => p.progress > 0);

      return {
        success: true,
        data: {
          address,
          summary: {
            totalAchievements: progress.length,
            earnedCount: earned.length,
            availableCount: available.length,
            inProgressCount: inProgress.length,
            completionRate:
              progress.length > 0
                ? Math.round((earned.length / progress.length) * 100)
                : 0,
          },
          achievements: {
            earned: earned.sort(
              (a, b) =>
                (b.earnedAt?.getTime() || 0) - (a.earnedAt?.getTime() || 0),
            ),
            inProgress: inProgress.sort((a, b) => b.progress - a.progress),
            available: available.filter((p) => p.progress === 0),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve achievement progress',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('check')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger achievement check for a user (Admin only)',
  })
  @ApiBody({ type: TriggerAchievementCheckDto })
  @ApiResponse({
    status: 200,
    description: 'Achievement check triggered successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async triggerAchievementCheck(
    @Body() dto: TriggerAchievementCheckDto,
    @Req() req: any,
  ) {
    try {
      const adminAddress = req.user.walletAddress;

      const newAchievements =
        await this.achievementService.checkAndAwardAchievements(
          dto.userAddress,
          dto.hackathonId,
        );

      return {
        success: true,
        message: `Achievement check completed for ${dto.userAddress}`,
        data: {
          userAddress: dto.userAddress,
          hackathonId: dto.hackathonId,
          newAchievements,
          newAchievementCount: newAchievements.length,
          triggeredBy: adminAddress,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to trigger achievement check',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('award')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Manually award achievement to user (Admin only)',
  })
  @ApiBody({ type: ManualAwardAchievementDto })
  @ApiResponse({
    status: 201,
    description: 'Achievement awarded successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async manuallyAwardAchievement(
    @Body() dto: ManualAwardAchievementDto,
    @Req() req: any,
  ) {
    try {
      const adminAddress = req.user.walletAddress;

      const achievement = await this.achievementService.awardAchievement(
        dto.userAddress,
        dto.achievementType,
        dto.hackathonId,
        dto.rank,
        dto.prizeAmount,
      );

      if (!achievement) {
        return {
          success: false,
          message: 'Achievement already exists or could not be awarded',
        };
      }

      return {
        success: true,
        message: `Achievement ${dto.achievementType} awarded to ${dto.userAddress}`,
        data: {
          achievement,
          reason: dto.reason,
          awardedBy: adminAddress,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to award achievement',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('stats/global')
  @ApiOperation({
    summary: 'Get global achievement statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Global achievement statistics retrieved successfully',
  })
  async getGlobalAchievementStats() {
    try {
      const stats = await this.achievementService[
        'prisma'
      ].userAchievement.groupBy({
        by: ['achievementType'],
        _count: {
          id: true,
        },
      });

      const totalUsers =
        await this.achievementService['prisma'].userProfile.count();
      const usersWithAchievements = await this.achievementService[
        'prisma'
      ].userProfile.count({
        where: {
          achievements: {
            some: {},
          },
        },
      });

      const achievementStats = stats.reduce(
        (acc, stat) => {
          acc[stat.achievementType] = stat._count.id;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        success: true,
        data: {
          totalUsers,
          usersWithAchievements,
          achievementParticipationRate:
            totalUsers > 0
              ? Math.round((usersWithAchievements / totalUsers) * 100)
              : 0,
          achievementsByType: achievementStats,
          totalAchievementsEarned: stats.reduce(
            (sum, stat) => sum + stat._count.id,
            0,
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve global achievement statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('leaderboard/:type')
  @ApiOperation({
    summary: 'Get achievement leaderboard by type',
  })
  @ApiParam({
    name: 'type',
    description: 'Achievement type for leaderboard',
    example: 'WINNER',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Achievement leaderboard retrieved successfully',
  })
  async getAchievementLeaderboard(
    @Param('type') type: string,
    @Query('limit', new DefaultValuePipe(10)) limit: number,
  ) {
    try {
      const achievementType = type.toUpperCase() as AchievementType;

      // Validate achievement type
      if (!Object.values(AchievementType).includes(achievementType)) {
        return {
          success: false,
          message: `Invalid achievement type: ${type}`,
        };
      }

      const leaderboard = await this.achievementService[
        'prisma'
      ].userAchievement.groupBy({
        by: ['userAddress'],
        where: {
          achievementType,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: Math.min(limit, 50), // Cap at 50
      });

      // Get user profiles for the leaderboard
      const userAddresses = leaderboard.map((entry) => entry.userAddress);
      const profiles = await this.achievementService[
        'prisma'
      ].userProfile.findMany({
        where: {
          walletAddress: { in: userAddresses },
        },
        select: {
          walletAddress: true,
          username: true,
          avatarUrl: true,
        },
      });

      const profileMap = new Map(profiles.map((p) => [p.walletAddress, p]));

      const leaderboardWithProfiles = leaderboard.map((entry, index) => {
        const profile = profileMap.get(entry.userAddress);
        return {
          rank: index + 1,
          userAddress: entry.userAddress,
          username: profile?.username,
          avatarUrl: profile?.avatarUrl,
          achievementCount: entry._count.id,
        };
      });

      return {
        success: true,
        data: {
          achievementType,
          leaderboard: leaderboardWithProfiles,
          total: leaderboard.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve achievement leaderboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
