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
  tags: { id: number; name: string }[];

  constructor(data: {
    id: number;
    title: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    tags?: { id: number; name: string }[];
  }) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.tags = data.tags ?? [];
  }

  /**
   * 監査ログ用スナップショットを返す
   *
   * 「このとき Todo はどういう状態だったか」を記録するためのメソッド。
   * 追跡対象のフィールドのみ返す（DB固有のカラムや大きなデータは含めない）。
   *
   * 【使われる場所（Usecase）】
   * - create: after = todo.toAuditSnapshot()
   * - update: before = original.toAuditSnapshot(), after = updated.toAuditSnapshot()
   * - delete: before = todo.toAuditSnapshot()
   */
  toAuditSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
    };
  }
}
