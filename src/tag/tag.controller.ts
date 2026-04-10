import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { TagUsecase } from './tag.usecase';
import {
  TagResponseDto,
  toTagResponseDto,
  toTagResponseDtos,
} from './dto/tag-response.dto';
import { createTagSchema, CreateTagDto } from './schema/create-tag.schema';
import { updateTagSchema, UpdateTagDto } from './schema/update-tag.schema';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('tags')
@ApiTags('tags')
export class TagController {
  constructor(private usecase: TagUsecase) {}

  @Get()
  @ApiOperation({ summary: 'Tag 一覧を取得' })
  @ApiResponse({ status: 200, description: 'Tag 一覧取得成功', type: [TagResponseDto] })
  async getTags(): Promise<TagResponseDto[]> {
    const models = await this.usecase.getTags();
    return toTagResponseDtos(models);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Tag 詳細を取得' })
  @ApiParam({ name: 'id', description: 'Tag の ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Tag 詳細取得成功', type: TagResponseDto })
  @ApiNotFoundResponse({ description: '指定された ID の Tag が見つかりません' })
  async getTag(@Param('id', ParseIntPipe) id: number): Promise<TagResponseDto> {
    const model = await this.usecase.getTagById(id);
    return toTagResponseDto(model);
  }

  @Post()
  @ApiOperation({ summary: '新しい Tag を作成' })
  @ApiResponse({ status: 201, description: 'Tag 作成成功', type: TagResponseDto })
  @ApiBadRequestResponse({ description: 'バリデーションエラー' })
  @ApiConflictResponse({ description: '同名の Tag が既に存在します' })
  async createTag(
    @Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    const model = await this.usecase.createTag(dto);
    return toTagResponseDto(model);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Tag を更新' })
  @ApiParam({ name: 'id', description: 'Tag の ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Tag 更新成功', type: TagResponseDto })
  @ApiBadRequestResponse({ description: 'バリデーションエラー' })
  @ApiNotFoundResponse({ description: '指定された ID の Tag が見つかりません' })
  @ApiConflictResponse({ description: '同名の Tag が既に存在します' })
  async updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateTagSchema)) dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    const model = await this.usecase.updateTag(id, dto);
    return toTagResponseDto(model);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Tag を削除' })
  @ApiParam({ name: 'id', description: 'Tag の ID', example: 1 })
  @ApiResponse({ status: 204, description: 'Tag 削除成功' })
  @ApiNotFoundResponse({ description: '指定された ID の Tag が見つかりません' })
  async deleteTag(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usecase.deleteTag(id);
  }
}
