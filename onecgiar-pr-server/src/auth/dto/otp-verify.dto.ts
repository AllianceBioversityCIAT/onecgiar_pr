import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5, design.md §4.1, §5.1)
export class OtpVerifyDto {
  @ApiProperty({
    description: 'Center-path (email OTP) sign-in email',
    example: 'user@icrisat.org',
  })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({
    description: 'One-time code delivered by the provider (4-10 digits)',
    example: '123456',
  })
  @Matches(/^\d{4,10}$/)
  code: string;

  @ApiProperty({
    description:
      'Opaque session returned by the start route (real or decoy) — always required, never empty',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  session: string;
}
