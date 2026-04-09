import { z } from 'zod';

/**
 * Todo 作成リクエストの Zod スキーマ
 *
 * 【なぜスキーマを定義するのか】
 * クライアントからの入力は何が来るかわからない。
 * このスキーマが「API の入力仕様書」兼「実行時バリデーション」を担う。
 *
 * 【各フィールドのルール】
 * - title: 必須、文字列、1〜255文字
 *   → 空文字や長すぎる文字列を弾く
 * - completed: 任意、boolean、デフォルト false
 *   → 指定しなければ未完了として作成される
 *
 * 【.optional().default(false) の意味】
 * - .optional() → リクエストに含まれなくても OK
 * - .default(false) → 含まれなかった場合は false を自動セット
 * → Usecase/Repository 側で undefined チェックが不要になる
 */
export const createTodoSchema = z.object({
  title: z
    .string({ message: 'title は文字列である必要があります' })
    .min(1, 'title は空にできません')
    .max(255, 'title は255文字以下である必要があります'),
  completed: z.boolean().optional().default(false),
});

/**
 * スキーマから TypeScript 型を自動生成
 *
 * 【なぜ z.infer を使うのか】
 * - スキーマ定義と型定義を「1箇所」で管理できる
 * - スキーマを変えれば型も自動的に変わる（DRY 原則）
 * - 手動で interface を書くと、スキーマとの乖離が起きるリスクがある
 */
export type CreateTodoDto = z.infer<typeof createTodoSchema>;
