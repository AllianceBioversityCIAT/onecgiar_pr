import { BilateralAiSweeperCron } from './bilateral-ai-sweeper.cron';
import { BilateralAiJobStatus } from './entities/bilateral-ai-job.entity';
import {
  getBilateralAiAttemptTimeoutMs,
  getBilateralAiQueueStallMs,
} from './bilateral-ai.config';

describe('BilateralAiSweeperCron (unit)', () => {
  const ORIGINAL_ENV = { ...process.env };

  // Frozen clock shared by every timed test below. Since the timezone-skew fix the *cutoffs* are
  // no longer computed here — MySQL evaluates `DATE_SUB(NOW(), INTERVAL n SECOND)` — so the frozen
  // instant only keeps the fixtures' dates stable and readable; nothing asserts against it.
  const NOW_ISO = '2026-09-15T10:00:00.000Z';
  const NOW = new Date(NOW_ISO).getTime();

  /** Seconds each branch must ask MySQL for, derived from the same getters the cron reads. */
  const attemptTimeoutSeconds = () =>
    Math.round(getBilateralAiAttemptTimeoutMs() / 1000);
  const queueStallSeconds = () =>
    Math.round(getBilateralAiQueueStallMs() / 1000);

  const configureQueueEnv = () => {
    process.env.BILATERAL_AI_PROCESSING_QUEUE = 'bilateral_ai_processing';
    process.env.RABBITMQ_URL = 'amqp://localhost';
  };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.useRealTimers();
  });

  /**
   * The repository is driven through the query builder now, so the mock records one builder per
   * `createQueryBuilder()` call and lets each test decide what the database answers. `results.*`
   * are thunks so a case can also make a branch throw (the resilience cases below).
   *
   * Builder order within one `sweep()`: [0] stale-attempt scan, [1] oldest-PENDING scan,
   * [2] liveness count, [3] `AIQ-T-3` owner-running count — [2] only when [1] returned a row,
   * [3] only when [2] found nothing.
   *
   * `getMany`/`getOne` each have exactly one caller in the whole method, so they stay
   * single-purpose thunks. `getCount` now has TWO callers (table-wide liveness, and the
   * `AIQ-DD-5` owner-exemption count) that must never answer for each other's query — a builder
   * classifies ITSELF from the SQL fragment its own `where`/`andWhere` received, so a mutation
   * that removes or reorders a query changes which builders exist, never which one a leftover
   * mock answers. (Leader finding: a positional `builders[N]` going `undefined` after a mutation
   * is a mock-sequencing crash, not a behavioural red — this keeps every `getCount()` red an
   * assertion on behaviour instead.)
   */
  const makeCron = () => {
    const builders: any[] = [];
    const results = {
      getMany: async (): Promise<any[]> => [],
      getOne: async (): Promise<any> => null,
      livenessCount: async (): Promise<number> => 0,
      ownerCount: async (): Promise<number> => 0,
    };
    const makeBuilder = () => {
      let countKind: 'liveness' | 'owner' | null = null;
      const classify = (sql: unknown) => {
        if (typeof sql !== 'string') return;
        if (sql.includes('user_id = :userId')) countKind = 'owner';
        else if (
          sql.includes('started_date >') ||
          sql.includes('stage_updated_date >')
        )
          countKind = 'liveness';
      };
      const qb: any = {
        where: jest.fn((sql: unknown) => {
          classify(sql);
          return qb;
        }),
        andWhere: jest.fn((sql: unknown) => {
          classify(sql);
          return qb;
        }),
        orderBy: jest.fn(() => qb),
        getMany: jest.fn(() => results.getMany()),
        getOne: jest.fn(() => results.getOne()),
        getCount: jest.fn(() => {
          if (countKind === 'owner') return results.ownerCount();
          if (countKind === 'liveness') return results.livenessCount();
          throw new Error(
            'Unclassified getCount() query in the sweeper test mock — teach classify() its SQL fragment.',
          );
        }),
      };
      builders.push(qb);
      return qb;
    };
    const jobRepository = {
      createQueryBuilder: jest.fn(makeBuilder),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const notificationsService = {
      notifyTerminal: jest.fn().mockResolvedValue(undefined),
    };
    // `AIQ-T-3`: the sweeper wakes the dispatch service after each flip and once, always, per
    // tick. `wake` is documented as never-throwing on the real class; the default here mirrors
    // that so every pre-`AIQ-T-3` test keeps behaving exactly as before this pivot.
    const dispatchService = {
      wake: jest.fn().mockResolvedValue(undefined),
    };
    const cron = new BilateralAiSweeperCron(
      jobRepository as any,
      notificationsService as any,
      dispatchService as any,
    );
    return {
      cron,
      stubs: {
        cron,
        jobRepository,
        notificationsService,
        dispatchService,
        builders,
        results,
      },
    };
  };

  /** Every SQL fragment a builder was handed, in the order it received them. */
  const sqlOf = (qb: any): string[] => [
    ...qb.where.mock.calls.map((call: any[]) => call[0]),
    ...qb.andWhere.mock.calls.map((call: any[]) => call[0]),
  ];

  /**
   * Finds a builder by content instead of position — so an assertion about a specific query's
   * shape survives a mutation that changes how many builders exist or in what order (the same
   * concern `makeBuilder`'s `classify` addresses for `getCount()` routing).
   */
  const findBuilderBySql = (builders: any[], fragment: string) =>
    builders.find((qb) => sqlOf(qb).some((sql) => sql.includes(fragment)));

  describe('guard', () => {
    it('is inert (touches nothing) when the queue env is not configured', async () => {
      delete process.env.BILATERAL_AI_PROCESSING_QUEUE;
      delete process.env.RABBITMQ_URL;
      const { cron, stubs } = makeCron();

      await cron.sweep();

      expect(stubs.jobRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
      expect(stubs.dispatchService.wake).not.toHaveBeenCalled();
    });
  });

  describe('attempt timeout (APF-R-2 A / APF-AC-3)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('queries the per-attempt column (started_date) against the attempt-timeout cutoff, not created_date or the stall window', async () => {
      const { cron, stubs } = makeCron();

      await cron.sweep();

      // Was: `expect(find).toHaveBeenCalledWith({ where: { status: PROCESSING, started_date:
      //   LessThan(new Date(NOW - getBilateralAiAttemptTimeoutMs())) } })`.
      const [timeoutQb] = stubs.builders;
      expect(timeoutQb.where).toHaveBeenCalledWith('job.status = :status', {
        status: BilateralAiJobStatus.PROCESSING,
      });
      expect(timeoutQb.andWhere).toHaveBeenCalledWith(
        `job.started_date < DATE_SUB(NOW(), INTERVAL ${attemptTimeoutSeconds()} SECOND)`,
      );
      // The window is MySQL's now, so the regression this pins is that no JS clock reaches the
      // query at all: nothing in the generated SQL is a bound/serialized `Date`.
      expect(sqlOf(timeoutQb).join(' ')).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      // Was a boundary proof that a 14-min-old attempt sits inside the 15-min window; the two
      // windows must still come from different getters, which this keeps pinned.
      expect(attemptTimeoutSeconds()).not.toBe(queueStallSeconds());
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    // `AIQ-R-3` Scenario A / `AIQ-AC-11`: "a job waited 20 minutes parked and then started; the
    // sweeper evaluates it 5 minutes after it started" must NOT be `TIMED_OUT` — the attempt
    // timeout counts from `started_date`, never from how long it sat `PENDING` first. Because the
    // cutoff itself is built in SQL (`DATE_SUB(NOW(), INTERVAL <n> SECOND)` compared to
    // `started_date`, proven above), a real 5-minute-old `started_date` can never be inside a
    // 15-minute-old cutoff — a unit test with a mocked query builder cannot re-run that SQL, so
    // this fixture models the DB's answer directly: a job that started only 5 min ago is simply
    // never IN the stale-attempts result set, regardless of its 20-minute wait beforehand.
    it('AIQ-AC-11: a job parked 20 min then started 5 min ago is not in the stale-attempts result, so it is not TIMED_OUT', async () => {
      const { cron, stubs } = makeCron();
      // The 20-minute parked wait never reaches this query at all (it filters only on
      // `status = PROCESSING` and `started_date`, never `queue_entry_date`) — modeled here by the
      // DB simply returning no rows for a job whose `started_date` (5 min ago) sits inside the
      // window.
      stubs.results.getMany = async () => [];

      await cron.sweep();

      const [timeoutQb] = stubs.builders;
      expect(timeoutQb.andWhere).toHaveBeenCalledWith(
        `job.started_date < DATE_SUB(NOW(), INTERVAL ${attemptTimeoutSeconds()} SECOND)`,
      );
      expect(stubs.jobRepository.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ error_code: 'TIMED_OUT' }),
      );
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    it('flips a PROCESSING attempt the DB reported as stale to FAILED/TIMED_OUT and notifies once', async () => {
      const { cron, stubs } = makeCron();
      // "The DB decides": the 16-min fixture is no longer compared against a JS cutoff here — the
      // row is in the result set precisely because MySQL's own window matched it.
      const staleJob = {
        job_id: 'job-1',
        status: BilateralAiJobStatus.PROCESSING,
        started_date: new Date(NOW - 16 * 60_000),
        user_id: 42,
        center_id: 7,
        document_keys: [],
        audio_keys: [],
        queue_entry_date: new Date(NOW - 16 * 60_000),
      };
      stubs.results.getMany = async () => [staleJob];

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'job-1', status: BilateralAiJobStatus.PROCESSING },
        expect.objectContaining({
          status: BilateralAiJobStatus.FAILED,
          error_code: 'TIMED_OUT',
          // Was: `completed_date: expect.any(Date)`.
          completed_date: expect.any(Function),
        }),
      );
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.job_id).toBe('job-1');
      expect(notifiedJob.error_code).toBe('TIMED_OUT');
      expect(outcome).toBe('failed');
    });

    it('does not notify when the conditional update affects 0 rows (another actor already won)', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        {
          job_id: 'job-2',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
          user_id: 1,
          center_id: 1,
        },
      ];
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    it('flips every stale attempt found, notifying once per job', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        {
          job_id: 'a',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
        {
          job_id: 'b',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
      ];

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(2);
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        2,
      );
    });

    // Reviewer (attempt 2, Discovered Issue): the only prior `wake` assertions were the tick-end
    // ones, so deleting the per-flip `wake` at `bilateral-ai-sweeper.cron.ts:135` left the whole
    // suite green — the tick-end `wake('sweep')` alone satisfies every `toHaveBeenCalledWith
    // ('sweep')`. This discriminates the two: with two affected flips, `wake` must fire 3 times
    // (once per flip + the tick-end safety net), and at least one call must land strictly BETWEEN
    // the two `update` calls — a position only the in-loop call can occupy, since the tick-end call
    // runs once, after both `sweep()` branches finish.
    // Falsifier: deleting line 135 must turn this red.
    it('AIQ-T-3: wakes once after EACH TIMED_OUT flip, in addition to the tick-end wake (two stale attempts, both affected)', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        {
          job_id: 'a',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
        {
          job_id: 'b',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
      ];

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(2);
      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(3);
      const [firstUpdateOrder, secondUpdateOrder] =
        stubs.jobRepository.update.mock.invocationCallOrder;
      const wakeOrders = stubs.dispatchService.wake.mock.invocationCallOrder;
      expect(
        wakeOrders.some(
          (order) => order > firstUpdateOrder && order < secondUpdateOrder,
        ),
      ).toBe(true);
    });

    it('AIQ-T-3: does NOT wake per-flip when the conditional update affects 0 rows — only the tick-end wake fires', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        {
          job_id: 'job-2',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
          user_id: 1,
          center_id: 1,
        },
      ];
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(1);
    });
  });

  describe('queue stall (APF-R-2 B / APF-AC-4)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('queries the oldest PENDING job against the queue-stall cutoff (not the attempt-timeout window), ordered oldest first', async () => {
      const { cron, stubs } = makeCron();

      await cron.sweep();

      // Was: `expect(findOne).toHaveBeenCalledWith({ where: { status: PENDING, queue_entry_date:
      //   LessThan(new Date(NOW - getBilateralAiQueueStallMs())) }, order: { queue_entry_date:
      //   'ASC' } })`.
      const stallQb = stubs.builders[1];
      expect(stallQb.where).toHaveBeenCalledWith('job.status = :status', {
        status: BilateralAiJobStatus.PENDING,
      });
      expect(stallQb.andWhere).toHaveBeenCalledWith(
        `job.queue_entry_date < DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND)`,
      );
      expect(stallQb.orderBy).toHaveBeenCalledWith(
        'job.queue_entry_date',
        'ASC',
      );
      // The stall window must differ from the attempt-timeout window — pins that the two branches
      // read distinct config getters instead of sharing one.
      expect(getBilateralAiQueueStallMs()).not.toBe(
        getBilateralAiAttemptTimeoutMs(),
      );
      // No liveness count runs when nothing old is pending.
      expect(stubs.builders).toHaveLength(2);
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    // The regression fixture named in the task: an old PENDING job stays untouched while another
    // job in the table shows recent activity (`started_date`/`stage_updated_date` inside the
    // window) — age alone must never be sufficient.
    it('does NOT flip an old PENDING job while another job advanced inside the stall window', async () => {
      const { cron, stubs } = makeCron();
      const stalePending = {
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000), // 31 min old
      };
      stubs.results.getOne = async () => stalePending;
      stubs.results.livenessCount = async () => 1; // another job advanced inside the window

      await cron.sweep();

      // Was: `expect(count).toHaveBeenCalledWith({ where: [{ started_date: MoreThan(stallCutoff) },
      //   { stage_updated_date: MoreThan(stallCutoff) }] })`.
      const livenessQb = stubs.builders[2];
      expect(livenessQb.where).toHaveBeenCalledWith(
        `job.started_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND) OR job.stage_updated_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND)`,
      );
      expect(livenessQb.getCount).toHaveBeenCalledTimes(1);
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    it('flips the oldest PENDING job to FAILED/QUEUE_STALLED when nothing anywhere moved, and notifies once', async () => {
      const { cron, stubs } = makeCron();
      const stalePending = {
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
        user_id: 7,
        center_id: 3,
        document_keys: ['doc1'],
        audio_keys: [],
      };
      stubs.results.getOne = async () => stalePending;
      stubs.results.livenessCount = async () => 0; // no activity anywhere
      stubs.results.ownerCount = async () => 0; // and no owner-processing job either

      await cron.sweep();

      const livenessQb = stubs.builders[2];
      expect(livenessQb.where).toHaveBeenCalledWith(
        `job.started_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND) OR job.stage_updated_date > DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND)`,
      );
      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'stale-pending', status: BilateralAiJobStatus.PENDING },
        expect.objectContaining({
          status: BilateralAiJobStatus.FAILED,
          error_code: 'QUEUE_STALLED',
          // Was: `completed_date: expect.any(Date)`.
          completed_date: expect.any(Function),
        }),
      );
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.job_id).toBe('stale-pending');
      expect(notifiedJob.error_code).toBe('QUEUE_STALLED');
      expect(outcome).toBe('failed');
    });

    it('does not notify when the conditional update affects 0 rows', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getOne = async () => ({
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
      });
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 0;
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    // Leader addition (task conformance): `tasks.md` AIQ-T-3's Description says "after each
    // sweeper TIMED_OUT and QUEUE_STALLED flip" — today only the pre-flip `wake` (§5.4, "tries
    // dispatch first") followed a QUEUE_STALLED flip; this proves the DISTINCT post-flip `wake`
    // the Description also requires. With one successful flip in the tick, `wake` must fire 3
    // times (pre-flip + post-flip + the tick-end safety net), with at least one call strictly
    // BEFORE the `update` and at least one strictly AFTER it — a position only the post-flip call
    // can occupy, since the tick-end call is the last thing `sweep()` does.
    // Falsifier: deleting the post-flip wake must turn this red.
    it('AIQ-T-3: wakes both before AND after a successful QUEUE_STALLED flip, in addition to the tick-end wake', async () => {
      const { cron, stubs } = makeCron();
      const stalePending = {
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
        user_id: 7,
        center_id: 3,
        document_keys: ['doc1'],
        audio_keys: [],
      };
      stubs.results.getOne = async () => stalePending;
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 0;

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(1);
      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(3);
      const [updateOrder] = stubs.jobRepository.update.mock.invocationCallOrder;
      const wakeOrders = stubs.dispatchService.wake.mock.invocationCallOrder;
      expect(wakeOrders.some((order) => order < updateOrder)).toBe(true);
      expect(wakeOrders.some((order) => order > updateOrder)).toBe(true);
    });

    it('AIQ-T-3: does NOT wake post-flip when the conditional update affects 0 rows — only pre-flip + tick-end wake fire', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getOne = async () => ({
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
      });
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 0;
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(2);
    });

    // `AIQ-R-4` Scenario A / `AIQ-DD-5` — the task's own Disqualifier: a fixture that gives the
    // running job fresh activity AND an owner match is inert on its own, because the table-wide
    // liveness check (`activeElsewhere`) would already explain "no flip" without any new code. To
    // discriminate the owner-exemption from that pre-existing liveness check, this fixture sets
    // `livenessCount` to 0 — liveness ALONE would allow the flip — while the SEPARATE `ownerCount`
    // reports the pending job's own owner as currently `PROCESSING`. Only the new exemption can
    // explain "no flip" here. The two are keyed by the SQL fragment each query actually sends (see
    // `makeBuilder`'s `classify`), not by call order or position, so deleting the exemption (which
    // removes that query entirely) cannot crash this test on a stale positional index — it can
    // only change the behavioural outcome asserted below.
    // Falsifier: deleting the owner-exemption code must turn the behavioural assertions red.
    it("Stall A: does NOT flip when liveness shows nothing table-wide, but the job's own owner has a PROCESSING job", async () => {
      const { cron, stubs } = makeCron();
      const stalePending = {
        job_id: 'a2',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000), // 31 min old
        user_id: 1, // same owner as the PROCESSING job below
      };
      stubs.results.getOne = async () => stalePending;
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 1;

      await cron.sweep();

      // Behavioural assertions (the falsifier's actual target): with the exemption removed, the
      // sweeper proceeds straight to wake + the conditional UPDATE, so these go red on their own
      // terms — never on a builder index that stopped existing.
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
      // Content-addressed (not positional) proof that the owner query itself ran with the right
      // shape, when it exists.
      const ownerQb = findBuilderBySql(stubs.builders, 'user_id = :userId');
      expect(ownerQb).toBeDefined();
      expect(ownerQb.where).toHaveBeenCalledWith('job.status = :status', {
        status: BilateralAiJobStatus.PROCESSING,
      });
      expect(ownerQb.andWhere).toHaveBeenCalledWith('job.user_id = :userId', {
        userId: 1,
      });
    });

    // `AIQ-DD-5` (`design.md` §5.4) — "the stall rule tries dispatch first": before flipping a
    // genuinely stalled job, the sweeper wakes the dispatch service. The conditional `UPDATE`
    // (already scoped to `status = PENDING`, unchanged by this task) is what actually re-checks
    // "only if still PENDING" — this test pins that `wake` runs strictly BEFORE that write.
    it('Stall B: calls wake before flipping, then flips because the write is still scoped to PENDING', async () => {
      const { cron, stubs } = makeCron();
      const stalePending = {
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
        user_id: 9,
      };
      stubs.results.getOne = async () => stalePending;
      stubs.results.livenessCount = async () => 0; // no liveness anywhere
      stubs.results.ownerCount = async () => 0; // and no owner-processing job either

      await cron.sweep();

      expect(stubs.dispatchService.wake).toHaveBeenCalledWith('sweep');
      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'stale-pending', status: BilateralAiJobStatus.PENDING },
        expect.objectContaining({ error_code: 'QUEUE_STALLED' }),
      );
      const wakeOrder = stubs.dispatchService.wake.mock.invocationCallOrder[0];
      const updateOrder =
        stubs.jobRepository.update.mock.invocationCallOrder[0];
      expect(wakeOrder).toBeLessThan(updateOrder);
    });
  });

  describe('timezone skew regression: every window and every write is in DB time', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('expresses both windows and the liveness count as DATE_SUB(NOW(), INTERVAL <config seconds> SECOND)', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getOne = async () => ({
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
      });
      stubs.results.livenessCount = async () => 1; // stop before the flip; only the SQL matters here

      await cron.sweep();

      const [timeoutSql, stallSql, livenessSql] = stubs.builders.map((qb) =>
        sqlOf(qb).join(' '),
      );
      expect(timeoutSql).toContain(
        `DATE_SUB(NOW(), INTERVAL ${attemptTimeoutSeconds()} SECOND)`,
      );
      expect(stallSql).toContain(
        `DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND)`,
      );
      expect(livenessSql).toContain(
        `DATE_SUB(NOW(), INTERVAL ${queueStallSeconds()} SECOND)`,
      );
      // Neither branch may smuggle a process-clock instant into the query: a serialized JS `Date`
      // would show up as an ISO literal in the generated SQL.
      for (const sql of [timeoutSql, stallSql, livenessSql]) {
        expect(sql).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });

    it('tracks a re-configured window: both branches re-read their getter, so the intervals move with the env', async () => {
      process.env.BILATERAL_AI_ATTEMPT_TIMEOUT_MS = String(4 * 60_000);
      process.env.BILATERAL_AI_QUEUE_STALL_MS = String(7 * 60_000);
      const { cron, stubs } = makeCron();

      await cron.sweep();

      expect(stubs.builders[0].andWhere).toHaveBeenCalledWith(
        'job.started_date < DATE_SUB(NOW(), INTERVAL 240 SECOND)',
      );
      expect(stubs.builders[1].andWhere).toHaveBeenCalledWith(
        'job.queue_entry_date < DATE_SUB(NOW(), INTERVAL 420 SECOND)',
      );
    });

    it('writes completed_date as the CURRENT_TIMESTAMP raw-SQL value on both flips, never a JS Date', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        { job_id: 'timed-out', status: BilateralAiJobStatus.PROCESSING },
      ];
      stubs.results.getOne = async () => ({
        job_id: 'stalled',
        status: BilateralAiJobStatus.PENDING,
      });
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 0;

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(2);
      for (const [, payload] of stubs.jobRepository.update.mock.calls) {
        expect(payload.completed_date).toBeInstanceOf(Function);
        expect(payload.completed_date()).toBe('CURRENT_TIMESTAMP');
        expect(payload.completed_date).not.toBeInstanceOf(Date);
      }
    });

    it('no longer threads a terminalDate into notifyTerminal — the duration is re-read from the row', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        { job_id: 'timed-out', status: BilateralAiJobStatus.PROCESSING },
      ];

      await cron.sweep();

      const call = stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(call).toHaveLength(2);
      expect(call[1]).toBe('failed');
    });
  });

  describe('one sweep per process (APF-R-2 C / D1)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('never double-notifies within a single sweep even when both branches fire', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [
        {
          job_id: 'timed-out',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
      ];
      stubs.results.getOne = async () => ({
        job_id: 'stalled',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 40 * 60_000),
      });
      stubs.results.livenessCount = async () => 0;
      stubs.results.ownerCount = async () => 0;

      await cron.sweep();

      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        2,
      );
      const notifiedIds =
        stubs.notificationsService.notifyTerminal.mock.calls.map(
          (call) => call[0].job_id,
        );
      expect(notifiedIds).toEqual(['timed-out', 'stalled']);
    });
  });

  describe('resilience — independent branches (Leader addendum)', () => {
    beforeEach(configureQueueEnv);

    it('a throw in the attempt-timeout branch is caught and logged, and the queue-stall branch still runs', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => {
        throw new Error('db down');
      };
      stubs.results.getOne = async () => null;

      await expect(cron.sweep()).resolves.toBeUndefined();

      // The stall branch must not be skipped just because the timeout branch blew up first.
      expect(stubs.builders[1].getOne).toHaveBeenCalledTimes(1);
    });

    it('a throw in the queue-stall branch is caught and logged, and the attempt-timeout branch still ran', async () => {
      const { cron, stubs } = makeCron();
      stubs.results.getMany = async () => [];
      stubs.results.getOne = async () => {
        throw new Error('db down');
      };

      await expect(cron.sweep()).resolves.toBeUndefined();

      expect(stubs.builders[0].getMany).toHaveBeenCalledTimes(1);
    });
  });

  // `AIQ-R-2` Scenario B (safety net) / `AIQ-T-3`: the tick must recover a lost re-dispatch even
  // when neither branch above found anything to flip — this is what a lost wake after a crash
  // looks like from the sweeper's side.
  describe('always wakes the dispatch service once per tick (AIQ-R-2 B safety net)', () => {
    beforeEach(configureQueueEnv);

    it('calls wake even when nothing flips', async () => {
      const { cron, stubs } = makeCron();
      // Defaults: getMany() -> [], getOne() -> null — neither branch finds anything to flip.

      await cron.sweep();

      expect(stubs.dispatchService.wake).toHaveBeenCalledWith('sweep');
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
    });

    it('still runs (and does not throw) when wake itself rejects', async () => {
      const { cron, stubs } = makeCron();
      stubs.dispatchService.wake.mockRejectedValue(new Error('DB down'));

      await expect(cron.sweep()).resolves.toBeUndefined();
    });
  });
});
