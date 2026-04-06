# NestJS キャッチアップ タスクリスト

## 進め方

- **このリポジトリ（nestjs-sample）はあくまで参考用です。クローンして中を編集するのではなく、自分のローカルに新しいプロジェクトを0から作ってください。**
- 各タスクに「nestjs-sample 参考」として該当ファイルを記載しています。実装に詰まったらそのファイルを読んでヒントにしてください。
- ただし丸写しではなく、「なぜこう書いているのか」を考えながら進めてください。

---

## タスクを始める前に知っておいてほしいこと

### 「良いコード」とは何か

コードは「動けばいい」わけではない。半年後の自分や、チームメンバーが読んで理解できるかが重要になる。
良いコードを考えるうえで、特に重要な概念が2つある。

**凝集度（Cohesion）— 関連するものがまとまっているか**

- 「ユーザーに関する処理」がいろんなファイルに散らばっていたら、修正時にどこを直せばいいかわからない
- 1つのモジュール・1つのクラスが「1つの責務」に集中しているほど凝集度が高く、変更しやすい
- このアプリでは、ドメインごとにフォルダを分け（`todo/`, `tag/`, `user/`）、関連するファイルをまとめている

**結合度（Coupling）— モジュール同士がどれだけ依存し合っているか**

- モジュール A の変更がモジュール B に波及するなら、結合度が高い
- 結合度が高いと「1箇所直したら別の場所が壊れた」が頻発する
- このアプリでは `external/` に公開するものだけを置き、`imports` / `exports` で依存を明示することで結合度を下げている

**調べるキーワード:** `凝集度と結合度`, `単一責任の原則（SRP）`, `関心の分離`

### アーキテクチャについて

このアプリは「レイヤードアーキテクチャ」を採用している。リクエストの流れが一方向になっている:

```text
Controller → Usecase → Validator / Repository → DB
```

- **Controller** はリクエストを受け取ってレスポンスを返すだけ。ビジネスロジックは書かない
- **Usecase** は処理の流れを組み立てる。「何をするか」を記述する
- **Validator** はビジネスルールの検証を行う。「やっていいか」を判断する
- **Repository** は DB とのやり取りだけを行う。「どう保存/取得するか」を担当する

各レイヤが「自分の仕事だけ」に集中しているので、変更の影響範囲が限定される。

**調べるキーワード:** `レイヤードアーキテクチャ`, `クリーンアーキテクチャ`, `ヘキサゴナルアーキテクチャ`

### このアプリの構成が「唯一の正解」ではない

このアプリの設計はあくまで **「このチーム・このプロジェクトにとっての現時点での最適解」** にすぎない。

世の中には様々な設計パターンがあり、どれが正解かはプロジェクトの規模・チームの経験・要件によって変わる:

- **小さな個人開発** — レイヤを分けずに Controller に直接書くほうが速い場合もある
- **大規模なマイクロサービス** — もっと細かく分割し、サービス間通信の設計が重要になる
- **DDD（ドメイン駆動設計）** — ドメインモデルをもっと厚くし、Repository のインターフェースを分離する設計もある

大事なのは「なぜその設計を選んだのか」を説明できること。
タスクを進めながら「なぜこうなっているんだろう」と考える癖をつけてほしい。

**調べるキーワード:** `ソフトウェアアーキテクチャ 種類`, `DDD（ドメイン駆動設計）`, `マイクロサービス vs モノリス`, `技術選定 トレードオフ`

---

## Phase 0: 環境構築

### Task 1: asdf で Node.js と yarn をインストールする

**なぜやるか:** チーム全員が同じバージョンで開発しないと「自分の環境では動くのに…」が起きる。asdf はプロジェクトごとにバージョンを固定できるツール。

1. asdf をインストールする（まだの場合）

   ```bash
   brew install asdf
   ```

2. Node.js プラグインを追加してインストールする

   ```bash
   asdf plugin add nodejs
   asdf install nodejs 22.2.0
   asdf global nodejs 22.2.0
   ```

