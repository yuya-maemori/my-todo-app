import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HelloModule } from './hello/hello.module';
import { TodoModule } from './todo/todo.module';
import { TagModule } from './tag/tag.module';
import { HealthModule } from './health/health.module';
import { ConfigSchema } from './config/config.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const parsed = ConfigSchema.safeParse(config);
        if (!parsed.success) {
          console.error('環境変数のバリデーションエラー:', parsed.error);
          throw new Error('環境変数のバリデーションに失敗しました');
        }
        return parsed.data;
      },
    }),
    PrismaModule,
    HelloModule,
    TodoModule,
    TagModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
