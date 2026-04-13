import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserAuthRepository } from './user-auth.repository';
import { UserAuthValidator } from './user-auth.validator';
import { UserJwtPayload, isValidUserRole } from '../types';
import { SignUpInput } from './schema/sign-up.schema';
import { LoginInput } from './schema/login.schema';

@Injectable()
export class UserAuthUsecase {
  private readonly bcryptRounds: number;
  private readonly accessTokenExpiresIn: number;

  constructor(
    private readonly repository: UserAuthRepository,
    private readonly validator: UserAuthValidator,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS') ?? 10;
    this.accessTokenExpiresIn =
      this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN') ?? 900;
  }

  async signUp(input: SignUpInput): Promise<{ accessToken: string }> {
    const existingUser = await this.repository.findByEmail(input.email);
    this.validator.ensureEmailNotTaken(existingUser);

    const passwordHash = await bcrypt.hash(input.password, this.bcryptRounds);

    const user = await this.repository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const role = isValidUserRole(user.role) ? user.role : 'user';
    const payload: UserJwtPayload = { sub: user.id, email: user.email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    return { accessToken };
  }

  async login(input: LoginInput): Promise<{ accessToken: string }> {
    const user = await this.repository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    await this.validator.ensurePasswordMatch(input.password, user.passwordHash);

    const role = isValidUserRole(user.role) ? user.role : 'user';
    const payload: UserJwtPayload = { sub: user.id, email: user.email, role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });

    return { accessToken };
  }

  async getMe(userId: number) {
    const user = await this.repository.findById(userId);
    return this.validator.ensureUserExists(user);
  }
}