3. yarn プラグインを追加してインストールする

   ```bash
   asdf plugin add yarn
   asdf install yarn 1.22.22
   asdf global yarn 1.22.22
   ```

4. バージョンを確認する

   ```bash
   node -v    # v22.2.0
   yarn -v    # 1.22.22
   ```

5. NestJS CLI をインストールする

   ```bash
   yarn global add @nestjs/cli
   nest --version
   ```

**調べるキーワード:** `asdf`, `.tool-versions`, `Node.js バージョン管理`

---

### Task 2: NestJS プロジェクトを作成する

**なぜやるか:** NestJS CLI が生成する初期構成を把握することで、フレームワークの全体像が掴める。ここで生成される `main.ts` → `AppModule` → `AppController` の流れが、すべての基本になる。

1. プロジェクトを作成する

   ```bash
   nest new my-todo-app --package-manager yarn
   ```

2. 生成されたファイルを確認する
   - `src/main.ts` — アプリのエントリポイント
   - `src/app.module.ts` — ルートモジュール
   - `src/app.controller.ts` — サンプルコントローラ
   - `src/app.service.ts` — サンプルサービス

3. 起動して動作確認する

   ```bash
   cd my-todo-app
   yarn start:dev
   ```

4. `http://localhost:3000` にアクセスして「Hello World!」が返ることを確認

**調べるキーワード:** `NestJS CLI`, `NestJS Module / Controller / Service の関係`

---

### Task 3: Docker で MySQL を立ち上げる

**なぜやるか:** ローカルに直接 MySQL をインストールすると環境が汚れる。Docker を使えば「コンテナを消せば元通り」にできるし、チーム全員が同じ DB 環境を再現できる。

1. Docker Desktop をインストールする
2. プロジェクトルートに `docker-compose.yaml` を作成する

   ```yaml
   services:
     mysql:
       image: mysql:8.0
       ports:
         - "3306:3306"
       environment:
         MYSQL_ROOT_PASSWORD: "password"
         MYSQL_DATABASE: "my_todo_app"
       volumes:
         - mysql-data:/var/lib/mysql

   volumes:
     mysql-data:
   ```

3. 起動して接続確認する

   ```bash
   docker compose up -d
   docker compose exec mysql mysql -uroot -ppassword -e "SHOW DATABASES;"
   ```

**nestjs-sample 参考:** `docker-compose.yaml`

**調べるキーワード:** `Docker Compose`, `volumes（データ永続化）`, `ports（ポートマッピング）`

---

### Task 4: Prisma をセットアップする

**なぜやるか:** SQL を直接書くとタイポや型の不一致に気づけない。Prisma（ORM）を使うと、TypeScript の型でテーブル構造が表現され、コンパイル時にミスを検出できる。

**やらないと困ること:** DB のカラム名を間違えても実行するまでわからない。Prisma なら `todo.titl` と書いた時点で赤線が出る。

1. Prisma をインストールする

   ```bash
   yarn add @prisma/client
   yarn add -D prisma
   ```

2. 初期化する

   ```bash
   npx prisma init
   ```

3. `.env` の `DATABASE_URL` を設定する

   ```text
   DATABASE_URL="mysql://root:password@localhost:3306/my_todo_app"
   ```

4. `prisma/schema.prisma` の `provider` を `mysql` に変更する

5. 接続を確認する

   ```bash
   npx prisma db push
   ```

**nestjs-sample 参考:** `prisma/schema.prisma`, `.env.example`

**調べるキーワード:** `Prisma ORM`, `prisma init`, `DATABASE_URL`, `Prisma schema`

---

### Task 5: PrismaService を作成して NestJS に組み込む

**なぜやるか:** Prisma をそのまま使うと、各ファイルで `new PrismaClient()` してしまい、DB 接続が何本も作られてしまう。NestJS の DI に組み込めば、アプリ全体で1つのインスタンスを共有できる。

**やらないと困ること:** DB 接続数の上限に達してアプリが落ちる。テスト時にモックに差し替えることもできない。

