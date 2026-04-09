import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HelloModule } from './hello/hello.module';
import { TodoModule } from './todo/todo.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, HelloModule, TodoModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
