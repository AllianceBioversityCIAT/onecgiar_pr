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
import { BilateralAiDispatchService } from './services/bilateral-ai-dispatch.service';

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
    // `AIQ-T-3` (`design.md` §5.3, §5.4): the sweeper is both a lane-freeing path (after each
    // `TIMED_OUT`/`QUEUE_STALLED` flip) and the safety net that wakes every tick regardless of
    // whether anything flipped (`AIQ-R-2` B).
    private readonly dispatchService: BilateralAiDispatchService,
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
    // `AIQ-T-3` (`design.md` §5.3 "Sweeper tick": always, the safety net for `AIQ-R-2` B) — runs
    // even when neither branch above flipped anything, recovering a lost re-dispatch after a
    // process crash. Outside both branch try/catches above, so it gets its own: `wake` documents
    // itself as never-throwing, but a cron tick must never fail its own schedule over this.
    try {
      await this.dispatchService.wake('sweep');
    } catch (error) {
      this.logger.error('Bilateral AI sweeper: wake failed', error as Error);
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
      // `AIQ-T-3` (`design.md` §5.3 P-5): this flip just freed a running lane — wake the next
      // eligible parked job instead of waiting for the top-of-tick safety net.
      await this.dispatchService.wake('sweep');
    }
  }

  /**
   * `APF-R-2` B / `AIQ-R-4` (`AIQ-DD-5`) — the oldest queued job stalls only when BOTH hold:
   * nothing in `bilateral_ai_jobs` shows worker activity (`started_date` or `stage_updated_date`)
   * inside the same window, AND the job is not waiting on its own owner's `PROCESSING` job (a
   * legitimately parked per-user-cap wait must never read as a stalled queue, `design.md` §5.4).
   * Age alone is never sufficient: the queue's `prefetchCount` now tracks the global lane cap
   * (`AIQ-T-1`), not a fixed `1`, so several jobs can legitimately be running or advancing at once
   * while others wait their turn. Before flipping, `dispatch.wake('sweep')` gives the job one more
   * chance to be picked up (§5.4); a second, distinct `wake` follows the flip itself, once it
   * actually affects a row (§5.3's "after each … QUEUE_STALLED flip").
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

    // `AIQ-R-4` Scenario A / `AIQ-DD-5`: a job is never `QUEUE_STALLED` while it is legitimately
    // parked behind its own owner's `PROCESSING` job — existence of that row is what matters here,
    // not freshness (the table-wide liveness check above already owns freshness). Scoped to this
    // job's own `user_id`, never table-wide, so it cannot be satisfied by a stranger's job.
    const ownerRunning = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', {
        status: BilateralAiJobStatus.PROCESSING,
      })
      .andWhere('job.user_id = :userId', { userId: oldestPending.user_id })
      .getCount();
    if (ownerRunning > 0) return;

    // `AIQ-DD-5` (`design.md` §5.4): "the stall rule tries dispatch first" — one more chance to be
    // picked up before this job is given up on. The conditional `UPDATE` below is still scoped to
    // `status = PENDING`, which is what actually re-checks "only if still PENDING" after this call.
    await this.dispatchService.wake('sweep');

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
    // `AIQ-T-3` (`design.md` §5.3 P-5, task Description "after each sweeper TIMED_OUT and
    // QUEUE_STALLED flip"): distinct from the pre-flip `wake('sweep')` above (§5.4's "tries
    // dispatch first") — this one follows the flip that just affected a row, mirroring the
    // TIMED_OUT branch's post-flip wake.
    await this.dispatchService.wake('sweep');
  }
}