1. `src/prisma/prisma.service.ts` を作成する
   - `PrismaClient` を継承し、`OnModuleInit` で `$connect()` を呼ぶ
2. `src/prisma/prisma.module.ts` を作成する
   - `PrismaService` を `providers` と `exports` に登録する
3. `app.module.ts` の `imports` に `PrismaModule` を追加する

**nestjs-sample 参考:** `src/prisma/`

**調べるキーワード:** `NestJS OnModuleInit`, `Module exports`, `NestJS DI（Dependency Injection）`

---

## Phase 1: NestJS の基本構造を理解する

### Task 6: Hello World エンドポイントを作る

**なぜやるか:** NestJS の最小構成を手で作ることで、Module と Controller の関係を体で覚える。`nest new` で自動生成されたコードを「読む」のと「自分で書く」のでは理解度が全く違う。

1. `src/hello/hello.controller.ts` を作成する
   - `GET /hello` で `{ message: "Hello World" }` を返す
2. `src/hello/hello.module.ts` を作成する
3. `app.module.ts` に `HelloModule` を追加する
4. `http://localhost:3000/hello` にアクセスして確認する

**nestjs-sample 参考:** `src/health/`

**調べるキーワード:** `@Controller`, `@Get`, `@Module`, `NestJS デコレータ`

---

### Task 7: パスパラメータとクエリパラメータを受け取る

**なぜやるか:** REST API では URL のパス（`/users/123`）やクエリ（`?page=1`）でデータを受け取る場面が頻出する。NestJS での受け取り方を知らないと、何も作れない。

- Task 6 の Hello モジュールに以下を追加:
  - `GET /hello/:name` → `{ message: "Hello, {name}!" }` を返す
  - `GET /hello?lang=ja` → lang が `ja` なら `こんにちは`、それ以外なら `Hello` を返す

**調べるキーワード:** `@Param`, `@Query`, `NestJS ルーティング`

---

### Task 8: レイヤ構造を理解する（Usecase の導入）

**なぜやるか:** Controller に全部書くと、同じロジックを別のエンドポイントで使い回せない。また、テストで HTTP リクエストを飛ばさないとロジックを検証できなくなる。Usecase に切り出すことで「ロジックだけ」のテストが可能になる。

**やらないと困ること:** Controller が肥大化して読めなくなる。テストが書きにくくなる。

1. `src/hello/hello.usecase.ts` を作成し、Controller にあったロジックを移動する
2. Module の `providers` に `HelloUsecase` を登録する
3. Controller のコンストラクタで `HelloUsecase` を受け取る（DI）
4. 動作確認する（振る舞いは変わらないことを確認）

**nestjs-sample 参考:** `src/tag/tag.usecase.ts`

**調べるキーワード:** `@Injectable`, `NestJS providers`, `Dependency Injection`, `単一責任の原則`

---

## Phase 2: Todo の CRUD を実装する

### Task 9: Prisma に Todo テーブルを定義する

**なぜやるか:** Prisma スキーマを書いてマイグレーションする流れは、DB を使う開発の基本中の基本。ここを理解しないとテーブル追加・変更のたびに手が止まる。

1. `prisma/schema.prisma` に `Todo` モデルを追加する

   ```prisma
   model Todo {
     id        Int      @id @default(autoincrement())
     title     String
     completed Boolean  @default(false)
     createdAt DateTime @default(now()) @map("created_at")
     updatedAt DateTime @updatedAt @map("updated_at")

     @@map("todos")
   }
   ```

2. マイグレーションを実行する

   ```bash
   npx prisma migrate dev --name add-todo
   ```

3. Prisma Studio で確認する

   ```bash
   npx prisma studio
   ```

**nestjs-sample 参考:** `prisma/schema.prisma`（Todo モデル部分）

**調べるキーワード:** `Prisma schema model`, `@map / @@map`, `prisma migrate dev`, `Prisma Studio`

---

### Task 10: Model / Entity / Response DTO を定義する

