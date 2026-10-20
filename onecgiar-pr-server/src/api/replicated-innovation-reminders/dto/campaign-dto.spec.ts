// @akili-spec changes/replicated-innovation-reminders
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplicatedReminderKind } from '../entities/replicated-innovation-reminder-campaign.entity';
import { CreateCampaignDto } from './create-campaign.dto';
import { UpdateCampaignDto } from './update-campaign.dto';

/** `RIR-T-5` — DTO validation: the date must be ISO-8601 WITH a UTC offset; `kind` is one of the two. */
const errorsOf = async (cls: any, plain: object) =>
  (await validate(plainToInstance(cls, plain))).map((e) => e.property);

describe('Campaign DTOs', () => {
  const kind = ReplicatedReminderKind.Q4_NOTICE;

  it.each([
    ['rejects a zone-less date', '2026-12-01T09:00:00', false],
    ['accepts Z', '2026-12-01T09:00:00Z', true],
    ['accepts +05:00', '2026-12-01T09:00:00+05:00', true],
    ['rejects a non-date', 'tomorrow', false],
  ])('create DTO %s', async (_n, scheduled_at, ok) => {
    const errors = await errorsOf(CreateCampaignDto, { kind, scheduled_at });
    expect(errors.length === 0).toBe(ok);
    if (!ok) expect(errors).toContain('scheduled_at');
  });

  it('create DTO rejects a bad kind', async () => {
    const errors = await errorsOf(CreateCampaignDto, {
      kind: 'WEEKLY',
      scheduled_at: '2026-12-01T09:00:00Z',
    });
    expect(errors).toEqual(['kind']);
  });

  it.each([
    ['rejects a zone-less date', '2026-12-01T09:00:00', false],
    ['accepts Z', '2026-12-01T09:00:00Z', true],
    ['accepts +05:00', '2026-12-01T09:00:00+05:00', true],
  ])('update DTO %s', async (_n, scheduled_at, ok) => {
    const errors = await errorsOf(UpdateCampaignDto, { scheduled_at });
    expect(errors.length === 0).toBe(ok);
  });
});
