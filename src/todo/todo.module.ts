import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TodoController } from './todo.controller';
import { TodoUsecase } from './todo.usecase';
import { TodoRepository } from './todo.repository';

/**
 * Todo Module
 *
 * TodoドメインのDI登録を行います。
 *
 * imports:     他のモジュールの機能を使いたい時に指定
 *              → PrismaModule は AppModule で import 済み。
 *                PrismaModule が exports しているので、
 *                子モジュールからも PrismaService を注入できる。
 *
 * controllers: HTTP エンドポイントを持つクラス
 *              → TodoController
 *
 * providers:   DI コンテナに登録するクラス（ビジネスロジック + データアクセス）
 *              → TodoUsecase, TodoRepository
 *
 * DI の解決の流れ：
 * 1. TodoController が TodoUsecase を要求
 * 2. NestJS が providers から TodoUsecase を見つけて注入
 * 3. TodoUsecase が TodoRepository を要求
 * 4. NestJS が providers から TodoRepository を見つけて注入
 * 5. TodoRepository が PrismaService を要求
 * 6. NestJS が PrismaModule の exports から PrismaService を見つけて注入
 */
@Module({
  imports: [PrismaModule],
  controllers: [TodoController],
  providers: [TodoUsecase, TodoRepository],
})
export class TodoModule {}