**なぜやるか:** 「DB の型」「アプリ内部の型」「API レスポンスの型」を1つの型で兼用すると、DB にカラムを足しただけで API レスポンスに意図しないフィールドが漏れる。型を分けておけば「どこまで公開するか」を明示的にコントロールできる。

**やらないと困ること:** `password_hash` のような内部フィールドがレスポンスに漏れる。DB スキーマ変更のたびに API の互換性が壊れる。

1. `src/todo/todo.model.ts` — アプリ内部で使う型を定義する
2. `src/todo/todo.entity.ts` — Prisma のレコードから Model に変換する関数を作る
3. `src/todo/dto/todo-response.dto.ts` — API レスポンスの形を定義する

**nestjs-sample 参考:** `src/tag/tag.model.ts`, `src/tag/tag.entity.ts`, `src/tag/dto/tag-response.dto.ts`

**調べるキーワード:** `DTO（Data Transfer Object）`, `Entity`, `Domain Model`, `レイヤードアーキテクチャ`

---

### Task 11: Repository を実装する

**なぜやるか:** DB アクセスのコードを Usecase に直接書くと、DB の種類を変えたりテストでモックに差し替えたりできなくなる。Repository に切り出すことで「データの取り方」と「ビジネスロジック」を分離できる。

1. `src/todo/todo.repository.ts` を作成する
   - `findAll()` — 全件取得
   - `findById(id)` — 1件取得（見つからなければ `null`）
   - `create(data)` — 作成
   - `update(id, data)` — 更新
   - `delete(id)` — 削除
2. PrismaService をコンストラクタで DI する

**nestjs-sample 参考:** `src/tag/external/tag.repository.ts`

**調べるキーワード:** `Repository パターン`, `Prisma CRUD`, `NestJS DI でのデータアクセス`

---

### Task 12: 一覧取得・詳細取得 API を作る

**なぜやるか:** Controller → Usecase → Repository を一気通貫で動かす最初のタスク。このレイヤの流れを理解することが NestJS 開発の土台になる。

1. `src/todo/todo.usecase.ts` を作成する
2. `src/todo/todo.controller.ts` を作成する
   - `GET /todos` — 一覧取得
   - `GET /todos/:id` — 詳細取得（存在しなければ 404）
3. `src/todo/todo.module.ts` を作成する
4. `app.module.ts` に `TodoModule` を追加する
5. curl で動作確認する

**nestjs-sample 参考:** `src/tag/tag.controller.ts`, `src/tag/tag.usecase.ts`, `src/tag/tag.module.ts`

**調べるキーワード:** `NestJS Module imports`, `NotFoundException`, `curl コマンドの使い方`

---

### Task 13: 作成 API を作る（Zod バリデーション）

**なぜやるか:** ユーザーからの入力は何が来るかわからない。バリデーションなしだと空文字やオブジェクトがそのまま DB に入り、データが壊れる。Zod を使うと「スキーマ定義」と「TypeScript の型」が1つのコードから自動で生成され、ズレが起きない。

**やらないと困ること:** `title` を空で送られても DB に保存されてしまう。バリデーションの型と実際の型が乖離して実行時エラーになる。

1. Zod をインストールする

   ```bash
   yarn add zod
   ```

2. `src/todo/schema/create-todo.schema.ts` を作成する（title: 必須文字列, completed: 任意 boolean）
3. `ZodValidationPipe`（カスタム Pipe）を作成する
4. Controller に `POST /todos` を追加する

**nestjs-sample 参考:** `src/tag/schema/create-tag.schema.ts`, `src/common/pipes/`

**調べるキーワード:** `Zod`, `NestJS Pipe`, `@Body`, `@UsePipes`, `カスタムバリデーションパイプ`

---

### Task 14: 更新・削除 API を作る

**なぜやるか:** CRUD の完成。加えて「存在しない ID を指定された場合に 404 を返す」という、実務で必ず必要になるバリデーションパターンを学ぶ。

