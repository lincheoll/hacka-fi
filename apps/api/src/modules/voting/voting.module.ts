import { Module } from '@nestjs/common';
import { VoteValidationService } from './vote-validation.service';
import { PrismaModule } from '../../common/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VoteValidationService],
  exports: [VoteValidationService],
})
export class VotingModule {}
