import { z } from 'zod';

/**
 * TODO 一覧取得のクエリパラメータ Zod スキーマ
 *
 * 【クエリパラメータ（URL の ?page=1&limit=10）をバリデーション】
 * - page: ページ番号。1 以上。指定なければ 1
 * - limit: 1ページあたりの件数。1～100。指定なければ 10
 *
 * 【なぜこのバリデーションか】
 * - page=0 や limit=0 は意味がない
 * - limit=10000 だとサーバー負荷が高い → 最大 100 に制限
 * - limit=-5 のような数値は弾く
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
});

/**
 * スキーマから型を生成
 */
export type ListTodoQuery = z.infer<typeof listTodoSchema>;
