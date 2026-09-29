import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from '../entities/bilateral-ai-job.entity';
import {
  getBilateralAiMaxConcurrent,
  getBilateralAiMaxPerUser,
} from '../bilateral-ai.config';
import { BilateralAiProcessingQueuePublisherService } from '../../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue-publisher.service';
import { BilateralAiService } from './bilateral-ai.service';

/**
 * The six outcomes `decide()` can return for a message `{jobId: X}` (`design.md` §2.3, one row
 * per case). `redirect` carries the id of the job that was published in `X`'s place.
 */
export type BilateralAiDispatchDecision =
  | { kind: 'run' }
  | { kind: 'resume-retry' }
  | { kind: 'park' }
  | { kind: 'redirect'; jobId: string }
  | { kind: 'noop' }
  | { kind: 'lock-timeout' };

interface EligibleJobRow {
  job_id: string;
  user_id: number;
}

/**
 * `AIQ-T-2` — claim-or-redirect under a MySQL named lock (`design.md` §2.3, §5.1, §5.2, `AIQ-DD-1`,
 * `AIQ-DD-3`).
 *
 * P-25 (settled, `client-proxy.js:57-68` in `@nestjs/microservices` 11.0.4): `ClientProxy.emit`
 * calls `connectableSource.connect()` unconditionally before returning, so the underlying publish
 * begins executing regardless of whether the caller subscribes to the returned `Observable` — the
 * existing `BilateralAiProcessingQueuePublisherService.publish` (fire-and-forget, no subscribe) is
 * therefore already sufficient for `wake`/redirect publishing; no wrapper subscribe was added.
 *
 * The lock (`GET_LOCK('prms_bilateral_ai_dispatch', 10)`) is acquired on one dedicated
 * `QueryRunner` because MySQL named locks are session-scoped: acquire and release MUST share a
 * connection, or `RELEASE_LOCK` silently does nothing. The eligibility reads (running count,
 * owners at cap, oldest eligible) run on that same connection via `queryRunner.manager` so the
 * decision is made against one consistent snapshot while the lock is held. The claim write itself
 * reuses `BilateralAiService.attemptStart` **unchanged** (P-2's existing conditional
 * `UPDATE … WHERE job_id = ? AND status = 'PENDING'`) — a WHERE-scoped conditional update is
 * atomic per-row regardless of which connection issues it, so running it through the service's own
 * pooled repository (rather than duplicating the WHERE clause against this dedicated connection)
 * keeps the disqualifier's "WHERE clauses stay exactly as they are" literal.
 *
 * Every job this dispatches through `run` was **already flipped to `PROCESSING` by this method**
 * before `processJob` is called. Calling `processJob`'s own internal `attemptStart` a second time
 * on that same row would find it no longer `PENDING` (and not `retrying`) and abort with 0 rows
 * affected — so the consumer calls `processJob(jobId, { skipClaim: true })` for the `run` outcome.
 * `resume-retry` needs no lock (`AIQ-R-1` F) and calls `processJob(jobId)` exactly as before.
 */
