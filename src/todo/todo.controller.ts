import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  Param,
  Body,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { TodoUsecase } from './todo.usecase';
import {
  TodoResponseDto,
  toTodoResponseDto,
  toTodoResponseDtos,
} from './dto/todo-response.dto';
import {
  createTodoSchema,
  CreateTodoDto,
} from './schema/create-todo.schema';
import {
  updateTodoSchema,
  UpdateTodoDto,
} from './schema/update-todo.schema';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

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

  /**
   * POST /todos — 新規作成
   *
   * @Post() → POST /todos にマッチ
   * @UsePipes(new ZodValidationPipe(createTodoSchema))
   *   → Controller メソッド実行前に Zod でバリデーション
   *   → 失敗時は自動的に 400 Bad Request が返る
   * @Body() dto → バリデーション済みのリクエストボディ
   *
   * 【なぜ @UsePipes を使うのか】
   * - バリデーション処理をメソッド本体から分離できる
   * - メソッド本体は「ビジネスロジックの呼び出し」だけに集中
   * - スキーマを差し替えるだけで、別のバリデーションルールに変更可能
   *
   * 【データの流れ】
   * 1. クライアント: POST /todos + { title: "..." }
   * 2. ZodValidationPipe: createTodoSchema.parse(body) でバリデーション
   * 3. バリデーション済み dto を受け取る
   * 4. Usecase.createTodo(dto): Repository 経由で DB に保存
   * 5. toTodoResponseDto(model): Model → DTO に変換して返却
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createTodoSchema))
  async createTodo(@Body() dto: CreateTodoDto): Promise<TodoResponseDto> {
    const model = await this.usecase.createTodo(dto);
    return toTodoResponseDto(model);
  }

  /**
   * PATCH /todos/:id — 更新
   *
   * PATCH は部分更新のため、送られた項目だけを更新する。
   * バリデーションは ZodValidationPipe で先に行い、Usecase には安全な DTO だけを渡す。
   */
  @Patch(':id')
  async updateTodo(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateTodoSchema)) dto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    const model = await this.usecase.updateTodo(id, dto);
    return toTodoResponseDto(model);
  }

  /**
   * DELETE /todos/:id — 削除
   *
   * 削除成功時はレスポンスボディを返さず、204 No Content を返す。
   */
  @Delete(':id')
  @HttpCode(204)
  async deleteTodo(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usecase.deleteTodo(id);
  }
}
