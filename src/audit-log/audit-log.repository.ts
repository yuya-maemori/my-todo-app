import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionClient } from '../prisma/transaction.service';
import { AuditAction } from './audit-log.model';

/**
 * AuditLog Repository
 *
 * 責務：監査ログの DB への書き込み
 *
 * 【設計ポイント】
 * - 書き込みメソッドは必ず tx（TransactionClient）を受け取る
 * - Usecase がトランザクションを開始し、同一 tx で Todo 操作と一緒に記録する
 * - これにより「Todo の更新」と「ログの記録」が確実にアトミックになる
 *
 * 【なぜアトミックにするのか】
 * Todo のdeleteに成功してもログの書き込みが失敗したら、
 * 「誰がいつ削除したか」が永遠に残らない。
 * トランザクションでまとめることで、どちらかが失敗したら両方ロールバックされる。
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 監査ログを作成する
   *
   * @param data ログデータ
   * @param tx トランザクションクライアント（Usecase から渡される）
   */
  async create(
    data: {
      userId: number | null;
      action: AuditAction;
      resourceType: string;
      resourceId: number;
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
    },
    tx: TransactionClient,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        before: data.before !== null
          ? (data.before as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        after: data.after !== null
          ? (data.after as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * 監査ログ一覧の取得（参照用）
   */
  async findAll(): Promise<
    {
      id: number;
      userId: number | null;
      action: string;
      resourceType: string;
      resourceId: number;
      before: unknown;
      after: unknown;
      createdAt: Date;
    }[]
  > {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
