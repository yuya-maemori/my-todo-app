/**
 * 監査ログの操作種別
 *
 * - create: リソースを新規作成した
 * - update: リソースを更新した
 * - delete: リソースを削除した
 */
export type AuditAction = 'create' | 'update' | 'delete';

/**
 * AuditLog Model
 *
 * アプリ内部で使う監査ログのドメインモデル。
 * DB 固有のカラム（createdAt 以外）は含めない。
 *
 * 【before / after の規約】
 * | 操作   | before                     | after                      |
 * |--------|----------------------------|----------------------------|
 * | create | null                       | model.toAuditSnapshot()    |
 * | update | original.toAuditSnapshot() | updated.toAuditSnapshot()  |
 * | delete | model.toAuditSnapshot()    | null                       |
 */
export class AuditLogModel {
  readonly id: number;
  readonly userId: number | null;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: number;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly createdAt: Date;

  constructor(data: {
    id: number;
    userId: number | null;
    action: AuditAction;
    resourceType: string;
    resourceId: number;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.action = data.action;
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.before = data.before;
    this.after = data.after;
    this.createdAt = data.createdAt;
  }
}
