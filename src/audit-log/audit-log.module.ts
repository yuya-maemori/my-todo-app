import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogRepository } from './audit-log.repository';

/**
 * AuditLog Module
 *
 * AuditLogRepository を exports することで、
 * TodoModule など他モジュールから監査ログを記録できるようにする。
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditLogRepository],
  exports: [AuditLogRepository],
})
export class AuditLogModule {}
