import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthCodeValidationDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'OAuth provider', required: false })
  @IsString()
  provider?: string;
}
