import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from './entities/bilateral-ai-job.entity';
import {
  bilateralAiDbNow,
  getBilateralAiAttemptTimeoutMs,
  getBilateralAiQueueStallMs,
} from './bilateral-ai.config';
import { isBilateralAiProcessingQueueConfigured } from '../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue.constants';
import { BilateralAiNotificationsService } from './services/bilateral-ai-notifications.service';

/**
 * `APF-T-3` — resolves stuck bilateral AI jobs into a terminal state (`design.md` §5 "Timeout &
 * stall sweeper", `requirements.md` `APF-R-2`, `APF-DD-2`). Follows `WebhookDispatchCron`
 * (`api/results/webhook/webhook-dispatch.cron.ts`): a named `@Cron`, a class-named `Logger`, and
 * an inert guard so a deploy with no queue configured never runs this — the same guard
 * `BilateralAiConsumer`'s microservice attach uses (`design.md` §11 "no feature flag").
 *
 * Every flip is a conditional `UPDATE … WHERE job_id = ? AND status = <expected>`
 * (`Repository#update`'s scoped `where`), and `notifyTerminal` only runs when that update
 * actually affected a row — so two API instances racing the same tick notify at most once
 * between them (`APF-R-2` C, D1).
 *
 * **All clocks in this cron are the database's.** Both windows are expressed as
 * `DATE_SUB(NOW(), INTERVAL <n> SECOND)` and both terminal writes use `bilateralAiDbNow`, so the
 * sweeper never mixes a process-zone `Date` with a DB-zone column. Before this fix the cutoffs
 * were built as `new Date(Date.now() - ms)` and serialized by mysql2 in the **Node process's**
 * local zone (there is no `timezone` option in `src/config/orm.config.ts`): a consumer on a
 * developer laptop (America/Bogota) writing `started_date` and this cron on prtest (UTC) reading
 * it disagreed by the whole 5 h offset, which timed a live job out ~48 s after it started and
 * declared `QUEUE_STALLED` while a consumer was demonstrably alive.
 *
 * The `INTERVAL` seconds are interpolated rather than bound: they come from the config getters
 * (`Math.round(ms / 1000)` of a JS number), never from request input, and the generated SQL is
 * what the regression tests pin.
 */
@Injectable()
export class BilateralAiSweeperCron {
  private readonly logger = new Logger(BilateralAiSweeperCron.name);

  constructor(
    @InjectRepository(BilateralAiJob)
    private readonly jobRepository: Repository<BilateralAiJob>,
    private readonly notificationsService: BilateralAiNotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'bilateral-ai-sweep' })
  async sweep(): Promise<void> {
    if (!isBilateralAiProcessingQueueConfigured()) return;
    // Separate try/catch per branch (Reviewer finding, attempt 2): a throw in the timeout branch
    // must not skip the stall branch on the same tick, and vice versa — the two checks are
    // independent and neither should starve the other because one query failed.
    try {
      await this.sweepTimedOutAttempts();
    } catch (error) {
      // A cron that throws risks losing its schedule in some setups; the rows stay stuck and the
      // next tick retries them (mirrors `WebhookDispatchCron.drainOutbox`).
      this.logger.error(
        'Bilateral AI sweeper: attempt-timeout branch failed',
        error as Error,
      );
    }
    try {
      await this.sweepStalledQueue();
    } catch (error) {
      this.logger.error(
        'Bilateral AI sweeper: queue-stall branch failed',
        error as Error,
      );
    }
  }

  /**
   * `APF-R-2` A — a job whose current attempt has run longer than the per-attempt timeout
   * (measured from `started_date`, not job creation, `APF-DD-3`) is presumed dead: the consumer
   * or the whole process died mid-attempt.
   */
  private async sweepTimedOutAttempts(): Promise<void> {
    // Was: `started_date: LessThan(new Date(Date.now() - getBilateralAiAttemptTimeoutMs()))`.
    const attemptTimeoutSeconds = Math.round(
      getBilateralAiAttemptTimeoutMs() / 1000,
    );
    const staleAttempts = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', {
        status: BilateralAiJobStatus.PROCESSING,
      })
      .andWhere(
        `job.started_date < DATE_SUB(NOW(), INTERVAL ${attemptTimeoutSeconds} SECOND)`,
      )
      .getMany();

    for (const job of staleAttempts) {
      const result = await this.jobRepository.update(
        { job_id: job.job_id, status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: 'TIMED_OUT',
          error_message:
            'The AI service did not respond within the attempt timeout.',
          completed_date: bilateralAiDbNow,
        },
      );
      if (!result?.affected) continue; // another instance (or the consumer) already won this flip
      this.logger.warn(
        `Bilateral AI job attempt timed out (jobId=${job.job_id}, error_code=TIMED_OUT).`,
      );
      // No `terminalDate` is threaded through any more: `notifyTerminal` re-reads the duration
      // from the row with `TIMESTAMPDIFF`, so the instant MySQL just wrote is the one it measures.
      await this.notificationsService.notifyTerminal(
        { ...job, error_code: 'TIMED_OUT' },
        'failed',
      );
    }
  }

  /**
   * `APF-R-2` B — the oldest queued job stalls only when NOTHING in `bilateral_ai_jobs` shows
   * worker activity (`started_date` or `stage_updated_date`) inside the same window. Age alone is
   * never sufficient: with `prefetchCount: 1` a job legitimately waits behind others that are
   * advancing.
   */
  private async sweepStalledQueue(): Promise<void> {
    // Was: `queue_entry_date: LessThan(new Date(Date.now() - getBilateralAiQueueStallMs()))` with
    // the same JS cutoff reused for the liveness count below.
    const queueStallSeconds = Math.round(getBilateralAiQueueStallMs() / 1000);
    const oldestPending = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: BilateralAiJobStatus.PENDING })
      .andWhere(
        `job.queue_entry_date < DATE_SUB(NOW(), INTERVAL ${queueStallSeconds} SECOND)`,
      )
      .orderBy('job.queue_entry_date', 'ASC')
      .getOne();
    if (!oldestPending) return;

    // Table-wide on purpose — not scoped to PENDING/PROCESSING or to this job: any recent
    // `started_date`/`stage_updated_date` anywhere is evidence a worker is alive right now.
    // Was: `count({ where: [{ started_date: MoreThan(cutoff) }, { stage_updated_date:
    // MoreThan(cutoff) }] })` — the OR is now one SQL predicate over the same DB-side window, so
    // a live consumer in another time zone is still seen as live (the exact case that produced a
    // spurious `QUEUE_STALLED` on prtest).
    const activeElsewhere = await this.jobRepository
      .createQueryBuilder('job')
      .where(
        `job.started_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds} SECOND) OR job.stage_updated_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds} SECOND)`,
      )
      .getCount();
    if (activeElsewhere > 0) return;

    const result = await this.jobRepository.update(
      { job_id: oldestPending.job_id, status: BilateralAiJobStatus.PENDING },
      {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_STALLED',
        error_message:
          'No AI worker picked up this job before the queue-stall window elapsed.',
        completed_date: bilateralAiDbNow,
      },
    );
    if (!result?.affected) return;
    this.logger.warn(
      `Bilateral AI queue stalled (jobId=${oldestPending.job_id}, error_code=QUEUE_STALLED).`,
    );
    await this.notificationsService.notifyTerminal(
      { ...oldestPending, error_code: 'QUEUE_STALLED' },
      'failed',
    );
  }
}
