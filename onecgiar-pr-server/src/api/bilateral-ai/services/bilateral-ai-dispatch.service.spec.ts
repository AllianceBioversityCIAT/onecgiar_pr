import { Logger } from '@nestjs/common';
import {
  BilateralAiDispatchService,
  BilateralAiDispatchDecision,
} from './bilateral-ai-dispatch.service';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from '../entities/bilateral-ai-job.entity';
import { BilateralAiService } from './bilateral-ai.service';
import { BilateralAiProcessingQueuePublisherService } from '../../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue-publisher.service';

/**
 * `AIQ-T-2` — one case per `design.md` §2.3 decision-table row, plus the worked example
 * (`requirements.md` `AIQ-R-1` C) and the two falsifiers named in `tasks.md`.
 *
 * The named lock (`GET_LOCK`/`RELEASE_LOCK`) and the eligibility reads run on a dedicated
 * `QueryRunner` (`design.md` §5.2); this suite mocks that runner and its `EntityManager`-scoped
 * repository. Per the task's Disqualifier, a green run here proves the *decision logic*, not that
 * the lock serialises two live containers — that proof is `AIQ-T-11`'s.
 */
describe('BilateralAiDispatchService', () => {
  let service: BilateralAiDispatchService;
  let jobRepository: { findOne: jest.Mock };
  let bilateralAiService: jest.Mocked<Pick<BilateralAiService, 'attemptStart'>>;
  let queue: jest.Mocked<
    Pick<BilateralAiProcessingQueuePublisherService, 'publish'>
  >;
  let dataSource: { createQueryRunner: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    query: jest.Mock;
    release: jest.Mock;
    manager: { getRepository: jest.Mock };
  };

  const originalConcurrent = process.env.BILATERAL_AI_MAX_CONCURRENT;
  const originalPerUser = process.env.BILATERAL_AI_MAX_PER_USER;

  beforeEach(() => {
    // Pin the caps explicitly (default values, but asserted rather than assumed — an ambient
    // `.env` must not silently change what this suite proves, `AIQ-T-1` review precedent).
    process.env.BILATERAL_AI_MAX_CONCURRENT = '2';
    process.env.BILATERAL_AI_MAX_PER_USER = '1';

    jobRepository = { findOne: jest.fn() };
    bilateralAiService = { attemptStart: jest.fn().mockResolvedValue(true) };
    queue = { publish: jest.fn() };

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('GET_LOCK')) return Promise.resolve([{ acquired: 1 }]);
        return Promise.resolve([{}]);
      }),
      release: jest.fn().mockResolvedValue(undefined),
      manager: { getRepository: jest.fn() },
    };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    service = new BilateralAiDispatchService(
      dataSource as any,
      jobRepository as any,
      bilateralAiService as any,
      queue as any,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalConcurrent === undefined)
      delete process.env.BILATERAL_AI_MAX_CONCURRENT;
    else process.env.BILATERAL_AI_MAX_CONCURRENT = originalConcurrent;
    if (originalPerUser === undefined)
      delete process.env.BILATERAL_AI_MAX_PER_USER;
    else process.env.BILATERAL_AI_MAX_PER_USER = originalPerUser;
  });

  function makeJob(overrides: Partial<BilateralAiJob>): BilateralAiJob {
    return {
      job_id: 'x',
      user_id: 1,
      status: BilateralAiJobStatus.PENDING,
      retrying: false,
      attempts: 0,
      ...overrides,
    } as BilateralAiJob;
  }

  /** A chainable `SelectQueryBuilder` stub. Terminal call resolves to `result`. */
  function makeQueryBuilder(result: unknown) {
    const qb: any = {};
    const chain = [
      'select',
      'addSelect',
      'where',
      'andWhere',
      'groupBy',
      'having',
      'orderBy',
      'addOrderBy',
    ];
    for (const method of chain) qb[method] = jest.fn().mockReturnValue(qb);
    qb.getRawMany = jest.fn().mockResolvedValue(result);
    qb.getOne = jest.fn().mockResolvedValue(result);
    return qb;
  }

  /**
   * Wires the dedicated-connection repository (`queryRunner.manager.getRepository`) for one
   * `decide`/`wake` lock cycle: `count()` answers `runningCount`, then each `createQueryBuilder()`
   * call answers `ownersAtCap` first, then `oldestEligible` calls in order.
   */
  function wireLockedRepo(opts: {
    runningCount: number;
    ownersAtCapRows: { user_id: number }[];
    oldestEligibleRows: (Record<string, unknown> | undefined)[];
  }) {
    const repo: any = { count: jest.fn().mockResolvedValue(opts.runningCount) };
    const qbCalls = [
      makeQueryBuilder(opts.ownersAtCapRows),
      ...opts.oldestEligibleRows.map((row) => makeQueryBuilder(row)),
    ];
    let call = 0;
    repo.createQueryBuilder = jest.fn().mockImplementation(() => {
      const qb = qbCalls[call] ?? makeQueryBuilder(undefined);
      call += 1;
      return qb;
    });
    queryRunner.manager.getRepository.mockReturnValue(repo);
    return repo;
  }

  describe('decide — rows that never touch the lock', () => {
    it('returns noop when the job is not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      const decision = await service.decide('missing');

      expect(decision).toEqual({ kind: 'noop' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('returns noop when the job is COMPLETED', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ status: BilateralAiJobStatus.COMPLETED }),
      );

      const decision = await service.decide('j1');

      expect(decision).toEqual({ kind: 'noop' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('returns noop when the job is FAILED', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ status: BilateralAiJobStatus.FAILED }),
      );

      const decision = await service.decide('j1');

      expect(decision).toEqual({ kind: 'noop' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('returns resume-retry when PROCESSING and retrying (AIQ-R-1 F)', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ status: BilateralAiJobStatus.PROCESSING, retrying: true }),
      );

      const decision = await service.decide('j1');

      expect(decision).toEqual({ kind: 'resume-retry' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('returns noop when PROCESSING and not retrying (another consumer owns it)', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ status: BilateralAiJobStatus.PROCESSING, retrying: false }),
      );

      const decision = await service.decide('j1');

      expect(decision).toEqual({ kind: 'noop' });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });
  });

  describe('decide — PENDING rows (locked)', () => {
    it('claims the job when it is the oldest eligible and lanes are free (run)', async () => {
      const job = makeJob({ job_id: 'x', user_id: 1 });
      jobRepository.findOne.mockResolvedValue(job);
      wireLockedRepo({
        runningCount: 0,
        ownersAtCapRows: [],
        oldestEligibleRows: [{ job_id: 'x', user_id: 1 }],
      });

      const decision = await service.decide('x');

      expect(decision).toEqual({ kind: 'run' });
      // Reviewer A, attempt 2: the claim MUST run through the lock-holding connection
      // (`queryRunner.manager`), not the service's pooled repository (`design.md` §5.2).
      expect(bilateralAiService.attemptStart).toHaveBeenCalledWith(
        job,
        queryRunner.manager,
      );
      expect(queue.publish).not.toHaveBeenCalled();
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['prms_bilateral_ai_dispatch'],
      );
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('parks X and redirects to the oldest eligible job E when X is not the oldest', async () => {
      const job = makeJob({ job_id: 'x', user_id: 1 });
      jobRepository.findOne.mockResolvedValue(job);
      wireLockedRepo({
        runningCount: 0,
        ownersAtCapRows: [],
        oldestEligibleRows: [{ job_id: 'e', user_id: 2 }],
      });

      const decision = await service.decide('x');

      expect(decision).toEqual({ kind: 'redirect', jobId: 'e' });
      expect(queue.publish).toHaveBeenCalledWith({ jobId: 'e' });
      expect(bilateralAiService.attemptStart).not.toHaveBeenCalled();
    });

    it('parks X when no free lane exists (running >= global cap)', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ job_id: 'x', user_id: 1 }),
      );
      wireLockedRepo({
        runningCount: 2,
        ownersAtCapRows: [],
        oldestEligibleRows: [],
      });

      const decision = await service.decide('x');

      expect(decision).toEqual({ kind: 'park' });
      expect(bilateralAiService.attemptStart).not.toHaveBeenCalled();
      expect(queue.publish).not.toHaveBeenCalled();
    });

    it('parks X when its own owner is already at the per-user cap', async () => {
      jobRepository.findOne.mockResolvedValue(
        makeJob({ job_id: 'x', user_id: 1 }),
      );
      wireLockedRepo({
        runningCount: 1,
        ownersAtCapRows: [{ user_id: 1 }],
        oldestEligibleRows: [],
      });

      const decision = await service.decide('x');

      expect(decision).toEqual({ kind: 'park' });
      expect(bilateralAiService.attemptStart).not.toHaveBeenCalled();
    });

    it('returns lock-timeout when GET_LOCK does not acquire within the window', async () => {
      jobRepository.findOne.mockResolvedValue(makeJob({ job_id: 'x' }));
      queryRunner.query.mockImplementation((sql: string) => {
        if (sql.includes('GET_LOCK')) return Promise.resolve([{ acquired: 0 }]);
        return Promise.resolve([{}]);
      });

      const decision = await service.decide('x');

      expect(decision).toEqual({ kind: 'lock-timeout' });
      expect(queryRunner.query).not.toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        expect.anything(),
      );
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('worked example — A1, A2, B1, C1 (AIQ-R-1 C, falsifier target)', () => {
    // A2 and C1 are PENDING; A2's queue_entry_date is OLDER than C1's, but A2's owner (A) holds
    // A1. `runningCount` varies by state (see each test): both lanes busy (A1+B1) vs. one free
    // (B1 finished, A1 still runs).
    //
    // Unlike the canned-result tests above, `oldestEligible`'s query is faked here with a real
    // in-memory filter/sort over the underlying PENDING rows, driven by whatever predicates the
    // real `andWhere(...)` calls apply — so this test (and the falsifier mutation below) actually
    // exercises the owner-at-cap SQL condition rather than a hardcoded return value.
    const pendingRows = [
      { job_id: 'A2', user_id: 1, queue_entry_date: '2026-01-01T00:00:00Z' },
      { job_id: 'C1', user_id: 3, queue_entry_date: '2026-01-01T00:00:05Z' },
    ];

    function wireWorkedExample(runningCount: number) {
      const repo: any = { count: jest.fn().mockResolvedValue(runningCount) };
      let qbCall = 0;
      repo.createQueryBuilder = jest.fn().mockImplementation(() => {
        qbCall += 1;
        if (qbCall === 1) {
          // ownersAtCap query: A is at cap (A1 running, per-user cap 1).
          return makeQueryBuilder([{ user_id: 1 }]);
        }
        // oldestEligible query: faithful filter/sort over pendingRows, driven by the real
        // andWhere predicates so a source mutation that drops a filter changes this result.
        let excludedOwners: number[] = [];
        let excludedJobIds: string[] = [];
        const qb: any = {};
        const passthrough = ['select', 'where', 'orderBy', 'addOrderBy'];
        for (const m of passthrough) qb[m] = jest.fn().mockReturnValue(qb);
        qb.andWhere = jest
          .fn()
          .mockImplementation((sql: string, params: any) => {
            if (sql.includes('ownersAtCap'))
              excludedOwners = params.ownersAtCap;
            if (sql.includes('excludeJobIds'))
              excludedJobIds = params.excludeJobIds;
            return qb;
          });
        qb.getOne = jest.fn().mockImplementation(async () => {
          const remaining = pendingRows
            .filter((r) => !excludedOwners.includes(r.user_id))
            .filter((r) => !excludedJobIds.includes(r.job_id))
            .sort((a, b) =>
              a.queue_entry_date.localeCompare(b.queue_entry_date),
            );
          return remaining[0] ?? null;
        });
        return qb;
      });
      queryRunner.manager.getRepository.mockReturnValue(repo);
    }

    it('decide(A2) parks (no_free_lane) while A1 AND B1 both run', async () => {
      const a2 = makeJob({ job_id: 'A2', user_id: 1 });
      jobRepository.findOne.mockResolvedValue(a2);
      wireWorkedExample(2); // A1 + B1 both PROCESSING, global cap 2 — genuinely full

      const decision = await service.decide('A2');

      expect(decision).toEqual({ kind: 'park' });
      expect(queue.publish).not.toHaveBeenCalled();
    });

    // Reviewer A, attempt 2 (Discovered Issue 1): once B1 finishes, a lane is free. A2's own
    // owner (A) is still at cap, but C1 IS eligible — §2.3's "park X, publish {jobId: E}" row,
    // not a bare park. Nothing wakes parked jobs until `AIQ-T-3`, so this redirect is the only
    // thing that keeps C1 moving.
    it('decide(A2) redirects to C1 once B1 finishes and a lane is free', async () => {
      const a2 = makeJob({ job_id: 'A2', user_id: 1 });
      jobRepository.findOne.mockResolvedValue(a2);
      wireWorkedExample(1); // only A1 PROCESSING now

      const decision = await service.decide('A2');

      expect(decision).toEqual({ kind: 'redirect', jobId: 'C1' });
      expect(queue.publish).toHaveBeenCalledWith({ jobId: 'C1' });
      expect(bilateralAiService.attemptStart).not.toHaveBeenCalled();
    });

    it('decide(C1) runs — the oldest ELIGIBLE job, not the oldest job overall (falsifier target)', async () => {
      const c1 = makeJob({ job_id: 'C1', user_id: 3 });
      jobRepository.findOne.mockResolvedValue(c1);
      wireWorkedExample(1); // only A1 PROCESSING, one free lane

      const decision = await service.decide('C1');

      expect(decision).toEqual({ kind: 'run' });
      expect(bilateralAiService.attemptStart).toHaveBeenCalledWith(
        c1,
        queryRunner.manager,
      );
    });
  });

  // `AIQ-R-2` Scenario D / `AIQ-AC-10` (`tasks.md` AIQ-T-3 Tests: "Retry re-entry: `retryJob` →
  // `decide` sees it as the newest"). `design.md` §5.3's row for this is "no code change there,
  // only a test" — `retryJob` (unchanged) writes a fresh `retried_date`, and the STORED generated
  // column `queue_entry_date = COALESCE(retried_date, created_date)` picks it up, which is what
  // this test proves at `decide`'s seam: a retried job's fresh (newer) `queue_entry_date` puts it
  // BEHIND an older `PENDING` job in fair order, exactly like any other `queue_entry_date`
  // comparison (`AIQ-DD-1`). This is a real filter/sort over the underlying rows — driven by the
  // actual `andWhere`/`orderBy` calls `oldestEligible` issues — not a canned return value, so a
  // source mutation that dropped ordering would change this result (same technique as the "worked
  // example" suite above). The complementary half (retryJob itself sets a fresh `retried_date` via
  // the DB-time escape hatch, never a JS `Date`) is proven in `bilateral-ai.service.spec.ts`
  // ("AIQ-R-2 D / AIQ-AC-10: retryJob sets a fresh retried_date...").
  describe('retry re-entry — a retried job goes to the back of fair order (AIQ-R-2 D / AIQ-AC-10)', () => {
    const retryPendingRows = [
      {
        job_id: 'old-job',
        user_id: 5,
        queue_entry_date: '2026-01-01T00:00:00Z',
      },
      // Simulates `retryJob`'s write: `retried_date = now` moved this job's `queue_entry_date` to
      // the back — newer than `old-job`'s, even though `old-job` has been PENDING for longer.
      {
        job_id: 'retried-job',
        user_id: 6,
        queue_entry_date: '2026-01-02T00:00:00Z',
      },
    ];

    function wireRetryExample() {
      const repo: any = { count: jest.fn().mockResolvedValue(0) }; // a lane is free
      let qbCall = 0;
      repo.createQueryBuilder = jest.fn().mockImplementation(() => {
        qbCall += 1;
        if (qbCall === 1) return makeQueryBuilder([]); // ownersAtCap: nobody at cap
        // oldestEligible: real filter/sort over retryPendingRows, driven by the real predicates —
        // an ordering regression here (e.g. sorting by insertion order instead of
        // `queue_entry_date`) would change which job this returns.
        let excludedOwners: number[] = [];
        let excludedJobIds: string[] = [];
        const qb: any = {};
        const passthrough = ['select', 'where', 'orderBy', 'addOrderBy'];
        for (const m of passthrough) qb[m] = jest.fn().mockReturnValue(qb);
        qb.andWhere = jest
          .fn()
          .mockImplementation((sql: string, params: any) => {
            if (sql.includes('ownersAtCap'))
              excludedOwners = params.ownersAtCap;
            if (sql.includes('excludeJobIds'))
              excludedJobIds = params.excludeJobIds;
            return qb;
          });
        qb.getOne = jest.fn().mockImplementation(async () => {
          const remaining = retryPendingRows
            .filter((r) => !excludedOwners.includes(r.user_id))
            .filter((r) => !excludedJobIds.includes(r.job_id))
            .sort((a, b) =>
              a.queue_entry_date.localeCompare(b.queue_entry_date),
            );
          return remaining[0] ?? null;
        });
        return qb;
      });
      queryRunner.manager.getRepository.mockReturnValue(repo);
    }

    it("decide(retried-job) redirects to the older job instead of claiming — the retry's fresh queue_entry_date lost fair order, not won it", async () => {
      const retriedJob = makeJob({ job_id: 'retried-job', user_id: 6 });
      jobRepository.findOne.mockResolvedValue(retriedJob);
      wireRetryExample();

      const decision = await service.decide('retried-job');

      expect(decision).toEqual({ kind: 'redirect', jobId: 'old-job' });
      expect(queue.publish).toHaveBeenCalledWith({ jobId: 'old-job' });
      expect(bilateralAiService.attemptStart).not.toHaveBeenCalled();
    });

    it('decide(old-job) runs — it is still the oldest eligible job, ahead of the retried one', async () => {
      const oldJob = makeJob({ job_id: 'old-job', user_id: 5 });
      jobRepository.findOne.mockResolvedValue(oldJob);
      wireRetryExample();

      const decision = await service.decide('old-job');

      expect(decision).toEqual({ kind: 'run' });
      expect(bilateralAiService.attemptStart).toHaveBeenCalledWith(
        oldJob,
        queryRunner.manager,
      );
    });
  });

  describe('lock release on a thrown error (second falsifier)', () => {
    it('still releases the named lock when the critical section throws', async () => {
      jobRepository.findOne.mockResolvedValue(makeJob({ job_id: 'x' }));
      const repo: any = {
        count: jest.fn().mockRejectedValue(new Error('DB exploded')),
      };
      queryRunner.manager.getRepository.mockReturnValue(repo);

      await expect(service.decide('x')).rejects.toThrow('DB exploded');

      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['prms_bilateral_ai_dispatch'],
      );
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('wake', () => {
    it('publishes the oldest eligible job for each free lane and stops when none remain', async () => {
      wireLockedRepo({
        runningCount: 0,
        ownersAtCapRows: [],
        oldestEligibleRows: [
          { job_id: 'p1', user_id: 1 },
          { job_id: 'p2', user_id: 2 },
          undefined,
        ],
      });

      await service.wake('terminal');

      expect(queue.publish).toHaveBeenCalledTimes(2);
      expect(queue.publish).toHaveBeenNthCalledWith(1, { jobId: 'p1' });
      expect(queue.publish).toHaveBeenNthCalledWith(2, { jobId: 'p2' });
    });

    it('publishes nothing when no lane is free', async () => {
      wireLockedRepo({
        runningCount: 2,
        ownersAtCapRows: [],
        oldestEligibleRows: [],
      });

      await service.wake('sweep');

      expect(queue.publish).not.toHaveBeenCalled();
    });

    it('does not throw when the lock cannot be acquired', async () => {
      queryRunner.query.mockImplementation((sql: string) => {
        if (sql.includes('GET_LOCK')) return Promise.resolve([{ acquired: 0 }]);
        return Promise.resolve([{}]);
      });

      await expect(service.wake('terminal')).resolves.toBeUndefined();
      expect(queue.publish).not.toHaveBeenCalled();
    });

    it('never throws even if a query fails mid-loop', async () => {
      const repo: any = {
        count: jest.fn().mockRejectedValue(new Error('boom')),
      };
      queryRunner.manager.getRepository.mockReturnValue(repo);

      await expect(service.wake('terminal')).resolves.toBeUndefined();
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE_LOCK'),
        ['prms_bilateral_ai_dispatch'],
      );
    });

    // `AIQ-T-3` forward pointer (from `AIQ-T-2`): `connect()` moved inside the `try` so a DB
    // outage at connect time is caught like every other failure here — `wake`'s documented
    // "never throws" must hold even before the lock is ever attempted, since `processJob`'s
    // terminal paths now depend on that contract.
    it('never throws when queryRunner.connect() itself rejects, and never tries to release', async () => {
      queryRunner.connect.mockRejectedValue(new Error('DB down'));

      await expect(service.wake('terminal')).resolves.toBeUndefined();

      expect(queryRunner.query).not.toHaveBeenCalled();
      expect(queryRunner.release).not.toHaveBeenCalled();
    });
  });

  it('type check: DispatchDecision covers every §2.3 row', () => {
    const decisions: BilateralAiDispatchDecision['kind'][] = [
      'run',
      'resume-retry',
      'park',
      'redirect',
      'noop',
      'lock-timeout',
    ];
    expect(decisions).toHaveLength(6);
  });
});
