# PDF エクスポートの実装方法

## 概要

`PdfExportService` を使って、一覧データを PDF テーブルとしてエクスポートする。
pdfmake ライブラリを使用。

## 既存のエクスポート実装例

TODO モジュールの PDF エクスポートを例に説明する。

## 手順

### 1. エクスポート用スキーマを定義

```typescript
// src/{name}/schema/export-{name}.schema.ts
import { z } from 'zod';

export const exportProductSchema = z.object({
  sortBy: z.enum(['createdAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  name: z.string().optional(),  // フィルター条件
});

export type ExportProductInput = z.infer<typeof exportProductSchema>;
```

### 2. Usecase に全件取得メソッドを追加

```typescript
// src/{name}/{name}.usecase.ts
async findAllForExport(
  ability: AppAbility,
  input: ExportProductInput,
): Promise<ProductModel[]> {
  const query: FindAllQuery = {
    page: 1,
    limit: 0,  // 0 = 全件取得
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    name: input.name,
  };
  const { items } = await this.repository.findAll(ability, query);
  return items;
}
```

### 3. Controller にエンドポイントを追加

```typescript
import { Res, StreamableFile } from '@nestjs/common';
import { ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfExportService } from '../common/services/pdf-export.service';
import { ExportColumn } from '../common/services/csv-export.service';

// コンストラクタに追加
constructor(
  private readonly pdfExportService: PdfExportService,
  // ...
) {}

@Get('export/pdf')
@ApiProduces('application/pdf')
@ApiResponse({ status: 200, description: '商品一覧PDFエクスポート' })
@CheckPolicy((ability) => ability.can('read', 'Product'))
async exportPdf(
  @Query(new ZodValidationPipe(exportProductSchema)) query: ExportProductInput,
  @CurrentUser() user: UserJwtPayload,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const ability = this.caslAbilityFactory.createForUser(user);
  const products = await this.productUsecase.findAllForExport(ability, query);

  const buffer = await this.pdfExportService.generate(
    '商品一覧',
    this.exportColumns(),
    products,
  );

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="products.pdf"',
  });

  return new StreamableFile(buffer);
}

private exportColumns(): ExportColumn<ProductModel>[] {
  return [
    { header: 'ID', accessor: (p) => p.id },
    { header: '商品名', accessor: (p) => p.name },
    { header: '価格', accessor: (p) => p.price },
    { header: '作成日時', accessor: (p) => p.createdAt },
  ];
}
```

## カラム定義

```typescript
export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | Date | null | undefined;
};
```

- `header` — PDF テーブルのヘッダー行に表示するラベル
- `accessor` — 各行からセルの値を取り出す関数

値の変換が必要な場合は accessor 内で行う：

```typescript
{ header: 'ステータス', accessor: (p) => p.active ? '有効' : '無効' }
{ header: 'タグ', accessor: (p) => p.tags.map(t => t.name).join(', ') }
```

## 注意事項

- `PdfExportService` は `CommonModule` に含まれているため、追加の import は不要
- エクスポートエンドポイントは `GET /:id` より前に定義すること（ルートの競合を避けるため）
- `@Res({ passthrough: true })` を必ず指定する（NestJS のレスポンス処理を維持するため）
- Date 型は自動的に ISO 文字列に変換される
