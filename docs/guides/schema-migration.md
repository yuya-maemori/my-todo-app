# テーブル・カラムの追加と反映

## 概要

Prisma スキーマを変更した後、DB とアプリケーションに反映するまでの手順。

## 前提知識

```
prisma/
  schema.prisma                    ← アクティブなスキーマ（これを DB に適用）
  schemas/
    schema.postgresql.prisma       ← PostgreSQL 用の控え
    schema.mysql.prisma            ← MySQL 用の控え
    schema.sqlserver.prisma        ← SQL Server 用の控え
    schema.sqlite.prisma           ← SQLite 用の控え
```

`prisma/schema.prisma` が実際に使われるファイル。
`prisma/schemas/` 配下は DB プロバイダ切り替え時の控え。

## カラムを追加する

### 例：Todo に `priority` カラムを追加

#### 1. スキーマを編集

```prisma
// prisma/schema.prisma
model Todo {
  id        Int      @id @default(autoincrement())
  tenantId  Int
  title     String   @db.VarChar(255)
  completed Boolean  @default(false)
  priority  Int      @default(0)          // ← 追加
  // ...
}
```

#### 2. DB に反映

```bash
# ローカル（Docker 環境）
make db-push        # スキーマを DB に反映
make db-generate    # コンテナ内の Prisma Client を再生成
```

#### 3. アプリケーションコードを修正

```typescript
// Model にフィールド追加
export class TodoModel {
  readonly priority: number;
  // ...
}

// Repository の toModel() を修正
private toModel(record): TodoModel {
  return new TodoModel({
    priority: record.priority,
    // ...
  });
}

// 必要に応じて DTO、スキーマも修正
```

## テーブルを追加する

### scaffold を使う場合（推奨）

```bash
yarn scaffold --name product --fields "name:string,price:number,active:boolean"
```

これで Model、DTO、Schema、Repository、Usecase、Controller、Module が一括生成される。
Prisma スキーマへの注入も自動で行われる。

生成後：

```bash
# 1. DB に反映
make db-push
make db-generate

# 2. 控えのスキーマに同じモデルを追加
# prisma/schemas/ 配下の4ファイルを編集

# 3. シードデータがあれば追加
# prisma/seed.ts を編集
make db-seed
```

### 手動で追加する場合

#### 1. Prisma スキーマにモデルを追加

```prisma
model Invoice {
  id        Int      @id @default(autoincrement())
  tenantId  Int
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  amount    Int
  status    String   @db.VarChar(50)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
}
```

Tenant モデルにもリレーションを追加：

```prisma
model Tenant {
  // ...
  invoices Invoice[]
}
```

#### 2. DB に反映

```bash
make db-push
make db-generate
```

#### 3. アプリケーションコードを作成

RULES.md に従い、以下のファイルを作成する：

- `src/invoice/invoice.model.ts`
- `src/invoice/invoice.repository.ts`
- `src/invoice/invoice.usecase.ts`
- `src/invoice/invoice.controller.ts`
- `src/invoice/invoice.validator.ts`
- `src/invoice/invoice.module.ts`
- `src/invoice/dto/invoice-response.dto.ts`
- `src/invoice/schema/`

#### 4. CASL に権限を追加

`src/auth/external/casl-ability.factory.ts` の Subjects と各ロールの権限を追加する。
詳細は [認可ガイド](./authorization.md) を参照。

#### 5. AppModule に登録

```typescript
// src/app.module.ts
import { InvoiceModule } from './invoice/invoice.module';

@Module({
  imports: [
    // ...
    InvoiceModule,
  ],
})
export class AppModule {}
```

## リレーションを追加する

### 1対多

```prisma
// 親テーブル
model Invoice {
  id    Int           @id @default(autoincrement())
  items InvoiceItem[]
}

// 子テーブル
model InvoiceItem {
  id        Int     @id @default(autoincrement())
  invoiceId Int
  invoice   Invoice @relation(fields: [invoiceId], references: [id])

  @@index([invoiceId])
}
```

### 多対多（中間テーブル）

```prisma
model TodoTag {
  todoId Int
  tagId  Int
  todo   Todo @relation(fields: [todoId], references: [id])
  tag    Tag  @relation(fields: [tagId], references: [id])

  @@id([todoId, tagId])
}
```

中間テーブルの操作は集約ルート側の Repository が行う（専用 Repository は作らない）。

## make コマンド一覧

| コマンド | 説明 |
|---------|------|
| `make db-push` | スキーマを DB に反映（`prisma db push`） |
| `make db-generate` | コンテナ内で Prisma Client を再生成 |
| `make db-seed` | シードデータを投入（`prisma db seed`） |
| `make db-login` | DB の CLI にログイン |

## よくあるトラブル

### コンテナ再起動後にエラーが出る

```bash
make db-generate
```

Docker の anonymous volume（`/app/node_modules`）により、ホスト側の `prisma generate` がコンテナに反映されない。`make db-generate` でコンテナ内の Prisma Client を更新する。

### カラム追加後にビルドエラー

Prisma Client の型が古い可能性がある。

```bash
yarn prisma generate   # ホスト側
make db-generate       # Docker 側
``` 