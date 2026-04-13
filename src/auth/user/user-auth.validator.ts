import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserAuthValidator {
  ensureEmailNotTaken(existingUser: User | null): void {
    if (existingUser) {
      throw new ConflictException(
        'このメールアドレスはすでに使用されています',
      );
    }
  }

  ensureUserExists(user: User | null): User {
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }
    return user;
  }

  async ensurePasswordMatch(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    if (!isMatch) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }
  }
}
