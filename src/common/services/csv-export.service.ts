import { Injectable } from '@nestjs/common';

/**
 * CSV 出力用のカラム定義
 *
 * @template T 出力対象のデータ型
 *
 * 使い方：
 * const columns: ExportColumn<TodoModel>[] = [
 *   { header: 'ID', accessor: (row) => row.id },
 *   { header: 'タイトル', accessor: (row) => row.title },
 * ];
 */
export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean | Date | null | undefined;
};

const BOM = '\uFEFF';

/**
 * CSV エクスポート Service
 *
 * CSV ファイルを汎用的に生成します。
 * どのモデルでも利用可能な共通ロジック。
 *
 * 【実装ポイント】
 * - BOM（Byte Order Mark）を付与 → Excel で日本語が文字化けしない
 * - escapeField で CSV の仕様に従ったエスケープ処理
 *   - カンマ、引用符、改行を含むフィールドを適切にハンドル
 * - formatValue で各型を適切に文字列化
 *   - Date は ISO 8601 形式
 *   - null/undefined は空文字列
 */
@Injectable()
export class CsvExportService {
  /**
   * CSV を生成して Buffer で返す
   *
   * @param columns カラム定義（header + accessor 関数）
   * @param rows 出力対象のデータ配列
   * @returns UTF-8 BOM 付きの CSV Buffer
   *
   * 【使用例】
   * const columns = [
   *   { header: 'ID', accessor: (t) => t.id },
   *   { header: 'タイトル', accessor: (t) => t.title },
   * ];
   * const buffer = this.cvsService.generate(columns, todos);
   */
  generate<T>(columns: ExportColumn<T>[], rows: T[]): Buffer {
    // ① ヘッダ行を生成
    const header = columns
      .map((c) => this.escapeField(c.header))
      .join(',');

    // ② データ行を生成
    const body = rows.map((row) =>
      columns
        .map((col) => this.escapeField(this.formatValue(col.accessor(row))))
        .join(','),
    );

    // ③ BOM を付与 + 改行で完成
    const csv = BOM + [header, ...body].join('\r\n') + '\r\n';

    // ④ Buffer に変換
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * 各型を CSV 用の文字列に変換
   *
   * @param value 値（日本語対応）
   * @returns CSV フィールド値
   *
   * 【ポイント】
   * - Date の場合は ISO 8601（2026-04-10T05:00:00.000Z）
   * - boolean は "true" / "false" 文字列
   * - null/undefined は空文字列
   */
  private formatValue(
    value: string | number | boolean | Date | null | undefined,
  ): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  /**
   * CSV フィールドをエスケープ
   *
   * @param value フィールド値（日本語対応）
   * @returns エスケープ済みの値
   *
   * 【CSV 仕様】
   * - カンマを含む → 引用符で囲む
   * - 引用符を含む → 2 個に変換（"" に）して引用符で囲む
   * - 改行を含む → 引用符で囲む
   *
   * 【例】
   * "Alice,Bob" → "\"Alice,Bob\"" （カンマ対応）
   * "Mr. \"Boss\"" → "\"Mr. \"\"Boss\"\"\"" （引用符対応）
   */
  private escapeField(value: string): string {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
