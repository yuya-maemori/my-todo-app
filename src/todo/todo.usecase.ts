import { Injectable, NotFoundException } from '@nestjs/common';
import { TodoRepository } from './todo.repository';
import { TodoModel } from './todo.model';

/**
 * Todo Usecase
 *
 * 責務：ビジネスロジックの組み立て
 * 「何をするか」を記述します。
 *
 * - DB にどうアクセスするかは知らない（Repository に任せる）
 * - HTTP リクエスト/レスポンスの形は知らない（Controller に任せる）
 * - 「存在しなければ 404」のような判定ロジックを担当する
 */
@Injectable()
export class TodoUsecase {
  constructor(private repository: TodoRepository) {}

  /**
   * Todo 一覧取得
   *
   * Repository の findAll() を呼んで全件取得する。
   * 現時点ではシンプルだが、将来的にはフィルタリングやソートなどの
   * ビジネスロジックがここに追加される。
   */
  async getTodos(): Promise<TodoModel[]> {
    return this.repository.findAll();
  }

  /**
   * Todo 詳細取得
   *
   * Repository の findById() を呼んで 1 件取得する。
   * 見つからなかった場合は NotFoundException を投げる。
   *
   * なぜここで例外を投げるのか：
   * - Repository は「見つかった/見つからない」を返すだけ（null を返す）
   * - 「見つからなかったらエラー」という判定はビジネスルールである
   * - この判定はこの Usecase の責務
   */
  async getTodoById(id: number): Promise<TodoModel> {
    const todo = await this.repository.findById(id);

    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }

    return todo;
  }
}
