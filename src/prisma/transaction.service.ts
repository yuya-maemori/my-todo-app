import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Prisma のトランザクションクライアント型
 *
 * `prisma.$transaction()` のコールバックで受け取れる client がこの型。
 * $connect / $disconnect など、トランザクション外でしか使えないメソッドが除かれている。
 */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * TransactionService
 *
 * Prisma のトランザクションを薄くラップしたサービス。
 *
 * 【なぜ作るのか】
 * Usecase が `this.prisma.$transaction()` を直接呼ぶと、
 * Usecase が PrismaService に依存してしまう。
 * TransactionService を挟むことで「Usecase はトランザクションの開始を
 * TransactionService に任せる」という責務分離ができる。
 *
 * 【使い方（Usecase で）】
 * const result = await this.transaction.run(async (tx) => {
 *   const todo = await this.repository.create(data, tx);
 *   await this.auditLogRepository.create({ ... }, tx);
 *   return todo;
 * });
 */
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
