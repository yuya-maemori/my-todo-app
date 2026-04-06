# 認証（Admin / User 分離）

## 概要

本プロジェクトでは Admin（システム管理者）と User（テナントユーザー）の認証を完全に分離している。
テーブル・JWT・Cookie・Guard・Controller すべてが別系統。

## アーキテクチャ

```
リクエスト
  └─ CompositeAuthGuard（グローバル）
       ├─ /admin/* → AdminAuthGuard → admin_access_token Cookie を検証
       └─ それ以外 → UserAuthGuard  → user_access_token Cookie を検証
```

## JWT Payload の違い

```typescript
// Admin
interface AdminJwtPayload {
  type: 'admin';
  sub: number;       // admin.id
}

// User
interface UserJwtPayload {
  type: 'user';
  sub: number;       // user.id
  tenantId: number;  // 所属テナント
  role: UserRole;    // 'tenant_admin' | 'tenant_user'
}
```

Guard は `type` フィールドで Admin/User を判別する。
Admin の Cookie で User のエンドポイントにはアクセスできない（逆も同様）。

## Cookie 構成

| Cookie 名 | 用途 | 有効期限 | Path |
|-----------|------|---------|------|
| `admin_access_token` | Admin アクセストークン | 15分 | `/` |
| `admin_refresh_token` | Admin リフレッシュトークン | 7日 | `/admin/auth` |
| `user_access_token` | User アクセストークン | 15分 | `/` |
| `user_refresh_token` | User リフレッシュトークン | 7日 | `/auth` |

すべて `httpOnly: true`、`sameSite: 'strict'`。本番環境では `secure: true`。

## エンドポイント

### Admin（`/admin/auth`）

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/admin/auth/login` | ログイン | 不要 |
| POST | `/admin/auth/logout` | ログアウト | 必要 |
| POST | `/admin/auth/refresh` | トークンリフレッシュ | 不要 |
| GET | `/admin/auth/me` | 自分の情報取得 | 必要 |
| POST | `/admin/auth/password-reset/request` | パスワードリセット依頼 | 不要 |
| POST | `/admin/auth/password-reset/confirm` | パスワードリセット確定 | 不要 |

### User（`/auth`）

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/auth/login` | ログイン | 不要 |
| POST | `/auth/logout` | ログアウト | 必要 |
| POST | `/auth/refresh` | トークンリフレッシュ | 不要 |
| GET | `/auth/me` | 自分の情報取得 | 必要 |
| POST | `/auth/password-reset/request` | パスワードリセット依頼 | 不要 |
| POST | `/auth/password-reset/confirm` | パスワードリセット確定 | 不要 |

## 認証不要のエンドポイントを追加する

`@Public()` デコレータを付けると、CompositeAuthGuard をスキップする。

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

## コントローラーでのユーザー情報取得

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserJwtPayload } from '../auth/types';

// User 向けコントローラー
@Get()
async findAll(@CurrentUser() user: UserJwtPayload) {
  // user.sub      → ユーザーID
  // user.tenantId → テナントID
  // user.role     → 'tenant_admin' | 'tenant_user'
}
```

```typescript
import { JwtPayload } from '../auth/types';

// Admin 向けコントローラー
@Get()
async findAll(@CurrentUser() user: JwtPayload) {
  // user.type === 'admin'
  // user.sub → 管理者ID
}
```

## DB テーブル構成

```
Admin               ← システム管理者（tenantId なし）
AdminRefreshToken   ← Admin のリフレッシュトークン
AdminPasswordReset  ← Admin のパスワードリセット

User                ← テナントユーザー（tenantId 必須）
UserRefreshToken    ← User のリフレッシュトークン
UserPasswordReset   ← User のパスワードリセット
```

Admin と User は完全に別テーブル。同じメールアドレスでも別々に存在できる。

## ディレクトリ構成

```
src/auth/
  admin/
    admin-auth.controller.ts   ← @Controller('admin/auth')
    admin-auth.usecase.ts
    admin-auth.repository.ts
    admin-auth.validator.ts
  user/
    user-auth.controller.ts    ← @Controller('auth')
    user-auth.usecase.ts
    user-auth.repository.ts
    user-auth.validator.ts
  external/
    composite-auth.guard.ts    ← グローバルガード（パスで振り分け）
    admin-auth.guard.ts        ← admin_access_token を検証
    user-auth.guard.ts         ← user_access_token を検証
    casl-ability.factory.ts    ← 認可（別ガイド参照）
    policies.guard.ts
  types/
    jwt-payload.type.ts        ← AdminJwtPayload | UserJwtPayload
    role.type.ts               ← UserRole 定義
  decorators/
    current-user.decorator.ts
    check-policy.decorator.ts
    public.decorator.ts
```

## レートリミット

認証エンドポイントには個別のレートリミットが設定されている。

| エンドポイント | 制限 |
|--------------|------|
| ログイン | 5回/60秒 |
| リフレッシュ | 5回/60秒 |
| パスワードリセット依頼 | 3回/60秒 |
| パスワードリセット確定 | 5回/60秒 |
