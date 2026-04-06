# scaffold（ドメイン生成）

## 概要

Hygen を使って、ドメインモジュールの全ファイルを一括生成する。

## コマンド

```bash
yarn scaffold --name <ドメイン名> --fields "<フィールド定義>"
```

### 例

```bash
yarn scaffold --name product --fields "name:string,price:number,active:boolean"
```

### オプション

| オプション | 説明 | デフォルト |
|-----------|------|----------|
| `--name` | ドメイン名（小文字、単数形） | 必須 |
| `--fields` | フィールド定義（カンマ区切り） | 必須 |
| `--hardDelete` | 物理削除にする | false（論理削除） |

### フィールド型

| 型 | TypeScript | Prisma | Zod (create) |
|------|-----------|--------|-------------|
| `string` | `string` | `String` | `z.string().min(1)` |
| `number` | `number` | `Int` | `z.coerce.number().int()` |
| `boolean` | `boolean` | `Boolean @default(false)` | `z.boolean().default(false)` |

## 生成されるファイル

```
src/{name}/
  {name}.model.ts              ← ドメインモデル（不変オブジェクト）
  {name}.usecase.ts            ← ユーザー向け Usecase
  admin-{name}.usecase.ts      ← 管理者向け Usecase
  {name}.controller.ts         ← ユーザー向け Controller
  admin-{name}.controller.ts   ← 管理者向け Controller
  {name}.repository.ts         ← Repository
  {name}.validator.ts          ← バリデーター
  {name}.module.ts             ← NestJS モジュール
  dto/
    {name}-response.dto.ts     ← レスポンス DTO
  schema/
    create-{name}.schema.ts    ← 作成スキーマ
    update-{name}.schema.ts    ← 更新スキーマ
    list-{name}.schema.ts      ← 一覧取得スキーマ
    admin-create-{name}.schema.ts ← 管理者用作成スキーマ（tenantId 付き）
    index.ts                   ← スキーマ re-export
```

## 自動注入

scaffold 実行時、以下のファイルに自動でコードが注入される：

| ファイル | 注入内容 |
|---------|---------|
| `prisma/schema.prisma` | Prisma モデル定義 |
| `src/auth/external/casl-ability.factory.ts` | CASL の ability 定義 |
| `src/app.module.ts` | モジュール import と登録 |

## 生成後にやること

1. **Prisma スキーマの同期** — 残り3つの DB バリアント（`prisma/schemas/schema.*.prisma`）に同じモデルを追加
2. **DB 反映** — `make db-push && make db-generate`
3. **ビジネスロジックの追加** — Validator にドメイン固有のバリデーションを追加
4. **リレーションの追加** — 他テーブルとのリレーションがあれば Prisma スキーマと Repository を修正
5. **テストの追加** — Validator / Usecase のテストを作成

## 生成コードの特徴

### Model

- 全フィールド `readonly`（イミュータブル）
- `toAuditSnapshot()` — 監査ログ用のスナップショット返却
- `withUpdate()` — 更新済みの新しいインスタンスを返す

### Usecase

- `TransactionService` でトランザクション管理
- 作成・更新・削除時に監査ログを自動記録
- CASL ability による認可チェック

### Controller

- `@CheckPolicy()` でエンドポイントごとの権限チェック
- `ZodValidationPipe` でリクエストバリデーション
- `ParseIdPipe` でパスパラメータの型変換

### Repository

- `accessibleBy(ability)` でテナント・権限フィルタリング
- 論理削除時は `deletedAt IS NULL` の WHERE 条件が自動付与
- ページネーション対応（`limit: 0` で全件取得）
