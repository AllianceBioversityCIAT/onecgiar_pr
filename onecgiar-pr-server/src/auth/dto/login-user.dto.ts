import { ApiProperty } from '@nestjs/swagger';

export class UserLoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    required: true,
  })
  password: string;
}
