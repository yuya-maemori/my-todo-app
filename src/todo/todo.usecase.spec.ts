import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TodoModel } from './todo.model';
import { TodoRepository } from './todo.repository';
import { TodoUsecase } from './todo.usecase';
import { TodoValidator } from './todo.validator';
import { TagService } from '../tag/external/tag.service';
import { TransactionService, TransactionClient } from '../prisma/transaction.service';
import { AuditLogRepository } from '../audit-log/audit-log.repository';

const mockTodo = new TodoModel({
  id: 1,
  title: 'テスト Todo',
  completed: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const mockRepository: Pick<
  TodoRepository,
  'findAll' | 'findById' | 'count' | 'create' | 'update' | 'delete'
> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockTagService: Pick<TagService, 'findOrCreateByName'> = {
  findOrCreateByName: jest.fn(),
};

// TransactionService のモック
// run() はコールバック関数を受け取り、空の tx を渡して実行する
const mockTransaction: Pick<TransactionService, 'run'> = {
  run: jest.fn().mockImplementation((fn: (tx: TransactionClient) => Promise<unknown>) =>
    fn({} as TransactionClient),
  ),
};

// AuditLogRepository のモック（監査ログ記録の検証はここで行う）
const mockAuditLogRepository: Pick<AuditLogRepository, 'create'> = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('TodoUsecase', () => {
  let usecase: TodoUsecase;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TodoUsecase,
        TodoValidator,
        { provide: TodoRepository, useValue: mockRepository },
        { provide: TagService, useValue: mockTagService },
        { provide: TransactionService, useValue: mockTransaction },
        { provide: AuditLogRepository, useValue: mockAuditLogRepository },
      ],
    }).compile();

    usecase = module.get(TodoUsecase);
  });

  afterEach(() => {
    jest.resetAllMocks();
    // resetAllMocks は実装もリセットするため、run() の実装を再設定する
    (mockTransaction.run as jest.Mock).mockImplementation(
      (fn: (tx: TransactionClient) => Promise<unknown>) => fn({} as TransactionClient),
    );
  });

  describe('getTodosWithSearch', () => {
    it('キーワードなしで検索した場合、全 Todo を返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithSearch({
        ability: undefined as never,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
    });

    it('キーワード付きで検索した場合、マッチした Todo のみ返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithSearch({
        ability: undefined as never,
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
        keyword: 'テスト',
      });

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
    });

    it('2ページ目をリクエストしたとき、正しい skip を計算する', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([]);
      (mockRepository.count as jest.Mock).mockResolvedValue(25);

      await usecase.getTodosWithSearch({
        ability: undefined as never,
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('getTodosWithPagination', () => {
    it('ページングパラメータから Todo 一覧を返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithPagination(1, 10);

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
    });
  });

  describe('getTodoById', () => {
    it('指定 ID の Todo を返す', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);

      const result = await usecase.getTodoById(1);

      expect(result).toEqual(mockTodo);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('存在しない ID の場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(usecase.getTodoById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTodo', () => {
    it('Todo を作成して返す', async () => {
      (mockRepository.create as jest.Mock).mockResolvedValue(mockTodo);
      (mockAuditLogRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await usecase.createTodo(
        { title: 'テスト Todo', completed: false, tagNames: [] },
        1, // userId
      );

      expect(result).toEqual(mockTodo);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('create 後に監査ログが記録される', async () => {
      (mockRepository.create as jest.Mock).mockResolvedValue(mockTodo);

      await usecase.createTodo(
        { title: 'テスト Todo', completed: false, tagNames: [] },
        1,
      );

      // 監査ログが記録されたことを確認
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'create',
          resourceType: 'Todo',
          resourceId: mockTodo.id,
          before: null,
          after: mockTodo.toAuditSnapshot(),
        }),
        expect.anything(), // tx
      );
    });
  });

  describe('updateTodo', () => {
    it('Todo が存在する場合、更新して返す', async () => {
      const updatedTodo = new TodoModel({
        id: 1,
        title: '更新済み Todo',
        completed: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.update as jest.Mock).mockResolvedValue(updatedTodo);

      const result = await usecase.updateTodo(
        1,
        { title: '更新済み Todo', completed: true },
        1, // userId
      );

      expect(result).toEqual(updatedTodo);
    });

    it('update 後に before/after を含む監査ログが記録される', async () => {
      const updatedTodo = new TodoModel({
        id: 1,
        title: '更新済み Todo',
        completed: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.update as jest.Mock).mockResolvedValue(updatedTodo);

      await usecase.updateTodo(1, { title: '更新済み Todo', completed: true }, 1);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          before: mockTodo.toAuditSnapshot(),
          after: updatedTodo.toAuditSnapshot(),
        }),
        expect.anything(),
      );
    });

    it('Todo が見つからない場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        usecase.updateTodo(999, { title: 'テスト' }, 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTodo', () => {
    it('Todo が存在する場合、削除する', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await usecase.deleteTodo(1, 1); // id, userId

      expect(mockRepository.delete).toHaveBeenCalledWith(1, expect.anything());
    });

    it('delete 後に before を含む監査ログが記録される', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await usecase.deleteTodo(1, 1);

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          before: mockTodo.toAuditSnapshot(),
          after: null,
        }),
        expect.anything(),
      );
    });

    it('Todo が見つからない場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(usecase.deleteTodo(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