1. `src/todo/schema/update-todo.schema.ts` を作成する
2. `src/todo/todo.validator.ts` を作成し「存在チェック」を実装する（見つからなければ 404）
3. Controller にエンドポイントを追加する
   - `PATCH /todos/:id` — 更新
   - `DELETE /todos/:id` — 削除（成功時は 204 No Content）

**nestjs-sample 参考:** `src/tag/tag.usecase.ts`, `src/tag/tag.validator.ts`

**調べるキーワード:** `@Patch`, `@Delete`, `@HttpCode`, `NotFoundException`, `NestJS Validator（ドメインバリデーション）`

---

## Phase 3: 実践的な機能を追加する

### Task 15: Swagger を導入する

**なぜやるか:** フロントエンド開発者や QA が API の仕様を確認するのに、毎回バックエンド開発者に聞くのは非効率。Swagger を入れておけば、コードから API ドキュメントが自動生成され、ブラウザ上で実際にリクエストを試すこともできる。

1. Swagger パッケージをインストールする

   ```bash
   yarn add @nestjs/swagger
   ```

2. `main.ts` に Swagger のセットアップを追加する

   ```ts
   const config = new DocumentBuilder()
     .setTitle('Todo API')
     .setVersion('1.0')
     .build();
   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api', app, document);
   ```

3. `http://localhost:3000/api` で Swagger UI を確認する
4. Controller に `@ApiOperation`, `@ApiResponse` を追加する
5. Response DTO に `@ApiProperty` を追加する

**nestjs-sample 参考:** `src/main.ts`, `src/todo/todo.controller.ts`

**調べるキーワード:** `@nestjs/swagger`, `OpenAPI`, `@ApiOperation`, `@ApiProperty`, `Swagger UI`

---

### Task 16: ページネーションを実装する

**なぜやるか:** データが 10 万件あるテーブルを全件返すと、レスポンスが数秒かかりフロントがフリーズする。ページネーションは実務で一覧 API を作るなら必須。

1. `src/todo/schema/list-todo.schema.ts` を作成する（page, limit のクエリパラメータ）
2. Repository の `findAll` を Prisma の `skip` / `take` + `count` に対応させる
3. 共通の `PaginatedResponseDto` を作成する（items, totalItems, totalPages, currentPage）
4. `GET /todos?page=1&limit=10` で動作確認する

**nestjs-sample 参考:** `src/todo/schema/list-todo.schema.ts`, `src/todo/todo.repository.ts`, `src/common/dto/`

**調べるキーワード:** `Prisma skip / take`, `オフセットページネーション`, `Prisma count`

---

### Task 17: ソート・検索機能を追加する

**なぜやるか:** 一覧 API は「並び順の指定」と「キーワード検索」がセットで求められることがほとんど。Prisma の `where` / `orderBy` を動的に組み立てるパターンを身につけておくと、今後どんな一覧 API でも応用できる。

1. list-todo.schema に `sortBy`（createdAt / title）, `sortOrder`（asc / desc）を追加する
2. `keyword` で title の部分一致検索を追加する
3. Repository で Prisma の `where` / `orderBy` を動的に組み立てる

**nestjs-sample 参考:** `src/todo/` の list 系実装

**調べるキーワード:** `Prisma where contains`, `Prisma orderBy`, `Zod .optional() / .default()`

---

### Task 18: 単体テストを書く

**なぜやるか:** テストがないと、既存機能が壊れたことに気づけない。NestJS のテストは DI コンテナを使ってモジュールを組み立てるため、最初は戸惑いやすい。ここで `Test.createTestingModule` のパターンを覚えておく。

**やらないと困ること:** リファクタリングするたびに全エンドポイントを手動で確認する羽目になる。

1. `todo.validator.spec.ts` — 存在チェックのテスト（存在する場合 / しない場合）
2. `todo.usecase.spec.ts` — 作成・更新のロジックテスト
3. `Test.createTestingModule` で Repository のモックを DI に差し替える

   ```bash
   yarn test
   ```

