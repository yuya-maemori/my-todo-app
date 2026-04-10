import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Problem Details Exception Filter
 *
 * 【責務】
 * すべての例外を RFC 9457 Problem Details フォーマットに統一変換する。
 * アプリケーション全体で「常に同じエラーレスポンス形式」を保証する。
 *
 * 【RFC 9457 Problem Details フォーマット】
 * 仕様: https://tools.ietf.org/html/rfc9457
 *
 * 必須フィールド:
 * - status: HTTP ステータスコード（400, 404, 500 等）
 *
 * 推奨フィールド:
 * - detail: エラーの詳細説明（ユーザーが理解できる形）
 *
 * 追加情報（便利）:
 * - type: エラー詳細ドキュメントへのURI
 * - title: HTTP ステータス名（BAD_REQUEST など）
 * - instance: エラーが発生したリソース（/todos/999 など）
 * - timestamp: ISO 8601 形式の発生時刻
 * - errors: バリデーションエラーの詳細配列
 *
 * 【設計方針】
 * - HTTP例外 → ステータスコード抽出 + RFC 9457 形式で返す
 * - 予期しない例外（5xx） → スタックトレースはサーバーログに記録のみ（セキュリティ）
 * - フロントエンド → 常に同じ構造を期待できる（エラーハンドリング統一）
 */
@Catch()  // ← 全ての例外をキャッチ
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  /**
   * 例外をキャッチしてレスポンスに変換する
   *
   * @param exception キャッチされた例外オブジェクト
   * @param host HTTP コンテキスト（Request / Response へのアクセス）
   */
  catch(exception: unknown, host: ArgumentsHost) {
    /**
     * 【ステップ 1】HTTP コンテキストから Request/Response を取得
     */
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    /**
     * 【ステップ 2】HTTP ステータスコードを決定
     * HttpException → そのステータスコード
     * 予期しない例外 → 500 Internal Server Error
     */
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * 【ステップ 3】例外のレスポンス情報を抽出
     * バリデーションエラーなどの詳細がここに含まれている
     */
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const detail =
      exception instanceof HttpException
        ? exception.message
        : 'Internal Server Error';

    /**
     * 【ステップ 4】リクエスト ID を抽出（オプション・分散トレーシング用）
     */
    const requestId = request.headers['x-request-id'] as string | undefined;

    /**
     * 【ステップ 5】RFC 7807 フォーマットのレスポンスボディを構築
     */
    /**
     * 【ステップ 5】RFC 9457 フォーマットのレスポンスボディ構築
     *
     * 必須: status
     * 推奨: detail
     * 便利: type, title, instance, timestamp, errors
     */
    const body: Record<string, unknown> = {
      // type: エラードキュメントへのURI（クライアントが自動で参照可能）
      type: `https://httpstatuses.com/${status}`,

      // title: HTTP ステータス名（人間が読める分類）
      title: HttpStatus[status],

      // status: HTTP ステータスコード（フロント側の判定基準）
      status,

      // detail: このインスタンスで何が失敗したか
      detail,

      // instance: どのリソース/エンドポイントで失敗したか
      instance: request.url,

      // timestamp: いつ発生したか（サーバーログとの時系列マッチング用）
      timestamp: new Date().toISOString(),

      // requestId: 分散トレーシング用（オプション）
      ...(requestId && { requestId }),
    };

    /**
     * 【ステップ 6】バリデーションエラー詳細を errors フィールドに追加
     * フロント側がフィールドごとのエラー表示可能にする
     */
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'errors' in exceptionResponse &&
      Array.isArray((exceptionResponse as Record<string, unknown>).errors)
    ) {
      body.errors = (exceptionResponse as Record<string, unknown>).errors;
      body.detail = 'Validation failed';
    }

    /**
     * 【ステップ 7】予期しない例外はサーバー側にログ記録（セキュリティ）
     * スタックトレースはクライアントに返さない（内部構造漏洩防止）
     */
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      );
    }

    /**
     * 【ステップ 8】HTTP レスポンスを送信
     * Content-Type で RFC 9457 形式であることを明示
     */
    response
      .status(status)
      // Content-Type ヘッダで「これは RFC 7807 Problem Details 形式だ」と明示
      .header('Content-Type', 'application/problem+json')
      .json(body);
  }
}
