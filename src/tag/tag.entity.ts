import { TagModel } from './tag.model';

type PrismaTag = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toTagModel(prismaRecord: PrismaTag): TagModel {
  return new TagModel({
    id: prismaRecord.id,
    name: prismaRecord.name,
    createdAt: prismaRecord.createdAt,
    updatedAt: prismaRecord.updatedAt,
  });
}

export function toTagModels(records: PrismaTag[]): TagModel[] {
  return records.map(toTagModel);
}
