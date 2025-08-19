import { Module } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../../common/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditLoggerService, AuditService],
  exports: [AuditLoggerService, AuditService],
})
export class AuditModule {}
