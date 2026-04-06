# NestJS プロジェクトルール

## 設計思想

### コンパイル時・起動時に確定させる

**「実行してみないとわからない」状態を最小化する。** 問題はできるだけ早い段階で検出する。

| 検出タイミング | 仕組み | 例 |
|--------------|--------|-----|
| コンパイル時 | TypeScript の型システム | 型の不一致、存在しないプロパティへのアクセス |
| コンパイル時 | `Pick<T>` 型付きモック | テストのモックが実装と乖離していたら型エラー |
| 起動時 | NestJS DI コンテナ | 依存の注入漏れ、Module exports の不足 |
| 起動時 | ConfigModule の validate | 環境変数の欠落・型不正 |
| リクエスト時（入口） | ZodValidationPipe | リクエストボディの形式不正 |

**やってはいけないこと:**

- `as any` による型の握りつぶし → コンパイル時の検出を無効化してしまう
- `process.env` の直接参照 → 起動時バリデーションを迂回してしまう
- DI を使わない直接インスタンス化（`new XxxRepository()`）→ 起動時の依存チェックを迂回してしまう

### 内部と外部で型を分ける

型は **「誰のためか」** で分離する。フィールドが同じかどうかは関係ない。

| 分類 | 型 | 関心事 |
|------|-----|--------|
| 内部 | Model | ビジネスロジックが扱うデータ |
| 外部 | Zod スキーマ | バリデーション + 入力型の生成 + Swagger 入力定義 |
| 外部 | Response DTO | 外部へ提供する形 |
| DB | Entity | DB テーブル構造 |

- **Model と Response DTO のフィールドが今同じでも、常に分離する**
- Model にフィールドを足しても、Response DTO に足さなければ API には漏れない
- **ルールが単純であるほど守られる。** 「常に分離する」は判断が不要

---

## ディレクトリ構成

ドメインモジュール単位のフラット構成を採用する。

```text
src/
├── main.ts
├── app.module.ts
├── auth/                        認証・認可モジュール
│   ├── auth.module.ts
│   ├── admin/                     Admin 認証
│   │   ├── admin-auth.controller.ts
│   │   ├── admin-auth.usecase.ts
│   │   ├── admin-auth.repository.ts
│   │   └── admin-auth.validator.ts
│   ├── user/                      User 認証
│   │   ├── user-auth.controller.ts
│   │   ├── user-auth.usecase.ts
│   │   ├── user-auth.repository.ts
│   │   └── user-auth.validator.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── check-policy.decorator.ts
│   ├── external/
│   │   ├── composite-auth.guard.ts  ← パスで Admin/User を振り分け
│   │   ├── admin-auth.guard.ts
│   │   ├── user-auth.guard.ts
│   │   ├── policies.guard.ts
│   │   └── casl-ability.factory.ts
│   └── types/
├── admin/                       Admin モデル
│   └── admin.model.ts
├── todo/                        ドメインモジュールの例
│   ├── todo.module.ts
│   ├── todo.controller.ts         User 向け CRUD
│   ├── admin-todo.controller.ts   Admin 向け CRUD
│   ├── todo.usecase.ts            User 向け Usecase
│   ├── admin-todo.usecase.ts      Admin 向け Usecase
│   ├── todo.validator.ts
│   ├── todo.model.ts
│   ├── todo.repository.ts
│   ├── dto/
│   └── schema/
├── tag/
│   ├── ...
│   └── external/              ← 他モジュールに公開するもの
│       ├── tag.repository.ts
│       └── tag-resolve.service.ts
├── audit-log/                   監査ログモジュール
├── file/                        ファイルストレージモジュール
├── mail/                        メール送信モジュール
├── health/                      ヘルスチェックモジュール
├── common/
│   ├── types/
│   │   └── id.type.ts             ResourceId / ParseIdPipe / zodId
│   ├── filters/
│   ├── pipes/
│   ├── services/                  CSV・PDF エクスポート
│   ├── dto/
│   └── schema/
├── config/
└── prisma/
```

### 配置ルール

| 種類 | 置き場所 |
|------|---------|
| 機能モジュール | `src/{ドメイン名}/` 直下 |
| Repository / Entity | ドメインモジュール内（他モジュールに公開する場合は `external/`） |
| 横断的関心事 | `src/common/{種類}/` |
| Zod スキーマ | `src/{ドメイン名}/schema/` |
| テスト（単体） | モジュールと同じディレクトリ |
| テスト（E2E） | `test/` |

---

## 命名規則

### ファイル名

すべてケバブケース + サフィックス。NestJS CLI のデフォルトに従う。

| 種類 | パターン | 例 |
|------|---------|-----|
| Module | `{name}.module.ts` | `user.module.ts` |
| Controller | `{name}.controller.ts` | `todo.controller.ts` |
| Admin Controller | `admin-{name}.controller.ts` | `admin-todo.controller.ts` |
| Usecase | `{name}.usecase.ts` | `todo.usecase.ts` |
| Admin Usecase | `admin-{name}.usecase.ts` | `admin-todo.usecase.ts` |
| Service | `{name}.service.ts` | `user.service.ts` |
| Model | `{name}.model.ts` | `user.model.ts` |
| Entity | `{name}.entity.ts` | `user.entity.ts` |
| Repository | `{name}.repository.ts` | `user.repository.ts` |
| Response DTO | `{name}-response.dto.ts` | `user-response.dto.ts` |
| Zod スキーマ | `{action}-{name}.schema.ts` | `create-user.schema.ts` |
| Admin Zod スキーマ | `admin-{action}-{name}.schema.ts` | `admin-create-todo.schema.ts` |
| Validator | `{name}.validator.ts` | `user.validator.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts` |
| Interceptor | `{name}.interceptor.ts` | `logging.interceptor.ts` |
| Pipe | `{name}.pipe.ts` | `parse-int.pipe.ts` |
| Filter | `{name}.filter.ts` | `http-exception.filter.ts` |
| Decorator | `{name}.decorator.ts` | `current-user.decorator.ts` |
| 単体テスト | `{name}.spec.ts` | `user.usecase.spec.ts` |
| E2E テスト | `{name}.e2e-spec.ts` | `user.e2e-spec.ts` |

