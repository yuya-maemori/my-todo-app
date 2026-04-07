import { Controller, Get, Param, Query} from '@nestjs/common';

@Controller('hello')
export class HelloController {
  @Get()
  getHello(@Query('lang') lang?: string) {
    const message = lang === 'ja' ? 'こんにちは' : 'Hello';
    return { message };
  }

  @Get(':name')
  getHelloWithName(@Param('name') name: string) {
    return { message: `Hello, ${name}!` };
  }
}
