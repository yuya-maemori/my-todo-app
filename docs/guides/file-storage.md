# ファイルストレージの切り替え

## 概要

ファイルアップロード機能は `FileStorageClient` 抽象クラスで抽象化されている。
S3 互換ストレージ（AWS S3 / MinIO）を差し替え可能。

## アーキテクチャ

```
FileUsecase
  ├─ FileRepository         ← DB にメタデータを保存
  └─ FileStorageClient      ← 抽象クラス
       ├─ S3StorageClient   ← 現在の実装（AWS S3 / MinIO）
       └─ ...               ← GCS 等に差し替え可能
```

## 現在の構成

```
src/file/
  file.usecase.ts
  file.repository.ts
  file.validator.ts
  file.controller.ts
  file.model.ts
  file.module.ts
  dto/
    file-response.dto.ts
  schema/
    upload-file.schema.ts
    copy-file.schema.ts
  external/
    file-storage.client.ts    ← 抽象クラス
    s3-storage.client.ts      ← S3/MinIO 実装
```

## 抽象クラスの定義

```typescript
// src/file/external/file-storage.client.ts
export abstract class FileStorageClient {
  abstract upload(key: string, body: Buffer, mimeType: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract copy(sourceKey: string, destKey: string): Promise<void>;
  abstract getSignedUrl(key: string): Promise<string>;
}
```

## GCS に切り替える例

### 1. パッケージ追加

```bash
yarn add @google-cloud/storage
```

### 2. 新しい Client を実装

```typescript
// src/file/external/gcs-storage.client.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { FileStorageClient } from './file-storage.client';

@Injectable()
export class GcsStorageClient extends FileStorageClient {
  private readonly storage: Storage;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.storage = new Storage();
    this.bucket = this.configService.getOrThrow('GCS_BUCKET');
  }

  async upload(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.storage
      .bucket(this.bucket)
      .file(key)
      .save(body, { contentType: mimeType });
  }

  async delete(key: string): Promise<void> {
    await this.storage.bucket(this.bucket).file(key).delete();
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    await this.storage
      .bucket(this.bucket)
      .file(sourceKey)
      .copy(this.storage.bucket(this.bucket).file(destKey));
  }

  async getSignedUrl(key: string): Promise<string> {
    const [url] = await this.storage
      .bucket(this.bucket)
      .file(key)
      .getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
    return url;
  }
}
```

### 3. モジュールの DI を差し替え

```typescript
// src/file/file.module.ts
import { GcsStorageClient } from './external/gcs-storage.client';

@Module({
  providers: [
    { provide: FileStorageClient, useClass: GcsStorageClient },  // ← ここだけ変更
    FileUsecase,
    FileValidator,
    FileRepository,
  ],
})
export class FileModule {}
```

### 変更不要なファイル

- `FileUsecase` — `FileStorageClient` 抽象クラス経由のため変更不要
- `FileController` — Usecase 経由のため変更不要
- `FileRepository` — ストレージとは無関係（DB メタデータのみ）

## ファイルアップロードの流れ

1. クライアントが `POST /files` にマルチパートでファイルを送信
2. Controller が `Express.Multer.File` として受け取る
3. Usecase がストレージキー（`{tenantId}/{uuid}{ext}`）を生成
4. `FileStorageClient.upload()` でオブジェクトストレージに保存
5. `FileRepository.create()` でメタデータを DB に保存（トランザクション内）
6. レスポンスに署名付き URL を含めて返却

## 環境変数

### S3 / MinIO（現在）

```env
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=nestjs-sample
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### GCS

```env
GCS_BUCKET=my-bucket
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```
