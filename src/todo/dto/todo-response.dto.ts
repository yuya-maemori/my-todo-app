import { ApiProperty } from '@nestjs/swagger';
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
 * 4. Swagger が実行時にこの class のメタデータを読んで、ドキュメント を生成する
 */
export class TodoResponseDto {
  /**
   * TODO の一意識別子。DB の主キー。
   * Swagger では type: number, example: 1 として表示される
   */
  @ApiProperty({
    description: 'TODO の ID',
    example: 1,
  })
  id: number;

  /**
   * TODO のタイトル。
   * 最大 255 文字。
   */
  @ApiProperty({
    description: 'TODO のタイトル',
    example: 'ミーティングの資料を作成する',
  })
  title: string;

  /**
   * TODO の完了状態。
   * true = 完了、false = 未完了
   */
  @ApiProperty({
    description: 'TODO の完了状態',
    example: false,
  })
  completed: boolean;

  /**
   * TODO が作成された日時。ISO 8601 形式。
   */
  @ApiProperty({
    description: 'TODO の作成日時',
    example: '2026-04-09T01:49:55.913Z',
  })
  createdAt: Date;

  /**
   * TODO が最後に更新された日時。ISO 8601 形式。
   */
  @ApiProperty({
    description: 'TODO の更新日時',
    example: '2026-04-09T05:04:27.522Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: '紐づいているタグ一覧',
    example: [{ id: 1, name: '緊急' }],
  })
  tags: { id: number; name: string }[];

  constructor(data: {
    id: number;
    title: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
    tags: { id: number; name: string }[];
  }) {
    this.id = data.id;
    this.title = data.title;
    this.completed = data.completed;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.tags = data.tags;
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
    tags: model.tags,
  });
}

/**
 * 複数の Model からレスポンスDTOの配列に変換
 */
export function toTodoResponseDtos(models: TodoModel[]): TodoResponseDto[] {
  return models.map(toTodoResponseDto);
}
