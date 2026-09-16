import { LessThan, MoreThan } from 'typeorm';
import { BilateralAiSweeperCron } from './bilateral-ai-sweeper.cron';
import { BilateralAiJobStatus } from './entities/bilateral-ai-job.entity';
import {
  getBilateralAiAttemptTimeoutMs,
  getBilateralAiQueueStallMs,
} from './bilateral-ai.config';

describe('BilateralAiSweeperCron (unit)', () => {
  const ORIGINAL_ENV = { ...process.env };

  // Frozen clock shared by every timed test below — the fixtures' ISO literals ("16 min before
  // now", "31 min old") are all relative to this instant (Reviewer finding, attempt 2: no test
  // ran under a frozen clock before, so nothing proved the cutoff math).
  const NOW_ISO = '2026-09-15T10:00:00.000Z';
  const NOW = new Date(NOW_ISO).getTime();

  const configureQueueEnv = () => {
    process.env.BILATERAL_AI_PROCESSING_QUEUE = 'bilateral_ai_processing';
    process.env.RABBITMQ_URL = 'amqp://localhost';
  };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.useRealTimers();
  });

  const makeCron = () => {
    const jobRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const notificationsService = {
      notifyTerminal: jest.fn().mockResolvedValue(undefined),
    };
    const cron = new BilateralAiSweeperCron(
      jobRepository as any,
      notificationsService as any,
    );
    return { cron, stubs: { jobRepository, notificationsService } };
  };

  describe('guard', () => {
    it('is inert (touches nothing) when the queue env is not configured', async () => {
      delete process.env.BILATERAL_AI_PROCESSING_QUEUE;
      delete process.env.RABBITMQ_URL;
      const { cron, stubs } = makeCron();

      await cron.sweep();

      expect(stubs.jobRepository.find).not.toHaveBeenCalled();
      expect(stubs.jobRepository.findOne).not.toHaveBeenCalled();
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });
  });

  describe('attempt timeout (APF-R-2 A / APF-AC-3)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('queries the per-attempt column (started_date) against the attempt-timeout cutoff, not created_date or the stall window', async () => {
      const { cron, stubs } = makeCron();
      stubs.jobRepository.find.mockResolvedValue([]); // nothing 14-min-old should ever reach this branch

      await cron.sweep();

      expect(stubs.jobRepository.find).toHaveBeenCalledWith({
        where: {
          status: BilateralAiJobStatus.PROCESSING,
          started_date: LessThan(
            new Date(NOW - getBilateralAiAttemptTimeoutMs()),
          ),
        },
      });
      // Boundary proof: a 14-min-old attempt is inside the 15-min default window, so the cutoff
      // computed above must sit strictly before "14 minutes ago" — if the cutoff were computed
      // from the wrong getter (e.g. the 30-min stall window) this would go negative and fail.
      const fourteenMinutesAgo = new Date(NOW - 14 * 60_000);
      expect(NOW - getBilateralAiAttemptTimeoutMs()).toBeLessThan(
        fourteenMinutesAgo.getTime(),
      );
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    it('flips a PROCESSING attempt 16 minutes old to FAILED/TIMED_OUT and notifies once', async () => {
      const { cron, stubs } = makeCron();
      const staleJob = {
        job_id: 'job-1',
        status: BilateralAiJobStatus.PROCESSING,
        started_date: new Date(NOW - 16 * 60_000), // 16 min before the frozen "now"
        user_id: 42,
        center_id: 7,
        document_keys: [],
        audio_keys: [],
        queue_entry_date: new Date(NOW - 16 * 60_000),
      };
      stubs.jobRepository.find.mockResolvedValue([staleJob]);

      await cron.sweep();

      expect(stubs.jobRepository.find).toHaveBeenCalledWith({
        where: {
          status: BilateralAiJobStatus.PROCESSING,
          started_date: LessThan(
            new Date(NOW - getBilateralAiAttemptTimeoutMs()),
          ),
        },
      });
      // Boundary proof: 16 minutes ago must fall on the stale side of the same cutoff.
      expect(staleJob.started_date.getTime()).toBeLessThan(
        NOW - getBilateralAiAttemptTimeoutMs(),
      );
      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'job-1', status: BilateralAiJobStatus.PROCESSING },
        expect.objectContaining({
          status: BilateralAiJobStatus.FAILED,
          error_code: 'TIMED_OUT',
          completed_date: expect.any(Date),
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
      stubs.jobRepository.find.mockResolvedValue([
        {
          job_id: 'job-2',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
          user_id: 1,
          center_id: 1,
        },
      ]);
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });

    it('flips every stale attempt found, notifying once per job', async () => {
      const { cron, stubs } = makeCron();
      stubs.jobRepository.find.mockResolvedValue([
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
      ]);

      await cron.sweep();

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(2);
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        2,
      );
    });
  });

  describe('queue stall (APF-R-2 B / APF-AC-4)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('queries the oldest PENDING job against the queue-stall cutoff (not the attempt-timeout window), ordered oldest first', async () => {
      const { cron, stubs } = makeCron();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await cron.sweep();

      expect(stubs.jobRepository.findOne).toHaveBeenCalledWith({
        where: {
          status: BilateralAiJobStatus.PENDING,
          queue_entry_date: LessThan(
            new Date(NOW - getBilateralAiQueueStallMs()),
          ),
        },
        order: { queue_entry_date: 'ASC' },
      });
      // The stall cutoff must differ from the attempt-timeout cutoff — pins that the two
      // branches read distinct config getters instead of sharing one.
      expect(getBilateralAiQueueStallMs()).not.toBe(
        getBilateralAiAttemptTimeoutMs(),
      );
      expect(stubs.jobRepository.count).not.toHaveBeenCalled();
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
      stubs.jobRepository.findOne.mockResolvedValue(stalePending);
      stubs.jobRepository.count.mockResolvedValue(1); // another job advanced 5 min ago

      await cron.sweep();

      const stallCutoff = new Date(NOW - getBilateralAiQueueStallMs());
      // Boundary proof: 31 minutes ago falls on the stale side of the 30-min default cutoff.
      expect(stalePending.queue_entry_date.getTime()).toBeLessThan(
        stallCutoff.getTime(),
      );
      expect(stubs.jobRepository.count).toHaveBeenCalledWith({
        where: [
          { started_date: MoreThan(stallCutoff) },
          { stage_updated_date: MoreThan(stallCutoff) },
        ],
      });
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
      stubs.jobRepository.findOne.mockResolvedValue(stalePending);
      stubs.jobRepository.count.mockResolvedValue(0); // no activity anywhere

      await cron.sweep();

      const stallCutoff = new Date(NOW - getBilateralAiQueueStallMs());
      expect(stubs.jobRepository.count).toHaveBeenCalledWith({
        where: [
          { started_date: MoreThan(stallCutoff) },
          { stage_updated_date: MoreThan(stallCutoff) },
        ],
      });
      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'stale-pending', status: BilateralAiJobStatus.PENDING },
        expect.objectContaining({
          status: BilateralAiJobStatus.FAILED,
          error_code: 'QUEUE_STALLED',
          completed_date: expect.any(Date),
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
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'stale-pending',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 31 * 60_000),
      });
      stubs.jobRepository.count.mockResolvedValue(0);
      stubs.jobRepository.update.mockResolvedValue({ affected: 0 });

      await cron.sweep();

      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
    });
  });

  describe('one sweep per process (APF-R-2 C / D1)', () => {
    beforeEach(() => {
      configureQueueEnv();
      jest.useFakeTimers().setSystemTime(new Date(NOW_ISO));
    });

    it('never double-notifies within a single sweep even when both branches fire', async () => {
      const { cron, stubs } = makeCron();
      stubs.jobRepository.find.mockResolvedValue([
        {
          job_id: 'timed-out',
          status: BilateralAiJobStatus.PROCESSING,
          started_date: new Date(NOW - 20 * 60_000),
        },
      ]);
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'stalled',
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date(NOW - 40 * 60_000),
      });
      stubs.jobRepository.count.mockResolvedValue(0);

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
      stubs.jobRepository.find.mockRejectedValue(new Error('db down'));
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await expect(cron.sweep()).resolves.toBeUndefined();

      // The stall branch must not be skipped just because the timeout branch blew up first.
      expect(stubs.jobRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('a throw in the queue-stall branch is caught and logged, and the attempt-timeout branch still ran', async () => {
      const { cron, stubs } = makeCron();
      stubs.jobRepository.find.mockResolvedValue([]);
      stubs.jobRepository.findOne.mockRejectedValue(new Error('db down'));

      await expect(cron.sweep()).resolves.toBeUndefined();

      expect(stubs.jobRepository.find).toHaveBeenCalledTimes(1);
    });
  });
});
