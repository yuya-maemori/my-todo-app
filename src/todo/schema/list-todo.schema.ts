import { z } from 'zod';

/**
 * TODO 一覧取得のクエリパラメータ Zod スキーマ
 *
 * 【クエリパラメータをバリデーション】
 * - page: ページ番号。1 以上。指定なければ 1
 * - limit: 1ページあたりの件数。1～100。指定なければ 10
 * - sortBy: ソート対象カラム。createdAt か title。指定なければ createdAt
 * - sortOrder: ソート順序。asc か desc。指定なければ desc
 * - keyword: タイトル検索キーワード。オプション（指定なければ undefined）
 *
 * 【URL 例】
 * GET /todos?page=1&limit=10&sortBy=createdAt&sortOrder=desc&keyword=買い物
 *
 * 【なぜこのバリデーションか】
 * - sortBy / sortOrder を enum で制限 → 不正な値を弾く
 * - keyword は文字列のため、特に制限なし
 * - .optional() / .default() で「あってもなくても大丈夫」な構造に
 */
export const listTodoSchema = z.object({
  /**
   * ページ番号。
   * - .int() → 整数のみ
   * - .positive() → 1 以上（0 や負数は拒否）
   * - .default(1) → 指定なければ 1 ページ目
   */
  page: z
    .number()
    .int('ページ番号は整数である必要があります')
    .positive('ページ番号は 1 以上である必要があります')
    .default(1),

  /**
   * 1ページあたりの件数。
   * - .int() → 整数のみ
   * - .positive() → 1 以上
   * - .max(100) → 最大 100 件（サーバー負荷制限）
   * - .default(10) → 指定なければ 10 件
   */
  limit: z
    .number()
    .int('件数は整数である必要があります')
    .positive('件数は 1 以上である必要があります')
    .max(100, '件数は最大 100 です')
    .default(10),

  /**
   * ソート対象のカラム。
   * - .enum(['createdAt', 'title']) → これ以外は拒否
   * - .default('createdAt') → 指定なければ作成日でソート
   *
   * 【なぜ enum で制限するのか】
   * ユーザーが任意のカラム名を指定できると、DB スキーマを推測されるセキュリティリスク
   * → 事前に許可するカラムだけを enum で列挙
   */
  sortBy: z
    .enum(['createdAt', 'title'])
    .default('createdAt'),

  /**
   * ソート順序（昇順 / 降順）。
   * - .enum(['asc', 'desc']) → これ以外は拒否
   * - .default('desc') → 指定なければ新しい順（降順）
   *
   * 【asc vs desc の例】
   * - asc（昇順）：古い → 新しい、A → Z
   * - desc（降順）：新しい → 古い、Z → A
   */
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),

  /**
   * タイトル検索キーワード。
   * - .string() → 文字列のみ
   * - .optional() → 指定なければ undefined
   *
   * 【なぜ optional か】
   * ユーザーが検索キーワードを指定しないことはよくある
   * → 指定なければ「検索条件なし」という意味
   */
  keyword: z
    .string('キーワードは文字列である必要があります')
    .optional(),
});

/**
 * スキーマから型を生成
 */
export type ListTodoQuery = z.infer<typeof listTodoSchema>;
