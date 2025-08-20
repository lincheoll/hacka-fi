import { Module } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { PrismaService } from '../../common/database/prisma.service';

@Module({
  providers: [
    UserProfileService,
    AchievementService,
    LeaderboardService,
    PrismaService,
  ],
  controllers: [
    UserProfileController,
    AchievementController,
    LeaderboardController,
  ],
  exports: [UserProfileService, AchievementService, LeaderboardService],
})
export class UserModule {}
