# DB プロバイダの切り替え

## 概要

本プロジェクトは Prisma の複数スキーマ管理により、4つの DB をサポートしている。
**プロジェクト開始時に一度だけ選定し、以降は変更しない前提。**

- PostgreSQL
- MySQL
- SQL Server
- SQLite

## ディレクトリ構成

```text
prisma/
  schema.prisma                      ← アクティブなスキーマ
  schemas/
    schema.postgresql.prisma         ← PostgreSQL 用
    schema.mysql.prisma              ← MySQL 用
    schema.sqlserver.prisma          ← SQL Server 用
    schema.sqlite.prisma             ← SQLite 用
```

## プロジェクト開始時の選定手順

### 1. DB を選択

```bash
yarn db:use <provider>
```

```bash
yarn db:use postgresql   # PostgreSQL を使う場合
yarn db:use mysql        # MySQL を使う場合
yarn db:use sqlserver    # SQL Server を使う場合
yarn db:use sqlite       # SQLite を使う場合
```

内部では `scripts/use-db.sh` が実行され、以下が行われる：

1. `prisma/schemas/schema.{provider}.prisma` → `prisma/schema.prisma` にコピー
2. `npx prisma generate` でクライアント再生成

### 2. `.env` の `DATABASE_URL` を設定

選択した DB に合わせて接続文字列を設定する。

### 3. Docker Compose を調整

`docker-compose.yaml` の DB サービスを選択した DB に合わせる。

## 選定後の開発フロー

DB を選定した後は、`prisma/schema.prisma` を直接編集して開発を進める。
スキーマ変更の手順は [テーブル・カラムの追加と反映](./schema-migration.md) を参照。

## 控えスキーマの管理

**全4ファイルを同時に編集すること。**

`prisma/schemas/` 配下のファイルは、将来別の DB に切り替える可能性に備えた控え。
`prisma/schema.prisma` にモデルやカラムを追加したら、控えの4ファイルにも同じ変更を反映する。

DB 固有の差分（カスケード設定、型制約、`@db.*` 属性など）があるため、各スキーマファイルの差異に注意する。

## scaffold テンプレートとの関係

`yarn scaffold` でドメインを生成すると、`prisma/schema.prisma` にモデルが自動注入される。
注入後、手動で控えの4ファイルにも同じモデルを追加する必要がある。
