import { ApiProperty } from '@nestjs/swagger';

export class CompletePasswordChallengeDto {
  @ApiProperty({
    description: 'Username (email)',
    example: 'user@cgiar.org',
  })
  username: string;

  @ApiProperty({
    description: 'New password to set',
    example: 'NewSecurePassword123!',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Session token from the challenge response',
    example: 'AYABeC...',
  })
  session: string;
}
