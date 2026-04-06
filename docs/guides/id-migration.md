# ID 型の変更（ULID / UUID 対応）

## 概要

本プロジェクトでは、すべての ID 型を `ResourceId` として一元管理している。
現在は `number`（連番）だが、ULID や UUID に切り替える場合の手順をまとめる。

## 現在の定義

```typescript
// src/common/types/id.type.ts
import { ParseIntPipe } from '@nestjs/common';
import { z } from 'zod';

export type ResourceId = number;
export const ParseIdPipe = ParseIntPipe;
export const zodId = () => z.coerce.number().int().positive();
```

- `ResourceId` — 全モデル・DTO・Usecase・Repository のID型
- `ParseIdPipe` — コントローラーのパスパラメータ検証
- `zodId()` — リクエストボディの Zod バリデーション

## ULID に変更する手順

### 1. ライブラリ追加

```bash
yarn add ulidx
```

### 2. `src/common/types/id.type.ts` を変更

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export type ResourceId = string;

@Injectable()
export class ParseIdPipe implements PipeTransform<string, ResourceId> {
  transform(value: string): ResourceId {
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(value)) {
      throw new BadRequestException('Invalid ULID format');
    }
    return value;
  }
}

export const zodId = () => z.string().ulid();
```

この1ファイルの変更で、全コントローラー・全スキーマ・全モデルの型が `string` に切り替わる。

### 3. Prisma スキーマの変更

全5ファイル（`prisma/schema.prisma` + `prisma/schemas/schema.*.prisma`）で、ID カラムを変更する。

```diff
model Todo {
-  id        Int      @id @default(autoincrement())
-  tenantId  Int
+  id        String   @id @db.VarChar(26)
+  tenantId  String   @db.VarChar(26)
}
```

すべてのテーブルの `id`、`tenantId`、FK カラム（`userId`、`tagId` 等）を同様に変更する。

### 4. Repository の `create` に ULID 生成を追加

```typescript
import { ulid } from 'ulidx';

async create(params, tx) {
  const client = tx ?? this.prisma;
  const record = await client.todo.create({
    data: {
      id: ulid(),  // ← 追加
      ...params,
    },
  });
  return this.toModel(record);
}
```

各 Repository の `create` メソッドに `id: ulid()` を追加する。

### 5. scaffold テンプレートの更新

`_templates/domain/new/05-repository.ejs.t` の `create` メソッドに `id: ulid()` を追加する。

### 6. マイグレーション

```bash
# 開発環境（データリセット可）
make db-push && make db-generate && make db-seed

# 本番環境
yarn prisma migrate dev --name ulid-migration
# 既存データの変換スクリプトを別途用意する
```

## UUID に変更する場合

手順は ULID と同じ。差分のみ記載する。

### `id.type.ts`

```typescript
import { ParseUUIDPipe } from '@nestjs/common';
import { z } from 'zod';

export type ResourceId = string;
export const ParseIdPipe = new ParseUUIDPipe({ version: '4' });
export const zodId = () => z.string().uuid();
```

NestJS 組み込みの `ParseUUIDPipe` がそのまま使える。

### Prisma スキーマ

```prisma
id  String  @id @default(uuid()) @db.VarChar(36)
```

UUID の場合、Prisma の `@default(uuid())` が使えるため、Repository 側での生成は不要。

## 変更が不要なファイル

`ResourceId` 経由で型が伝播するため、以下は変更不要：

- 全コントローラー（`ParseIdPipe` 経由で自動対応）
- 全 Usecase（`ResourceId` 型のまま）
- 全モデル・DTO（`ResourceId` 型のまま）
- Zod スキーマ（`zodId()` 経由で自動対応）
