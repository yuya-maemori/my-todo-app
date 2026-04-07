import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { HelloUsecase } from './hello.usecase';

@Module({
  controllers: [HelloController],
  providers: [HelloUsecase],
})
export class HelloModule {}