**nestjs-sample 参考:** `src/tag/tag.usecase.spec.ts`, `src/tag/tag.validator.spec.ts`

**調べるキーワード:** `NestJS Testing`, `Test.createTestingModule`, `Jest モック`, `DI でモックに差し替える`

---

### Task 19: ヘルスチェックエンドポイントを作る

**なぜやるか:** 本番環境では Kubernetes や AWS ELB がアプリの生存確認をする。`GET /health` がないと、アプリが落ちてもインフラが検知できず、ユーザーに障害が見え続ける。

1. Terminus をインストールする

   ```bash
   yarn add @nestjs/terminus
   ```

2. `src/health/health.controller.ts` を作成する
   - `GET /health` で DB 接続を含むヘルスチェックを返す
3. `src/health/health.module.ts` を作成する

**nestjs-sample 参考:** `src/health/`

**調べるキーワード:** `@nestjs/terminus`, `ヘルスチェック`, `Kubernetes liveness / readiness probe`

---

## Phase 4: 横断的関心事を導入する

### Task 20: エラーハンドリングを統一する（Exception Filter）

**なぜやるか:** エンドポイントごとにエラーレスポンスの形が違うと、フロントエンドがエラー処理を書けない。Exception Filter でアプリ全体のエラー形式を統一することで、フロントは「常に同じ構造」を期待できる。

**やらないと困ること:** あるエンドポイントは `{ message: "..." }` で、別のは `{ error: "..." }` で返ってくる。NestJS デフォルトのエラー形式は情報が少なく、デバッグしにくい。

1. `src/common/filters/problem-details.filter.ts` を作成する
   - すべての例外を統一した JSON 形式で返す
   - 例: `{ status, title, detail }` の形式
2. `main.ts` で `app.useGlobalFilters()` に登録する
3. わざと 404 や 400 を発生させて、レスポンス形式を確認する

**nestjs-sample 参考:** `src/common/filters/`

**調べるキーワード:** `NestJS Exception Filter`, `@Catch`, `useGlobalFilters`, `RFC 9457 Problem Details`

---

### Task 21: 環境変数を型安全に管理する（ConfigModule）

**なぜやるか:** `process.env.DATABASE_URL` を直接書くと、環境変数の設定漏れに起動してリクエストが来るまで気づけない。ConfigModule を使えば、アプリ起動時に「この環境変数がない」とエラーで落としてくれる。

**やらないと困ること:** 本番デプロイ後に `undefined` が紛れ込んで障害になる。

1. ConfigModule をインストールする

   ```bash
   yarn add @nestjs/config
   ```

2. `src/config/` にバリデーション付きの設定を作成する
3. `app.module.ts` で `ConfigModule.forRoot()` を設定する
4. `ConfigService` を DI で注入して値を取得する

**nestjs-sample 参考:** `src/config/`

**調べるキーワード:** `@nestjs/config`, `ConfigModule.forRoot`, `環境変数バリデーション`, `ConfigService`

---

### Task 22: Tag モジュールを追加してモジュール間連携を理解する

**なぜやるか:** 実務のアプリは複数のドメインが絡み合う。「Module A が Module B の機能を使う」ときの `imports` / `exports` の仕組みを理解していないと、モジュールを追加するたびに DI エラーで詰まる。

**やらないと困ること:** `Nest can't resolve dependencies of ...` というエラーが頻発し、原因がわからず時間を溶かす。

1. Prisma スキーマに `Tag` テーブルと中間テーブル `TodoTag` を追加する
2. `src/tag/` に Tag の CRUD を実装する（Todo と同じレイヤ構成）
3. Tag の Repository と Service を `src/tag/external/` に配置する
4. `TagModule` の `exports` に `external/` 配下のクラスだけ登録する
5. `TodoModule` の `imports` に `TagModule` を追加する
6. Todo の作成時にタグ名の配列を受け取り、自動でタグを作成・紐づけする

**nestjs-sample 参考:** `src/tag/`, `src/todo/todo.module.ts`

