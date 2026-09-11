import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhookDispatchService } from './webhook-dispatch.service';

/**
 * P2-3166 AC4 — the schedule that drains the outbox.
 *
 * Follows `ClarisaCronsService`: a named cron and a class-named `Logger`. `ScheduleModule.forRoot()`
 * is already global in `app.module.ts`.
 *
 * Idempotent by construction, which the repo requires of every scheduled task: the dispatcher claims
 * rows into SENDING before it sends, so a tick that overlaps the previous one finds nothing due
 * rather than POSTing twice.
 *
 * Every minute rather than something slower because the first attempt should feel immediate to the
 * receiving platform; the backoff is what spaces out the failures.
 */
@Injectable()
export class WebhookDispatchCron {
  private readonly _logger = new Logger(WebhookDispatchCron.name);

  constructor(private readonly _dispatchService: WebhookDispatchService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'webhook-dispatch' })
  async drainOutbox(): Promise<void> {
    try {
      await this._dispatchService.dispatchDue();
    } catch (error) {
      // A cron that throws is a cron that stops being scheduled in some setups. Swallow and log:
      // the rows are still in the outbox and the next tick retries them.
      this._logger.error('Webhook dispatch run failed', error as Error);
    }
  }
}