@Injectable()
export class BilateralAiDispatchService {
  private readonly logger = new Logger(BilateralAiDispatchService.name);
  private static readonly LOCK_NAME = 'prms_bilateral_ai_dispatch';
  private static readonly LOCK_TIMEOUT_SECONDS = 10;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(BilateralAiJob)
    private readonly jobRepository: Repository<BilateralAiJob>,
    private readonly bilateralAiService: BilateralAiService,
    private readonly queue: BilateralAiProcessingQueuePublisherService,
  ) {}

  /**
   * The decision for message `{jobId}` (`design.md` §2.3). Rows not found / `COMPLETED` /
   * `FAILED` / already-owned `PROCESSING` never touch the lock (§2.3: "no lock needed").
   */
  async decide(jobId: string): Promise<BilateralAiDispatchDecision> {
    const job = await this.jobRepository.findOne({ where: { job_id: jobId } });
    if (
      !job ||
      job.status === BilateralAiJobStatus.COMPLETED ||
      job.status === BilateralAiJobStatus.FAILED
    ) {
      this.logger.log(
        `Bilateral AI dispatch: noop(${jobId}) — not found or terminal.`,
      );
      return { kind: 'noop' };
    }
    if (job.status === BilateralAiJobStatus.PROCESSING) {
      if (job.retrying) {
        this.logger.log(`Bilateral AI dispatch: resume-retry(${jobId}).`);
        return { kind: 'resume-retry' };
      }
      this.logger.log(
        `Bilateral AI dispatch: noop(${jobId}) — already owned by another consumer.`,
      );
      return { kind: 'noop' };
    }

    // job.status === PENDING from here — the only case that needs the lock.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let locked = false;
    try {
      locked = await this.acquireLock(queryRunner);
      if (!locked) {
        this.logger.warn(`Bilateral AI dispatch: lock-timeout(${jobId}).`);
        return { kind: 'lock-timeout' };
      }

      const manager = queryRunner.manager;
      const globalCap = getBilateralAiMaxConcurrent();
      const perUserCap = getBilateralAiMaxPerUser();
      const runningCount = await this.runningCount(manager);

      // Only a genuinely full queue parks X outright (Reviewer A, attempt 2). If X's own owner
      // is at the per-user cap but a lane is free, X still must not just park: `oldestEligible`
      // (below) excludes X's owner and finds the next eligible job, if any — `design.md` §2.3's
      // "park X, publish {jobId: E}" row, not the "no free lane" row.
      // Only a genuinely full queue parks X outright (Reviewer A, attempt 2). If X's own owner
      // is at the per-user cap but a lane is free, X still must not just park: `oldestEligible`
      // (below) excludes X's owner and finds the next eligible job, if any — `design.md` §2.3's
      // "park X, publish {jobId: E}" row, not the "no free lane" row.
      if (runningCount >= globalCap) {
        this.logger.log(
          `Bilateral AI dispatch: parked(${jobId}, no_free_lane).`,
        );
        return { kind: 'park' };
      }

      const ownersAtCap = await this.ownersAtCap(manager, perUserCap);
      const oldest = await this.oldestEligible(manager, ownersAtCap);
      if (!oldest) {
        // Either X's owner is at cap and nothing else is eligible, or the row changed
        // concurrently (defensive) — either way, §2.3's park row.
        this.logger.log(
          `Bilateral AI dispatch: parked(${jobId}, own_job_running).`,
        );
        return { kind: 'park' };
      }

      if (oldest.job_id === job.job_id) {
        // Claim runs on THIS lock-holding connection (`manager`), not the service's pooled
        // repository — `design.md` §5.2: "acquire, decide, claim and release must share that
        // connection" (Reviewer A, attempt 2).
        const claimed = await this.bilateralAiService.attemptStart(
          job,
          manager,
        );
        if (!claimed) {
          this.logger.log(
            `Bilateral AI dispatch: noop(${jobId}) — lost the claim race.`,
          );
          return { kind: 'noop' };
        }
        this.logger.log(`Bilateral AI dispatch: claimed(${jobId}).`);
        return { kind: 'run' };
      }

      this.queue.publish({ jobId: oldest.job_id });
      this.logger.log(
        `Bilateral AI dispatch: parked(${jobId}), redirected(to ${oldest.job_id}).`,
      );
      return { kind: 'redirect', jobId: oldest.job_id };
    } finally {
      if (locked) await this.releaseLock(queryRunner);
      await this.releaseRunner(queryRunner);
    }
  }

  /**
   * Publishes the oldest eligible job for each free lane (`design.md` §5.3, §5.7). Called from
   * every lane-freeing path (`AIQ-T-3`) and the sweeper's safety net. Never throws — a failure to
   * acquire the lock or to publish is logged and swallowed, since the sweeper's next tick (or the
   * next terminal transition) recovers.
   */
  async wake(reason: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    let locked = false;
    let published = 0;
    try {
      locked = await this.acquireLock(queryRunner);
      if (!locked) {
        this.logger.warn(
          `Bilateral AI dispatch: wake(${reason}) lock-timeout.`,
        );
        return;
      }

      const manager = queryRunner.manager;
      const globalCap = getBilateralAiMaxConcurrent();
      const perUserCap = getBilateralAiMaxPerUser();
      const runningCount = await this.runningCount(manager);
      let freeLanes = Math.max(0, globalCap - runningCount);
      if (freeLanes === 0) return;

      const ownersAtCap = await this.ownersAtCap(manager, perUserCap);
      const reservedJobIds = new Set<string>();
      const reservedOwners = new Set<number>();

      while (freeLanes > 0) {
        const excludedOwners = new Set<number>([
          ...ownersAtCap,
          ...reservedOwners,
        ]);
        const next = await this.oldestEligible(
          manager,
          excludedOwners,
          reservedJobIds,
        );
        if (!next) break;
        this.queue.publish({ jobId: next.job_id });
        reservedJobIds.add(next.job_id);
        reservedOwners.add(next.user_id);
        published += 1;
        freeLanes -= 1;
      }
    } catch (error) {
      this.logger.error(
        `Bilateral AI dispatch: wake(${reason}) failed.`,
        error as Error,
      );
    } finally {
      if (locked) await this.releaseLock(queryRunner);
      await this.releaseRunner(queryRunner);
      this.logger.log(
        `Bilateral AI dispatch: wake(${reason}, published ${published}).`,
      );
    }
  }

  private async acquireLock(
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<boolean> {
    const rows = await queryRunner.query(`SELECT GET_LOCK(?, ?) AS acquired`, [
      BilateralAiDispatchService.LOCK_NAME,
      BilateralAiDispatchService.LOCK_TIMEOUT_SECONDS,
    ]);
    const acquired = rows?.[0]?.acquired;
    return acquired === 1 || acquired === '1' || acquired === true;
  }

  private async releaseLock(
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<void> {
    try {
      await queryRunner.query(`SELECT RELEASE_LOCK(?)`, [
        BilateralAiDispatchService.LOCK_NAME,
      ]);
    } catch (error) {
      this.logger.error(
        'Bilateral AI dispatch: RELEASE_LOCK failed.',
        error as Error,
      );
    }
  }

  /**
   * Reviewer B, attempt 2: if `queryRunner.release()` itself throws after a successful claim,
   * the job is already `PROCESSING` with no mining call in flight — log-and-swallow (like
   * `releaseLock`) so nothing can throw here and strand the job until `TIMED_OUT`.
   */
  private async releaseRunner(
    queryRunner: import('typeorm').QueryRunner,
  ): Promise<void> {
    try {
      await queryRunner.release();
    } catch (error) {
      this.logger.error(
        'Bilateral AI dispatch: query runner release failed.',
        error as Error,
      );
    }
  }

  private async runningCount(manager: EntityManager): Promise<number> {
    return manager.getRepository(BilateralAiJob).count({
      where: { status: BilateralAiJobStatus.PROCESSING },
    });
  }

  /** Users whose `PROCESSING` count is at or above `perUserCap` (`design.md` §5.1). */
  private async ownersAtCap(
    manager: EntityManager,
    perUserCap: number,
  ): Promise<Set<number>> {
    const rows = await manager
      .getRepository(BilateralAiJob)
      .createQueryBuilder('job')
      .select('job.user_id', 'user_id')
      .where('job.status = :status', {
        status: BilateralAiJobStatus.PROCESSING,
      })
      .groupBy('job.user_id')
      .having('COUNT(*) >= :cap', { cap: perUserCap })
      .getRawMany<{ user_id: number }>();
    return new Set(rows.map((row) => Number(row.user_id)));
  }

  /**
   * The oldest `PENDING` job whose owner is not at cap (`design.md` §5.1 "the single source of
   * fair order"). Ties break by `job_id` for determinism. `excludeJobIds` lets `wake` reserve
   * jobs it already published to a different lane in the same call without re-querying counts.
   */
  private async oldestEligible(
    manager: EntityManager,
    ownersAtCap: Set<number>,
    excludeJobIds: Set<string> = new Set(),
  ): Promise<EligibleJobRow | null> {
    const qb = manager
      .getRepository(BilateralAiJob)
      .createQueryBuilder('job')
      .select(['job.job_id', 'job.user_id'])
      .where('job.status = :status', { status: BilateralAiJobStatus.PENDING })
      .orderBy('job.queue_entry_date', 'ASC')
      .addOrderBy('job.job_id', 'ASC');
    if (ownersAtCap.size) {
      qb.andWhere('job.user_id NOT IN (:...ownersAtCap)', {
        ownersAtCap: [...ownersAtCap],
      });
    }
    if (excludeJobIds.size) {
      qb.andWhere('job.job_id NOT IN (:...excludeJobIds)', {
        excludeJobIds: [...excludeJobIds],
      });
    }
    const row = await qb.getOne();
    return row ? { job_id: row.job_id, user_id: row.user_id } : null;
  }
}
