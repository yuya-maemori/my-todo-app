import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '山田 太郎' })
  name: string;

  @ApiProperty({ example: 'user', enum: ['admin', 'user'] })
  role: string;
}