**調べるキーワード:** `NestJS Module imports / exports`, `多対多リレーション Prisma`, `中間テーブル`, `モジュール間依存`

---

### Task 23: CSV エクスポート機能を追加する

**なぜやるか:** 管理画面では「データを CSV でダウンロードしたい」という要件が頻出する。JSON を返すのとは異なり、ファイルとしてレスポンスを返す方法・ヘッダの設定方法を知っておく必要がある。

1. `GET /todos/export/csv` エンドポイントを追加する
2. Todo の一覧データを CSV 形式で返す
   - UTF-8 BOM 付き（Excel で文字化けしないため）
   - ヘッダ行 + データ行
3. レスポンスヘッダを設定する
   - `Content-Type: text/csv`
   - `Content-Disposition: attachment; filename="todos.csv"`

**nestjs-sample 参考:** `src/todo/admin-todo.controller.ts`, `src/common/services/`

**調べるキーワード:** `NestJS StreamableFile`, `Content-Disposition`, `CSV エクスポート`, `UTF-8 BOM`

---

## Phase 5: 発展（nestjs-sample を読んで理解する）

ここからは nestjs-sample のコードを読んで仕組みを理解するフェーズ。
余裕があれば自分のアプリにも導入してみること。

### Task 24: 認証の仕組みを読む

**なぜ理解が必要か:** ほぼすべての実務アプリで認証は必須。JWT + Cookie の仕組みを理解しておかないと、認証周りのバグ調査や機能追加ができない。

**読むファイル:** `src/auth/`

- JWT Cookie 認証の流れ（Guard → Strategy → Decorator → Controller）
- Admin / User で認証を切り替える `CompositeAuthGuard` の仕組み
- `@Public()` デコレータで認証をスキップする仕組み

**調べるキーワード:** `JWT（JSON Web Token）`, `NestJS Guard`, `Passport`, `httpOnly Cookie`, `@nestjs/passport`

---

### Task 25: 認可（CASL）の仕組みを読む

**なぜ理解が必要か:** 「管理者は全操作できるが、一般ユーザーは自分のデータしか触れない」のようなアクセス制御は実務で必ず出てくる。CASL はロールベースの権限管理を宣言的に書けるライブラリ。

**読むファイル:** `src/auth/external/casl-ability.factory.ts`, `src/auth/external/policies.guard.ts`

- ロール（admin / tenant_admin / tenant_user）ごとの権限定義
- `@CheckPolicy()` デコレータで Controller にポリシーを適用する仕組み
- Prisma クエリに自動で `where` 条件が付く仕組み

**調べるキーワード:** `CASL`, `RBAC（Role-Based Access Control）`, `NestJS Guard`, `@casl/prisma`

---

### Task 26: 監査ログの仕組みを読む

**なぜ理解が必要か:** 「誰が・いつ・何を・どう変えたか」を記録しておかないと、障害調査やコンプライアンス対応ができない。特に B2B SaaS では必須機能。

**読むファイル:** `src/audit-log/`, `src/todo/todo.usecase.ts`

- 作成・更新・削除時にどうログが記録されるか
- before / after のスナップショットの取り方
- Usecase 内でのトランザクション + 監査ログの組み合わせ方

**調べるキーワード:** `監査ログ（Audit Log）`, `Prisma トランザクション`, `before / after スナップショット`

---

## 進め方のコツ

1. **1 タスクずつ確実に** — 動作確認してから次に進む。`yarn start:dev` で常にサーバーを起動しておく
2. **エラーを読む** — NestJS の DI エラーは起動時に出る。メッセージに「何が足りないか」が書いてある
3. **nestjs-sample を先に読む** — 実装する前に該当ファイルを読んでパターンを掴む。丸写しではなく「なぜこう書いているか」を考える
4. **完璧を目指さない** — まず動くものを作る。リファクタリングは後でいい
5. **キーワードで調べる** — 各タスクの「調べるキーワード」で検索して、公式ドキュメントや記事を読む
