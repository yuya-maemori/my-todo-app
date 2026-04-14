/**
 * AuditLog Entity
 *
 * DB テーブル（audit_logs）の構造をそのまま表現した型。
 * Repository 内部でのみ使用する。外部には漏らさない。
 */
export class AuditLog {
  id: number;
  userId: number | null;
  action: string;
  resourceType: string;
  resourceId: number;
  before: unknown;
  after: unknown;
  createdAt: Date;
}