### フォルダ名

| 種類 | 形式 | 例 |
|------|------|-----|
| ドメインフォルダ | **単数形** | `user/`, `order/`, `product/` |
| ユーティリティフォルダ | **複数形** | `guards/`, `pipes/`, `filters/` |

### クラス名

パスカルケース + サフィックス。ファイル名と対応させる。

| 種類 | パターン | 例 |
|------|---------|-----|
| Module | `{Name}Module` | `UserModule` |
| Controller | `{Name}Controller` | `UserController` |
| Usecase | `{Name}Usecase` | `UserUsecase` |
| Service | `{Name}Service` | `UserService` |
| Model | `{Name}Model` | `UserModel` |
| Entity | `{Name}` | `User` |
| Response DTO | `{Name}ResponseDto` | `UserResponseDto` |
| Validator | `{Name}Validator` | `UserValidator` |
| Guard | `{Name}Guard` | `JwtAuthGuard` |

---

## レイヤ構成と DI

### レイヤ全体像

```
Controller          ← HTTP ハンドラ。DTO の受け取りと Response の返却
  ↓ Zod input
Usecase             ← 処理の流れ + トランザクション管理
  ↓ Model (データ)       ↓ tx (トランザクション)
Validator / Service     Repository
(純粋ロジック)            (DB アクセス)
                          ↓
                       PrismaService
```

### データの流れ

```
[リクエスト]
  → Controller (ZodValidationPipe でバリデーション済みの input を受け取る)
    → Usecase (input を受け取り、Repository / Validator / Service を呼ぶ)
      → Validator / Service (Model を受け取り、検証・加工)
      → Repository (Model + tx で書き込み、Model を返す)
    ← Usecase (Model を返す)
  ← Controller (Model → Response DTO に変換して返す)
[レスポンス]
```

### 型の流れ

| 区間 | 流れる型 |
|------|---------|
| Client → Controller | Zod input（ZodValidationPipe がパース済み） |
| Controller → Usecase | Zod input |
| Usecase → Validator / Service | Model |
| Usecase → Repository | Model + tx |
| Repository → Usecase | Model |
| Usecase → Controller | Model |
| Controller → Client | Response DTO |

### 変換の責務

| レイヤ | 変換 |
|--------|------|
| Repository | Entity → Model（private `toModel` メソッド） |
| Controller | Model → Response DTO（private `toResponse` メソッド） |
| Usecase / Validator / Service | 変換しない。Model をそのまま扱う |

### DI ルール

- 具体クラスを直接注入する（NestJS の標準パターン）
- インタフェース + Symbol トークンによる抽象化は原則やらない
- Symbol トークンを使うのは、環境ごとに実装を切り替える場合のみ（例: S3 / Minio）
- **1 クラスのコンストラクタ依存は目安4個**。超える場合は責務の切り出しを検討する（仕方のない場合もある）
- **外部 SDK / API は専用の Client クラスでラップする**。Usecase が SDK を直接扱わない

```typescript
// OK: 具体クラスを直接注入
@Injectable()
export class TodoUsecase {
  constructor(private readonly repository: TodoRepository) {}
}

// NG: 不要なインタフェース + Symbol
@Inject(TODO_REPOSITORY)
private readonly todoRepo: TodoRepository;
```

```typescript
// OK: Client で SDK をラップ
@Injectable()
export class MailClient {
  async send(to: string, subject: string, body: string): Promise<void> { ... }
}

// NG: Service が SDK を直接扱う
@Injectable()
export class UserService {
  constructor(private readonly sesClient: SESClient) {}
}
```

### レイヤごとの注入・公開ルール

| サフィックス | 役割 | Zod input を知るか | 注入可能なもの | Module exports |
|-------------|------|-------------------|---------------|----------------|
| `Usecase` | 処理の流れ + tx 管理 | **知る** | TransactionService, Repository, Validator, Service, Client | **しない** |
| `Validator` | ビジネスバリデーション | 知らない | なし（引数のみ） | する（外部呼び出し可） |
| `Service` | ビジネスロジック（Validator 以外） | 知らない | Repository（`external/` 配置の場合） | する（`external/` 配置の場合） |
| `Repository` | DB アクセス + クエリロジック | 知らない | PrismaService, 引数の tx | する（`external/` 配置の場合） |
| `Client` | 外部 SDK / API のラップ | 知らない | 外部 SDK | Usecase から注入される |

### トランザクションのルール

- **Usecase だけが `TransactionService.run()` でトランザクションを開始し、`tx` を Repository に渡す**
- Repository の書き込みメソッドは `tx: TransactionClient` を必須引数で受け取る
- Repository の読み取りメソッドは `this.prisma` を直接使う（tx 不要）
- Validator は Repository や PrismaService を持たない。データは引数で受け取る
- Service は `external/` 配置の場合のみ Repository を注入できる

---

## Controller

### 書くこと

- HTTP リクエストの受け取り（`@Get`, `@Post`, `@Patch`, `@Delete`）
- パスパラメータ・ボディの型指定（`@Param`, `@Body`）
- `ZodValidationPipe` の適用
- Usecase の呼び出し
- **Model → Response DTO の変換**（`toResponse` メソッド）
- Swagger デコレータ（`@ApiTags`, `@ApiResponse`）

### 書かないこと

- ビジネスロジック / DB アクセス / トランザクション管理
- Repository や PrismaService の直接注入

### 注入できるもの

- **Usecase のみ**

### 実装例

```typescript
@Controller('todos')
@ApiTags('todos')
export class TodoController {
  constructor(private readonly todoUsecase: TodoUsecase) {}

  @Get()
  @ApiResponse({ status: 200, description: 'TODO一覧取得', type: [TodoResponseDto] })
  async findAll(): Promise<TodoResponseDto[]> {
    const todos = await this.todoUsecase.findAll();
    return todos.map((todo) => this.toResponse(todo));
  }

  @Post()
  @ApiResponse({ status: 201, description: 'TODO作成成功', type: TodoResponseDto })
  @UsePipes(new ZodValidationPipe(createTodoSchema))
  async create(@Body() dto: CreateTodoInput): Promise<TodoResponseDto> {
    const todo = await this.todoUsecase.create(dto);
    return this.toResponse(todo);
  }

  private toResponse(model: TodoModel): TodoResponseDto {
    return {
      id: model.id,
      title: model.title,
      completed: model.completed,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      tags: (model.tags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })),
    };
  }
}
```

