import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';
import { HackathonStatusService } from './hackathon-status.service';
import { RankingService } from './ranking.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HackathonController],
  providers: [HackathonService, HackathonStatusService, RankingService],
  exports: [HackathonService, HackathonStatusService, RankingService],
})
export class HackathonModule {}
