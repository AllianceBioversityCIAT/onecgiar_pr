import { ApiProperty } from '@nestjs/swagger';

export class EmailBodyMessageDto {
  @ApiProperty({ required: false })
  text?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  socketFile?: string;
}

export class EmailBodyDto {
  @ApiProperty()
  subject: string;

  @ApiProperty()
  to: string[];

  @ApiProperty({ required: false, isArray: true, type: String })
  cc?: string[];

  @ApiProperty({ required: false, isArray: true, type: String })
  bcc?: string;

  @ApiProperty({ type: EmailBodyMessageDto })
  message: EmailBodyMessageDto;
}

export class FromBodyDto {
  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  name?: string;
}

export class ConfigMessageDto {
  @ApiProperty({ type: FromBodyDto, required: false })
  from?: FromBodyDto;

  @ApiProperty({ type: EmailBodyDto })
  emailBody: EmailBodyDto;
}
