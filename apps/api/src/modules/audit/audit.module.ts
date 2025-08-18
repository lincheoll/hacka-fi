import { Module } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditController],
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditModule {}
