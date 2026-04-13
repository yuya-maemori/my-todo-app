import { z } from 'zod';

export const signUpSchema = z.object({
  email: z
    .string({ message: 'email は文字列である必要があります' })
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string({ message: 'password は文字列である必要があります' })
    .min(8, 'パスワードは8文字以上である必要があります')
    .max(100, 'パスワードは100文字以下である必要があります'),
  name: z
    .string({ message: 'name は文字列である必要があります' })
    .min(1, '名前は空にできません')
    .max(100, '名前は100文字以下である必要があります'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
