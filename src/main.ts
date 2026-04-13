import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  /**
   * 【グローバル Exception Filter を登録】
   *
   * 【なぜここで登録するのか】
   * - アプリケーション全体のすべてのエンドポイントに適用したいから
   * - app が完成した状態（全 Module・Controller が初期化完了）で登録する必要がある
   * - main.ts の bootstrap 関数が「アプリの最終的な完成状態」を表すので、ここが適切
   *
   * 【どう機能するのか】
   * アプリケーション内で例外が投げられる
   *   ↓
   *   Controller → Usecase → Validator から NotFoundException などが投げられる
   *   ↓
   *   NestJS フレームワークが例外をキャッチ
   *   ↓
   *   ProblemDetailsFilter.catch() が自動で呼ばれる
   *   ↓
   *   RFC 7807 形式に統一変換
   *   ↓
   *   HTTP レスポンス（400/404/500 など）
   *
   * 【登録順序】
   * useGlobalFilters() は「複数登録できる」が、一般的には1つ。
   * 複数必要な場合は useGlobalFilters(filterA, filterB, filterC) と並べる。
   */
  app.useGlobalFilters(new ProblemDetailsFilter());

  /**
   * Swagger / OpenAPI ドキュメント生成
   *
   * 【なぜここで設定するのか】
   * - アプリがすべてのモジュール・Controller・メタデータを読み込んだ後に実行される必要がある
   * - main.ts の bootstrap 関数が「アプリの最終的な完成状態」を表すので、ここが適切
   *
   * 【流れ】
   * 1. DocumentBuilder でドキュメント全体のメタデータ（タイトル・バージョン）を定義
   * 2. SwaggerModule.createDocument() が app から all Controller のメタ情報を集めて OpenAPI スキーマを生成
   * 3. SwaggerModule.setup() が /api に Swagger UI をマウント
   *   → http://localhost:3000/api でアクセス可能
   *   → Try it out ボタンで実際にリクエストを試せる
   */
  const config = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription('TODO 管理 API')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