---

## Usecase

### 書くこと

- **処理の流れ（オーケストレーション）**
- **トランザクションの開始**（`this.transaction.run()`）
- Repository / Validator / Service の呼び出し

### 書かないこと

- ビジネスロジックの実装（Validator / Service に委譲する）
- DB クエリの組み立て / HTTP の関心事 / Model → Response DTO の変換

### 注入できるもの

- TransactionService, Repository, Validator, Service, Client — **目安4個**（超える場合は切り出しを検討）

### Module での扱い

- `providers` に含める。**`exports` には含めない**（Zod input を知っているため）

### 実装例

```typescript
@Injectable()
export class TodoUsecase {
  constructor(
    private readonly transaction: TransactionService,
    private readonly repository: TodoRepository,
    private readonly validator: TodoValidator,
  ) {}

  async findAll(): Promise<TodoModel[]> {
    return this.repository.findAll();
  }

  async findOne(id: number): Promise<TodoModel> {
    return this.validator.ensureExists(await this.repository.findById(id), id);
  }

  async create(input: CreateTodoInput): Promise<TodoModel> {
    return this.transaction.run((tx) => {
      return this.repository.create({ title: input.title }, tx);
    });
  }

  async update(id: number, input: UpdateTodoInput): Promise<TodoModel> {
    const todo = this.validator.ensureExists(
      await this.repository.findById(id),
      id,
    );
    const updated = todo.withUpdate(input.title, input.completed);

    return this.transaction.run((tx) => {
      return this.repository.update(id, updated, tx);
    });
  }
}
```

### 判断基準

- if 文の条件が「データの状態に基づくビジネスルール」→ Validator に切り出す
- if 文の条件が「どの Repository を呼ぶかの分岐」→ Usecase に残す
- 計算・変換ロジック → Service に切り出す

---

## Validator

### 書くこと

- **ビジネスバリデーション**: 存在チェック / 重複チェック / 状態チェック
- NestJS 組み込み例外の throw

### 書かないこと

- DB アクセス（データは引数で受け取る）
- 形式チェック（Zod スキーマの責務）
- 計算・変換（Service の責務）

### 注入できるもの

- **なし**（引数のみ）

### 命名規則

メソッド名は `ensure{条件}` で統一する。

| メソッド名 | 役割 |
|-----------|------|
| `ensureExists` | 存在することを保証 |
| `ensureNameNotDuplicated` | 重複がないことを保証 |
| `ensureNotCompleted` | 未完了であることを保証 |
| `ensureOwner` | 所有者であることを保証 |

### 実装例

```typescript
@Injectable()
export class TodoValidator {
  ensureExists(todo: TodoModel | null, id: number): TodoModel {
    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} was not found`);
    }
    return todo;
  }
}
```

### テスト

DB 依存がないため `new TodoValidator()` で直接テストできる。DI 不要。

```typescript
describe('TodoValidator', () => {
  let validator: TodoValidator;

  beforeEach(() => {
    validator = new TodoValidator();
  });

  it('TODOが存在する場合、そのTODOを返す', () => {
    const result = validator.ensureExists(mockTodo, 1);
    expect(result).toEqual(mockTodo);
  });

  it('TODOがnullの場合、NotFoundExceptionを投げる', () => {
    expect(() => validator.ensureExists(null, 999)).toThrow(NotFoundException);
  });
});
```

---

## Service

### 書くこと

- **ビジネスロジック（Validator 以外）**: 計算処理、データ変換・加工
- 他モジュールに公開するドメイン操作（`external/` に配置）

### 書かないこと

- バリデーション / 処理の流れの制御 / HTTP の関心事
- **権限や認証テーブルへの依存** — Service の関数は認証の口（Admin / User）に依存しない純粋なロジックであるべき

### Admin / User で振る舞いが異なる場合

Service の関数内で `actorType` や `role` を見て if 分岐するのは **禁止**。
認証の口が異なることで振る舞いが変わるなら、**関数を分ける**。

```typescript
// OK: 関数を分ける
async notifyUser(userId: ResourceId, message: string): Promise<void> { ... }
async notifyTenantAdmins(tenantId: ResourceId, message: string): Promise<void> { ... }

// NG: if 分岐で認証種別を判定
async notify(actor: JwtPayload, message: string): Promise<void> {
  if (actor.type === 'admin') { ... }
  else { ... }
}
```

認証の口の違いは Controller → Usecase で吸収する。Service はどちらから呼ばれても同じインターフェースで動くように設計する。

### 注入できるもの

- **純粋ロジックの Service**: なし（引数のみ）
- **`external/` 配置の Service**: Repository を注入できる

### Validator と Service の使い分け

| 観点 | Validator | Service |
|------|-----------|---------|
| 目的 | 「ダメな状態を弾く」 | 「データを加工・計算する」 |
| 戻り値 | 検証済みデータ or 例外 | 計算結果・変換結果 |
| 例外 | 投げる | 投げない（原則） |
| 命名 | `ensure~`, `validate~` | `calculate~`, `apply~`, `resolve~` |

### 実装例

```typescript
// 純粋ロジックの Service（引数のみ）
@Injectable()
export class OrderService {
  calculateTotalWithTax(items: OrderItemModel[], taxRate: number): number {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.floor(subtotal * (1 + taxRate));
  }
}

// external/ 配置の Service（Repository を注入、他モジュールに公開）
@Injectable()
export class TagResolveService {
  constructor(private readonly repository: TagRepository) {}

