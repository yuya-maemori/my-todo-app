import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TagModel } from '../tag.model';
import { toTagModel, toTagModels } from '../tag.entity';

/**
 * Tag Repository（external）
 *
 * 他モジュール（TodoModule など）からも利用される公開 Repository。
 * TagModule の exports に登録することで外部公開する。
 */
@Injectable()
export class TagRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<TagModel[]> {
    const records = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    return toTagModels(records);
  }

  async findById(id: number): Promise<TagModel | null> {
    const record = await this.prisma.tag.findUnique({
      where: { id },
    });
    if (!record) return null;
    return toTagModel(record);
  }

  async findByName(name: string): Promise<TagModel | null> {
    const record = await this.prisma.tag.findUnique({
      where: { name },
    });
    if (!record) return null;
    return toTagModel(record);
  }

  async create(data: { name: string }): Promise<TagModel> {
    const record = await this.prisma.tag.create({
      data: { name: data.name },
    });
    return toTagModel(record);
  }

  async update(id: number, data: { name: string }): Promise<TagModel> {
    const record = await this.prisma.tag.update({
      where: { id },
      data: { name: data.name },
    });
    return toTagModel(record);
  }

  async delete(id: number): Promise<TagModel> {
    const record = await this.prisma.tag.delete({
      where: { id },
    });
    return toTagModel(record);
  }

  /**
   * タグ名で検索し、存在しなければ新規作成する
   *
   * Todo 作成時にタグ名を受け取り、
   * 既存のタグがあればそれを返し、なければ作成する。
   */
  async findOrCreateByName(name: string): Promise<TagModel> {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return this.create({ name });
  }
}
