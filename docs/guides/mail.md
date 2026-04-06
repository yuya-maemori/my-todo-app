# メール送信機能の切り替え

## 概要

メール送信はインターフェース（`MailTransport`）で抽象化されている。
実装を差し替えることで、SMTP / AWS SES / SendGrid 等に切り替えられる。

## アーキテクチャ

```
MailService (公開API)
  └─ MailTransport (インターフェース)
       ├─ SmtpMailTransport   ← 現在の実装（nodemailer）
       ├─ SesMailTransport    ← AWS SES を使う場合に作成
       └─ ...
```

## 現在の構成

```
src/mail/
  mail-transport.interface.ts   ← インターフェース + DI トークン
  smtp-mail.transport.ts        ← SMTP 実装（nodemailer）
  external/
    mail.service.ts             ← 公開サービス（他モジュールが使う）
  mail.module.ts
```

## 他モジュールからの利用

```typescript
// 1. モジュールで MailModule を import
@Module({
  imports: [MailModule],
})
export class UserModule {}

// 2. Usecase で MailService を注入
@Injectable()
export class UserUsecase {
  constructor(private readonly mailService: MailService) {}

  async resetPassword(email: string) {
    await this.mailService.send({
      to: email,
      subject: 'パスワードリセット',
      text: `リセットリンク: ${url}`,
    });
  }
}
```

## AWS SES に切り替える手順

### 1. パッケージ追加

```bash
yarn add @aws-sdk/client-ses
```

### 2. 新しい Transport を実装

```typescript
// src/mail/ses-mail.transport.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { MailTransport, SendMailParams } from './mail-transport.interface';

@Injectable()
export class SesMailTransport implements MailTransport {
  private readonly client: SESClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new SESClient({
      region: this.configService.get('AWS_REGION', 'ap-northeast-1'),
    });
  }

  async sendMail(params: SendMailParams): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        Source: params.from,
        Destination: { ToAddresses: [params.to] },
        Message: {
          Subject: { Data: params.subject },
          Body: { Text: { Data: params.text } },
        },
      }),
    );
  }
}
```

### 3. モジュールの DI を差し替え

```typescript
// src/mail/mail.module.ts
import { SesMailTransport } from './ses-mail.transport';

@Module({
  providers: [
    { provide: MAIL_TRANSPORT, useClass: SesMailTransport },  // ← ここだけ変更
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
```

### 変更不要なファイル

- `MailService` — Transport を経由するため変更不要
- 各 Usecase — `MailService` を使っているため変更不要

## インターフェース定義

```typescript
// src/mail/mail-transport.interface.ts
export interface SendMailParams {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export interface MailTransport {
  sendMail(params: SendMailParams): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
```

## 環境変数

### SMTP（現在）

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@example.com
```

### AWS SES

```env
AWS_REGION=ap-northeast-1
SMTP_FROM=noreply@example.com
```

SES の認証は IAM ロールまたは環境変数（`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`）で行う。
