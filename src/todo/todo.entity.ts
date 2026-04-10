import { TodoModel } from './todo.model';

/**
 * Prisma型定義
 */
type PrismaTodo = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: { tag: { id: number; name: string } }[];
};

/**
 * Prisma記録をドメインモデルに変換する
 */
export function toPrismaToModel(prismaRecord: PrismaTodo): TodoModel {
  return new TodoModel({
    id: prismaRecord.id,
    title: prismaRecord.title,
    completed: prismaRecord.completed,
    createdAt: prismaRecord.createdAt,
    updatedAt: prismaRecord.updatedAt,
    tags: prismaRecord.tags?.map((t) => ({ id: t.tag.id, name: t.tag.name })),
  });
}

/**
 * 複数のPrismaレコードをModelの配列に変換
 */
export function toPrismaToModels(records: PrismaTodo[]): TodoModel[] {
  return records.map(toPrismaToModel);
}
