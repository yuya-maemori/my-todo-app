/**
 * Todo のドメインモデル
 *
 * アプリ内部（ビジネスロジック層）で使う型です。
 * Controller や Repository では直接Prismaの型を使わず、
 * このModelを経由することで、DBスキーマの変更に強くなります。
 */
export class TodoModel {
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
