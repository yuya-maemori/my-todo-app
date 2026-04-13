import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { UserAuthController } from './user/user-auth.controller';
import { UserAuthUsecase } from './user/user-auth.usecase';
import { UserAuthValidator } from './user/user-auth.validator';
import { UserAuthRepository } from './user/user-auth.repository';
import { UserAuthGuard } from './external/user-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<number>('JWT_ACCESS_TOKEN_EXPIRES_IN') ?? 900,
        },
      }),
    }),
  ],
  controllers: [UserAuthController],
  providers: [
    UserAuthUsecase,
    UserAuthValidator,
    UserAuthRepository,
    UserAuthGuard,
  ],
  exports: [UserAuthGuard],
})
export class AuthModule {}
