import { ApiProperty } from '@nestjs/swagger';

export class CognitoProfileDto {
  @ApiProperty()
  public sub: string;

  @ApiProperty()
  public identities: string;

  @ApiProperty()
  public email_verified: string;

  @ApiProperty()
  public name: string;

  @ApiProperty()
  public given_name: string;

  @ApiProperty()
  public family_name: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public username: string;
}
