import { Module } from '@nestjs/common';
import { PrizePoolService } from './prize-pool.service';
import { PrizePoolController } from './prize-pool.controller';
import { AutomatedDistributionService } from './automated-distribution.service';
import { AutomatedDistributionController } from './automated-distribution.controller';
import { HackathonStatusListenerService } from './hackathon-status-listener.service';
import { TransactionMonitorService } from './transaction-monitor.service';
import { TransactionMonitorController } from './transaction-monitor.controller';
import { DistributionHistoryService } from './distribution-history.service';
import { DistributionHistoryController } from './distribution-history.controller';
import { ReportGenerationService } from './report-generation.service';
import { ReportGenerationController } from './report-generation.controller';
import { EmergencyControlsService } from './emergency-controls.service';
import { EmergencyControlsController } from './emergency-controls.controller';
import { PlatformFeeController } from './platform-fee.controller';
import { PlatformFeeListenerService } from './platform-fee-listener.service';
import { PrismaModule } from '../../common/database/prisma.module';
import { Web3Module } from '../web3/web3.module';
import { HackathonModule } from '../hackathon/hackathon.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, Web3Module, HackathonModule, AuditModule],
  controllers: [
    PrizePoolController,
    AutomatedDistributionController,
    TransactionMonitorController,
    DistributionHistoryController,
    ReportGenerationController,
    EmergencyControlsController,
    PlatformFeeController,
  ],
  providers: [
    PrizePoolService,
    AutomatedDistributionService,
    HackathonStatusListenerService,
    TransactionMonitorService,
    DistributionHistoryService,
    ReportGenerationService,
    EmergencyControlsService,
    PlatformFeeListenerService,
  ],
  exports: [
    PrizePoolService,
    AutomatedDistributionService,
    HackathonStatusListenerService,
    TransactionMonitorService,
    DistributionHistoryService,
    ReportGenerationService,
    EmergencyControlsService,
    PlatformFeeListenerService,
  ],
})
export class PrizePoolModule {}
