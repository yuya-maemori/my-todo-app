import { z } from 'zod';

export const updateTagSchema = z.object({
  name: z
    .string({ message: 'name は文字列である必要があります' })
    .min(1, 'name は空にできません')
    .max(100, 'name は100文字以下である必要があります'),
});

export type UpdateTagDto = z.infer<typeof updateTagSchema>;
