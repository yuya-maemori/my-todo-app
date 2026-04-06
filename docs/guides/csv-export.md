# CSV エクスポートの実装方法

## 概要

`CsvExportService` を使って、一覧データを CSV ファイルとしてエクスポートする。
Excel での文字化けを防ぐため、UTF-8 BOM 付きで出力する。

## 手順

### 1. エクスポート用スキーマを定義

PDF エクスポートと共通のスキーマを使える。

```typescript
// src/{name}/schema/export-{name}.schema.ts
import { z } from 'zod';

export const exportProductSchema = z.object({
  sortBy: z.enum(['createdAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  name: z.string().optional(),
});

export type ExportProductInput = z.infer<typeof exportProductSchema>;
```

### 2. Usecase に全件取得メソッドを追加

PDF と同じメソッドを共用する。

```typescript
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
import { CsvExportService, ExportColumn } from '../common/services/csv-export.service';

// コンストラクタに追加
constructor(
  private readonly csvExportService: CsvExportService,
  // ...
) {}

@Get('export/csv')
@ApiProduces('text/csv')
@ApiResponse({ status: 200, description: '商品一覧CSVエクスポート' })
@CheckPolicy((ability) => ability.can('read', 'Product'))
async exportCsv(
  @Query(new ZodValidationPipe(exportProductSchema)) query: ExportProductInput,
  @CurrentUser() user: UserJwtPayload,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const ability = this.caslAbilityFactory.createForUser(user);
  const products = await this.productUsecase.findAllForExport(ability, query);

  const buffer = this.csvExportService.generate(
    this.exportColumns(),
    products,
  );

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="products.csv"',
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

## PDF と CSV のカラム定義を共通化

同じ `exportColumns()` メソッドを PDF と CSV の両方で使える。

```typescript
@Get('export/csv')
async exportCsv(...) {
  const buffer = this.csvExportService.generate(this.exportColumns(), products);
  // ...
}

@Get('export/pdf')
async exportPdf(...) {
  const buffer = await this.pdfExportService.generate('商品一覧', this.exportColumns(), products);
  // ...
}

// 共通のカラム定義
private exportColumns(): ExportColumn<ProductModel>[] {
  return [
    { header: 'ID', accessor: (p) => p.id },
    { header: '商品名', accessor: (p) => p.name },
    // ...
  ];
}
```

## CSV の仕様

| 項目 | 値 |
|------|-----|
| 文字コード | UTF-8（BOM 付き） |
| 改行コード | CRLF（`\r\n`） |
| 区切り文字 | カンマ（`,`） |
| エスケープ | ダブルクォート（値にカンマ・改行・引用符を含む場合） |
| null / undefined | 空文字 |
| Date | ISO 8601 文字列 |
| boolean | `true` / `false` |

## 注意事項

- `CsvExportService` は `CommonModule` に含まれているため、追加の import は不要
- エクスポートエンドポイントは `GET /:id` より前に定義すること
- `@Res({ passthrough: true })` を必ず指定する
- CSV の `generate()` は同期メソッド（`await` 不要）、PDF は非同期（`await` 必要）
