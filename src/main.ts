import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
