import { ApiProperty } from '@nestjs/swagger';
import { TagModel } from '../tag.model';

export class TagResponseDto {
  @ApiProperty({ description: 'Tag の ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Tag の名前', example: '緊急' })
  name: string;

  @ApiProperty({
    description: 'Tag の作成日時',
    example: '2026-04-10T04:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Tag の更新日時',
    example: '2026-04-10T04:00:00.000Z',
  })
  updatedAt: Date;

  constructor(data: {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export function toTagResponseDto(model: TagModel): TagResponseDto {
  return new TagResponseDto({
    id: model.id,
    name: model.name,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

export function toTagResponseDtos(models: TagModel[]): TagResponseDto[] {
  return models.map(toTagResponseDto);
}
