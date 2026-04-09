import { Injectable, NotFoundException } from '@nestjs/common';
import { TodoModel } from './todo.model';
import { TodoRepository } from './todo.repository';

/**
 * Todo Validator
 *
 * 責務：Todo ドメインのビジネスルール検証
 *
 * なぜ Usecase から分けるのか：
 * - 「存在するかどうか」は get/update/delete で共通して必要になる
 * - 共通ロジックを 1 箇所に寄せることで DRY を保てる
 * - 将来、存在チェック以外のドメイン検証もここに集約できる
 */
@Injectable()
export class TodoValidator {
  constructor(private repository: TodoRepository) {}

  /**
   * Todo の存在チェック
   *
   * 見つからなければ 404 Not Found を投げる。
   * 見つかった場合は、その後の処理で使えるように TodoModel を返す。
   */
  async validateTodoExists(id: number): Promise<TodoModel> {
    const todo = await this.repository.findById(id);

    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }

    return todo;
  }
}