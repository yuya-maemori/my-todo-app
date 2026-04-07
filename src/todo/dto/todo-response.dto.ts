import { TodoModel } from '../todo.model';

/**
 * Todo API のレスポンス DTO
 *
 * クライアント（フロントエンド、外部API呼び出し元）に返すデータの形です。
 *
 * なぜDTOを分けるのか：
 * 1. Model にはアプリ内部用フィールドがあるかもしれない
 * 2. DTOに「このフィールドだけ返す」と明示することで、意図しない情報漏洩を防ぐ
 * 3. API仕様書として、クライアントが「何が返ってくるのか」を明確に知ることができる
 */
export class TodoResponseDto {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: number;
    title: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

/**
 * Model から ResponseDto に変換する関数
 *
 * Model には内部用フィールドがあっても、DTOには公開フィールドだけを詰める
 */
export function toTodoResponseDto(model: TodoModel): TodoResponseDto {
  return new TodoResponseDto({
    id: model.id,
    title: model.title,
    completed: model.completed,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

/**
 * 複数の Model からレスポンスDTOの配列に変換
 */
export function toTodoResponseDtos(models: TodoModel[]): TodoResponseDto[] {
  return models.map(toTodoResponseDto);
}
