import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class AuthCodeValidationDto {
  @ApiProperty({ description: 'Authorization code from OAuth provider' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'OAuth provider', required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Redirect URI used when the OAuth flow was initiated',
    required: false,
    example: 'https://prtest.ciat.cgiar.org/auth',
  })
  @IsOptional()
  @IsUrl({ require_tld: true, protocols: ['https'] })
  redirectUri?: string;
}
