import { Module } from '@nestjs/common';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';

@Module({
  controllers: [HackathonController],
  providers: [HackathonService],
  exports: [HackathonService],
})
export class HackathonModule {}
