import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma Health Indicator
 *
 * 【なぜカスタムインジケータを作るのか】
 *
 * @nestjs/terminus の PrismaHealthIndicator は PrismaClient に対応していない。
 * だから Prisma 用のカスタムインジケータを自分たちで実装する。
 *
 * 【役割】
 * - DB に SELECT 1 を実行してみる
 * - 成功したら { database: { status: 'up' } } を返す
 * - 失敗したら HealthCheckError を投げる（ヘルスチェック全体が失敗）
 */
@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * 【Prisma の健全性をチェック】
   *
   * @param key レスポンスの JSON に表示されるキー名（例：'database'）
   * @returns { database: { status: 'up' } }
   *
   * 【内部動作】
   * try:
   *   await this.prisma.$queryRaw`SELECT 1`
   *   ↑ 実際に DB に SELECT クエリを送信
   *   成功 → this.getStatus(key, true) で OK マーク
   *
   * catch:
   *   接続エラー・タイムアウト・認証エラーなど
   *   ↑ HealthCheckError を投げる
   *     → HealthCheckService が 503 に変換
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // 実際に DB に SELECT を実行してみる
      await this.prisma.$queryRaw`SELECT 1`;
      // 成功時：{ database: { status: 'up' } }
      return this.getStatus(key, true);
    } catch (error) {
      // 失敗時：HealthCheckError を投げる
      // ← @HealthCheck() デコレータがこれを HTTP 503 に変換
      throw new HealthCheckError(
        `${key} is not available`,
        this.getStatus(key, false),
      );
    }
  }
}
