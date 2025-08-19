import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';
import { HackathonStatusService } from './hackathon-status.service';
import { RankingService } from './ranking.service';
import { WinnerDeterminationService } from './winner-determination.service';
import { AuditModule } from '../audit/audit.module';
import { VotingModule } from '../voting/voting.module';

@Module({
  imports: [AuditModule, VotingModule],
  controllers: [HackathonController],
  providers: [
    HackathonService,
    HackathonStatusService,
    RankingService,
    WinnerDeterminationService,
  ],
  exports: [
    HackathonService,
    HackathonStatusService,
    RankingService,
    WinnerDeterminationService,
  ],
})
export class HackathonModule {}
