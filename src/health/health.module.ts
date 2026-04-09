import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Health Module
 *
 * 【責務】
 * - HealthController をエクスポート
 * - TerminusModule を import（HealthCheckService, HealthCheck() デコレータを提供）
 * - PrismaHealthIndicator を provider として登録
 * - PrismaModule を import（PrismaService を DI で注入できるようにするため）
 *
 * 【構成】
 * HealthController
 *   ├─ HealthCheckService（TerminusModule から）
 *   └─ PrismaHealthIndicator（カスタムクラス）
 *         └─ PrismaService（PrismaModule から）
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
