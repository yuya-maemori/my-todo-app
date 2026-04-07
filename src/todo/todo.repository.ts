import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TodoModel } from './todo.model';
import { toPrismaToModel, toPrismaToModels } from './todo.entity';

/**
 * Todo Repository
 *
 * 責務：データベースとのやり取り
 * 「どう保存/取得するか」を担当します。
 *
 * なぜ Repository に切り出すのか：
 * 1. DB アクセスロジックを1箇所に集約 → 変更が容易
 * 2. Usecase が DB の実装方法を知らない → 疎結合
 * 3. テストでモックに差し替えやすい → テスト性向上
 * 4. 将来 Prisma → 別の ORM に変える場合、Repository だけ修正すればいい
 */
@Injectable()
export class TodoRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 全件取得
   *
   * DB から全ての Todo レコードを取得します。
   * Prisma のレコードを toPrismaToModel で Model に変換。
   *
   * 戻り値：TodoModel の配列
   */
  async findAll(): Promise<TodoModel[]> {
    const records = await this.prisma.todo.findMany();
    return toPrismaToModels(records);
  }

  /**
   * 1件取得（ID で検索）
   *
   * 存在しない場合は null を返します。
   * 例外を投げるのではなく null を返すことで、
   * Usecase/Controller で「見つかったか」を判定できる責務分離ができます。
   *
   * 戻り値：TodoModel | null
   */
  async findById(id: number): Promise<TodoModel | null> {
    const record = await this.prisma.todo.findUnique({
      where: { id },
    });

    // 見つからなければ null を返す
    if (!record) {
      return null;
    }

    return toPrismaToModel(record);
  }

  /**
   * Todo を作成
   *
   * DB に新規 Todo を挿入します。
   * Prisma の `create` を呼んで、自動的に id, createdAt, updatedAt が設定されます。
   *
   * タイムスタンプ（createdAt, updatedAt）は Prisma スキーマで自動生成されるため、
   * 引数には含めません。
   *
   * 戻り値：作成された TodoModel
   */
  async create(data: {
    title: string;
    completed: boolean;
  }): Promise<TodoModel> {
    const record = await this.prisma.todo.create({
      data: {
        title: data.title,
        completed: data.completed,
        // created_at, updated_at は @default(now()), @updatedAt で自動設定
      },
    });

    return toPrismaToModel(record);
  }

  /**
   * Todo を更新
   *
   * ID で指定した Todo を部分的（Partial）に更新します。
   * 指定されたフィールドだけ更新し、その他は変更されません。
   *
   * 例：
   *   update(1, { completed: true })
   *   → ID 1 の Todo の completed だけ true に変更
   *   → title は変わらない
   *
   * 戻り値：更新された TodoModel
   */
  async update(
    id: number,
    data: Partial<{
      title: string;
      completed: boolean;
    }>,
  ): Promise<TodoModel> {
    const record = await this.prisma.todo.update({
      where: { id },
      data: {
        // 指定されたフィールドだけを更新
        ...(data.title !== undefined && { title: data.title }),
        ...(data.completed !== undefined && { completed: data.completed }),
        // updated_at は Prisma が自動で現在時刻に更新
      },
    });

    return toPrismaToModel(record);
  }

  /**
   * Todo を削除
   *
   * ID で指定した Todo を DB から削除します。
   * 削除される直前のレコードを返すので、
   * 「本当に達成済みだった」みたいな確認に使えます。
   *
   * 戻り値：削除された TodoModel
   */
  async delete(id: number): Promise<TodoModel> {
    const record = await this.prisma.todo.delete({
      where: { id },
    });

    return toPrismaToModel(record);
  }
}
