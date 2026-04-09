import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TodoUsecase } from './todo.usecase';
import {
  TodoResponseDto,
  toTodoResponseDto,
  toTodoResponseDtos,
} from './dto/todo-response.dto';

/**
 * Todo Controller
 *
 * 責務：HTTP リクエストの受け取りとレスポンスの返却
 * ビジネスロジックは一切書かない。Usecase に委譲する。
 *
 * @Controller('todos') → このクラスのエンドポイントはすべて /todos で始まる
 */
@Controller('todos')
export class TodoController {
  /**
   * コンストラクタで TodoUsecase を DI で受け取る
   *
   * NestJS の DI コンテナが自動的に TodoUsecase のインスタンスを注入してくれる。
   * private をつけることで、this.usecase としてアクセスできる（TypeScript の糖衣構文）。
   */
  constructor(private usecase: TodoUsecase) {}

  /**
   * GET /todos — 一覧取得
   *
   * @Get() → パスなし＝ /todos にマッチ
   *
   * 流れ：
   * 1. Usecase から TodoModel[] を取得
   * 2. toTodoResponseDtos() で DTO に変換
   * 3. NestJS が自動的に JSON にシリアライズして返す
   */
  @Get()
  async getTodos(): Promise<TodoResponseDto[]> {
    const models = await this.usecase.getTodos();
    return toTodoResponseDtos(models);
  }

  /**
   * GET /todos/:id — 詳細取得
   *
   * @Get(':id') → /todos/1, /todos/2 などにマッチ
   * @Param('id', ParseIntPipe) → URL の :id を number に変換
   *
   * ParseIntPipe の役割：
   * - "1" → 1（文字列を数値に変換）
   * - "abc" → 400 Bad Request（数値でなければ自動でエラー）
   *
   * 流れ：
   * 1. URL パラメータから id を取得
   * 2. Usecase で TodoModel を取得（見つからなければ 404）
   * 3. toTodoResponseDto() で DTO に変換
   * 4. NestJS が自動的に JSON にシリアライズして返す
   */
  @Get(':id')
  async getTodo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TodoResponseDto> {
    const model = await this.usecase.getTodoById(id);
    return toTodoResponseDto(model);
  }
}
