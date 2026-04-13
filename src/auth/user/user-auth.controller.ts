import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserAuthUsecase } from './user-auth.usecase';
import { AuthResponseDto } from './dto/user-auth-response.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { signUpSchema, SignUpInput } from './schema/sign-up.schema';
import { loginSchema, LoginInput } from './schema/login.schema';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserAuthGuard } from '../external/user-auth.guard';
import { UserJwtPayload } from '../types';

@ApiTags('auth')
@Controller('auth')
@UseGuards(UserAuthGuard)
export class UserAuthController {
  private readonly accessTokenExpiresIn: number;

  constructor(
    private readonly usecase: UserAuthUsecase,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiresIn =
      this.configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN') ?? 900;
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(signUpSchema))
  @ApiOperation({ summary: '新規ユーザー登録' })
  @ApiResponse({ status: 201, description: '登録成功。access_token Cookie がセットされます。' })
  async signUp(
    @Body() body: SignUpInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken } = await this.usecase.signUp(body);
    this.setCookie(response, accessToken);
    return { message: '登録が完了しました' };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  @ApiOperation({ summary: 'ログイン' })
  @ApiResponse({ status: 200, description: 'ログイン成功。access_token Cookie がセットされます。' })
  async login(
    @Body() body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken } = await this.usecase.login(body);
    this.setCookie(response, accessToken);
    return { message: 'ログインしました' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ログアウト' })
  @ApiResponse({ status: 200, description: 'Cookie を削除してログアウト。' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'ログアウトしました' };
  }

  @Get('me')
  @ApiOperation({ summary: '自分のユーザー情報を取得' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async getMe(@CurrentUser() currentUser: UserJwtPayload) {
    const user = await this.usecase.getMe(currentUser.sub);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies AuthResponseDto;
  }

  private setCookie(response: Response, token: string): void {
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: this.accessTokenExpiresIn * 1000,
      path: '/',
    });
  }
}
