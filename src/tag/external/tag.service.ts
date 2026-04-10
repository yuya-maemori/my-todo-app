import { Injectable } from '@nestjs/common';
import { TagRepository } from './tag.repository';
import { TagModel } from '../tag.model';

/**
 * Tag Service（external）
 *
 * 他モジュール向けの公開 API。
 * TodoModule などがタグ操作をする際のインターフェース。
 *
 * 内部の Validator / Usecase は公開せず、
 * この Service だけを exports することで結合度を下げている。
 */
@Injectable()
export class TagService {
  constructor(private repository: TagRepository) {}

  /**
   * タグ名で検索し、存在しなければ新規作成する
   *
   * Todo 作成時に「タグ名の配列」を受け取り、
   * それぞれ findOrCreate する用途を想定。
   */
  async findOrCreateByName(name: string): Promise<TagModel> {
    return this.repository.findOrCreateByName(name);
  }

  async findAll(): Promise<TagModel[]> {
    return this.repository.findAll();
  }

  async findById(id: number): Promise<TagModel | null> {
    return this.repository.findById(id);
  }
}
