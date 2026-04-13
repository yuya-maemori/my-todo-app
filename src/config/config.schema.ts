import { z } from 'zod';

/**
 * 環境変数のスキーマ定義
 *
 * このスキーマでは：
 * 1. 環境変数の型と構造を定義
 * 2. Zod のバリデーション機能を活用
 * 3. TypeScript の型を自動生成（z.infer<typeof ConfigSchema>）
 *
 * アプリ起動時に Zod がこのスキーマに基づいて
 * 環境変数をバリデーションするため、設定漏れが即座に検出される
 */
export const ConfigSchema = z.object({
  // Node環境（development / production / test）
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // アプリケーション設定
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // データベース設定
  DATABASE_URL: z.string().url('Valid database URL is required'),

  // JWT設定
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().default(900), // デフォルト: 15分

  // bcrypt設定
  BCRYPT_ROUNDS: z.coerce.number().default(10),

  // オプショナルな設定（デフォルト値あり）
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),
});

/**
 * Config 型は Zod スキーマから自動生成される
 *
 * 例：
 * - NODE_ENV: 'development' | 'production' | 'test'
 * - PORT: number
 * - DATABASE_URL: string
 * - JWT_SECRET: string
 * - JWT_ACCESS_TOKEN_EXPIRES_IN: number
 * - BCRYPT_ROUNDS: number
 * - LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
 */
export type Config = z.infer<typeof ConfigSchema>;
