# 認可（CASL）

## 概要

認証（誰であるか）の後に、認可（何ができるか）を CASL ライブラリで制御する。
Controller でのエンドポイント保護と、Repository での自動データフィルタリングの2層構成。

## 権限の全体像

### Admin（システム管理者）

```typescript
can('manage', 'all')  // 全リソースに対して全操作可能
```

### Tenant Admin（テナント管理者）

```typescript
can('manage', 'Todo',     { tenantId: user.tenantId })
can('manage', 'Tag',      { tenantId: user.tenantId })
can('manage', 'File',     { tenantId: user.tenantId })
can('manage', 'User',     { tenantId: user.tenantId })
can('read',   'AuditLog', { tenantId: user.tenantId })
can('read',   'Tenant',   { id: user.tenantId })
can('update', 'Tenant',   { id: user.tenantId })
```

自テナント内のリソースをすべて管理できる。

### Tenant User（テナント一般ユーザー）

```typescript
can('read',   'Todo', { tenantId: user.tenantId })
can('create', 'Todo', { tenantId: user.tenantId })
can('update', 'Todo', { tenantId: user.tenantId })
can('read',   'Tag',  { tenantId: user.tenantId })
can('read',   'File', { tenantId: user.tenantId })
can('create', 'File', { tenantId: user.tenantId })
can('update', 'File', { tenantId: user.tenantId })
can('read',   'User', { id: user.sub })      // 自分だけ
can('update', 'User', { id: user.sub })      // 自分だけ
```

自テナント内で読み書きできるが、削除はできない。User は自分のレコードのみ。

## 使い方

### 1. Controller でエンドポイントを保護

```typescript
import { CheckPolicy } from '../auth/decorators/check-policy.decorator';

@Get()
@CheckPolicy((ability) => ability.can('read', 'Product'))
async findAll() { ... }

@Post()
@CheckPolicy((ability) => ability.can('create', 'Product'))
async create() { ... }

@Delete(':id')
@CheckPolicy((ability) => ability.can('delete', 'Product'))
async remove() { ... }
```

`@CheckPolicy()` が `false` を返すと 403 Forbidden になる。
これはエンドポイントレベルの「入口チェック」。

### 2. Repository でデータを自動フィルタリング

```typescript
import { accessibleBy } from '@casl/prisma';

async findAll(ability: AppAbility, query: FindAllQuery) {
  const where = {
    ...accessibleBy(ability).Product,  // ← CASL の条件が自動注入される
    deletedAt: null,
  };

  const [items, totalItems] = await Promise.all([
    this.prisma.product.findMany({ where, skip, take, orderBy }),
    this.prisma.product.count({ where }),
  ]);
  return { items, totalItems };
}
```

`accessibleBy(ability).Product` は、ユーザーの権限に応じた WHERE 条件を自動生成する。

- Admin → 条件なし（全件）
- Tenant Admin → `{ tenantId: user.tenantId }`
- Tenant User → `{ tenantId: user.tenantId }`

これにより、他テナントのデータが返されることを防ぐ。

### 2層チェックの役割分担

| 層 | 役割 | 例 |
|----|------|-----|
| Controller（`@CheckPolicy`） | そもそもその操作を許可するか | User は Todo を削除できない |
| Repository（`accessibleBy`） | アクセス可能なデータに絞る | User は自テナントの Todo のみ取得 |

## 新しいリソースの権限を追加する

### 1. `casl-ability.factory.ts` を編集

```typescript
// src/auth/external/casl-ability.factory.ts

// 1. subjects に追加
type Subjects =
  | 'Todo'
  | 'Tag'
  | 'Product'  // ← 追加
  | 'all';

// 2. 各ロールに権限を追加

// Admin — 'manage', 'all' なので追加不要

// Tenant Admin
case 'tenant_admin':
  can('manage', 'Product', { tenantId: user.tenantId });  // ← 追加
  break;

// Tenant User
case 'tenant_user':
  can('read', 'Product', { tenantId: user.tenantId });    // ← 追加
  can('create', 'Product', { tenantId: user.tenantId });  // ← 追加
  break;
```

### 2. Controller に `@CheckPolicy` を追加

```typescript
@CheckPolicy((ability) => ability.can('read', 'Product'))
```

### 3. Repository に `accessibleBy` を追加

```typescript
const where = {
  ...accessibleBy(ability).Product,
  deletedAt: null,
};
```

### scaffold を使う場合

`yarn scaffold` で生成すると、上記の設定が自動的に注入される（Hygen のマーカーコメント経由）。

## 操作の種類

CASL で使える操作（action）：

| 操作 | 意味 |
|------|------|
| `read` | 読み取り（一覧・詳細） |
| `create` | 作成 |
| `update` | 更新 |
| `delete` | 削除 |
| `manage` | 上記すべて |

## 注意事項

- `@CheckPolicy()` がないエンドポイントは認可チェックなし（認証のみ）
- `@UseGuards(PoliciesGuard)` をコントローラーに付ける必要がある
- `accessibleBy()` の Subject 名は Prisma モデル名ではなく、CASL の Subjects に定義した文字列
- 条件は `{ tenantId: ... }` のようなオブジェクトで指定する。Prisma の WHERE 句に変換される
