import { Injectable, NotFoundException } from '@nestjs/common';
import { TagModel } from './tag.model';
import { TagRepository } from './external/tag.repository';

@Injectable()
export class TagValidator {
  constructor(private repository: TagRepository) {}

  async validateTagExists(id: number): Promise<TagModel> {
    const tag = await this.repository.findById(id);
    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }
    return tag;
  }
}
