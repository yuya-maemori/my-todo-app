import { Controller, Get, Param, Query } from '@nestjs/common';
import { HelloUsecase } from './hello.usecase';

@Controller('hello')
export class HelloController {
  constructor(private helloUsecase: HelloUsecase) {}
  
  @Get()
  getHello(@Query('lang') lang?: string) {
    const message = this.helloUsecase.getGreeting(undefined, lang);
    return { message };
  }

  @Get(':name')
  getHelloWithName(
    @Param('name') name: string,
    @Query('lang') lang?: string
  ) {
    const message = this.helloUsecase.getGreeting(name, lang);
    return { message };
  }
}
