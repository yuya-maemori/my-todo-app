import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { accessibleBy } from '@casl/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionClient } from '../prisma/transaction.service';
import { AppAbility } from '../auth/external/casl-ability.factory';
import { TodoModel } from './todo.model';
import { toPrismaToModel, toPrismaToModels } from './todo.entity';

/**
 * Todo 一覧取得のオプション
 *
 * 【パラメータ説明】
 * - skip: スキップ件数（ページ計算済み）
 * - take: 取得件数（limit と同じ）
 * - where: 検索条件（Prisma.TodoWhereInput）
 *   - title: { contains: "キーワード" } など
 * - orderBy: ソート条件（Prisma.TodoOrderByWithRelationInput）
 *   - createdAt: "desc" など
 *
 * 【なぜこの設計か】
 * Repository は「条件をそのまま Prisma に渡すだけ」
 * → 複雑な条件組み立ては Controller/Usecase がやる（責務分離）
 */
export interface FindAllOptions {
  ability?: AppAbility;
  skip?: number;
  take?: number;
  where?: Prisma.TodoWhereInput;
  orderBy?: Prisma.TodoOrderByWithRelationInput;
}

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
   * 全件取得（ページネーション + 検索・ソート対応）
   *
   * @param options.skip スキップ件数（ページ計算済み）
   * @param options.take 取得件数（limit と同じ）
   * @param options.where 検索条件（title に keyword を含むなど）
   * @param options.orderBy ソート条件（createdAt asc/desc など）
   * @returns 条件に合った TodoModel[]
   *
   * 【実装ポイント】
   * - where / orderBy は「与えられなければ undefined」で OK
   * - Prisma がそれらの値を無視してくれる
   * - 複雑な条件組み立ては Controller/Usecase が担当
   *
   * 【使用例】
   * findAll({
   *   skip: 0,
   *   take: 10,
   *   where: { title: { contains: "買い物" }, completed: false },
   *   orderBy: { createdAt: "desc" }
   * })
   * → 「買い物」を含む未完了 TODO を、新しい順に、最初の 10 件取得
   */
  async findAll(options?: FindAllOptions): Promise<TodoModel[]> {
    const accessibleWhere = options?.ability
      ? accessibleBy(options.ability).Todo
      : {};

    const records = await this.prisma.todo.findMany({
      skip: options?.skip,
      take: options?.take,
      where: { ...accessibleWhere, ...options?.where },
      orderBy: options?.orderBy,
      include: { tags: { include: { tag: true } } },
    });
    return toPrismaToModels(records);
  }

  /**
   * TODO の件数をカウント
   *
   * @param where 検索条件（指定なければ全件カウント）
   * @returns マッチした TODO の総件数
   *
   * 【重要】
   * ページネーション時の totalPages 計算に使う。
   * 検索時は where を渡して「検索にマッチした件数」を取得。
   *
   * 【例】
   * - count() → 全 TODO 件数（例：100 件）
   * - count({ where: { title: { contains: "買い物" } } }) → 検索結果の件数（例：15 件）
   */
  async count(where?: Prisma.TodoWhereInput, ability?: AppAbility): Promise<number> {
    const accessibleWhere = ability ? accessibleBy(ability).Todo : {};
    return this.prisma.todo.count({ where: { ...accessibleWhere, ...where } });
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
      include: { tags: { include: { tag: true } } },
    });

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
  async create(
    data: {
      title: string;
      completed: boolean;
      userId?: number;
      tagIds?: number[];
    },
    tx?: TransactionClient,
  ): Promise<TodoModel> {
    const client = tx ?? this.prisma;
    const record = await client.todo.create({
      data: {
        title: data.title,
        completed: data.completed,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.tagIds && data.tagIds.length > 0 && {
          tags: {
            createMany: {
              data: data.tagIds.map((tagId) => ({ tagId })),
            },
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
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
    tx?: TransactionClient,
  ): Promise<TodoModel> {
    const client = tx ?? this.prisma;
    const record = await client.todo.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.completed !== undefined && { completed: data.completed }),
      },
      include: { tags: { include: { tag: true } } },
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
  async delete(id: number, tx?: TransactionClient): Promise<TodoModel> {
    const client = tx ?? this.prisma;
    const record = await client.todo.delete({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });

    return toPrismaToModel(record);
  }
}
