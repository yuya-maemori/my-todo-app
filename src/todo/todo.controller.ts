import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
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
import { listTodoSchema } from './schema/list-todo.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

/**
 * Todo Controller
 *
 * 責務：HTTP リクエストの受け取りとレスポンスの返却
 * ビジネスロジックは一切書かない。Usecase に委譲する。
 *
 * @Controller('todos') → このクラスのエンドポイントはすべて /todos で始まる
 * @ApiTags('todos') → Swagger UI でこのコントローラーのエンドポイントをグループ化
 */
@Controller('todos')
@ApiTags('todos')
export class TodoController {
  /**
   * コンストラクタで TodoUsecase を DI で受け取る
   *
   * NestJS の DI コンテナが自動的に TodoUsecase のインスタンスを注入してくれる。
   * private をつけることで、this.usecase としてアクセスできる（TypeScript の糖衣構文）。
   */
  constructor(private usecase: TodoUsecase) {}

  /**
   * GET /todos — 一覧取得（ページング対応）
   *
   * @Query('page') page — ページ番号（デフォルト: 1）
   * @Query('limit') limit — 1ページあたりの件数（デフォルト: 10）
   *
   * 流れ：
   * 1. クエリパラメータから page/limit を取得
   * 2. Usecase で getTodosWithPagination(page, limit) を実行
   * 3. 結果から PaginatedResponseDto を組み立てる
   * 4. { items, totalItems, totalPages, currentPage } を返す
   *
   * 【使用例】
   * GET /todos?page=2&limit=10
   * → 2ページ目、1ページ 10 件を返す
   *
   * GET /todos
   * → デフォルト: 1ページ目、1ページ 10 件
   */
  @Get()
  @ApiOperation({
    summary: 'TODO 一覧を取得（ページング対応）',
    description: 'ページ番号とページサイズを指定して TODO 一覧を取得します。',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'ページ番号（1 以上、デフォルト: 1）',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '1ページあたりの件数（1～100、デフォルト: 10）',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'TODO 一覧取得成功',
    type: PaginatedResponseDto<TodoResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'バリデーションエラー（page/limit が不正）',
  })
  async getTodos(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResponseDto<TodoResponseDto>> {
    // バリデーション（Zod スキーマで検証）
    const query = listTodoSchema.parse({ page, limit });

    // ページング付きで取得
    const { todos, totalItems } = await this.usecase.getTodosWithPagination(
      query.page,
      query.limit,
    );

    // 全ページ数を計算
    const totalPages = Math.ceil(totalItems / query.limit);

    // レスポンス DTO に変換して返す
    return new PaginatedResponseDto(
      toTodoResponseDtos(todos),
      totalItems,
      totalPages,
      query.page,
    );
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
  @ApiOperation({
    summary: 'TODO 詳細を取得',
    description: '指定された ID の TODO データを返します。',
  })
  @ApiParam({
    name: 'id',
    description: 'TODO の ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'TODO 詳細取得成功',
    type: TodoResponseDto,
  })
  @ApiNotFoundResponse({
    description: '指定された ID の TODO が見つかりません',
  })
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
   * @Body(new ZodValidationPipe(createTodoSchema)) → リクエストボディを Zod でバリデーション
   *   → 失敗時は自動的に 400 Bad Request が返る
   *
   * 【データの流れ】
   * 1. クライアント: POST /todos + { title: "..." }
   * 2. ZodValidationPipe: createTodoSchema.parse(body) でバリデーション
   * 3. バリデーション済み dto を受け取る
   * 4. Usecase.createTodo(dto): Repository 経由で DB に保存
   * 5. toTodoResponseDto(model): Model → DTO に変換して返却
   */
  @Post()
  @ApiOperation({
    summary: '新しい TODO を作成',
    description: 'リクエストボディに title を指定して新規 TODO を作成します',
  })
  @ApiResponse({
    status: 201,
    description: 'TODO 作成成功',
    type: TodoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'バリデーションエラー（title が空、型不正など）',
  })
  async createTodo(
    @Body(new ZodValidationPipe(createTodoSchema)) dto: CreateTodoDto,
  ): Promise<TodoResponseDto> {
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
  @ApiOperation({
    summary: 'TODO を部分更新',
    description:
      '指定された ID の TODO を部分更新します。title と completed の一方または両方を指定してください。',
  })
  @ApiParam({
    name: 'id',
    description: 'TODO の ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'TODO 更新成功',
    type: TodoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'バリデーションエラー（何も更新項目がない、型不正など）',
  })
  @ApiNotFoundResponse({
    description: '指定された ID の TODO が見つかりません',
  })
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
  @ApiOperation({
    summary: 'TODO を削除',
    description: '指定された ID の TODO を削除します。削除成功時は No Content (204) を返します。',
  })
  @ApiParam({
    name: 'id',
    description: 'TODO の ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'TODO 削除成功',
  })
  @ApiNotFoundResponse({
    description: '指定された ID の TODO が見つかりません',
  })
  async deleteTodo(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usecase.deleteTodo(id);
  }
}
