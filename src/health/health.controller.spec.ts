import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';

/**
 * Health Controller Test
 *
 * 【テストの狙い】
 * ヘルスチェックの失敗はすぐに本番障害に直結する。
 * - ロジックバグ → 常に 503 → 全ポッド切り離し → 障害
 * - チェック呼び忘れ → DB 障害を検知できない → 障害が見え続ける
 *
 * だから正常系・異常系の両方を検証する必要がある。
 */

const mockHealthCheckService = {
  check: jest.fn(),
};

const mockPrismaHealthIndicator = {
  isHealthy: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('check', () => {
    it('全チェック正常の場合、HTTP 200 でヘルスチェック結果を返す', async () => {
      /**
       * 【正常時のレスポンス形式】
       *
       * @nestjs/terminus の @HealthCheck() が自動で以下の形式に変換する：
       * {
       *   "status": "ok",
       *   "info": { "database": { "status": "up" } },
       *   "error": {},
       *   "details": { "database": { "status": "up" } }
       * }
       *
       * → HTTP 200 を返す
       * → ロードバランサーが「このポッド OK」と判定
       */
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.check();

      expect(result).toEqual(healthResult);
      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Function)]),
      );
    });

    it('DB 接続失敗の場合、例外を投げる（HTTP 503 に変換される）', async () => {
      /**
       * 【失敗時の動作】
       *
       * PrismaHealthIndicator.isHealthy() が HealthCheckError を投げる
       * ↓
       * HealthCheckService.check() がそれをキャッチして、
       * @HealthCheck() デコレータが HTTP 503 に変換する
       *
       * 【なぜ例外を投げるテストするのか】
       *
       * DB 接続失敗時に「例外が正しく投げられる」ことを保証しないと、
       * 本番で DB 障害が起きたのに /health が HTTP 200 を返す
       * という悪夢のシナリオになる。
       */
      const error = new Error('DB connection failed');
      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow('DB connection failed');
    });

    it('チェック項目が実行されることを確認', async () => {
      /**
       * 【実装検証】
       * health.check() に渡される配列内に関数が含まれていることを確認。
       * 
       * 意外に重要なテスト：
       * - チェック関数が check() に渡されていないと、チェックが実行されない
       * - コピペミスで関数の呼び出しを忘れるのはよくあるバグ
       */
      const healthResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      mockHealthCheckService.check.mockResolvedValue(healthResult);

      await controller.check();

      // health.check() が呼ばれたことを確認
      expect(mockHealthCheckService.check).toHaveBeenCalled();

      // 呼び出し時に 「関数の配列」が渡されたことを確認
      const callArgs = mockHealthCheckService.check.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs.length).toBeGreaterThan(0);
      expect(typeof callArgs[0]).toBe('function');
    });
  });
});
