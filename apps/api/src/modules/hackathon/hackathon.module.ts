import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';
import { HackathonStatusService } from './hackathon-status.service';
import { RankingService } from './ranking.service';
import { WinnerDeterminationService } from './winner-determination.service';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AuditModule } from '../audit/audit.module';
import { VotingModule } from '../voting/voting.module';
import { HackathonTransformer } from '../../common/transformers/hackathon.transformer';

@Module({
  imports: [AuditModule, VotingModule],
  controllers: [HackathonController, PublicApiController, AnalyticsController],
  providers: [
    HackathonService,
    HackathonStatusService,
    RankingService,
    WinnerDeterminationService,
    PublicApiService,
    AnalyticsService,
    HackathonTransformer,
  ],
  exports: [
    HackathonService,
    HackathonStatusService,
    RankingService,
    WinnerDeterminationService,
    PublicApiService,
    AnalyticsService,
  ],
})
export class HackathonModule {}
