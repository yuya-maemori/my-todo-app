import { NotFoundException } from '@nestjs/common';
import { TodoModel } from './todo.model';
import { TodoValidator } from './todo.validator';
import { TodoRepository } from './todo.repository';

const mockTodo = new TodoModel({
  id: 1,
  title: 'テスト Todo',
  completed: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const mockRepository: Pick<TodoRepository, 'findById'> = {
  findById: jest.fn(),
};

describe('TodoValidator', () => {
  let validator: TodoValidator;

  beforeEach(() => {
    validator = new TodoValidator(mockRepository as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validateTodoExists', () => {
    it('Todo が存在する場合、その Todo を返す', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(mockTodo);

      const result = await validator.validateTodoExists(1);

      expect(result).toEqual(mockTodo);
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('Todo が見つからない場合、NotFoundException を投げる', async () => {
      (mockRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(validator.validateTodoExists(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
