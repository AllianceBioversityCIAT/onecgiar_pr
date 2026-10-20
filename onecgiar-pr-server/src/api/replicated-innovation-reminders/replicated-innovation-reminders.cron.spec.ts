// @akili-spec changes/replicated-innovation-reminders
import { Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { ReplicatedInnovationReminderCron } from './replicated-innovation-reminders.cron';

/** `RIR-T-5` / `RIR-R-6` — the hourly tick calls `dispatchDue` and never throws. */
describe('ReplicatedInnovationReminderCron', () => {
  afterEach(() => jest.restoreAllMocks());

  it('calls dispatchDue', async () => {
    const dispatcher: any = { dispatchDue: jest.fn().mockResolvedValue([]) };
    await new ReplicatedInnovationReminderCron(
      dispatcher,
    ).dispatchDueCampaigns();
    expect(dispatcher.dispatchDue).toHaveBeenCalledTimes(1);
  });

  it('swallows an error and logs only its class name (no address)', async () => {
    const logged: string[] = [];
    jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((m: any) => void logged.push(String(m)));
    const dispatcher: any = {
      dispatchDue: jest
        .fn()
        .mockRejectedValue(new Error('smtp failed for secret@example.org')),
    };
    await expect(
      new ReplicatedInnovationReminderCron(dispatcher).dispatchDueCampaigns(),
    ).resolves.toBeUndefined();
    expect(logged).toHaveLength(1);
    expect(logged[0]).not.toContain('@');
    expect(logged[0]).toContain('Error');
  });

  it('is registered as a named hourly @Cron', () => {
    const fn = ReplicatedInnovationReminderCron.prototype.dispatchDueCampaigns;
    const options = Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', fn);
    expect(options.name).toBe('replicated-innovation-reminders');
    expect(options.cronTime).toBe(CronExpression.EVERY_HOUR);
  });
});
