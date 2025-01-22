import { ApiProperty } from '@nestjs/swagger';

export class UserNotificationSettingDto {
  @ApiProperty({
    example: 10,
    description: 'The ID of the Init/SGP/Platform',
    type: 'number',
    required: true,
  })
  initiative_id: number;

  @ApiProperty({
    example: false,
    description:
      'Whether email notifications for contribution requests are enabled',
    type: 'boolean',
    required: false,
  })
  email_notifications_contributing_request_enabled?: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether email notifications for initial users are enabled',
    type: 'boolean',
    required: false,
  })
  email_notifications_updates_enabled?: boolean;
}
