import { Injectable, NotFoundException } from '@nestjs/common';
import { TodoRepository } from './todo.repository';
import { TodoModel } from './todo.model';
import { CreateTodoDto } from './schema/create-todo.schema';

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

  /**
   * Todo 作成
   *
   * バリデーション済みの DTO を受け取り、Repository に委譲して DB に保存する。
   *
   * 【なぜ Usecase を経由するのか】
   * - 現段階では Repository.create() を呼ぶだけ
   * - しかし将来的には以下のようなビジネスロジックが追加される：
   *   → 「同じタイトルの Todo が既に存在しないか」チェック
   *   → 「このユーザーは作成権限を持っているか」チェック
   *   → 「作成後に通知を送る」などの副作用
   * - Controller に直接書くと、これらのロジックが HTTP 層に漏れる
   *
   * 【引数の型が CreateTodoDto な理由】
   * - Zod スキーマから自動生成された型
   * - Controller の ZodValidationPipe で検証済み
   * - Usecase は「既に安全なデータ」を前提にできる
   */
  async createTodo(data: CreateTodoDto): Promise<TodoModel> {
    return this.repository.create({
      title: data.title,
      completed: data.completed,
    });
  }
}
