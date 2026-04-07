import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloUsecase {
  getGreeting(name?: string, lang?: string): string {
    const greeting = lang === 'ja' ? 'こんにちは' : 'Hello';
    if (name) {
      return `${greeting}, ${name}!`;
    }
    return greeting;
  }
}
