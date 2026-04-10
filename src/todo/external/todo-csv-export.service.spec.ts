import { Test, TestingModule } from '@nestjs/testing';
import { TodoCsvExportService } from './todo-csv-export.service';
import { CsvExportService } from '../../common/services/csv-export.service';
import { TodoModel } from '../todo.model';

describe('TodoCsvExportService', () => {
  let service: TodoCsvExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TodoCsvExportService, CsvExportService],
    }).compile();

    service = module.get<TodoCsvExportService>(TodoCsvExportService);
  });

  describe('exportToCsv', () => {
    it('Todo を CSV Buffer に変換する', () => {
      const todos: TodoModel[] = [
        new TodoModel({
          id: 1,
          title: '買い物',
          completed: false,
          createdAt: new Date('2026-04-10T04:51:03.452Z'),
          updatedAt: new Date('2026-04-10T04:51:03.452Z'),
          tags: [{ id: 1, name: '緊急' }],
        }),
      ];

      const buffer = service.exportToCsv(todos);
      const csv = buffer.toString('utf-8');

      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('ID,タイトル,完了,タグ,作成日時,更新日時');
      expect(csv).toContain('買い物');
      // JSON は。CSV でエスケープされるため、ダブルクォートが "" に変換される
      expect(csv).toContain('"[{""id"":1,""name"":""緊急""}]"');
    });

    it('タグのない Todo をエクスポートする', () => {
      const todos: TodoModel[] = [
        new TodoModel({
          id: 2,
          title: 'Learn NestJS',
          completed: false,
          createdAt: new Date('2026-04-09T03:56:00.985Z'),
          updatedAt: new Date('2026-04-09T03:56:00.985Z'),
          tags: [],
        }),
      ];

      const buffer = service.exportToCsv(todos);
      const csv = buffer.toString('utf-8');

      expect(csv).toContain('Learn NestJS,false,,2026-04-09T03:56:00.985Z');
    });

    it('複数の Todo をエクスポートする', () => {
      const todos: TodoModel[] = [
        new TodoModel({
          id: 1,
          title: '買い物',
          completed: false,
          createdAt: new Date('2026-04-10T04:51:03.452Z'),
          updatedAt: new Date('2026-04-10T04:51:03.452Z'),
          tags: [],
        }),
        new TodoModel({
          id: 2,
          title: 'Learn NestJS',
          completed: false,
          createdAt: new Date('2026-04-09T03:56:00.985Z'),
          updatedAt: new Date('2026-04-09T03:56:00.985Z'),
          tags: [],
        }),
      ];

      const buffer = service.exportToCsv(todos);
      const csv = buffer.toString('utf-8');
      const lines = csv.replace('\uFEFF', '').trim().split('\r\n');

      expect(lines).toHaveLength(3);
      expect(lines[1]).toContain('買い物');
      expect(lines[2]).toContain('Learn NestJS');
    });
  });
});
