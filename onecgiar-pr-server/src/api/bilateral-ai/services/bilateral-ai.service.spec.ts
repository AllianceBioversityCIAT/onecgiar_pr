import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BilateralAiService } from './bilateral-ai.service';
import { BilateralAiJobStatus } from '../entities/bilateral-ai-job.entity';
import { DraftEvidenceSourceType } from '../entities/draft-evidence.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('BilateralAiService (unit)', () => {
  const makeService = (overrides: Partial<any> = {}) => {
    // `getExpectations` moved its 90-day sample window into SQL (timezone-skew fix), so it runs
    // through the query builder instead of `find` — MySQL, not the Node process, decides which
    // rows are inside the window.
    const jobQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const jobRepository = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, job_id: 'job-uuid-1' })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => jobQueryBuilder),
      // Default: every conditional UPDATE "wins" (affected: 1). Tests exercising a lost race
      // (attempt-start, stage advancement, retry/final writes) override this per-call.
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn(),
    };
    const draftRepository = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: 1 })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    const evidenceRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (x) => ({ ...x, id: 1 })),
    };
    const resultRepository = {
      save: jest.fn(async (x) => ({ ...x, id: 100 })),
      update: jest.fn(),
      findOneOrFail: jest
        .fn()
        .mockResolvedValue({ id: 100, result_type_id: 7 }),
    };
    const versioningService = {
      $_findActivePhase: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const yearRepository = {
      findOne: jest.fn().mockResolvedValue({ year: 2025 }),
    };
    const resultsByProjectsRepository = {
      save: jest.fn(),
    };
    const queue = {
      isEnabled: jest.fn().mockReturnValue(true),
      publish: jest.fn(),
    };
    const storage = {
      validateSources: jest.fn(),
      uploadFiles: jest.fn().mockResolvedValue([]),
      getBucketName: jest.fn().mockReturnValue('test-bucket'),
      getSignedUrl: jest.fn().mockReturnValue('https://signed.url'),
      keyExists: jest.fn().mockResolvedValue(true),
    };
    const textMining = {
      extract: jest.fn().mockResolvedValue({}),
      normalize: jest
        .fn()
        .mockReturnValue({ results: [], interactionId: null }),
    };

    const bilateralService = {
      populateResultFromExtractedMds: jest.fn().mockResolvedValue(undefined),
      populateTypeSpecificFromExtractedMds: jest
        .fn()
        .mockResolvedValue(undefined),
      populateInitiativeAndTocFromProgramCode: jest
        .fn()
        .mockResolvedValue(undefined),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ email: 'user@cgiar.org' }),
      find: jest.fn().mockResolvedValue([]),
    };
    const roleByUserRepository = {
      validationCenterPermissions: jest.fn().mockResolvedValue(1),
      // `ASC-T-5`: default false so every pre-existing case (which never asserts on admin
      // status) keeps behaving exactly as before this pivot.
      isUserAdmin: jest.fn().mockResolvedValue(false),
    };
    const clarisaCentersRepository = {
      findOne: jest.fn().mockResolvedValue({ code: 'TEST_CENTER' }),
    };
    const clarisaInstitutionsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7, acronym: 'AfricaRice' }),
      find: jest.fn().mockResolvedValue([]),
    };
    // `AIQ-T-4`: batched lookup for the list item's `project_name` (design.md §4.1, P-21).
    const clarisaProjectsRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const notificationsService = {
      notifyTerminal: jest.fn().mockResolvedValue(undefined),
    };
    const evidenceTransferService = {
      transferForDraft: jest.fn().mockResolvedValue([]),
    };
    // `AIQ-T-3`: `wake` is documented as never-throwing on the real class; the default here mirrors
    // that so every existing test keeps behaving exactly as before this pivot.
    const dispatchService = {
      wake: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BilateralAiService(
      jobRepository as any,
      draftRepository as any,
      evidenceRepository as any,
      resultRepository as any,
      versioningService as any,
      yearRepository as any,
      resultsByProjectsRepository as any,
      queue as any,
      storage as any,
      textMining as any,
      bilateralService as any,
      userRepository as any,
      roleByUserRepository as any,
      clarisaCentersRepository as any,
      clarisaInstitutionsRepository as any,
      clarisaProjectsRepository as any,
      notificationsService as any,
      evidenceTransferService as any,
      dispatchService as any,
    );

    Object.assign(service, overrides);

    return {
      service,
      stubs: {
        jobRepository,
        jobQueryBuilder,
        draftRepository,
        evidenceRepository,
        resultRepository,
        versioningService,
        yearRepository,
        resultsByProjectsRepository,
        queue,
        storage,
        textMining,
        bilateralService,
        userRepository,
        roleByUserRepository,
        clarisaCentersRepository,
        clarisaInstitutionsRepository,
        clarisaProjectsRepository,
        notificationsService,
        evidenceTransferService,
        dispatchService,
      },
    };
  };

  const user: TokenDto = {
    id: 42,
    email: 'test@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  };

  describe('createJob', () => {
    it('should throw ServiceUnavailableException when queue is not enabled', async () => {
      const { service, stubs } = makeService();
      stubs.queue.isEnabled.mockReturnValue(false);

      await expect(
        service.createJob(
          { project_id: 1, center_id: 7, program_code: 'WLE' },
          [],
          [],
          user,
        ),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should validate sources before creating job', async () => {
      const { service, stubs } = makeService();
      const dto = { project_id: 1, center_id: 7, program_code: 'WLE' };
      const docs = [{ originalname: 'doc.pdf' }];
      const audio = [];

      await service.createJob(dto, docs, audio, user);

      expect(stubs.storage.validateSources).toHaveBeenCalledWith(
        docs,
        audio,
        undefined,
      );
    });

    it('should upload files and save job entity', async () => {
      const { service, stubs } = makeService();
      stubs.storage.uploadFiles.mockResolvedValue([
        { key: 'doc-key-1', name: 'doc.pdf' },
        { key: 'audio-key-1', name: 'audio.mp3' },
      ]);

      await service.createJob(
        { project_id: 1, center_id: 7, program_code: 'WLE' },
        [{ originalname: 'doc.pdf' }],
        [{ originalname: 'audio.mp3' }],
        user,
      );

      expect(stubs.storage.uploadFiles).toHaveBeenCalled();
      expect(stubs.jobRepository.save).toHaveBeenCalled();
    });

    it('should publish to queue after saving job', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.save.mockResolvedValue({ job_id: 'saved-job' });

      await service.createJob(
        { project_id: 1, center_id: 7, program_code: 'WLE' },
        [],
        [],
        user,
      );

      expect(stubs.queue.publish).toHaveBeenCalledWith({ jobId: 'saved-job' });
    });

    it('should mark job as FAILED when queue publish fails', async () => {
      const { service, stubs } = makeService();
      stubs.queue.publish.mockImplementation(() => {
        throw new Error('Queue unavailable');
      });
      stubs.jobRepository.save.mockResolvedValue({ job_id: 'fail-job' });

      await expect(
        service.createJob(
          { project_id: 1, center_id: 7, program_code: 'WLE' },
          [],
          [],
          user,
        ),
      ).rejects.toThrow('Queue unavailable');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith('fail-job', {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_NOT_AVAILABLE',
        error_message: 'The AI processing queue could not accept the job.',
        completed_date: expect.any(Function), // was: expect.any(Date)
      });
    });

    it('should trim text context', async () => {
      const { service, stubs } = makeService();

      await service.createJob(
        { project_id: 1, center_id: 7, program_code: 'WLE', text: '  hello  ' },
        [],
        [],
        user,
      );

      expect(stubs.storage.validateSources).toHaveBeenCalledWith(
        [],
        [],
        'hello',
      );
    });

    it('should return jobId and status on success', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.save.mockResolvedValue({
        job_id: 'new-job',
        status: BilateralAiJobStatus.PENDING,
      });

      const result = await service.createJob(
        { project_id: 1, center_id: 7, program_code: 'WLE' },
        [],
        [],
        user,
      );

      expect(result).toEqual({
        response: {
          jobId: 'new-job',
          jobStatus: BilateralAiJobStatus.PENDING,
        },
        message: 'AI job created successfully',
        status: 202,
      });
    });
  });

  describe('getJob', () => {
    it('should return job when found, with queue_position null and max_attempts filled in for a non-PENDING job', async () => {
      const { service, stubs } = makeService();
      const mockJob = {
        job_id: 'j1',
        user_id: 42,
        status: BilateralAiJobStatus.PROCESSING,
      };
      stubs.jobRepository.findOne.mockResolvedValue(mockJob);

      const result = await service.getJob('j1', 42);

      expect(result).toEqual({
        response: {
          ...mockJob,
          queue_position: null,
          jobs_ahead: null,
          wait_reason: null,
          max_attempts: 3,
        },
        message: 'AI job found',
        status: 200,
      });
      // PROCESSING jobs never compute a position (APF-R-1 A: PENDING only).
      expect(stubs.jobRepository.count).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when job not found', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await expect(service.getJob('missing', 42)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by jobId and userId', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await service.getJob('j1', 42).catch(() => {});

      expect(stubs.jobRepository.findOne).toHaveBeenCalledWith({
        where: { job_id: 'j1', user_id: 42 },
      });
    });

    // `AIQ-T-4`, `AIQ-DD-4`: `jobs_ahead` (and `queue_position`, redefined as `jobs_ahead`) is a
    // mocked count keyed on `queue_entry_date`, never a stored column — computed fresh on every
    // read, and scoped to `PENDING` only (older `PROCESSING` rows no longer count).
    it('computes jobs_ahead/queue_position for a PENDING job from a PENDING-only count keyed on queue_entry_date, and wait_reason from the caps', async () => {
      const { service, stubs } = makeService();
      const myQueueEntryDate = new Date('2026-09-10T00:00:00.000Z');
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        user_id: 42,
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: myQueueEntryDate,
      });
      stubs.jobRepository.count
        .mockResolvedValueOnce(2) // jobs_ahead
        .mockResolvedValueOnce(0) // owner's PROCESSING count — below the per-user cap (default 1)
        .mockResolvedValueOnce(1); // global PROCESSING count — below the global cap (default 2)

      const result = await service.getJob('j1', 42);

      expect(result.response.jobs_ahead).toBe(2);
      expect(result.response.queue_position).toBe(2);
      expect(result.response.wait_reason).toBe('starting');
      expect(stubs.jobRepository.count).toHaveBeenCalledTimes(3);

      const jobsAheadArgs = stubs.jobRepository.count.mock.calls[0][0];
      // The count is scoped to this job's own queue-entry clock (never `created_date`) and to
      // PENDING jobs only — a running job is never "ahead" in a lane model.
      expect(jobsAheadArgs.where.queue_entry_date.type).toBe('lessThan');
      expect(jobsAheadArgs.where.queue_entry_date.value).toEqual(
        myQueueEntryDate,
      );
      expect(jobsAheadArgs.where.status).toBe(BilateralAiJobStatus.PENDING);

      const ownerArgs = stubs.jobRepository.count.mock.calls[1][0];
      expect(ownerArgs.where).toEqual({
        status: BilateralAiJobStatus.PROCESSING,
        user_id: 42,
      });

      const globalArgs = stubs.jobRepository.count.mock.calls[2][0];
      expect(globalArgs.where).toEqual({
        status: BilateralAiJobStatus.PROCESSING,
      });
    });

    // `AIQ-R-6` A: the three `wait_reason` outcomes (`design.md` §5.5).
    it('wait_reason is own_job_running when the owner is at the per-user cap', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        user_id: 42,
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date('2026-09-10T00:00:00.000Z'),
      });
      stubs.jobRepository.count
        .mockResolvedValueOnce(0) // jobs_ahead
        .mockResolvedValueOnce(1); // owner's PROCESSING count === default per-user cap (1)

      const result = await service.getJob('j1', 42);

      expect(result.response.wait_reason).toBe('own_job_running');
      // Short-circuits before the third (global) count.
      expect(stubs.jobRepository.count).toHaveBeenCalledTimes(2);
    });

    it('wait_reason is no_free_lane when the owner is free but the global cap is full', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        user_id: 42,
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: new Date('2026-09-10T00:00:00.000Z'),
      });
      stubs.jobRepository.count
        .mockResolvedValueOnce(0) // jobs_ahead
        .mockResolvedValueOnce(0) // owner's PROCESSING count — below the per-user cap
        .mockResolvedValueOnce(2); // global PROCESSING count === default global cap (2)

      const result = await service.getJob('j1', 42);

      expect(result.response.wait_reason).toBe('no_free_lane');
    });

    it('reads max_attempts from BILATERAL_AI_MAX_ATTEMPTS', async () => {
      const { service, stubs } = makeService();
      const original = process.env.BILATERAL_AI_MAX_ATTEMPTS;
      process.env.BILATERAL_AI_MAX_ATTEMPTS = '5';
      try {
        stubs.jobRepository.findOne.mockResolvedValue({
          job_id: 'j1',
          user_id: 42,
          status: BilateralAiJobStatus.FAILED,
        });

        const result = await service.getJob('j1', 42);

        expect(result.response.max_attempts).toBe(5);
      } finally {
        if (original === undefined)
          delete process.env.BILATERAL_AI_MAX_ATTEMPTS;
        else process.env.BILATERAL_AI_MAX_ATTEMPTS = original;
      }
    });
  });

  describe('listJobs', () => {
    // A `FindOperator`-aware fake matcher for `jobRepository.find`/`count`'s `where` clauses
    // (`In`, `Not`, `LessThan`) plus plain equality — lets these tests exercise the real
    // filtering/counting shape the service builds, against a fixture the test controls.
    function findMatches(job: any, where: Record<string, any>): boolean {
      return Object.entries(where).every(([key, condition]) => {
        if (condition && typeof condition === 'object' && 'type' in condition) {
          switch (condition.type) {
            case 'in':
              return condition.value.includes(job[key]);
            case 'not':
              return job[key] !== condition.value;
            case 'lessThan':
              return (
                new Date(job[key]).getTime() <
                new Date(condition.value).getTime()
              );
            default:
              throw new Error(
                `Unhandled FindOperator in test fake: ${condition.type}`,
              );
          }
        }
        return job[key] === condition;
      });
    }

    // A fake `createQueryBuilder()` for the finished-jobs branch, which builds its WHERE with
    // raw SQL fragments (`design.md` §5.5's timezone-skew rule: the 24h cutoff is SQL, not JS
    // `Date` math) instead of `FindOperator`s. Recognizes exactly the fragments `listJobs` emits.
    function buildQueryBuilderFake(rows: any[]) {
      const conditions: Array<{ sql: string; params?: any }> = [];
      const qb: any = {
        where: jest.fn((sql: string, params?: any) => {
          conditions.push({ sql, params });
          return qb;
        }),
        andWhere: jest.fn((sql: string, params?: any) => {
          conditions.push({ sql, params });
          return qb;
        }),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () =>
          rows.filter((job) =>
            conditions.every(({ sql, params }) => {
              if (sql === 'job.user_id = :userId')
                return job.user_id === params.userId;
              if (sql === 'job.status IN (:...statuses)')
                return params.statuses.includes(job.status);
              if (
                sql ===
                'job.completed_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
              ) {
                return (
                  job.completed_date != null &&
                  Date.now() - new Date(job.completed_date).getTime() <=
                    24 * 60 * 60 * 1000
                );
              }
              throw new Error(`Unhandled test condition: ${sql}`);
            }),
          ),
        ),
      };
      return qb;
    }

    function wireFixture(stubs: any, allJobs: any[]) {
      stubs.jobRepository.find.mockImplementation(async ({ where }: any) =>
        allJobs.filter((job) => findMatches(job, where)),
      );
      stubs.jobRepository.createQueryBuilder.mockImplementation(() =>
        buildQueryBuilderFake(allJobs),
      );
      stubs.jobRepository.count.mockImplementation(
        async ({ where }: any) =>
          allJobs.filter((job) => findMatches(job, where)).length,
      );
    }

    function baseJob(overrides: Partial<any>): any {
      return {
        job_id: 'job',
        user_id: 1,
        status: BilateralAiJobStatus.PENDING,
        stage: 'queued',
        stage_updated_date: null,
        project_id: 1,
        program_code: 'WLE',
        center_id: 1,
        document_keys: [],
        audio_keys: [],
        text_context: null,
        queue_entry_date: new Date(),
        started_date: null,
        completed_date: null,
        result_count: 0,
        error_code: null,
        attempts: 0,
        retrying: false,
        ...overrides,
      };
    }

    // Falsifier 1 (`AIQ-T-4`): if the implementation spreads `{...job}` instead of the explicit
    // §4.1 key set, `bucket_name`/`user_id` leak and this goes red.
    // Falsifier 2: if the `user_id = caller` filter is dropped, `other-pending`/`other-processing`
    // appear in the result and the "no other job_id" assertion goes red.
    // Disqualifier: the fixture below mixes the caller's rows with other users' rows on purpose.
    it("returns exactly the §4.1 key set and never another user's job_id, with matching summary counts", async () => {
      const { service, stubs } = makeService();
      const now = Date.now();

      const callerPending = baseJob({
        job_id: 'caller-pending',
        user_id: 42,
        project_id: 10,
        center_id: 7,
        document_keys: ['d1'],
        audio_keys: [],
        text_context: 'hello',
        queue_entry_date: new Date(now - 1000),
        bucket_name: 'secret-bucket',
        document_keys_raw: undefined,
      });
      const otherPending = baseJob({
        job_id: 'other-pending',
        user_id: 99,
        project_id: 11,
        center_id: 8,
        queue_entry_date: new Date(now - 5000),
      });
      const otherProcessing = baseJob({
        job_id: 'other-processing',
        user_id: 99,
        status: BilateralAiJobStatus.PROCESSING,
        project_id: 11,
        center_id: 8,
        queue_entry_date: new Date(now - 8000),
        started_date: new Date(now - 4000),
      });

      wireFixture(stubs, [callerPending, otherPending, otherProcessing]);
      stubs.clarisaProjectsRepository.find.mockResolvedValue([
        { id: 10, shortName: 'Short', fullName: 'Full Project Name' },
      ]);
      stubs.clarisaInstitutionsRepository.find.mockResolvedValue([
        { id: 7, acronym: 'AfricaRice' },
      ]);

      const result = await service.listJobs({ id: 42 } as any);

      expect(result.response.jobs).toHaveLength(1);
      const [item] = result.response.jobs;

      expect(Object.keys(item).sort()).toEqual(
        [
          'job_id',
          'status',
          'stage',
          'stage_updated_date',
          'project_id',
          'project_name',
          'program_code',
          'center_id',
          'center_acronym',
          'document_count',
          'audio_count',
          'has_text',
          'queue_entry_date',
          'started_date',
          'completed_date',
          'result_count',
          'error_code',
          'attempts',
          'max_attempts',
          'retrying',
          'jobs_ahead',
          'wait_reason',
        ].sort(),
      );
      // §4.1 "Excluded from the list on purpose".
      expect(item).not.toHaveProperty('bucket_name');
      expect(item).not.toHaveProperty('user_id');
      expect(item).not.toHaveProperty('document_keys');
      expect(item).not.toHaveProperty('audio_keys');
      expect(item).not.toHaveProperty('text_context');
      expect(item).not.toHaveProperty('response_snapshot');
      expect(item).not.toHaveProperty('error_message');

      const jobIds = result.response.jobs.map((j: any) => j.job_id);
      expect(jobIds).not.toContain('other-pending');
      expect(jobIds).not.toContain('other-processing');

      expect(item.project_name).toBe('Full Project Name');
      expect(item.center_acronym).toBe('AfricaRice');
      expect(item.document_count).toBe(1);
      expect(item.audio_count).toBe(0);
      expect(item.has_text).toBe(true);
      expect(item.max_attempts).toBe(3);
      // Global fair order: `other-pending` is an older PENDING row (any owner counts, §5.5).
      expect(item.jobs_ahead).toBe(1);
      // Owner not at cap (0 PROCESSING), global PROCESSING count is 1 < default cap 2.
      expect(item.wait_reason).toBe('starting');

      expect(result.response.summary).toEqual({
        lanes_total: 2,
        lanes_busy: 1,
        others_waiting: 1,
      });
    });

    it('returns an empty list (but a real summary) when the caller resolves to id: 0', async () => {
      const { service, stubs } = makeService();
      const allJobs = [
        baseJob({
          job_id: 'someone-elses',
          user_id: 7,
          project_id: 1,
          center_id: 1,
        }),
      ];
      wireFixture(stubs, allJobs);

      const result = await service.listJobs({ id: 0 } as any);

      expect(result.response.jobs).toEqual([]);
      expect(result.response.summary).toEqual({
        lanes_total: 2,
        lanes_busy: 0,
        others_waiting: 1,
      });
    });

    it('is monotonic: a newer PENDING row leaves jobs_ahead unchanged, finishing an older one decreases it', async () => {
      const { service, stubs } = makeService();
      const t0 = new Date('2026-09-10T00:00:00.000Z');

      const olderPending = baseJob({
        job_id: 'older',
        user_id: 99,
        project_id: 1,
        center_id: 1,
        queue_entry_date: new Date(t0.getTime() - 2000),
      });
      const myJob = baseJob({
        job_id: 'mine',
        user_id: 42,
        project_id: 1,
        center_id: 1,
        queue_entry_date: t0,
      });

      wireFixture(stubs, [olderPending, myJob]);
      const first = await service.listJobs({ id: 42 } as any);
      expect(
        first.response.jobs.find((j: any) => j.job_id === 'mine').jobs_ahead,
      ).toBe(1);

      const newerPending = baseJob({
        ...olderPending,
        job_id: 'newer',
        queue_entry_date: new Date(t0.getTime() + 2000),
      });
      wireFixture(stubs, [olderPending, myJob, newerPending]);
      const second = await service.listJobs({ id: 42 } as any);
      expect(
        second.response.jobs.find((j: any) => j.job_id === 'mine').jobs_ahead,
      ).toBe(1);

      const finishedOlder = {
        ...olderPending,
        status: BilateralAiJobStatus.COMPLETED,
        completed_date: new Date(),
      };
      wireFixture(stubs, [finishedOlder, myJob, newerPending]);
      const third = await service.listJobs({ id: 42 } as any);
      expect(
        third.response.jobs.find((j: any) => j.job_id === 'mine').jobs_ahead,
      ).toBe(0);
    });

    it('agrees with getJob on jobs_ahead, wait_reason and queue_position for the same PENDING job', async () => {
      const { service, stubs } = makeService();
      const queueEntryDate = new Date('2026-09-10T00:00:00.000Z');

      const olderPending = baseJob({
        job_id: 'older',
        user_id: 7,
        project_id: 1,
        center_id: 1,
        queue_entry_date: new Date(queueEntryDate.getTime() - 1000),
      });
      const myJob = baseJob({
        job_id: 'mine',
        user_id: 42,
        project_id: 1,
        center_id: 1,
        queue_entry_date: queueEntryDate,
      });

      wireFixture(stubs, [olderPending, myJob]);
      stubs.jobRepository.findOne.mockResolvedValue(myJob);

      const listResult = await service.listJobs({ id: 42 } as any);
      const listItem = listResult.response.jobs.find(
        (j: any) => j.job_id === 'mine',
      );

      const jobResult = await service.getJob('mine', 42);

      expect(jobResult.response.jobs_ahead).toBe(listItem.jobs_ahead);
      expect(jobResult.response.wait_reason).toBe(listItem.wait_reason);
      expect(jobResult.response.queue_position).toBe(listItem.jobs_ahead);
    });
  });

  describe('retryJob', () => {
    const failedJob = () => ({
      job_id: 'job-1',
      user_id: 42,
      status: BilateralAiJobStatus.FAILED,
      document_keys: ['doc-key-1'],
      audio_keys: [],
    });

    it('should throw ServiceUnavailableException when the queue is not configured', async () => {
      const { service, stubs } = makeService();
      stubs.queue.isEnabled.mockReturnValue(false);

      await expect(service.retryJob('job-1', user)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should throw NotFoundException when the job does not exist', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await expect(service.retryJob('missing', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when the requester is not the job owner', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        ...failedJob(),
        user_id: 999,
      });

      await expect(service.retryJob('job-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each([BilateralAiJobStatus.PENDING, BilateralAiJobStatus.PROCESSING])(
      'should throw 409 JOB_ALIVE when the job is %s',
      async (status) => {
        const { service, stubs } = makeService();
        stubs.jobRepository.findOne.mockResolvedValue({
          ...failedJob(),
          status,
        });

        try {
          await service.retryJob('job-1', user);
          throw new Error('expected retryJob to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(409);
          expect((error as HttpException).getResponse()).toEqual(
            expect.objectContaining({ code: 'JOB_ALIVE' }),
          );
        }
      },
    );

    it('should throw 409 JOB_COMPLETED when the job already completed', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        ...failedJob(),
        status: BilateralAiJobStatus.COMPLETED,
      });

      try {
        await service.retryJob('job-1', user);
        throw new Error('expected retryJob to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(409);
        expect((error as HttpException).getResponse()).toEqual(
          expect.objectContaining({ code: 'JOB_COMPLETED' }),
        );
      }
    });

    it('should throw 410 SOURCES_GONE on the first missing S3 key, before writing anything', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());
      stubs.storage.keyExists.mockResolvedValue(false);

      try {
        await service.retryJob('job-1', user);
        throw new Error('expected retryJob to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(410);
        expect((error as HttpException).getResponse()).toEqual(
          expect.objectContaining({ code: 'SOURCES_GONE' }),
        );
      }
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.queue.publish).not.toHaveBeenCalled();
    });

    it('should reset the job and republish on success, returning 202 with the same jobId', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());

      const result = await service.retryJob('job-1', user);

      expect(result).toEqual({
        response: { jobId: 'job-1', jobStatus: BilateralAiJobStatus.PENDING },
        message: 'AI job re-queued for retry',
        status: 202,
      });
      expect(stubs.queue.publish).toHaveBeenCalledWith({ jobId: 'job-1' });
    });

    it('resets attempts/retrying/error_*/started_date/completed_date, sets retried_date, scopes the write to status = FAILED, and leaves created_date untouched', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());

      await service.retryJob('job-1', user);

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'job-1', status: BilateralAiJobStatus.FAILED },
        expect.objectContaining({
          status: BilateralAiJobStatus.PENDING,
          stage: 'queued',
          stage_updated_date: expect.any(Function), // was: expect.any(Date)
          attempts: 0,
          retrying: false,
          error_code: null,
          error_message: null,
          started_date: null,
          completed_date: null,
          retried_date: expect.any(Function), // was: expect.any(Date)
        }),
      );
      const [, setPayload] = stubs.jobRepository.update.mock.calls[0];
      expect(setPayload).not.toHaveProperty('created_date');
    });

    // `AIQ-R-2` D / `AIQ-AC-10` (`tasks.md` AIQ-T-3 Tests: "Retry re-entry: retryJob → decide sees
    // it as the newest"; `design.md` §5.3's row for this is "no code change there, only a test").
    // This is the "fresh queue_entry_date" half of that scenario: `queue_entry_date` is a STORED
    // generated column `COALESCE(retried_date, created_date)` (`design.md` P-7), never written
    // directly, so proving `retried_date` is set to the DB-time escape hatch (never a JS `Date`,
    // per the timezone-skew fix `bilateral-ai.config.ts`'s `bilateralAiDbNow`) is what makes the
    // generated column pick up "now" as this job's new fair-order position. The complementary
    // "ordering behind an older PENDING job" half is proven at `decide`'s seam in
    // `bilateral-ai-dispatch.service.spec.ts` ("retry re-entry — a retried job goes to the back of
    // fair order").
    it('AIQ-R-2 D / AIQ-AC-10: retryJob sets a fresh retried_date via CURRENT_TIMESTAMP (never a JS Date), which the generated queue_entry_date column picks up as the new fair-order position', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());

      await service.retryJob('job-1', user);

      const [, setPayload] = stubs.jobRepository.update.mock.calls[0];
      expect(setPayload.retried_date).toBeInstanceOf(Function);
      expect(setPayload.retried_date()).toBe('CURRENT_TIMESTAMP');
      expect(setPayload.retried_date).not.toBeInstanceOf(Date);
      // `design.md` §5.2/P-7: `queue_entry_date` itself is never in this write's SET clause — it
      // is a STORED generated column derived from `retried_date`, not a column this write ever
      // touches directly.
      expect(setPayload).not.toHaveProperty('queue_entry_date');
    });

    it('should throw 409 JOB_ALIVE when the conditional reset affects 0 rows (lost the race)', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());
      stubs.jobRepository.update.mockResolvedValueOnce({ affected: 0 });

      try {
        await service.retryJob('job-1', user);
        throw new Error('expected retryJob to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(409);
        expect((error as HttpException).getResponse()).toEqual(
          expect.objectContaining({ code: 'JOB_ALIVE' }),
        );
      }
      expect(stubs.queue.publish).not.toHaveBeenCalled();
    });

    it('should mark the job FAILED again and rethrow when publish fails after the reset', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(failedJob());
      const publishError = new Error('queue unavailable');
      stubs.queue.publish.mockImplementation(() => {
        throw publishError;
      });

      await expect(service.retryJob('job-1', user)).rejects.toThrow(
        publishError,
      );

      expect(stubs.jobRepository.update).toHaveBeenLastCalledWith('job-1', {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'QUEUE_NOT_AVAILABLE',
        error_message: 'The AI processing queue could not accept the job.',
        completed_date: expect.any(Function), // was: expect.any(Date)
      });
    });
  });

  describe('getExpectations', () => {
    const makeCompletedRow = (
      durationSeconds: number,
      mix: 'documents' | 'audio',
    ) => {
      const started = new Date('2026-01-01T00:00:00.000Z');
      return {
        audio_keys: mix === 'audio' ? ['audio-key-1'] : [],
        started_date: started,
        completed_date: new Date(started.getTime() + durationSeconds * 1000),
      };
    };

    it('should throw BadRequestException for an invalid mix', async () => {
      const { service } = makeService();

      await expect(service.getExpectations('mixed')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('computes P25/P75 in whole minutes over 6 COMPLETED samples of the same mix class', async () => {
      const { service, stubs } = makeService();
      const durationsSeconds = [120, 240, 360, 480, 600, 720];
      stubs.jobQueryBuilder.getMany.mockResolvedValue(
        durationsSeconds.map((s) => makeCompletedRow(s, 'documents')),
      );

      const result = await service.getExpectations('documents');

      expect(result).toEqual({
        response: {
          mix: 'documents',
          sampleSize: 6,
          p25Minutes: 4,
          p75Minutes: 10,
        },
        message: 'AI job expectations found',
        status: 200,
      });
    });

    it('returns null percentiles when fewer than 5 samples exist', async () => {
      const { service, stubs } = makeService();
      stubs.jobQueryBuilder.getMany.mockResolvedValue(
        [60, 120, 180, 240].map((s) => makeCompletedRow(s, 'documents')),
      );

      const result = await service.getExpectations('documents');

      expect(result.response).toEqual({
        mix: 'documents',
        sampleSize: 4,
        p25Minutes: null,
        p75Minutes: null,
      });
    });

    it('classifies a job with any audio key as "audio", even alongside documents', async () => {
      const { service, stubs } = makeService();
      stubs.jobQueryBuilder.getMany.mockResolvedValue([
        makeCompletedRow(600, 'audio'),
      ]);

      const audioResult = await service.getExpectations('audio');
      expect(audioResult.response.sampleSize).toBe(1);

      const documentsResult = await service.getExpectations('documents');
      expect(documentsResult.response.sampleSize).toBe(0);
    });

    it('caches the result per mix — a second call within the 10-minute window skips the query', async () => {
      const { service, stubs } = makeService();
      stubs.jobQueryBuilder.getMany.mockResolvedValue(
        [120, 240, 360, 480, 600].map((s) => makeCompletedRow(s, 'documents')),
      );

      const first = await service.getExpectations('documents');
      const second = await service.getExpectations('documents');

      // Was: `expect(stubs.jobRepository.find).toHaveBeenCalledTimes(1)`.
      expect(stubs.jobQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL when key belongs to a user job', async () => {
      const { service, stubs } = makeService();
      const mockJob = {
        job_id: 'job-uuid-1',
        user_id: 42,
        document_keys: ['prms/bilateral-ai/job-uuid-1/doc.pdf'],
        audio_keys: [],
      };
      stubs.jobRepository.findOne.mockResolvedValue(mockJob);

      const result = await service.getSignedUrl(
        'prms/bilateral-ai/job-uuid-1/doc.pdf',
        user,
      );

      expect(stubs.jobRepository.findOne).toHaveBeenCalledWith({
        where: { job_id: 'job-uuid-1', user_id: 42 },
      });
      expect(stubs.storage.getSignedUrl).toHaveBeenCalledWith(
        'prms/bilateral-ai/job-uuid-1/doc.pdf',
      );
      expect(result).toEqual({
        response: { url: 'https://signed.url' },
        message: 'Signed URL generated',
        status: 200,
      });
    });

    it('should throw NotFoundException when key format is invalid', async () => {
      const { service } = makeService();
      await expect(service.getSignedUrl('invalid-key', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when job not found for user', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSignedUrl('prms/bilateral-ai/other-job/doc.pdf', user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when key not in job keys', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        user_id: 42,
        document_keys: ['prms/bilateral-ai/j1/real.pdf'],
        audio_keys: [],
      });

      await expect(
        service.getSignedUrl('prms/bilateral-ai/j1/unknown.pdf', user),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listDrafts', () => {
    it('should return non-discarded drafts scoped to the center, shared across all its members', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.find.mockResolvedValue([{ id: 1 }]);

      const result = await service.listDrafts(42, 7);

      expect(stubs.draftRepository.find).toHaveBeenCalledWith({
        where: {
          is_discarded: false,
          job: { center_id: 7 },
        },
        relations: { job: true, result: true },
        order: { created_date: 'DESC' },
      });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should enrich drafts with creator user info when user_id is present on the job', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.find.mockResolvedValue([
        { id: 1, job: { job_id: 'j1', user_id: 612 } },
      ]);
      stubs.userRepository.find.mockResolvedValue([
        {
          id: 612,
          first_name: 'Juan',
          last_name: 'Cadavid',
          email: 'j.cadavid@cgiar.org',
        },
      ]);

      const result = await service.listDrafts(42, 7);

      expect(stubs.userRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, first_name: true, last_name: true, email: true },
        }),
      );
      expect((result[0] as any).job.user).toEqual({
        id: 612,
        first_name: 'Juan',
        last_name: 'Cadavid',
        email: 'j.cadavid@cgiar.org',
      });
    });

    it('should scope the query to a different center independently', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.find.mockResolvedValue([]);

      await service.listDrafts(42, 99);

      expect(stubs.draftRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            job: { center_id: 99 },
          }),
        }),
      );
    });

    it('should resolve the center code and check membership before querying', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaCentersRepository.findOne.mockResolvedValue({
        code: 'ABC',
      });
      stubs.draftRepository.find.mockResolvedValue([]);

      await service.listDrafts(42, 7);

      expect(stubs.clarisaCentersRepository.findOne).toHaveBeenCalledWith({
        where: { institutionId: 7 },
      });
      expect(
        stubs.roleByUserRepository.validationCenterPermissions,
      ).toHaveBeenCalledWith(42, 'ABC');
    });

    it('should throw NotFoundException when the center does not resolve', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaCentersRepository.findOne.mockResolvedValue(null);

      await expect(service.listDrafts(42, 7)).rejects.toThrow(
        NotFoundException,
      );
      expect(stubs.draftRepository.find).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is not a member of the center', async () => {
      const { service, stubs } = makeService();
      stubs.roleByUserRepository.validationCenterPermissions.mockResolvedValue(
        0,
      );

      await expect(service.listDrafts(42, 7)).rejects.toThrow(
        ForbiddenException,
      );
      expect(stubs.draftRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('getDraft', () => {
    it('should return draft with evidence when found', async () => {
      const { service, stubs } = makeService();
      const mockDraft = {
        id: 5,
        is_discarded: false,
        job: { center_id: 7 },
      };
      stubs.draftRepository.findOne.mockResolvedValue(mockDraft);
      stubs.evidenceRepository.find.mockResolvedValue([{ id: 10 }]);

      const result = await service.getDraft(5, 42);

      expect(result).toEqual({
        response: { ...mockDraft, evidence: [{ id: 10 }] },
        message: 'AI draft found',
        status: 200,
      });
    });

    it('should throw NotFoundException when draft not found', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue(null);

      await expect(service.getDraft(999, 42)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when the requesting user is not a member of the draft's center", async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 7 },
      });
      stubs.roleByUserRepository.validationCenterPermissions.mockResolvedValue(
        0,
      );

      await expect(service.getDraft(5, 999)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('setFormalEvidence', () => {
    it('should mark evidence as formal when source type is DOCUMENT', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 7 },
      });
      stubs.evidenceRepository.find.mockResolvedValue([
        { id: 10, source_type: DraftEvidenceSourceType.DOCUMENT },
      ]);
      stubs.evidenceRepository.findOne.mockResolvedValue({
        id: 10,
        draft_id: 5,
        source_type: DraftEvidenceSourceType.DOCUMENT,
        is_active: true,
      });

      await service.setFormalEvidence(5, 10, true, 42);

      expect(stubs.evidenceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ is_formal_evidence: true }),
      );
    });

    it('should throw BadRequestException when marking non-DOCUMENT as formal', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 7 },
      });
      stubs.evidenceRepository.find.mockResolvedValue([
        { id: 10, source_type: DraftEvidenceSourceType.VOICE_NOTE },
      ]);
      stubs.evidenceRepository.findOne.mockResolvedValue({
        id: 10,
        draft_id: 5,
        source_type: DraftEvidenceSourceType.VOICE_NOTE,
        is_active: true,
      });

      await expect(service.setFormalEvidence(5, 10, true, 42)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when evidence not found', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 7 },
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);
      stubs.evidenceRepository.findOne.mockResolvedValue(null);

      await expect(service.setFormalEvidence(5, 999, true, 42)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('promoteDraft', () => {
    it('should update result status to Editing', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: 'EXCELLENCE', user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([
        {
          is_formal_evidence: true,
          source_type: DraftEvidenceSourceType.DOCUMENT,
        },
      ]);

      await service.promoteDraft(5, 42);

      expect(stubs.resultRepository.update).toHaveBeenCalledWith(100, {
        status_id: expect.any(Number),
      });
    });

    it('should call populateInitiativeAndTocFromProgramCode with job program_code', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: 'CLIMATE', user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(
        stubs.bilateralService.populateInitiativeAndTocFromProgramCode,
      ).toHaveBeenCalledWith(100, 'CLIMATE', 42);
    });

    // 2026-09-04: the client lands on /bilateral/:center/result/:result_code?phase=:versionId —
    // the same URL shape the results list opens — instead of the bare internal id.
    it('returns resultCode and versionId alongside resultId for the canonical editor URL', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);
      stubs.resultRepository.findOneOrFail.mockResolvedValue({
        id: 100,
        result_code: 9046,
        version_id: 36,
      });

      const res = await service.promoteDraft(5, 42);

      expect(res.response).toEqual({
        resultId: 100,
        resultCode: 9046,
        versionId: 36,
      });
    });

    // 2026-09-07: an AfricaRice upload whose document said "commissioned by ILRI" was promoted
    // with ILRI as lead centre — the promote handed the model's `lead_center` straight to
    // handleLeadCenter. The lead is the job's centre; the model's centre rides along as an option
    // for the bilateral service to keep as a contributor.
    it('makes the job centre the lead centre and passes the extracted MDS alongside it', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInstitutionsRepository.findOne.mockResolvedValue({
        id: 7,
        acronym: 'AfricaRice',
        name: 'Africa Rice Center',
      });
      const extracted = {
        lead_center: { acronym: 'ILRI' },
        contributing_partners: [],
      };
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: extracted,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(stubs.clarisaInstitutionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(
        stubs.bilateralService.populateResultFromExtractedMds,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: 100 }),
        extracted,
        42,
        {
          leadCenter: {
            institution_id: 7,
            acronym: 'AfricaRice',
            name: 'Africa Rice Center',
          },
        },
      );
    });

    // A draft with no extracted MDS used to get NO lead centre at all (the populate call was
    // skipped) — the same silent gap the wizard has for projects without organization_code.
    it('still assigns the job centre as lead when the draft carries no extracted MDS', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInstitutionsRepository.findOne.mockResolvedValue({
        id: 7,
        acronym: 'AfricaRice',
        name: 'Africa Rice Center',
      });
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(
        stubs.bilateralService.populateResultFromExtractedMds,
      ).toHaveBeenCalledWith(expect.objectContaining({ id: 100 }), null, 42, {
        leadCenter: expect.objectContaining({
          institution_id: 7,
          acronym: 'AfricaRice',
        }),
      });
    });

    it('passes no lead centre when the job has none, so the extracted one still leads', async () => {
      const { service, stubs } = makeService();
      const extracted = { lead_center: { acronym: 'ILRI' } };
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: null },
        extracted_mds: extracted,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(
        stubs.bilateralService.populateResultFromExtractedMds,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ id: 100 }),
        extracted,
        42,
        {
          leadCenter: undefined,
        },
      );
    });

    it('should throw BadRequestException when non-DOCUMENT formal evidence exists', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([
        {
          is_formal_evidence: true,
          source_type: DraftEvidenceSourceType.VOICE_NOTE,
        },
      ]);

      await expect(service.promoteDraft(5, 42)).rejects.toThrow(
        BadRequestException,
      );
    });

    // `ADE-T-4` — the live dispatch chain (`design.md` §3.1): the transfer runs once, scoped to
    // THIS draft's own `result_id`/`id`, after the `status_id` write and before the discard.
    it('calls the evidence transfer for this draft only, after the status write and before the discard', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(
        stubs.evidenceTransferService.transferForDraft,
      ).toHaveBeenCalledWith(5, 100, 42);
      const statusUpdateOrder =
        stubs.resultRepository.update.mock.invocationCallOrder[0];
      const transferOrder =
        stubs.evidenceTransferService.transferForDraft.mock
          .invocationCallOrder[0];
      const discardOrder =
        stubs.draftRepository.update.mock.invocationCallOrder[0];
      expect(statusUpdateOrder).toBeLessThan(transferOrder);
      expect(transferOrder).toBeLessThan(discardOrder);
    });

    // ADE-R-5 / defense in depth: even if the transfer service's own "never throws" contract were
    // violated, promoteDraft still resolves with its unchanged response — the result already
    // reached Editing above and nothing downstream may strand it.
    it('still resolves with the unchanged response contract if the evidence transfer rejects outright', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);
      stubs.resultRepository.findOneOrFail.mockResolvedValue({
        id: 100,
        result_code: 9046,
        version_id: 36,
      });
      stubs.evidenceTransferService.transferForDraft.mockRejectedValue(
        new Error('unexpected transfer defect'),
      );

      const res = await service.promoteDraft(5, 42);

      expect(res).toEqual({
        response: { resultId: 100, resultCode: 9046, versionId: 36 },
        message: 'Draft promoted to bilateral result',
        status: 200,
      });
      expect(stubs.resultRepository.update).toHaveBeenCalledWith(100, {
        status_id: expect.any(Number),
      });
      expect(stubs.draftRepository.update).toHaveBeenCalledWith(5, {
        is_discarded: true,
      });
    });
  });

  // `ADE-T-2` (`ADE-R-6`, DD-5): `createDraftFromCandidate` defaults `is_formal_evidence` per
  // source. Only the document site changes — it reuses `ADE-T-1`'s predicate; audio and text
  // context stay hard-coded `false`.
  describe('createDraftFromCandidate — is_formal_evidence defaults (ADE-T-2)', () => {
    it('defaults true for every qualifying document extension and false for .txt, audio and text context', async () => {
      const { service, stubs } = makeService();
      const evidenceRows: any[] = [];
      stubs.evidenceRepository.save.mockImplementation(async (row: any) => {
        const saved = { ...row, id: evidenceRows.length + 1 };
        evidenceRows.push(saved);
        return saved;
      });
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [
          'prms/j1/report.pdf',
          'prms/j1/report.docx',
          'prms/j1/sheet.xls',
          'prms/j1/sheet.xlsx',
          'prms/j1/deck.pptx',
          'prms/j1/notes.txt',
        ],
        audio_keys: ['prms/j1/note.m4a'],
        text_context: 'free-form notes captured alongside the upload',
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [{ indicator: 'Innovation Development', title: 'X' }],
        interactionId: null,
      });

      await service.processJob('j1');

      const byFileName = (fileName: string) =>
        evidenceRows.find((row) => row.file_name === fileName);

      expect(byFileName('report.pdf').is_formal_evidence).toBe(true);
      expect(byFileName('report.docx').is_formal_evidence).toBe(true);
      expect(byFileName('sheet.xls').is_formal_evidence).toBe(true);
      expect(byFileName('sheet.xlsx').is_formal_evidence).toBe(true);
      expect(byFileName('deck.pptx').is_formal_evidence).toBe(true);
      // `.txt` is an accepted DOCUMENT upload but never qualifying evidence (ADE-T-1).
      expect(byFileName('notes.txt').is_formal_evidence).toBe(false);

      const voiceRow = evidenceRows.find(
        (row) => row.source_type === DraftEvidenceSourceType.VOICE_NOTE,
      );
      expect(voiceRow.is_formal_evidence).toBe(false);

      const textRow = evidenceRows.find(
        (row) => row.source_type === DraftEvidenceSourceType.TEXT_CONTEXT,
      );
      expect(textRow.is_formal_evidence).toBe(false);
    });

    // The negative constraint this task names as the regression it is most likely to cause: if
    // the flag were set for EVERY source (not just qualifying documents), the voice note above
    // would also default `true`, and `promoteDraft`'s existing non-DOCUMENT validation
    // (`bilateral-ai.service.ts:547-556`) would throw `BadRequestException` on promotion — this
    // test drives that same mixed-source draft through `promoteDraft` end to end and asserts it
    // still succeeds. A test that only inspected the created rows (the test above) would never
    // exercise that guard, per this task's Disqualifier.
    it('a job carrying one .pdf and one .m4a still promotes successfully end to end (guard regression)', async () => {
      const { service, stubs } = makeService();
      const evidenceRows: any[] = [];
      stubs.evidenceRepository.save.mockImplementation(async (row: any) => {
        const saved = { ...row, id: evidenceRows.length + 1 };
        evidenceRows.push(saved);
        return saved;
      });
      stubs.evidenceRepository.find.mockImplementation(
        async () => evidenceRows,
      );
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: ['prms/j1/report.pdf'],
        audio_keys: ['prms/j1/note.m4a'],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [
          { indicator: 'Innovation Development', title: 'Mixed source' },
        ],
        interactionId: null,
      });

      await service.processJob('j1');

      // Sanity check on the defaults this test depends on: exactly one row is formal (the
      // document); the voice note is not.
      expect(evidenceRows).toHaveLength(2);
      const documentRow = evidenceRows.find(
        (row) => row.source_type === DraftEvidenceSourceType.DOCUMENT,
      );
      const voiceRow = evidenceRows.find(
        (row) => row.source_type === DraftEvidenceSourceType.VOICE_NOTE,
      );
      expect(documentRow.is_formal_evidence).toBe(true);
      expect(voiceRow.is_formal_evidence).toBe(false);

      // `draftRepository.save`'s default stub (see `makeService`) returns the created draft as
      // id 1 — wire `getDraftRaw`'s lookup for the promote call that follows.
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 1,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42, center_id: 7 },
        extracted_mds: null,
      });

      await expect(service.promoteDraft(1, 42)).resolves.toMatchObject({
        status: 200,
      });
    });
  });

  // `PSR-T-5` tasks.md Falsifier: "The AI-job completion path (the draft result in status Draft)
  // creates a primary request → FAIL". `createDraftFromCandidate` (job finish) never calls
  // `populateInitiativeAndTocFromProgramCode` — only `promoteDraft` does (design.md §2.2 row 1,
  // requirements.md PSR-R-1 "IT MUST NOT have created a primary request when the AI job finished
  // (only when Create result was pressed)").
  describe('PSR-T-5: job finish never requests a primary Science Program', () => {
    it('createDraftFromCandidate (via processJob) never calls populateInitiativeAndTocFromProgramCode', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: ['prms/j1/report.pdf'],
        audio_keys: [],
        text_context: null,
        program_code: 'SP09',
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [{ indicator: 'Innovation Development', title: 'X' }],
        interactionId: null,
      });

      await service.processJob('j1');

      expect(
        stubs.bilateralService.populateInitiativeAndTocFromProgramCode,
      ).not.toHaveBeenCalled();
    });
  });

  describe('discardDraft', () => {
    it('should mark draft as discarded and deactivate result', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { center_id: 7 },
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      const result = await service.discardDraft(5, 42);

      expect(stubs.draftRepository.update).toHaveBeenCalledWith(5, {
        is_discarded: true,
      });
      expect(stubs.resultRepository.update).toHaveBeenCalledWith(100, {
        is_active: false,
      });
      expect(result).toEqual({
        response: { id: 5, discarded: true },
        message: 'AI draft discarded',
        status: 200,
      });
    });
  });

  describe("ASC-T-5 — admin reads a centre's AI drafts but cannot act on them", () => {
    // Falsifier fixture (tasks.md `ASC-T-5`): a user who `isUserAdmin` = true and
    // `validationCenterPermissions` = 0 for centre 52, plus a draft of centre 52.
    const nonMemberAdminStubs = (stubs: any) => {
      stubs.roleByUserRepository.validationCenterPermissions.mockResolvedValue(
        0,
      );
      stubs.roleByUserRepository.isUserAdmin.mockResolvedValue(true);
      stubs.clarisaCentersRepository.findOne.mockResolvedValue({ code: 'C52' });
    };

    it('ASC-AC-12 — listDrafts resolves for an admin who is not a member of the centre', async () => {
      const { service, stubs } = makeService();
      nonMemberAdminStubs(stubs);
      stubs.draftRepository.find.mockResolvedValue([{ id: 1 }]);

      const result = await service.listDrafts(42, 52);

      expect(result).toEqual([{ id: 1 }]);
      expect(stubs.roleByUserRepository.isUserAdmin).toHaveBeenCalledWith(42);
    });

    it('ASC-AC-12 — getDraft resolves for an admin who is not a member of the centre', async () => {
      const { service, stubs } = makeService();
      nonMemberAdminStubs(stubs);
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 52 },
      });
      stubs.evidenceRepository.find.mockResolvedValue([{ id: 10 }]);

      const result = await service.getDraft(5, 42);

      expect(result.response).toEqual(
        expect.objectContaining({ id: 5, evidence: [{ id: 10 }] }),
      );
    });

    it('ASC-AC-13 — promoteDraft is forbidden for the same admin', async () => {
      const { service, stubs } = makeService();
      nonMemberAdminStubs(stubs);
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { center_id: 52 },
      });

      await expect(service.promoteDraft(5, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ASC-AC-13 — discardDraft is forbidden for the same admin', async () => {
      const { service, stubs } = makeService();
      nonMemberAdminStubs(stubs);
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { center_id: 52 },
      });

      await expect(service.discardDraft(5, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ASC-AC-13 — setFormalEvidence is forbidden for the same admin', async () => {
      const { service, stubs } = makeService();
      nonMemberAdminStubs(stubs);
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        job: { center_id: 52 },
      });

      await expect(service.setFormalEvidence(5, 10, true, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ASC-AC-14 — a non-admin non-member is still forbidden on all five', async () => {
      const { service, stubs } = makeService();
      stubs.roleByUserRepository.validationCenterPermissions.mockResolvedValue(
        0,
      );
      stubs.roleByUserRepository.isUserAdmin.mockResolvedValue(false);
      stubs.clarisaCentersRepository.findOne.mockResolvedValue({ code: 'C52' });
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { center_id: 52 },
      });

      await expect(service.listDrafts(7, 52)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getDraft(5, 7)).rejects.toThrow(ForbiddenException);
      await expect(service.promoteDraft(5, 7)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.discardDraft(5, 7)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.setFormalEvidence(5, 10, true, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('processJob', () => {
    it('should return early when job not found', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(null);

      await service.processJob('missing-job');

      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
    });

    it('should return early when job already completed', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'done',
        status: BilateralAiJobStatus.COMPLETED,
      });

      await service.processJob('done');

      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
    });

    // `design.md` §5 "Attempt start" / `APF-DD-3` item 2: `error_code`/`error_message` are the
    // only record of the last error once retries no longer bounce through FAILED, so this write
    // must preserve them (they are simply absent from the payload below, unlike the old
    // `error_code: null, error_message: null` this test used to assert).
    it('attempt-start: PENDING job → PROCESSING/uploading, attempts+1, retrying cleared, error_* preserved', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 2,
        bucket_name: 'bucket',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
        error_code: 'HTTP_503',
        error_message: 'previous failure',
      });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PENDING },
        {
          status: BilateralAiJobStatus.PROCESSING,
          stage: 'uploading',
          stage_updated_date: expect.any(Function), // was: expect.any(Date)
          attempts: 3,
          retrying: false,
          started_date: expect.any(Function), // was: expect.any(Date)
        },
      );
    });

    it('attempt-start: PROCESSING & retrying job uses that WHERE clause', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PROCESSING,
        retrying: true,
        attempts: 1,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        {
          job_id: 'j1',
          status: BilateralAiJobStatus.PROCESSING,
          retrying: true,
        },
        {
          status: BilateralAiJobStatus.PROCESSING,
          stage: 'uploading',
          stage_updated_date: expect.any(Function), // was: expect.any(Date)
          attempts: 2,
          retrying: false,
          started_date: expect.any(Function), // was: expect.any(Date)
        },
      );
    });

    it('does not touch the DB or call text mining when the job is not eligible for a new attempt', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.FAILED,
        retrying: false,
        attempts: 3,
      });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
      expect(stubs.textMining.extract).not.toHaveBeenCalled();
    });

    it('returns immediately when the attempt-start update affects 0 rows — text mining is never called', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.jobRepository.update.mockResolvedValueOnce({ affected: 0 });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledTimes(1);
      expect(stubs.textMining.extract).not.toHaveBeenCalled();
    });

    // `APF-R-1` B: the three intermediate stages are pre-set from the source mix, before the
    // mining call — never claimed as observed progress the server cannot see.
    it('stage sequence — documents only: uploading → reading → extracting → validating → creating_drafts', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: ['doc1'],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1');

      const stages = stubs.jobRepository.update.mock.calls
        .map((call) => call[1]?.stage)
        .filter((stage) => stage !== undefined);
      expect(stages).toEqual([
        'uploading',
        'reading',
        'extracting',
        'validating',
        'creating_drafts',
      ]);
    });

    it('stage sequence — audio only: uploading → transcribing → extracting → validating → creating_drafts', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: ['audio1'],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1');

      const stages = stubs.jobRepository.update.mock.calls
        .map((call) => call[1]?.stage)
        .filter((stage) => stage !== undefined);
      expect(stages).toEqual([
        'uploading',
        'transcribing',
        'extracting',
        'validating',
        'creating_drafts',
      ]);
    });

    it('stage sequence — documents and audio: uploading → reading_transcribing → extracting → validating → creating_drafts', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: ['doc1'],
        audio_keys: ['audio1'],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1');

      const stages = stubs.jobRepository.update.mock.calls
        .map((call) => call[1]?.stage)
        .filter((stage) => stage !== undefined);
      expect(stages).toEqual([
        'uploading',
        'reading_transcribing',
        'extracting',
        'validating',
        'creating_drafts',
      ]);
    });

    it('stage sequence — text-context only: skips reading/transcribing entirely', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: 'some notes',
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1');

      const stages = stubs.jobRepository.update.mock.calls
        .map((call) => call[1]?.stage)
        .filter((stage) => stage !== undefined);
      expect(stages).toEqual([
        'uploading',
        'extracting',
        'validating',
        'creating_drafts',
      ]);
    });

    it('sets stage=extracting before calling text mining, not after', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });
      let extractingWritesWhenMiningWasCalled = -1;
      stubs.textMining.extract.mockImplementation(async () => {
        extractingWritesWhenMiningWasCalled =
          stubs.jobRepository.update.mock.calls.filter(
            (call) => call[1]?.stage === 'extracting',
          ).length;
        return {};
      });

      await service.processJob('j1');

      expect(extractingWritesWhenMiningWasCalled).toBe(1);
    });

    it('should call textMining.extract with correct parameters', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'my-bucket',
        document_keys: ['key1'],
        audio_keys: ['audio1'],
        text_context: 'some text',
        user_id: 42,
        project_id: 25,
        program_code: 'P25',
      });

      await service.processJob('j1');

      expect(stubs.textMining.extract).toHaveBeenCalledWith({
        bucketName: 'my-bucket',
        keys: ['key1'],
        audio_keys: ['audio1'],
        text: 'some text',
        user_id: 'user@cgiar.org',
        project_id: 25,
        program_code: 'P25',
      });
    });

    it('should mark job as COMPLETED after successful processing', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: 'int-123',
      });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1' },
        {
          status: BilateralAiJobStatus.COMPLETED,
          result_count: 0,
          external_interaction_id: 'int-123',
          response_snapshot: expect.any(Object),
          completed_date: expect.any(Function), // was: expect.any(Date)
        },
      );
      // `APF-T-3`: the mail rule (2-minute gate, template selection) is
      // `BilateralAiNotificationsService`'s concern (see its own spec) — this seam only proves
      // `processJob` picked the zero-drafts outcome.
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome, options] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.job_id).toBe('j1');
      expect(outcome).toBe('no_candidates');
      expect(options).toMatchObject({ resultCount: 0, late: false });
    });

    // `AIQ-T-3` (`design.md` §5.3 P-5): the COMPLETED write just freed a lane — `processJob` must
    // wake the dispatch service so a parked job doesn't wait for the sweeper's next tick.
    it('wakes the dispatch service exactly once after the COMPLETED write (AIQ-T-3)', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: 'int-123',
      });

      await service.processJob('j1');

      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(1);
      expect(stubs.dispatchService.wake).toHaveBeenCalledWith('completed');
    });

    // `AIQ-T-3` forward pointer (from `AIQ-T-2`): a wake-time fault must never turn a job that just
    // completed successfully into a consumer retry — `processJob` must still resolve and still
    // have notified the uploader.
    it('does not rethrow when dispatch.wake rejects after the COMPLETED write', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: 'int-123',
      });
      stubs.dispatchService.wake.mockRejectedValue(new Error('DB down'));

      await expect(service.processJob('j1')).resolves.toBeUndefined();

      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
    });

    // `APF-R-2` A "AND IT MUST accept a late mining response... idempotently": a re-run for the
    // same (job_id, candidate_index) — the mining response arriving after the sweeper already
    // flipped the row, or a redelivered message — must reuse the existing draft/result instead of
    // creating a second `Result`.
    it('late completion: reuses an existing draft per (job_id, candidate_index) instead of creating a duplicate Result', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [{ indicator: 'Number of innovations' }],
        interactionId: null,
      });
      const existingDraft = {
        id: 77,
        job_id: 'j1',
        candidate_index: 0,
        result_id: 555,
      };
      stubs.draftRepository.findOne.mockResolvedValue(existingDraft);

      await service.processJob('j1');

      expect(stubs.draftRepository.findOne).toHaveBeenCalledWith({
        where: { job_id: 'j1', candidate_index: 0 },
      });
      expect(stubs.resultRepository.save).not.toHaveBeenCalled();
      expect(stubs.draftRepository.save).not.toHaveBeenCalled();
      expect(stubs.evidenceRepository.save).not.toHaveBeenCalled();
      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1' },
        expect.objectContaining({
          status: BilateralAiJobStatus.COMPLETED,
          result_count: 1,
        }),
      );
    });

    // `APF-T-3`: `processJob` now delegates the whole "tell the uploader" concern to
    // `BilateralAiNotificationsService.notifyTerminal` (the mail rule, template selection and
    // link-building are covered by that service's own spec) — this seam only proves the COMPLETED
    // branch hands off the right outcome and count.
    it('notifies "results_ready" with the result count when candidates were produced', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
        center_id: 7,
        program_code: 'SP06',
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [
          { indicator: 'Number of innovations', title: 'A', description: 'd' },
        ],
        interactionId: 'int-9',
      });
      jest
        .spyOn(service as any, 'createDraftFromCandidate')
        .mockResolvedValue({ id: 1 });

      await service.processJob('j1');

      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome, options] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.job_id).toBe('j1');
      expect(outcome).toBe('results_ready');
      expect(options).toMatchObject({ resultCount: 1, late: false });
    });

    // `APF-R-2` A: a mining response landing after the sweeper already flipped the row to
    // `FAILED`/`TIMED_OUT` still completes the job, but the notification must say so.
    it('notifies with late=true when the row was FAILED/TIMED_OUT immediately before this write', async () => {
      const { service, stubs } = makeService();
      const jobFixture = {
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
        center_id: 7,
      };
      // `attemptStart`'s read sees PENDING (the case that got this attempt going); the
      // pre-completion late-detection read is a SEPARATE `findOne` call and must see the row as
      // it stands right before the COMPLETED write — simulated here as the sweeper's flip.
      stubs.jobRepository.findOne
        .mockResolvedValueOnce(jobFixture)
        .mockResolvedValueOnce({
          status: BilateralAiJobStatus.FAILED,
          error_code: 'TIMED_OUT',
        });
      stubs.textMining.normalize.mockReturnValue({
        results: [{ indicator: 'Number of innovations' }],
        interactionId: null,
      });
      jest
        .spyOn(service as any, 'createDraftFromCandidate')
        .mockResolvedValue({ id: 1 });

      await service.processJob('j1');

      const [, outcome, options] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(outcome).toBe('results_ready');
      expect(options).toMatchObject({ late: true });
    });

    // `BilateralAiNotificationsService.notifyTerminal` is contractually never-throwing (its own
    // spec proves it) — `processJob` relies on that rather than wrapping it a second time. What
    // this seam owns is ordering: the COMPLETED write must already stand before the notification
    // is attempted, so a slow or misbehaving notification can never undo it.
    it('writes COMPLETED before calling notifyTerminal', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
        center_id: 7,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [{ indicator: 'Number of innovations' }],
        interactionId: null,
      });
      jest
        .spyOn(service as any, 'createDraftFromCandidate')
        .mockResolvedValue({ id: 1 });

      const callOrder: string[] = [];
      stubs.jobRepository.update.mockImplementation(async (_where, set) => {
        if ((set as any)?.status === BilateralAiJobStatus.COMPLETED) {
          callOrder.push('update-completed');
        }
        return { affected: 1 };
      });
      stubs.notificationsService.notifyTerminal.mockImplementation(async () => {
        callOrder.push('notify');
      });

      await service.processJob('j1');

      expect(callOrder).toEqual(['update-completed', 'notify']);
    });

    it('should preserve the AI-detected lead center when creating a draft', async () => {
      const { service, stubs } = makeService();
      const candidate = {
        indicator: 'Innovation Development',
        title: 'Seattle result',
        lead_center: {
          institution_id: 46,
          name: 'Seattle Alliance',
          acronym: 'SEA',
        },
      };
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
        project_id: 10,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [candidate],
        interactionId: null,
      });

      await service.processJob('j1');

      expect(stubs.draftRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ extracted_mds: candidate }),
      );
    });

    // `APF-DD-3` reversion: this test used to assert an immediate bounce to FAILED on any
    // retryable error (`jobRepository.update` called with `'j1', { status: FAILED, error_code:
    // 'PROCESSING_ERROR', error_message: 'Service down', completed_date: expect.any(Date) }`,
    // criteria as a bare job-id string). That behaviour is exactly the bug this spec fixes: on
    // attempt 1 of `max_attempts` (default 3) a retryable failure must stay PROCESSING with
    // `retrying = true`, not bounce through FAILED (`APF-R-3`).
    it('retryable error on attempt 1 of max_attempts stays PROCESSING with retrying=true and throws (for the consumer to nack/requeue)', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Service down');
      (error as any).status = undefined;
      stubs.textMining.extract.mockRejectedValue(error);

      await expect(service.processJob('j1')).rejects.toThrow('Service down');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PROCESSING },
        {
          retrying: true,
          stage: 'queued',
          stage_updated_date: expect.any(Function), // was: expect.any(Date)
          error_code: 'PROCESSING_ERROR',
          error_message: 'Service down',
        },
      );
      expect(stubs.jobRepository.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: BilateralAiJobStatus.FAILED }),
      );
      // Not terminal yet — the retry keeps `PROCESSING`, so `APF-R-4`'s "exactly once per terminal
      // state" must not fire here.
      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
      // `AIQ-T-3` negative case: a mid-attempt retry never frees a lane, so it must not wake.
      expect(stubs.dispatchService.wake).not.toHaveBeenCalled();
    });

    // `APF-R-3` "AND IT MUST set FAILED with the last error_code after attempt max_attempts".
    it('retryable error on the final attempt (max_attempts) sets FAILED with the last error_code and still throws', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 2, // default max_attempts = 3 → this is the 3rd, final attempt
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Service down again');
      (error as any).status = 503;
      stubs.textMining.extract.mockRejectedValue(error);

      await expect(service.processJob('j1')).rejects.toThrow(
        'Service down again',
      );

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: 'HTTP_503',
          error_message: 'Service down again',
          completed_date: expect.any(Function), // was: expect.any(Date)
        },
      );
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.error_code).toBe('HTTP_503');
      expect(outcome).toBe('failed');
      // `AIQ-T-3`: the final FAILED write just freed a lane, exactly like COMPLETED.
      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(1);
      expect(stubs.dispatchService.wake).toHaveBeenCalledWith('failed');
    });

    it('should mark job as FAILED without throwing on 4xx errors', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Bad request');
      (error as any).status = 400;
      stubs.textMining.extract.mockRejectedValue(error);

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: 'HTTP_400',
          error_message: 'Bad request',
          completed_date: expect.any(Function), // was: expect.any(Date)
        },
      );
      // `AIQ-T-3`: a 4xx final failure is still "the final FAILED write" (design.md §5.3 P-5
      // explicitly includes "incl. 4xx").
      expect(stubs.dispatchService.wake).toHaveBeenCalledTimes(1);
      expect(stubs.dispatchService.wake).toHaveBeenCalledWith('failed');
    });

    // `AIQ-T-3` (`design.md` §5.3 P-5): the write is scoped to `status = PROCESSING`, so a lost
    // race (the sweeper or another consumer already moved the row) must not wake on someone else's
    // behalf — the same guard that already gates `notifyTerminal` on this path.
    it('does not wake when the final FAILED write affects 0 rows (lost the race)', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Bad request');
      (error as any).status = 400;
      stubs.textMining.extract.mockRejectedValue(error);
      // Update call order for this fixture (no docs/audio, so no intermediate stage write):
      // [1] attemptStart's claim, [2] setStage(EXTRACTING), [3] the final FAILED write — only the
      // third is the one this test targets.
      stubs.jobRepository.update.mockResolvedValueOnce({ affected: 1 });
      stubs.jobRepository.update.mockResolvedValueOnce({ affected: 1 });
      stubs.jobRepository.update.mockResolvedValueOnce({ affected: 0 });

      await service.processJob('j1');

      expect(stubs.notificationsService.notifyTerminal).not.toHaveBeenCalled();
      expect(stubs.dispatchService.wake).not.toHaveBeenCalled();
    });
  });

  // `AIQ-T-2` attempt 2, Reviewer B (error-path lens) item 2: the `skipClaim` branch had no
  // coverage — `attemptNumber = job.attempts` (no +1, since `BilateralAiDispatchService.decide`
  // already incremented it via `attemptStart`) drives retry-vs-final, and an off-by-one here
  // would silently add or drop an attempt while every other test stayed green.
  describe('processJob — skipClaim:true (dispatch already claimed the job)', () => {
    it('does not call attemptStart', async () => {
      const { service, stubs } = makeService();
      const attemptStartSpy = jest.spyOn(service, 'attemptStart');
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PROCESSING,
        attempts: 1,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: null,
      });

      await service.processJob('j1', { skipClaim: true });

      expect(attemptStartSpy).not.toHaveBeenCalled();
    });

    it('returns before calling text mining when the row is not PROCESSING (claim did not actually land)', async () => {
      const { service, stubs } = makeService();
      const attemptStartSpy = jest.spyOn(service, 'attemptStart');
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PENDING,
        attempts: 0,
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });

      await service.processJob('j1', { skipClaim: true });

      expect(attemptStartSpy).not.toHaveBeenCalled();
      expect(stubs.textMining.extract).not.toHaveBeenCalled();
      expect(stubs.jobRepository.update).not.toHaveBeenCalled();
    });

    it('at attempts = max_attempts - 1 (already incremented by the claim), a retryable error rethrows with retrying=true', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PROCESSING,
        attempts: 2, // default max_attempts = 3 → this IS attempt 2 of 3, not a fresh 0
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Service down');
      (error as any).status = undefined;
      stubs.textMining.extract.mockRejectedValue(error);

      await expect(
        service.processJob('j1', { skipClaim: true }),
      ).rejects.toThrow('Service down');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PROCESSING },
        {
          retrying: true,
          stage: 'queued',
          stage_updated_date: expect.any(Function),
          error_code: 'PROCESSING_ERROR',
          error_message: 'Service down',
        },
      );
      expect(stubs.jobRepository.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: BilateralAiJobStatus.FAILED }),
      );
    });

    it('at attempts = max_attempts (already incremented by the claim), a retryable error writes FAILED', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        status: BilateralAiJobStatus.PROCESSING,
        attempts: 3, // default max_attempts = 3 → this IS the final attempt, not one past it
        bucket_name: 'b',
        document_keys: [],
        audio_keys: [],
        text_context: null,
        user_id: 42,
      });
      const error = new Error('Service down again');
      (error as any).status = 503;
      stubs.textMining.extract.mockRejectedValue(error);

      await expect(
        service.processJob('j1', { skipClaim: true }),
      ).rejects.toThrow('Service down again');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith(
        { job_id: 'j1', status: BilateralAiJobStatus.PROCESSING },
        {
          status: BilateralAiJobStatus.FAILED,
          error_code: 'HTTP_503',
          error_message: 'Service down again',
          completed_date: expect.any(Function),
        },
      );
    });
  });

  describe('timezone skew regression: lifecycle timestamps are written in DB time, never from the process clock', () => {
    /**
     * Post-archive bug on `bilateral/ai-processing-feedback`. `created_date` and the STORED
     * `queue_entry_date` are generated by MySQL in the DB session zone, but a JS `new Date()`
     * written into `started_date` / `stage_updated_date` / `completed_date` / `retried_date` is
     * serialized by mysql2 in the **Node process's** local zone (`src/config/orm.config.ts` sets
     * no `timezone`). A consumer on a Bogota laptop and the sweeper on prtest (UTC) then read each
     * other's timestamps 5 h apart: job `6716bf59…` was created `13:50:11` UTC, stored
     * `started_date` `08:50:12`, and was flipped to `TIMED_OUT` at `13:51:00` — 48 s into a
     * 15-minute window.
     *
     * Every such write must therefore be `bilateralAiDbNow`: a function TypeORM emits as raw SQL,
     * so MySQL stamps the row in its own session zone.
     */
    const DB_TIME_COLUMNS = [
      'started_date',
      'stage_updated_date',
      'completed_date',
      'retried_date',
    ] as const;

    /**
     * Asserts every lifecycle timestamp in every recorded UPDATE payload is DB-evaluated SQL, and
     * returns how many it checked so a case can prove it actually inspected something.
     */
    const expectAllTimestampsAreDbTime = (updateMock: jest.Mock): number => {
      let asserted = 0;
      for (const call of updateMock.mock.calls) {
        const payload = call[1] ?? {};
        for (const column of DB_TIME_COLUMNS) {
          const value = payload[column];
          // `retryJob` deliberately nulls `started_date`/`completed_date`; that is not a clock.
          if (value === undefined || value === null) continue;
          expect(value).not.toBeInstanceOf(Date);
          expect(typeof value).toBe('function');
          expect(value()).toBe('CURRENT_TIMESTAMP');
          asserted += 1;
        }
      }
      return asserted;
    };

    const pendingJob = () => ({
      job_id: 'j1',
      status: BilateralAiJobStatus.PENDING,
      attempts: 0,
      bucket_name: 'b',
      document_keys: [],
      audio_keys: [],
      text_context: null,
      user_id: 42,
    });

    it('stamps attempt start, every stage advance and the COMPLETED flip with CURRENT_TIMESTAMP', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(pendingJob());
      stubs.textMining.normalize.mockReturnValue({
        results: [],
        interactionId: 'int-123',
      });

      await service.processJob('j1');

      // At minimum: `started_date` + `stage_updated_date` on attempt start, and `completed_date`
      // on the COMPLETED write — plus one `stage_updated_date` per stage advance.
      expect(
        expectAllTimestampsAreDbTime(stubs.jobRepository.update),
      ).toBeGreaterThanOrEqual(3);
    });

    it('stamps the final-FAILED flip with CURRENT_TIMESTAMP', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(pendingJob());
      const error = new Error('Bad request');
      (error as any).status = 400; // 4xx is terminal on the first attempt
      stubs.textMining.extract.mockRejectedValue(error);

      await service.processJob('j1');

      const failedWrite = stubs.jobRepository.update.mock.calls.find(
        ([, payload]: any[]) => payload?.status === BilateralAiJobStatus.FAILED,
      );
      expect(failedWrite).toBeDefined();
      expect(failedWrite[1].completed_date()).toBe('CURRENT_TIMESTAMP');
      expect(
        expectAllTimestampsAreDbTime(stubs.jobRepository.update),
      ).toBeGreaterThanOrEqual(3);
    });

    it('stamps the retry-requeue write (retrying = true) with CURRENT_TIMESTAMP', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue(pendingJob());
      const error = new Error('Service down');
      (error as any).status = undefined; // retryable → stays PROCESSING with retrying = true
      stubs.textMining.extract.mockRejectedValue(error);

      await expect(service.processJob('j1')).rejects.toThrow('Service down');

      const requeueWrite = stubs.jobRepository.update.mock.calls.find(
        ([, payload]: any[]) => payload?.retrying === true,
      );
      expect(requeueWrite).toBeDefined();
      expect(requeueWrite[1].stage_updated_date()).toBe('CURRENT_TIMESTAMP');
      expectAllTimestampsAreDbTime(stubs.jobRepository.update);
    });

    it("stamps retryJob's reset with CURRENT_TIMESTAMP while still nulling started_date/completed_date", async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'job-1',
        user_id: 42,
        status: BilateralAiJobStatus.FAILED,
        document_keys: ['doc-key-1'],
        audio_keys: [],
      });

      await service.retryJob('job-1', user);

      const [, resetPayload] = stubs.jobRepository.update.mock.calls[0];
      expect(resetPayload.stage_updated_date()).toBe('CURRENT_TIMESTAMP');
      expect(resetPayload.retried_date()).toBe('CURRENT_TIMESTAMP');
      // The two cleared columns stay literal `null` — they are erasures, not clocks.
      expect(resetPayload.started_date).toBeNull();
      expect(resetPayload.completed_date).toBeNull();
      expectAllTimestampsAreDbTime(stubs.jobRepository.update);
    });

    it('lets MySQL evaluate the 90-day expectations window instead of a JS cutoff', async () => {
      const { service, stubs } = makeService();
      stubs.jobQueryBuilder.getMany.mockResolvedValue([]);

      await service.getExpectations('documents');

      expect(stubs.jobRepository.createQueryBuilder).toHaveBeenCalledWith(
        'job',
      );
      expect(stubs.jobQueryBuilder.where).toHaveBeenCalledWith(
        'job.status = :status',
        { status: BilateralAiJobStatus.COMPLETED },
      );
      // 90 days, written out independently of the service constant it must match.
      const ninetyDaysInSeconds = 90 * 24 * 60 * 60;
      expect(stubs.jobQueryBuilder.andWhere).toHaveBeenCalledWith(
        `job.completed_date > DATE_SUB(NOW(), INTERVAL ${ninetyDaysInSeconds} SECOND)`,
      );
      // Was: `find({ where: { status: COMPLETED, completed_date: MoreThan(new Date(Date.now() -
      //   EXPECTATIONS_SAMPLE_WINDOW_MS)) }, select: {...} })`.
      expect(stubs.jobRepository.find).not.toHaveBeenCalled();
    });
  });
});
