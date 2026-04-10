import { CsvExportService, ExportColumn } from './csv-export.service';

describe('CsvExportService', () => {
  let service: CsvExportService;

  beforeEach(() => {
    service = new CsvExportService();
  });

  interface TestRow {
    id: number;
    name: string;
  }

  const columns: ExportColumn<TestRow>[] = [
    { header: 'ID', accessor: (r) => r.id },
    { header: '名前', accessor: (r) => r.name },
  ];

  it('UTF-8 BOM付きCSVを生成する', () => {
    const rows: TestRow[] = [{ id: 1, name: 'テスト' }];
    const buffer = service.generate(columns, rows);
    const csv = buffer.toString('utf-8');

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('ID,名前');
    expect(csv).toContain('1,テスト');
  });

  it('カンマを含む値をダブルクォートで囲む', () => {
    const rows: TestRow[] = [{ id: 1, name: 'foo,bar' }];
    const buffer = service.generate(columns, rows);
    const csv = buffer.toString('utf-8');

    expect(csv).toContain('"foo,bar"');
  });

  it('ダブルクォートを含む値をエスケープする', () => {
    const rows: TestRow[] = [{ id: 1, name: 'say "hello"' }];
    const buffer = service.generate(columns, rows);
    const csv = buffer.toString('utf-8');

    expect(csv).toContain('"say ""hello"""');
  });

  it('null値を空文字として出力する', () => {
    const nullColumns: ExportColumn<{ value: string | null }>[] = [
      { header: 'Value', accessor: (r) => r.value },
    ];
    const rows = [{ value: null }];
    const buffer = service.generate(nullColumns, rows);
    const csv = buffer.toString('utf-8');

    expect(csv).toBe('\uFEFFValue\r\n\r\n');
  });
});
