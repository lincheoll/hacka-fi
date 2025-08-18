import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';
import { HackathonStatusService } from './hackathon-status.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HackathonController],
  providers: [HackathonService, HackathonStatusService],
  exports: [HackathonService, HackathonStatusService],
})
export class HackathonModule {}
