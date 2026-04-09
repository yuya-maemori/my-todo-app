import { Injectable } from '@nestjs/common';
import { TodoRepository } from './todo.repository';
import { TodoModel } from './todo.model';
import { CreateTodoDto } from './schema/create-todo.schema';
import { UpdateTodoDto } from './schema/update-todo.schema';
import { TodoValidator } from './todo.validator';

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
  constructor(
    private repository: TodoRepository,
    private validator: TodoValidator,
  ) {}

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
    return this.validator.validateTodoExists(id);
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

  /**
   * Todo 更新
   *
   * 先に存在確認を行うことで、「存在しない ID を更新した」というケースを
   * 明確に 404 として扱える。
   */
  async updateTodo(id: number, data: UpdateTodoDto): Promise<TodoModel> {
    await this.validator.validateTodoExists(id);

    return this.repository.update(id, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.completed !== undefined && { completed: data.completed }),
    });
  }

  /**
   * Todo 削除
   *
   * 削除前に存在確認を行い、存在しない場合は 404 を返す。
   * 正常系は Controller 側で 204 No Content を返す。
   */
  async deleteTodo(id: number): Promise<void> {
    await this.validator.validateTodoExists(id);
    await this.repository.delete(id);
  }
}
