# 監査ログ

## 概要

リソースの作成・更新・削除を記録する。誰が・いつ・何を・どう変えたかを追跡できる。

## データ構造

| フィールド | 型 | 説明 |
|-----------|------|------|
| `tenantId` | `ResourceId` | 対象リソースのテナント |
| `actorType` | `string` | 操作者の種別（`'user'` / `'admin'`） |
| `actorId` | `ResourceId` | 操作者の ID |
| `action` | `string` | 操作種別（`'create'` / `'update'` / `'delete'`） |
| `resourceType` | `string` | リソース名（`'Todo'` / `'Tag'` 等） |
| `resourceId` | `ResourceId` | 対象リソースの ID |
| `before` | `object \| null` | 変更前のスナップショット |
| `after` | `object \| null` | 変更後のスナップショット |

## 使い方

### 1. Usecase に `AuditLogRepository` を注入

```typescript
import { AuditLogRepository } from '../audit-log/external/audit-log.repository';

@Injectable()
export class ProductUsecase {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    // ...
  ) {}
}
```

`AuditLogModule` を自モジュールの `imports` に追加すること。

### 2. 作成時

```typescript
async create(dto, tenantId: ResourceId, userId: ResourceId) {
  return this.transaction.run(async (tx) => {
    const product = await this.repository.create({ ...dto, tenantId }, tx);

    await this.auditLogRepository.create(
      {
        tenantId,
        actorType: 'user',
        actorId: userId,
        action: 'create',
        resourceType: 'Product',
        resourceId: product.id,
        before: null,
        after: product.toAuditSnapshot(),
      },
      tx,
    );

    return product;
  });
}
```

### 3. 更新時

```typescript
async update(id: ResourceId, dto, tenantId: ResourceId, userId: ResourceId, ability) {
  return this.transaction.run(async (tx) => {
    const original = await this.repository.findById(id, ability);
    this.validator.ensureExists(original, id);

    const updated = original.withUpdate(dto.name);
    const result = await this.repository.update(id, updated, tx);

    await this.auditLogRepository.create(
      {
        tenantId,
        actorType: 'user',
        actorId: userId,
        action: 'update',
        resourceType: 'Product',
        resourceId: id,
        before: original.toAuditSnapshot(),
        after: result.toAuditSnapshot(),
      },
      tx,
    );

    return result;
  });
}
```

### 4. 削除時

```typescript
async remove(id: ResourceId, userId: ResourceId, ability) {
  return this.transaction.run(async (tx) => {
    const product = await this.repository.findById(id, ability);
    this.validator.ensureExists(product, id);

    const result = await this.repository.delete(id, tx);

    await this.auditLogRepository.create(
      {
        tenantId: product.tenantId,
        actorType: 'user',
        actorId: userId,
        action: 'delete',
        resourceType: 'Product',
        resourceId: id,
        before: product.toAuditSnapshot(),
        after: null,
      },
      tx,
    );

    return result;
  });
}
```

## Admin の場合

`actorType` を `'admin'` にする。

```typescript
await this.auditLogRepository.create(
  {
    tenantId,
    actorType: 'admin',
    actorId: adminId,
    action: 'create',
    resourceType: 'Product',
    resourceId: product.id,
    before: null,
    after: product.toAuditSnapshot(),
  },
  tx,
);
```

## `toAuditSnapshot()` の実装

Model に追跡したいフィールドだけを返すメソッドを定義する。

```typescript
// product.model.ts
toAuditSnapshot(): Record<string, unknown> {
  return {
    id: this.id,
    name: this.name,
    price: this.price,
  };
}
```

全フィールドを含める必要はない。変更を追跡したいフィールドだけでよい。

## 注意事項

- 監査ログの記録は必ずトランザクション内で行う（`tx` を渡す）
- scaffold で生成されるコードには監査ログが組み込み済み
- 監査ログ自体の更新・削除は不可（追記のみ）
