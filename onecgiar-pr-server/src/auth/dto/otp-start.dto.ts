import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

// @akili-spec changes/cognito-email-otp-login (OTP-T-5, design.md §4.1, §5.1)
export class OtpStartDto {
  @ApiProperty({
    description: 'Center-path (email OTP) sign-in email',
    example: 'user@icrisat.org',
  })
  @IsEmail()
  @MaxLength(254)
  email: string;
}
