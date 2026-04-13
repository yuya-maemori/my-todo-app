import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ message: 'email は文字列である必要があります' })
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string({ message: 'password は文字列である必要があります' })
    .min(1, 'パスワードを入力してください'),
});

export type LoginInput = z.infer<typeof loginSchema>;
