import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * Zod バリデーション パイプ
 *
 * 【Pipe とは何か】
 * NestJS の Pipe は、Controller のメソッドが呼ばれる「前」に実行される処理。
 * リクエストデータの「変換」や「検証」を行う。
 *
 * 例：ParseIntPipe → 文字列 "123" を数値 123 に変換
 * 例：ZodValidationPipe → リクエストボディを Zod スキーマで検証
 *
 * 【なぜ Pipe に切り出すのか】
 * - Controller に try/catch + Zod parse を毎回書くのは DRY 違反
 * - Pipe にすれば @UsePipes() デコレータで宣言的に適用できる
 * - 検証ロジックの再利用性が高まる
 *
 * 【使い方】
 * @Post()
 * @UsePipes(new ZodValidationPipe(createTodoSchema))
 * async create(@Body() dto: CreateTodoDto) { ... }
 *
 * 【処理の流れ】
 * 1. クライアントが POST リクエストを送信
 * 2. NestJS が @Body() でリクエストボディを取得
 * 3. ZodValidationPipe.transform() が呼ばれ、Zod で検証
 * 4. 検証成功 → dto として Controller メソッドに渡る
 * 5. 検証失敗 → BadRequestException (400) が自動返却される
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      // Zod の parse() でバリデーション + 型変換を実行
      // 成功すれば、スキーマに沿った安全な値が返る
      return this.schema.parse(value);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        // Zod のエラーから詳細なメッセージを取り出す
        // 例: [{ path: ['title'], message: 'title は空にできません' }]
        const messages = error.issues.map(
          (issue) => `${(issue.path ?? []).join('.')}: ${issue.message}`,
        );
        throw new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
