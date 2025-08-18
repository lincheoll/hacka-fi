import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';
import { HackathonStatusService } from './hackathon-status.service';
import { RankingService } from './ranking.service';
import { WinnerDeterminationService } from './winner-determination.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
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
