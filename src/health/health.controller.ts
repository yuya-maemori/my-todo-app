import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Health Check Controller
 *
 * 【なぜｔこのコントローラが必要か】
 *
 * 本番環境では Kubernetes や AWS ELB がアプリの生存確認をする。
 * GET /health がないと、DB が落ちていてもインフラは「アプリ起動」と判定
 * → ユーザーにずっと 502 Bad Gateway が見える
 *
 * /health エンドポイントがあれば：
 * - HTTP 200 が返る → ロードバランサーが「このポッド OK」と判定
 * - HTTP 503 が返る → ロードバランサーが「このポッド NG」と判定 → 切り離す
 */
@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(
    /**
     * HealthCheckService：複数のチェック項目を並列実行して集約する
     * @nestjs/terminus が提供する
     */
    private readonly health: HealthCheckService,
    /**
     * PrismaHealthIndicator：Prisma 経由で DB をチェック
     * ← 自分たちで実装したカスタムインジケータ
     */
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  /**
   * ヘルスチェックエンドポイント
   *
   * 【@HealthCheck() デコレータがやること】
   * 1. 引数の配列内の全チェック関数を並列実行（Promise.all）
   * 2. 1つでも HealthCheckError を投げたら HTTP 503 を返す
   * 3. 全て成功したら HTTP 200 を返す + レスポンスボディに詳細を含める
   *
   * 【レスポンス例】
   * HTTP 200 成功時：
   * {
   *   "status": "ok",
   *   "info": { "database": { "status": "up" } },
   *   "error": {},
   *   "details": { "database": { "status": "up" } }
   * }
   *
   * HTTP 503 失敗時：
   * {
   *   "status": "error",
   *   "info": {},
   *   "error": { "database": { "status": "down" } },
   *   "details": { "database": { "status": "down" } }
   * }
   */
  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'ヘルスチェック OK' })
  @ApiResponse({ status: 503, description: 'サービス利用不可' })
  async check(): Promise<HealthCheckResult> {
    /**
     * 【複数チェック項目を追加する場合】
     *
     * return this.health.check([
     *   () => this.prismaHealth.isHealthy('database'),
     *   () => this.memoryHealth.checkHeap('memory', 150000000),
     *   () => this.diskHealth.checkStorage('filesystem'),
     * ])
     *
     * 全て並列実行で、1つでも失敗したら entire check は 503 になる
     */
    return this.health.check([() => this.prismaHealth.isHealthy('database')]);
  }
}
