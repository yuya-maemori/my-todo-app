import { z } from 'zod';

/**
 * Todo 更新リクエストの Zod スキーマ
 *
 * PATCH は部分更新なので、各フィールドは optional にする。
 * ただし、何も更新しない空オブジェクトは API として意味がないため弾く。
 */
export const updateTodoSchema = z
  .object({
    title: z
      .string({ message: 'title は文字列である必要があります' })
      .min(1, 'title は空にできません')
      .max(255, 'title は255文字以下である必要があります')
      .optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.completed !== undefined,
    {
      message: '少なくとも1つの更新項目を指定してください',
    },
  );

export type UpdateTodoDto = z.infer<typeof updateTodoSchema>;