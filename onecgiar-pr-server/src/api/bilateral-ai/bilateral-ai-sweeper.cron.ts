import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from './entities/bilateral-ai-job.entity';
import {
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
    const cutoff = new Date(Date.now() - getBilateralAiAttemptTimeoutMs());
    const staleAttempts = await this.jobRepository.find({
      where: {
        status: BilateralAiJobStatus.PROCESSING,
        started_date: LessThan(cutoff),
      },
    });

    for (const job of staleAttempts) {
      const terminalDate = new Date();
      const result = await this.jobRepository.update(
        { job_id: job.job_id, status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: 'TIMED_OUT',
          error_message:
            'The AI service did not respond within the attempt timeout.',
          completed_date: terminalDate,
        },
      );
      if (!result?.affected) continue; // another instance (or the consumer) already won this flip
      this.logger.warn(
        `Bilateral AI job attempt timed out (jobId=${job.job_id}, error_code=TIMED_OUT).`,
      );
      await this.notificationsService.notifyTerminal(
        { ...job, error_code: 'TIMED_OUT' },
        'failed',
        { terminalDate },
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
    const cutoff = new Date(Date.now() - getBilateralAiQueueStallMs());
    const oldestPending = await this.jobRepository.findOne({
      where: {
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: LessThan(cutoff),
      },
      order: { queue_entry_date: 'ASC' },
    });
    if (!oldestPending) return;

    // Table-wide on purpose — not scoped to PENDING/PROCESSING or to this job: any recent
    // `started_date`/`stage_updated_date` anywhere is evidence a worker is alive right now.
    const activeElsewhere = await this.jobRepository.count({
      where: [
        { started_date: MoreThan(cutoff) },
        { stage_updated_date: MoreThan(cutoff) },
      ],
    });
    if (activeElsewhere > 0) return;

    const terminalDate = new Date();
    const result = await this.jobRepository.update(
      { job_id: oldestPending.job_id, status: BilateralAiJobStatus.PENDING },
      {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_STALLED',
        error_message:
          'No AI worker picked up this job before the queue-stall window elapsed.',
        completed_date: terminalDate,
      },
    );
    if (!result?.affected) return;
    this.logger.warn(
      `Bilateral AI queue stalled (jobId=${oldestPending.job_id}, error_code=QUEUE_STALLED).`,
    );
    await this.notificationsService.notifyTerminal(
      { ...oldestPending, error_code: 'QUEUE_STALLED' },
      'failed',
      { terminalDate },
    );
  }
}
