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
  Header,
  UseGuards,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
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
import { TodoCsvExportService } from './external/todo-csv-export.service';
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
import { UserAuthGuard } from '../auth/external/user-auth.guard';
import { PoliciesGuard } from '../auth/external/policies.guard';
import { CheckPolicy } from '../auth/decorators/check-policy.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CaslAbilityFactory } from '../auth/external/casl-ability.factory';
import { UserJwtPayload } from '../auth/types';

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
@UseGuards(UserAuthGuard, PoliciesGuard)
export class TodoController {
  constructor(
    private usecase: TodoUsecase,
    private csvExport: TodoCsvExportService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * GET /todos — 一覧取得（ページング + 検索・ソート対応）
   *
   * @Query('page') page — ページ番号（デフォルト: 1）
   * @Query('limit') limit — 1ページあたりの件数（デフォルト: 10）
   * @Query('sortBy') sortBy — ソート対象（デフォルト: createdAt）
   * @Query('sortOrder') sortOrder — ソート順序（デフォルト: desc）
   * @Query('keyword') keyword — タイトル検索キーワード（オプション）
   *
   * 流れ：
   * 1. クエリパラメータをすべて取得
   * 2. listTodoSchema で Zod バリデーション + デフォルト値適用
   * 3. Usecase に条件を渡して getTodosWithSearch() を実行
   * 4. where / orderBy は Usecase が組み立てる
   * 5. PaginatedResponseDto を返す
   *
   * 【URL 例】
   * GET /todos?page=1&limit=10&sortBy=createdAt&sortOrder=desc&keyword=買い物
   * → 「買い物」を含む TODO を、新しい順に、1ページ目を取得
   *
   * GET /todos?sortBy=title&sortOrder=asc
   * → タイトルのアレ順に並べたデータを、デフォルトページサイズで取得
   *
   * GET /todos
   * → デフォルト: 最新順、1ページ目、10 件
   */
  @Get()
  @CheckPolicy((ability) => ability.can('read', 'Todo'))
  @ApiOperation({
    summary: 'TODO 一覧を取得（ページング + ソート・検索対応）',
    description:
      'ページネーション、キーワード検索、ソート機能に対応した TODO 一覧取得',
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
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'ソート対象カラム（createdAt | title、デフォルト: createdAt）',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'ソート順序（asc | desc、デフォルト: desc）',
    example: 'desc',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'タイトル検索キーワード（オプション）',
    example: '買い物',
  })
  @ApiResponse({
    status: 200,
    description: 'TODO 一覧取得成功',
    type: PaginatedResponseDto<TodoResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'バリデーションエラー（パラメータが不正）',
  })
  async getTodos(
    @CurrentUser() currentUser: UserJwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: string,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResponseDto<TodoResponseDto>> {
    const query = listTodoSchema.parse({
      page,
      limit,
      sortBy,
      sortOrder,
      keyword,
    });

    const ability = this.caslAbilityFactory.createForUser(currentUser);

    const { todos, totalItems } = await this.usecase.getTodosWithSearch({
      ability,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy as 'createdAt' | 'title',
      sortOrder: query.sortOrder as 'asc' | 'desc',
      keyword: query.keyword,
    });

    // 【Step 3】全ページ数を計算
    const totalPages = Math.ceil(totalItems / query.limit);

    // 【Step 4】レスポンス DTO に変換して返す
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
  @CheckPolicy((ability) => ability.can('read', 'Todo'))
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
  @CheckPolicy((ability) => ability.can('create', 'Todo'))
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
    @CurrentUser() currentUser: UserJwtPayload,
    @Body(new ZodValidationPipe(createTodoSchema)) dto: CreateTodoDto,
  ): Promise<TodoResponseDto> {
    const model = await this.usecase.createTodo(dto, currentUser.sub);
    return toTodoResponseDto(model);
  }

  /**
   * PATCH /todos/:id — 更新
   *
   * PATCH は部分更新のため、送られた項目だけを更新する。
   * バリデーションは ZodValidationPipe で先に行い、Usecase には安全な DTO だけを渡す。
   */
  @Patch(':id')
  @CheckPolicy((ability) => ability.can('update', 'Todo'))
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
    @CurrentUser() currentUser: UserJwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateTodoSchema)) dto: UpdateTodoDto,
  ): Promise<TodoResponseDto> {
    const model = await this.usecase.updateTodo(id, dto, currentUser.sub);
    return toTodoResponseDto(model);
  }

  /**
   * DELETE /todos/:id — 削除
   *
   * 削除成功時はレスポンスボディを返さず、204 No Content を返す。
   */
  @Delete(':id')
  @HttpCode(204)
  @CheckPolicy((ability) => ability.can('delete', 'Todo'))
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
  async deleteTodo(
    @CurrentUser() currentUser: UserJwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.usecase.deleteTodo(id, currentUser.sub);
  }

  /**
   * GET /todos/export/csv — CSV エクスポート
   *
   * 全 TODO をCSV形式でダウンロードできます。
   *
   * 【レスポンスヘッダ】
   * - Content-Type: text/csv; charset=utf-8
   * - Content-Disposition: attachment; filename="todos.csv"
   *   → ブラウザに「ダウンロード」として認識させる
   *
   * 【CSV の特徴】
   * - UTF-8 BOM 付き → Excel で日本語が正しく表示
   * - ヘッダ行 + データ行
   * - カンマや改行を含むフィールドは "..." でエスケープ
   *
   * 【使用例】
   * GET /todos/export/csv
   * → todos.csv がダウンロード完了
   *
   * 【出力例】
   * ID,タイトル,完了,タグ,作成日時,更新日時
   * 1,買物,false,"[{""id"":1,""name"":""緊急""}]",2026-04-10T04:51:03.452Z,2026-04-10T04:51:03.452Z
   * 2,ミーティング,true,,2026-04-09T10:00:00.000Z,2026-04-09T12:00:00.000Z
   */
  @Get('export/csv')
  @CheckPolicy((ability) => ability.can('read', 'Todo'))
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="todos.csv"')
  @ApiOperation({
    summary: 'TODO を CSV でエクスポート',
    description:
      '全 TODO を CSV 形式でダウンロードします。ファイル名は todos.csv です。',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV ファイルを返す',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportToCsv(): Promise<StreamableFile> {
    // ① 全 TODO を取得
    const todos = await this.usecase.getAll();

    // ② CSV に変換
    const buffer = this.csvExport.exportToCsv(todos);

    // ③ StreamableFile でラップして返す
    // ヘッダは @Header() デコレータで自動設定される
    return new StreamableFile(buffer);
  }
}
