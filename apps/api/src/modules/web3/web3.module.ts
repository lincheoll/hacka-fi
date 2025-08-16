import { Module } from '@nestjs/common';
import { Web3Service } from './web3.service';
import { Web3HealthController } from './web3-health.controller';

@Module({
  providers: [Web3Service],
  controllers: [Web3HealthController],
  exports: [Web3Service],
})
export class Web3Module {}
