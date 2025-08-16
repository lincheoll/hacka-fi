import { Module } from '@nestjs/common';
import { Web3Service } from './web3.service';
import { Web3HealthController } from './web3-health.controller';
import { ContractTestController } from './contract-test.controller';
import { HackathonContractService } from './hackathon-contract.service';
import { PrizePoolContractService } from './prize-pool-contract.service';

@Module({
  providers: [Web3Service, HackathonContractService, PrizePoolContractService],
  controllers: [Web3HealthController, ContractTestController],
  exports: [Web3Service, HackathonContractService, PrizePoolContractService],
})
export class Web3Module {}
