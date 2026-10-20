// @akili-spec changes/replicated-innovation-reminders
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, Matches } from 'class-validator';
import { ReplicatedReminderKind } from '../entities/replicated-innovation-reminder-campaign.entity';

/** An ISO-8601 instant that carries an explicit UTC offset (`Z` or `+hh:mm`), never a local time. */
export const UTC_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

/** `POST /campaigns` body (design §4). The future-date rule needs the clock, so the service owns it. */
export class CreateCampaignDto {
  @ApiProperty({ enum: ReplicatedReminderKind })
  @IsIn(Object.values(ReplicatedReminderKind))
  kind: ReplicatedReminderKind;

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
