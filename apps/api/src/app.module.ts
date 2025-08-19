import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { HackathonModule } from './modules/hackathon/hackathon.module';
import { UserModule } from './modules/user/user.module';
import { VotingModule } from './modules/voting/voting.module';
import { Web3Module } from './modules/web3/web3.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrizePoolModule } from './modules/prize-pool/prize-pool.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/database/prisma.module';
import { configValidationSchema } from './config/app.config';
import { DatabaseHealthController } from './common/database/database-health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema as any,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    HackathonModule,
    UserModule,
    VotingModule,
    Web3Module,
    UploadModule,
    AuditModule,
    PrizePoolModule,
    CommonModule,
  ],
  controllers: [AppController, DatabaseHealthController],
  providers: [AppService],
})
export class AppModule {}
