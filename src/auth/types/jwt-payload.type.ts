import { UserRole } from './role.type';

export interface UserJwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