  async resolveTagIds(tagNames: string[], tx: TransactionClient): Promise<number[]> {
    const existing = await this.repository.findByNames(tagNames);
    const existingMap = new Map(existing.map((t) => [t.name, t.id]));
    const newNames = tagNames.filter((name) => !existingMap.has(name));
    const created = newNames.length > 0
      ? await this.repository.createMany(newNames, tx)
      : [];
    return [...existing.map((t) => t.id), ...created.map((t) => t.id)];
  }
}
```

---

## Model

### 書くこと

- **ビジネスの関心事を表すデータ構造**
- `readonly` フィールド + constructor（不変性を保証）
- `withUpdate` 等の immutable 更新メソッド（更新が必要な場合）
- `toAuditSnapshot()` — 監査ログ用のスナップショットを返す（追跡対象のフィールドのみ）
- リレーションは optional フィールドで定義（`tags?: TagModel[]`）

### 書かないこと

- DB 固有のカラム（`deletedAt` 等、ビジネスに不要なもの）
- API レスポンス固有のフィールド
- class-validator デコレータ
- private + getter（Java 式）→ `readonly` を使う

### 実装例

```typescript
import { ResourceId } from '../common/types/id.type';

export class TodoModel {
  readonly id: ResourceId;
  readonly tenantId: ResourceId;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly tags?: TagModel[];

