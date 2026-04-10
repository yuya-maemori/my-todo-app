import { Injectable } from '@nestjs/common';
import { CsvExportService, ExportColumn } from '../../common/services/csv-export.service';
import { TodoModel } from '../todo.model';

/**
 * Todo CSV エクスポート Service
 *
 * CsvExportService を使用して、Todo 固有の CSV エクスポート機能を提供します。
 *
 * 【役割分担】
 * - CsvExportService（汎用）→ CSV 生成ロジック（エスケープ、BOM など）
 * - TodoCsvExportService（固有）→ Todo のカラム定義、データ変換
 *
 * 【なぜ external/ に置くのか】
 * - 純粋に「CSV 生成」という再利用可能な機能
 * - 将来 PDF エクスポートが出た時も、同じ Service を使える可能性がある
 * - 他モジュールから利用される可能性がある
 */
@Injectable()
export class TodoCsvExportService {
  constructor(private csvExport: CsvExportService) {}

  /**
   * Todo 一覧を CSV Buffer に変換
   *
   * @param todos 出力対象の Todo 配列
   * @returns UTF-8 BOM 付きの CSV Buffer
   *
   * 【出力形式】
   * ID,タイトル,完了,タグ,作成日時,更新日時
   * 1,買物,false,"緊急",2026-04-10T04:51:03.452Z,2026-04-10T04:51:03.452Z
   * 2,ミーティング,true,,2026-04-09T10:00:00.000Z,2026-04-09T12:00:00.000Z
   *
   * 【ポイント】
   * - tags は JSON 文字列に変換（Excel で見やすく）
   * - completed は boolean を文字列化
   * - 日付は ISO 8601 形式で統一
   */
  exportToCsv(todos: TodoModel[]): Buffer {
    // ① TodoModel 用のカラム定義
    const columns: ExportColumn<TodoModel>[] = [
      {
        header: 'ID',
        accessor: (row) => row.id,
      },
      {
        header: 'タイトル',
        accessor: (row) => row.title,
      },
      {
        header: '完了',
        accessor: (row) => row.completed,
      },
      {
        header: 'タグ',
        accessor: (row) => {
          // tags 配列を JSON 文字列に変換
          // 例: [{"id":1,"name":"緊急"}] → JSON 文字列
          if (row.tags.length === 0) {
            return '';
          }
          return JSON.stringify(row.tags);
        },
      },
      {
        header: '作成日時',
        accessor: (row) => row.createdAt,
      },
      {
        header: '更新日時',
        accessor: (row) => row.updatedAt,
      },
    ];

    // ② CsvExportService で生成
    return this.csvExport.generate(columns, todos);
  }
}
