import { ApiProperty } from '@nestjs/swagger';

export class CreateAnnouncementNotificationDto {
  @ApiProperty({
    description: 'The text of the notification',
    example: 'The system will be open for QA review from June 15 to June 25.',
    required: true,
  })
  text: string;
}
