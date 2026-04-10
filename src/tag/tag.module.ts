import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TagController } from './tag.controller';
import { TagUsecase } from './tag.usecase';
import { TagValidator } from './tag.validator';
import { TagRepository } from './external/tag.repository';
import { TagService } from './external/tag.service';

/**
 * Tag Module
 *
 * exports に external/ 配下の TagService と TagRepository だけを登録。
 * → 他モジュール（TodoModule）はこの2つだけを使える。
 * → TagUsecase, TagValidator は内部実装として隠蔽される。
 */
@Module({
  imports: [PrismaModule],
  controllers: [TagController],
  providers: [TagUsecase, TagValidator, TagRepository, TagService],
  exports: [TagService, TagRepository],
})
export class TagModule {}
