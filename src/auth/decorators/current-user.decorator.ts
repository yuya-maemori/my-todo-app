import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserJwtPayload } from '../types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserJwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserJwtPayload;
  },
);
