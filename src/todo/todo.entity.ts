import { TodoModel } from './todo.model';

/**
 * Prisma型定義
 */
type PrismaTodo = {
  id: number;
  title: string;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
};

/**
 * Prisma記録をドメインモデルに変換する
 *
 * 目的：DB層とアプリケーション層の独立性を保つ
 * 例えば、Prismaのレコードに新しいフィールドが追加されても、
 * このEntity関数だけを修正すれば、その他の層には影響しません。
 */
export function toPrismaToModel(prismaRecord: PrismaTodo): TodoModel {
  return new TodoModel({
    id: prismaRecord.id,
    title: prismaRecord.title,
    completed: prismaRecord.completed,
    createdAt: prismaRecord.created_at,
    updatedAt: prismaRecord.updated_at,
  });
}

/**
 * 複数のPrismaレコードをModelの配列に変換
 */
export function toPrismaToModels(records: PrismaTodo[]): TodoModel[] {
  return records.map(toPrismaToModel);
}