  constructor(params: { /* 同上 */ }) { /* ... */ }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
    };
  }

  withUpdate(title?: string, completed?: boolean): TodoModel {
    return new TodoModel({
      ...this,
      title: title ?? this.title,
      completed: completed ?? this.completed,
    });
  }
}
```

---

## Repository

### 書くこと

- **DB アクセス（CRUD）** + Prisma クエリの組み立て
- **Entity → Model の変換**（`toModel` メソッド）
- 読み取り: `this.prisma` を直接使う
- 書き込み: 引数の `tx: TransactionClient` を使う
- **集約に属する中間テーブルの操作**（1 Repository = 1 テーブルではなく集約単位）

### 書かないこと

- ビジネスロジック / トランザクションの開始 / HTTP の関心事

### 注入できるもの

- PrismaService

### 配置

- ドメインモジュール内に置く。他モジュールに公開する場合は `external/` に配置

### 実装例

```typescript
@Injectable()
export class TodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TodoModel[]> {
    const entities = await this.prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
      include: { todoTags: { include: { tag: true } } },
    });
    return entities.map((entity) => this.toModel(entity));
  }

  async create(
    params: { title: string; tagIds?: number[] },
    tx: TransactionClient,
  ): Promise<TodoModel> {
    const entity = await tx.todo.create({
      data: {
        title: params.title,
        ...(params.tagIds && {
          todoTags: { create: params.tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: { todoTags: { include: { tag: true } } },
    });
    return this.toModel(entity);
  }

  private toModel(entity: TodoWithTodoTags): TodoModel {
    return new TodoModel({
      id: entity.id,
      title: entity.title,
      completed: entity.completed,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      tags: entity.todoTags.map((tt) => new TagModel({ ... })),
    });
  }
}
```

---

## Entity

### 書くこと

- **DB テーブル構造のそのままの表現**（全カラム対応フィールド）
- 中間テーブルの Entity（リレーションがある場合）

### 書かないこと

- class-validator デコレータ / メソッド / ビジネスロジック

### 扱うレイヤ

- **Repository 内部のみ**（外部に漏らさない）

### 実装例

```typescript
export class Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  todoTags?: TodoTag[];
}

export class TodoTag {
  todoId: number;
  tagId: number;
  tag: Tag;
}
```

---

---

## Zod スキーマ

### 書くこと

- **バリデーションルールの定義**（共通ヘルパー `requiredString`, `optionalString` 等を利用）
- `z.infer` による入力型の生成
- 日本語エラーメッセージ
- **`.openapi()` による Swagger メタデータ**（description, example）

### 配置

- `src/{ドメイン名}/schema/{action}-{name}.schema.ts`
- `src/{ドメイン名}/schema/index.ts` で再 export

### ルール

- 形式チェック（型、フォーマット等）は Zod スキーマで行う
- ビジネスバリデーション（重複チェック等）は Validator で行う
- **Zod input を受け取れるのは Usecase だけ**。Validator / Service / Repository は Zod input を知らない

### 実装例

```typescript
import { z } from 'zod';
import { requiredString } from '../../common/schema';

export const createTodoSchema = z.object({
  title: requiredString('タイトル')
    .openapi({ description: 'TODOのタイトル', example: '買い物に行く' }),
  tags: z.array(requiredString('タグ名')).optional()
    .openapi({ description: 'タグ名の配列', example: ['重要', '買い物'] }),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
```

### テスト

```typescript
describe('createTodoSchema', () => {
  it('タイトルのみで有効', () => {
    const result = createTodoSchema.safeParse({ title: 'タスク1' });
    expect(result.success).toBe(true);
  });

  it('タイトルが空文字の場合はエラー', () => {
    const result = createTodoSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});
```

---

## Response DTO

### 書くこと

- **API レスポンスの形の定義**
- JSDoc コメント（Swagger の description になる）

### 書かないこと

- class-validator デコレータ / ビジネスに不要な DB カラム

### 扱うレイヤ

- **Controller のみ**（Model → Response DTO に変換して返す）

### 実装例

```typescript
export class TodoResponseDto {
  /** TODO ID */
  id: number;

  /** TODOのタイトル */
  title: string;

  /** 完了フラグ */
  completed: boolean;

  /** 作成日時 */
  createdAt: Date;

  /** 更新日時 */
  updatedAt: Date;

  /** タグ一覧 */
  tags: TagResponseDto[];
}
```

---

## Module

### 書くこと

- `imports`: 依存する他ドメインの Module
- `controllers`: そのドメインの Controller
- `providers`: Usecase, Validator, Service, Repository
- `exports`: **`external/` 配下のもののみ**（Repository, Service）

### ルール

- **Usecase / Controller は `exports` に含めない**
- 他モジュールの機能を使いたい場合は `imports` で明示的に依存を宣言する（`@Global()` は使わない）

### 実装例

```typescript
@Module({
  imports: [TagModule],
  controllers: [TodoController],
  providers: [TodoUsecase, TodoValidator, TodoRepository],
})
export class TodoModule {}

@Module({
  controllers: [TagController],
  providers: [TagUsecase, TagValidator, TagRepository, TagResolveService],
  exports: [TagRepository, TagResolveService],
})
export class TagModule {}
```

---

## テスト

### モックの書き方

- `as any` でモックを作ることを禁止する
- `Pick<具体クラス, 'メソッド名'>` で型付きモックを作成する

```typescript
// OK: 型付きモック
const mockRepository: Pick<TodoRepository, 'findAll' | 'create'> = {
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(mockTodo),
};

// NG: as any
const mockRepository = {
  findAll: jest.fn(),
} as any;
```

### テストモジュールの組み立て

```typescript
const module = await Test.createTestingModule({
  providers: [
    TodoUsecase,
    TodoValidator,
    { provide: TodoRepository, useValue: mockRepository },
    { provide: TransactionService, useValue: mockTransactionService },
  ],
}).compile();
```

### ESLint で `as any` を禁止する

```json
{
  "overrides": [
    {
      "files": ["**/*.spec.ts", "**/*.e2e-spec.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "error"
      }
    }
  ]
}
```

---

## ORM / DB

Prisma を使用する。TypeORM は使わない。

### スキーマ

- `prisma/schema.prisma` は `yarn db:use <provider>` で自動生成される（直接編集しない）
- スキーマの変更は `prisma/schemas/schema.{provider}.prisma` に対して行い、全4ファイルに反映する
- 対応 DB: sqlserver, postgresql, mysql, sqlite
- DB 固有の差異（リレーションの `onUpdate` / `onDelete` 等）は各スキーマファイルで個別に管理する
- ドメインごとに Entity ファイル (`{name}.entity.ts`) をドメインモジュール内に作成する

### PrismaService

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### TransactionService

```typescript
@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
```

### マイグレーション

このアプリではマイグレーションを管理しない。既存 DB を別アプリが管理しており、本アプリはデータの読み書きのみ行う。

```bash
npx prisma db pull
npx prisma generate
```

### 禁止事項

- `prisma migrate` / `db push` は実行しない（DB は別アプリが管理）
- Prisma Client を `new PrismaClient()` しない（PrismaService 経由）

---

## Swagger

`@nestjs/swagger` で API ドキュメントを自動生成する。`http://localhost:3000/api` でアクセス。

### セットアップ

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('TODO API')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

### ルール

- Zod スキーマの各フィールドに `.openapi({ description, example })` を付与する
- Controller には `@ApiBody({ schema: createApiBodySchema(zodSchema) })` で入力スキーマを指定する
- Controller にはレスポンスの型を `@ApiResponse()` で明示
- Response DTO には JSDoc コメントで説明を書く

```typescript
@Controller('todos')
@ApiTags('todos')
export class TodoController {
  @Post()
  @ApiBody({ schema: createApiBodySchema(createTodoSchema) })
  @ApiResponse({ status: 201, description: 'TODO作成成功', type: TodoResponseDto })
  @UsePipes(new ZodValidationPipe(createTodoSchema))
  create(@Body() dto: CreateTodoInput) { ... }
}
```

---

## エラーハンドリング

RFC 9457 (Problem Details for HTTP APIs) に準拠する。

### レスポンス形式

Content-Type: `application/problem+json`

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not Found",
  "status": 404,
  "detail": "Todo with id 123 was not found",
  "instance": "/todos/123"
}
```

バリデーションエラー：

```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "errors": {
    "title": ["タイトルは必須です"]
  }
}
```

### 例外の投げ方

NestJS 組み込み例外をそのまま使う。カスタム例外クラスは作らない。

```typescript
// OK
throw new NotFoundException('Todo with id 123 was not found');
throw new ConflictException('Tag with name "重要" already exists');

// NG: カスタム例外
throw new TodoNotFoundException(todoId);
```

### Exception Filter

グローバルに1つだけ配置し、全エラーを RFC 9457 形式に変換する。

```typescript
// main.ts で登録
app.useGlobalFilters(new ProblemDetailsFilter());
```

---

## ロギング

- `new Logger(クラス名)` でフィールド定義する
- 出力先の切り替えは `main.ts` の Logger 設定で1箇所だけ行う

```typescript
@Injectable()
export class TodoUsecase {
  private readonly logger = new Logger(TodoUsecase.name);

  create(input: CreateTodoInput) {
    this.logger.log('Todo created');
  }
}
```

### 構造化ログ

- pino (`nestjs-pino`) を使用した JSON 構造化ログ
- 開発時は `pino-pretty`、本番は JSON stdout
- ログの外部連携はアプリコード変更不要（pino transport or インフラ層で対応）
- `app.module.ts` の `LoggerModule.forRoot()` で設定
- `main.ts` で `bufferLogs: true` + `app.useLogger()` を使用

---

## リクエスト ID

- 全リクエストに `X-Request-Id` ヘッダを付与
- `pino-http` の `genReqId` で生成（既存ヘッダがあればそれを使用、なければ UUID 生成）
- ログ出力に自動的に含まれる
- `ProblemDetailsFilter` のエラーレスポンスにも `requestId` フィールドとして含まれる

---

## 設定管理

`@nestjs/config` を使用。環境変数は起動時にバリデーションする。

### セットアップ

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
})
export class AppModule {}
```

### 起動時バリデーション

```typescript
class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsNumber()
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
```

### ルール

- `process.env` を直接参照しない。必ず `ConfigService` 経由
- 環境変数はすべて `EnvironmentVariables` クラスに定義し、起動時バリデーションの対象にする
- `.env` はリポジトリにコミットしない。`.env.example` にキーだけ記載
- `ConfigModule.forRoot()` は `isGlobal: true` にし、各モジュールで import しない

---

## 新規ドメイン追加チェックリスト

1. **Model** - `src/{name}/{name}.model.ts`（`ResourceId` 型、`toAuditSnapshot()`、`withUpdate()` を含む）
2. **Repository** - `src/{name}/{name}.repository.ts`（公開する場合は `external/`）
3. **Zod スキーマ** - `src/{name}/schema/` に作成、`index.ts` で再 export、各フィールドに `.openapi()` を付与
4. **Response DTO** - `src/{name}/dto/{name}-response.dto.ts`
5. **Validator** - `src/{name}/{name}.validator.ts`
6. **Usecase** - `src/{name}/{name}.usecase.ts`（監査ログ記録を含む）
7. **Admin Usecase** - `src/{name}/admin-{name}.usecase.ts`（監査ログ記録を含む）
8. **Controller** - `src/{name}/{name}.controller.ts`（User 向け）
9. **Admin Controller** - `src/{name}/admin-{name}.controller.ts`（Admin 向け、`/admin/{name}s`）
10. **Module** - `src/{name}/{name}.module.ts`、`AppModule` に登録
11. **CASL** - `casl-ability.factory.ts` に Subject と権限を追加
12. **テスト** - `*.spec.ts`（Usecase, Validator, Schema は必須）

> scaffold（`yarn scaffold --name {name} --fields "..."`）を使えば上記の大半が自動生成される。

---

## ID 型

すべての ID（主キー、FK、パスパラメータ）は `ResourceId` 型を使う。`number` を直接使わない。

### 定義

```typescript
// src/common/types/id.type.ts
import { ParseIntPipe } from '@nestjs/common';
import { z } from 'zod';

export type ResourceId = number;
export const ParseIdPipe = ParseIntPipe;
export const zodId = () => z.coerce.number().int().positive();
```

### 使い方

| 場所 | 使うもの |
|------|---------|
| Model / DTO のフィールド | `ResourceId` |
| Controller のパスパラメータ | `@Param('id', ParseIdPipe) id: ResourceId` |
| Usecase / Repository のメソッド引数 | `id: ResourceId` |
| Zod スキーマの ID フィールド | `zodId()` |

### ルール

- `number` や `ParseIntPipe` を直接使わない。必ず `ResourceId` / `ParseIdPipe` / `zodId()` を経由する
- 将来 UUID / ULID に移行する場合、`id.type.ts` の1ファイルだけ変更すればよい

---

## 論理削除

### デフォルトは論理削除

scaffold で生成されるコードはデフォルトで論理削除（`deletedAt` カラム）を使う。

- Prisma スキーマに `deletedAt DateTime?` を定義
- Repository の読み取りクエリに `deletedAt: null` を WHERE 条件に含める
- Repository の `delete` メソッドは `update({ deletedAt: new Date() })` を実行する
- Model には `deletedAt` を含めない（ビジネスに不要な DB 固有カラム）

### 物理削除にする場合

scaffold で `--hardDelete` フラグを指定する。

```bash
yarn scaffold --name product --fields "name:string" --hardDelete
```

---

## 監査ログ

### ルール

- **create / update / delete を行う Usecase は、監査ログの記録を必須とする**
- 監査ログはトランザクション内で記録する（`tx` を渡す）
- Model に `toAuditSnapshot()` を実装し、追跡対象のフィールドのみ返す

### 操作者の記録

ポリモーフィックな `actorType` + `actorId` で操作者を追跡する。

| actorType | actorId | 呼び出し元 |
|-----------|---------|-----------|
| `'user'` | ユーザー ID | User 向け Usecase |
| `'admin'` | 管理者 ID | Admin 向け Usecase |

### before / after の規約

| 操作 | before | after |
|------|--------|-------|
| create | `null` | `model.toAuditSnapshot()` |
| update | `original.toAuditSnapshot()` | `updated.toAuditSnapshot()` |
| delete | `model.toAuditSnapshot()` | `null` |

### 実装パターン

```typescript
await this.auditLogRepository.create(
  {
    tenantId,
    actorType: 'user',
    actorId: userId,
    action: 'create',
    resourceType: 'Todo',
    resourceId: todo.id,
    before: null,
    after: todo.toAuditSnapshot(),
  },
  tx,
);
```

---

## Admin / User コントローラー分離

### 構造

各ドメインモジュールは、User 向けと Admin 向けの Controller / Usecase を分離する。

| ファイル | ルートプレフィックス | JWT 型 |
|---------|-------------------|--------|
| `{name}.controller.ts` | `/{name}s` | `UserJwtPayload` |
| `admin-{name}.controller.ts` | `/admin/{name}s` | `JwtPayload` |
| `{name}.usecase.ts` | — | `actorType: 'user'` |
| `admin-{name}.usecase.ts` | — | `actorType: 'admin'` |

### ルール

- Admin Controller は `/admin/` プレフィックスを付ける
- Admin Usecase は `actorType: 'admin'` で監査ログを記録する
- Admin は任意のテナントのリソースを操作できるため、`tenantId` をリクエストボディから受け取る
- User は `user.tenantId` を使い、リクエストから `tenantId` を受け取らない
- Repository / Validator / Service は Admin / User で共有する（分離しない）
- **Service の関数内で `actorType` や `role` を見て分岐するのは禁止** — 認証の口の違いは Controller → Usecase で吸収する

---

## まとめ: 各レイヤの一覧表

| レイヤ | 責務 | DB | tx | 例外 | 型の入出力 |
|--------|------|----|----|------|-----------|
| Controller | HTTP ハンドラ + 型変換 | - | - | - | Zod input → Usecase、Model → ResponseDto |
| Usecase | 流れの制御 + tx 管理 | - | 開始 | - | Zod input → Repository、Model を返す |
| Validator | ビジネス検証 | - | - | 投げる | Model を受け取る |
| Service | ビジネス計算・加工 | - | - | 原則なし | Model を受け取り加工結果を返す |
| Repository | DB アクセス + 型変換 | 直接 | 受け取る | - | params → Entity → Model |
| Entity | DB テーブル構造 | - | - | - | Repository 内部のみ |
| Model | ビジネスデータ | - | - | - | Usecase / Validator / Service |
| Zod スキーマ | バリデーション + 入力型 + Swagger 入力定義 | - | - | - | Controller → Usecase |
| Response DTO | レスポンス形式 | - | - | - | Controller のみ |

---

## 認証

### Admin / User 分離

Admin（システム管理者）と User（テナントユーザー）の認証は完全に分離されている。
テーブル・JWT・Cookie・Guard・Controller すべてが別系統。

### グローバル認証ガード

`CompositeAuthGuard` を `main.ts` でグローバルガードとして登録する。パスで振り分ける。

```text
リクエスト
  └─ CompositeAuthGuard
       ├─ /admin/* → AdminAuthGuard → admin_access_token Cookie を検証
       └─ それ以外 → UserAuthGuard  → user_access_token Cookie を検証
```

認証不要なエンドポイントには `@Public()` デコレータで除外する。

### JWT Payload

```typescript
// Admin
interface AdminJwtPayload {
  type: 'admin';
  sub: number;       // admin.id
}

// User
interface UserJwtPayload {
  type: 'user';
  sub: number;       // user.id
  tenantId: number;  // 所属テナント（必須）
  role: UserRole;    // 'tenant_admin' | 'tenant_user'
}

type JwtPayload = AdminJwtPayload | UserJwtPayload;
```

### Cookie 構成

| Cookie 名 | 用途 | 有効期限 | path |
|-----------|------|---------|------|
| `admin_access_token` | Admin アクセストークン | 15 分 | `/` |
| `admin_refresh_token` | Admin リフレッシュトークン | 7 日 | `/admin/auth` |
| `user_access_token` | User アクセストークン | 15 分 | `/` |
| `user_refresh_token` | User リフレッシュトークン | 7 日 | `/auth` |

すべて `httpOnly: true`、`sameSite: 'strict'`。本番環境では `secure: true`。

### DB テーブル

Admin と User は完全に別テーブル。

```text
Admin               ← システム管理者（tenantId なし）
AdminRefreshToken
AdminPasswordReset

User                ← テナントユーザー（tenantId 必須）
UserRefreshToken
UserPasswordReset
```

### 認証に関するファイル配置

| ファイル | 責務 |
|---------|------|
| `auth/admin/admin-auth.controller.ts` | Admin 認証エンドポイント (`/admin/auth`) |
| `auth/admin/admin-auth.usecase.ts` | Admin 認証ロジック |
| `auth/admin/admin-auth.repository.ts` | Admin / AdminRefreshToken / AdminPasswordReset の DB アクセス |
| `auth/user/user-auth.controller.ts` | User 認証エンドポイント (`/auth`) |
| `auth/user/user-auth.usecase.ts` | User 認証ロジック |
| `auth/user/user-auth.repository.ts` | User / UserRefreshToken / UserPasswordReset の DB アクセス |
| `auth/external/composite-auth.guard.ts` | パスベースの認証ガード振り分け |
| `auth/external/admin-auth.guard.ts` | Admin 認証ガード |
| `auth/external/user-auth.guard.ts` | User 認証ガード |
| `auth/decorators/public.decorator.ts` | `@Public()` — 認証不要マーク |
| `auth/decorators/current-user.decorator.ts` | `@CurrentUser()` — JWT ペイロード取得 |

### ルール

- **パスワードは bcrypt でハッシュ化する**（ソルトラウンド: 10）
- **リフレッシュトークンは `crypto.randomBytes(32)` で生成する**
- **トークンリフレッシュ時は古いトークンを削除して新しいトークンを発行する**（トークンローテーション）
- **パスワード変更時は全リフレッシュトークンを削除する**
- **ユーザー列挙を防止する**: パスワードリセット要求は、ユーザーが存在しなくても成功レスポンスを返す
- Admin の Cookie で User のエンドポイントにはアクセスできない（逆も同様）
- `auth/admin/` と `auth/user/` の Repository は Auth モジュール内部でのみ使用する（export しない）

---

## 認可

### CASL によるアビリティベース認可

`@casl/ability` + `@casl/prisma` を使用し、ロールに応じた権限を定義する。

### アビリティ定義

`CaslAbilityFactory.createForUser(user)` で JWT Payload に応じたアビリティを生成する。

| ロール | リソース | 権限 | 条件 |
|--------|---------|------|------|
| Admin | all | manage | なし（全操作可能） |
| `tenant_admin` | Todo, Tag, File, User | manage | `tenantId = user.tenantId` |
| `tenant_admin` | AuditLog | read | `tenantId = user.tenantId` |
| `tenant_admin` | Tenant | read, update | `id = user.tenantId` |
| `tenant_user` | Todo | read, create, update | `tenantId = user.tenantId` |
| `tenant_user` | Tag | read | `tenantId = user.tenantId` |
| `tenant_user` | File | read, create, update | `tenantId = user.tenantId` |
| `tenant_user` | User | read, update | 自分自身のみ (`id = user.sub`) |

### 使い方

認可は 2 段階で適用する。

**1. Controller で `@CheckPolicy()` + `PoliciesGuard`**

エンドポイントレベルでの認可チェック。操作自体が許可されているかを確認する。

```typescript
@Controller('todos')
@UseGuards(PoliciesGuard)
export class TodoController {
  @Get()
  @CheckPolicy((ability) => ability.can('read', 'Todo'))
  async findAll(@CurrentUser() user: JwtPayload) { ... }

  @Delete(':id')
  @CheckPolicy((ability) => ability.can('delete', 'Todo'))
  async remove(@Param('id') id: number) { ... }
}
```

**2. Usecase / Repository で `AppAbility` を使ったデータフィルタリング**

CASL の条件付きルールにより、Repository のクエリレベルでテナント分離を実現する。`@casl/prisma` の `accessibleBy` を使い、Prisma の `where` 句に CASL の条件を自動注入する。

```typescript
// Repository での使用例
async findAll(ability: AppAbility): Promise<TodoModel[]> {
  const entities = await this.prisma.todo.findMany({
    where: accessibleBy(ability).Todo,
    // ...
  });
  return entities.map((e) => this.toModel(e));
}
```

### 認可に関するファイル配置

| ファイル | 責務 |
|---------|------|
| `auth/external/casl-ability.factory.ts` | ロールごとのアビリティ定義 |
| `auth/external/policies.guard.ts` | `@CheckPolicy()` を評価するガード |
| `auth/decorators/check-policy.decorator.ts` | `@CheckPolicy()` デコレータ定義 |

### ルール

- **`CaslAbilityFactory` はロールの追加・権限変更の唯一の変更箇所**
- `PoliciesGuard` は Controller ごとに `@UseGuards(PoliciesGuard)` で適用する（グローバルガードではない）
- `AppAbility` は Controller で生成し、Usecase → Repository に引数として渡す
- **`@Global()` は使わない** — AuthModule を各モジュールの `imports` に明示的に追加する

---

## マルチテナント

### データ分離方式

共有 DB・共有スキーマ方式を採用する。各テーブルに `tenantId` カラムを持ち、CASL の条件付きルール (`{ tenantId: user.tenantId }`) でクエリレベルのフィルタリングを行う。

### テナントスキーマ

```text
Tenants
├── id (PK, autoincrement)
├── name
├── created_at
└── updated_at

Admins                              ← システム管理者（テナントに属さない）
├── id (PK, autoincrement)
├── email (unique)
├── password_hash
├── name
├── created_at
└── updated_at

Users                               ← テナントユーザー
├── id (PK, autoincrement)
├── tenant_id (FK → Tenants.id)     ← 必須（null 不可）
├── role ('tenant_admin' | 'tenant_user')
├── email (unique)
├── password_hash
├── name
├── created_at
└── updated_at
```

### テナント作成フロー

`POST /tenants` はテナントと管理者ユーザーをアトミックに作成する。

```typescript
async create(input: CreateTenantInput): Promise<TenantModel> {
  const passwordHash = await bcrypt.hash(input.admin.password, 10);
  return this.transaction.run(async (tx) => {
    const tenant = await this.tenantRepository.create({ name: input.name }, tx);
    await this.userRepository.create({
      tenantId: tenant.id,
      role: 'tenant_admin',
      email: input.admin.email,
      passwordHash,
      name: input.admin.name,
    }, tx);
    return tenant;
  });
}
```

### テナント分離の仕組み

1. ユーザーがログインすると JWT に `tenantId` が含まれる
2. CASL のアビリティ定義で `{ tenantId: user.tenantId }` の条件を設定
3. Repository で `accessibleBy(ability).Todo` を `where` 句に渡す
4. Prisma が自動的にテナントフィルタ付きの SQL を生成

**意図的にテナント ID をハードコードで指定する処理は書かない。** CASL の条件が自動的にフィルタリングする。

### ルール

- **`tenantId` による手動フィルタリング (`where: { tenantId }`) は禁止** — CASL の `accessibleBy` を使う
- Admin は `Admins` テーブルに保存され、テナントに属さない。CASL で `can('manage', 'all')` を設定するため、全テナントのデータにアクセスできる
- User は必ずテナントに属する（`tenantId` は必須）
- テナント作成は Admin のみ可能
- テナント削除時の関連データ（User, Todo, Tag 等）のカスケード削除は DB 制約に委ねる

---

## レートリミット

`@nestjs/throttler` でリクエスト頻度を制限する。インメモリストアを使用。

### 設定

| 対象 | リクエスト上限 | 期間 |
|------|-------------|------|
| 全エンドポイント（グローバル） | 100 | 60 秒 |
| ログイン（`/admin/auth/login`, `/auth/login`） | 5 | 60 秒 |
| パスワードリセット要求 | 3 | 60 秒 |
| パスワードリセット実行 | 5 | 60 秒 |

### 登録方法

```typescript
// app.module.ts — グローバル設定
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])

// APP_GUARD でグローバルガードとして登録
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]

// auth.controller.ts — エンドポイント単位の上書き
@Throttle({ default: { ttl: 60000, limit: 5 } })
@Post('login')
async login() { ... }
```

### ルール

- 429 レスポンスは `ProblemDetailsFilter` が自動的に RFC 9457 形式に変換する
- IP ベースの制限（デフォルト動作）
- 設定値はハードコード。環境変数化が必要な場合は `ThrottlerModule.forRootAsync` + `ConfigService` に変更する

---

## ヘルスチェック

- `GET /health` — 認証不要（`@Public()`）、レートリミット除外（`@SkipThrottle()`）
- `@nestjs/terminus` を使用
- `PrismaHealthIndicator` で DB 接続確認
- k8s readiness/liveness probe に対応

---

## CORS

- 環境変数 `CORS_ORIGIN` で許可オリジン設定
- カンマ区切りで複数オリジン指定可能
- 未設定時は `origin: true`（リクエストオリジン動的反映、credentials と互換）
- `credentials: true` 固定（Cookie 認証のため）

## ページネーション・ソート・フィルタ

### 共通パターン

一覧取得エンドポイントには共通のページネーション・ソート・フィルタパターンを適用する。

**共通スキーマ** (`src/common/schema/pagination.schema.ts`):

- `paginationSchema` — `page`（デフォルト: 1）、`limit`（デフォルト: 20、最大: 100）
- `sortOrderSchema` — `asc` / `desc`（デフォルト: `desc`）

**レスポンス型** (`src/common/dto/paginated-response.dto.ts`):

- `PaginatedResponseDto<T>` — `{ items: T[], meta: { page, limit, totalItems, totalPages } }`

### limit=0 で全件取得

`limit=0` を指定すると、ページネーションなしで全件を返す。

- Repository は `skip` / `take` を省略する
- `meta` は `{ page: 1, limit: 0, totalItems: N, totalPages: 1 }` を返す

### ドメイン固有のクエリスキーマ

各ドメインの `schema/list-{domain}.schema.ts` に配置する。

```typescript
// 例: src/todo/schema/list-todo.schema.ts
export const listTodoSchema = paginationSchema.extend({
  sortBy: z.enum(['createdAt', 'title']).default('createdAt'),
  sortOrder: sortOrderSchema,
  title: z.string().min(1).optional(),       // 部分一致
  completed: z.enum(['true', 'false']).transform(...).optional(),  // 完全一致
});
```

### 各レイヤの責務

| レイヤ | 責務 |
|--------|------|
| Controller | `@Query(new ZodValidationPipe(schema))` でバリデーション。`PaginatedResponseDto` に変換して返す |
| Usecase | クエリパラメータを Repository に透過する |
| Repository | `where` / `orderBy` / `skip` / `take` を構築。`{ items, totalItems }` を返す |

### 新規ドメインへの適用手順

1. `src/{domain}/schema/list-{domain}.schema.ts` を作成（`paginationSchema.extend(...)` で拡張）
2. Repository の `findAll` に `query` 引数を追加し、`{ items, totalItems }` を返す
3. Usecase の `findAll` にクエリパラメータを透過
4. Controller で `@Query(new ZodValidationPipe(...))` を追加し、`PaginatedResponseDto` で返す
