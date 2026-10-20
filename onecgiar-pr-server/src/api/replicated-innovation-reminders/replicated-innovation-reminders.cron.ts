// @akili-spec changes/replicated-innovation-reminders
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReminderDispatcher } from './reminder-dispatcher.service';

/**
 * `RIR-T-5` / `RIR-R-6` — hourly tick that dispatches every due PENDING campaign.
 *
 * Both PROD servers run it; exactly-once is the dispatcher's MySQL claim, so overlapping ticks are
 * harmless. Follows `WebhookDispatchCron`: a named cron, errors swallowed so the schedule survives.
 * Only the error class name is logged: a driver or SMTP message can carry an address (AC-9).
 */
@Injectable()
export class ReplicatedInnovationReminderCron {
  private readonly _logger = new Logger(ReplicatedInnovationReminderCron.name);

  constructor(private readonly _dispatcher: ReminderDispatcher) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'replicated-innovation-reminders' })
  async dispatchDueCampaigns(): Promise<void> {
    try {
      await this._dispatcher.dispatchDue();
    } catch (error) {
      this._logger.error(
        `Reminder dispatch run failed: ${(error as Error)?.name ?? 'Error'}`,
      );
    }
  }
}
