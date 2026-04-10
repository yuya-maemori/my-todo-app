import { Injectable, ConflictException } from '@nestjs/common';
import { TagRepository } from './external/tag.repository';
import { TagModel } from './tag.model';
import { CreateTagDto } from './schema/create-tag.schema';
import { UpdateTagDto } from './schema/update-tag.schema';
import { TagValidator } from './tag.validator';

@Injectable()
export class TagUsecase {
  constructor(
    private repository: TagRepository,
    private validator: TagValidator,
  ) {}

  async getTags(): Promise<TagModel[]> {
    return this.repository.findAll();
  }

  async getTagById(id: number): Promise<TagModel> {
    return this.validator.validateTagExists(id);
  }

  async createTag(data: CreateTagDto): Promise<TagModel> {
    const existing = await this.repository.findByName(data.name);
    if (existing) {
      throw new ConflictException(`Tag "${data.name}" already exists`);
    }
    return this.repository.create({ name: data.name });
  }

  async updateTag(id: number, data: UpdateTagDto): Promise<TagModel> {
    await this.validator.validateTagExists(id);

    const existing = await this.repository.findByName(data.name);
    if (existing && existing.id !== id) {
      throw new ConflictException(`Tag "${data.name}" already exists`);
    }

    return this.repository.update(id, { name: data.name });
  }

  async deleteTag(id: number): Promise<void> {
    await this.validator.validateTagExists(id);
    await this.repository.delete(id);
  }
}
