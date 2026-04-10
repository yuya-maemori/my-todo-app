import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TodoModel } from './todo.model';
import { TodoRepository } from './todo.repository';
import { TodoUsecase } from './todo.usecase';
import { TodoValidator } from './todo.validator';
import { TagService } from '../tag/external/tag.service';

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

describe('TodoUsecase', () => {
  let usecase: TodoUsecase;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TodoUsecase,
        TodoValidator,
        { provide: TodoRepository, useValue: mockRepository },
        { provide: TagService, useValue: mockTagService },
      ],
    }).compile();

    usecase = module.get(TodoUsecase);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getTodosWithSearch', () => {
    it('キーワードなしで検索した場合、全 Todo を返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithSearch({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        orderBy: { createdAt: 'asc' },
      });
      expect(mockRepository.count).toHaveBeenCalledWith({});
    });

    it('キーワード付きで検索した場合、マッチした Todo のみ返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithSearch({
        page: 1,
        limit: 10,
        sortBy: 'title',
        sortOrder: 'asc',
        keyword: 'テスト',
      });

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          title: { contains: 'テスト' },
        },
        orderBy: { title: 'asc' },
      });
      expect(mockRepository.count).toHaveBeenCalledWith({
        title: { contains: 'テスト' },
      });
    });

    it('2ページ目をリクエストしたとき、正しい skip を計算する', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([]);
      (mockRepository.count as jest.Mock).mockResolvedValue(25);

      await usecase.getTodosWithSearch({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('ソート順序が desc のときは降順で取得する', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      await usecase.getTodosWithSearch({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getTodosWithPagination', () => {
    it('ページングパラメータから Todo 一覧を返す', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([mockTodo]);
      (mockRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await usecase.getTodosWithPagination(1, 10);

      expect(result.todos).toEqual([mockTodo]);
      expect(result.totalItems).toBe(1);
      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
      expect(mockRepository.count).toHaveBeenCalled();
    });

    it('複数ページ目のリクエストで正しい skip を計算する', async () => {
      (mockRepository.findAll as jest.Mock).mockResolvedValue([]);
      (mockRepository.count as jest.Mock).mockResolvedValue(100);

      await usecase.getTodosWithPagination(3, 20);

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 40,
        take: 20,
      });
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

      await expect(usecase.getTodoById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTodo', () => {
    it('Todo を作成して返す', async () => {
      (mockRepository.create as jest.Mock).mockResolvedValue(mockTodo);

      const result = await usecase.createTodo({
        title: 'テスト Todo',
        completed: false,
        tagNames: [],
      });

      expect(result).toEqual(mockTodo);
      expect(mockRepository.create).toHaveBeenCalledWith({
        title: 'テスト Todo',
        completed: false,
        tagIds: [],
      });
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

      const result = await usecase.updateTodo(1, {
        title: '更新済み Todo',
        completed: true,
      });

      expect(result).toEqual(updatedTodo);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        title: '更新済み Todo',
        completed: true,
      });
    });

    it('Todo が見つからない場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        usecase.updateTodo(999, { title: 'テスト', completed: false }),
      ).rejects.toThrow(NotFoundException);
    });

    it('部分更新では更新対象のフィールドのみを渡す', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.update as jest.Mock).mockResolvedValue(mockTodo);

      await usecase.updateTodo(1, { title: '新しいタイトル' });

      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        title: '新しいタイトル',
      });
    });
  });

  describe('deleteTodo', () => {
    it('Todo が存在する場合、削除する', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);
      (mockRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await usecase.deleteTodo(1);

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('Todo が見つからない場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(usecase.deleteTodo(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
