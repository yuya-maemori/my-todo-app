import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Config } from '../config/config.schema';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * ConfigService でデータベース設定を型安全に注入
   *
   * ConfigService<Config> の型パラメータにより、
   * IDE は configService.get('DATABASE_URL') のように
   * 存在しないキーを入力しようとすると赤線を表示する
   */
  constructor(private config: ConfigService<Config>) {
    super({
      datasources: {
        db: {
          // .env ファイルから読み込まれた DATABASE_URL を使用
          url: config.get('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
