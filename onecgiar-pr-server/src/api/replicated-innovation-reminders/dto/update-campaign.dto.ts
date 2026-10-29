// @akili-spec changes/replicated-innovation-reminders
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';
import { UTC_OFFSET } from './create-campaign.dto';

/** `PATCH /campaigns/:id` body: only the date can change (design §4). */
export class UpdateCampaignDto {
  @ApiProperty({
    description:
      'ISO-8601 instant with an explicit UTC offset; must be in the future.',
    example: '2026-12-01T09:00:00Z',
  })
  @IsISO8601({ strict: true })
  @Matches(UTC_OFFSET, {
    message: 'scheduled_at must carry a UTC offset (Z or +hh:mm)',
  })
  scheduled_at: string;
}
