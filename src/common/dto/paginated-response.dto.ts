import { ApiProperty } from '@nestjs/swagger';

/**
 * ページネーション付きレスポンス
 *
 * すべての一覧 API （/todos, /tags, /users など）は
 * 同じレスポンス形式でデータ + メタデータを返す。
 *
 * 【ジェネリック型 T を使う理由】
 * - 同じ形式でどんなデータにも対応
 * - items: TodoResponseDto[]
 * - items: TagResponseDto[]
 * など、型安全に書ける
 */
export class PaginatedResponseDto<T> {
  /**
   * このページに含まれるデータの配列。
   * 例：10 件取得なら、長さ 10 の配列
   */
  @ApiProperty({
    description: 'このページのアイテム配列',
    isArray: true,
  })
  items: T[];

  /**
   * 全件数（フィルタ前）
   * Prisma の count() で取得した値をそのまま返す
   */
  @ApiProperty({
    description: '条件にマッチしたアイテム総数',
    example: 150,
  })
  totalItems: number;

  /**
   * 全ページ数
   * 計算式: Math.ceil(totalItems / limit)
   */
  @ApiProperty({
    description: '全ページ数',
    example: 15,
  })
  totalPages: number;

  /**
   * 現在のページ番号
   * リクエストで指定された page パラメータ
   */
  @ApiProperty({
    description: '現在のページ番号',
    example: 2,
  })
  currentPage: number;

  constructor(
    items: T[],
    totalItems: number,
    totalPages: number,
    currentPage: number,
  ) {
    this.items = items;
    this.totalItems = totalItems;
    this.totalPages = totalPages;
    this.currentPage = currentPage;
  }
}
