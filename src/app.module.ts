import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [PrismaModule, HelloModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
