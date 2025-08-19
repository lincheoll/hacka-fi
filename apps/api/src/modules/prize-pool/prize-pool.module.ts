import { Module } from '@nestjs/common';
import { PrizePoolService } from './prize-pool.service';
import { PrizePoolController } from './prize-pool.controller';
import { AutomatedDistributionService } from './automated-distribution.service';
import { AutomatedDistributionController } from './automated-distribution.controller';
import { HackathonStatusListenerService } from './hackathon-status-listener.service';
import { PrismaModule } from '../../common/database/prisma.module';
import { Web3Module } from '../web3/web3.module';
import { HackathonModule } from '../hackathon/hackathon.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, Web3Module, HackathonModule, AuditModule],
  controllers: [PrizePoolController, AutomatedDistributionController],
  providers: [
    PrizePoolService,
    AutomatedDistributionService,
    HackathonStatusListenerService,
  ],
  exports: [
    PrizePoolService,
    AutomatedDistributionService,
    HackathonStatusListenerService,
  ],
})
export class PrizePoolModule {}
