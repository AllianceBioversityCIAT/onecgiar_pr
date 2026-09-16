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
    const jobRepository = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, job_id: 'job-uuid-1' })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
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
    };
    const clarisaCentersRepository = {
      findOne: jest.fn().mockResolvedValue({ code: 'TEST_CENTER' }),
    };
    const clarisaInstitutionsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7, acronym: 'AfricaRice' }),
    };
    const notificationsService = {
      notifyTerminal: jest.fn().mockResolvedValue(undefined),
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
      notificationsService as any,
    );

    Object.assign(service, overrides);

    return {
      service,
      stubs: {
        jobRepository,
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
        notificationsService,
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
        completed_date: expect.any(Date),
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
        response: { ...mockJob, queue_position: null, max_attempts: 3 },
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

    // `APF-AC-1`, `APF-R-1` A: position is a mocked count over `queue_entry_date`, never a stored
    // column — computed fresh on every read.
    it('computes queue_position for a PENDING job from a count keyed on queue_entry_date', async () => {
      const { service, stubs } = makeService();
      const myQueueEntryDate = new Date('2026-09-10T00:00:00.000Z');
      stubs.jobRepository.findOne.mockResolvedValue({
        job_id: 'j1',
        user_id: 42,
        status: BilateralAiJobStatus.PENDING,
        queue_entry_date: myQueueEntryDate,
      });
      stubs.jobRepository.count.mockResolvedValue(2);

      const result = await service.getJob('j1', 42);

      expect(result.response.queue_position).toBe(2);
      expect(stubs.jobRepository.count).toHaveBeenCalledTimes(1);
      const { where } = stubs.jobRepository.count.mock.calls[0][0];
      // The count is scoped to this job's own queue-entry clock (never `created_date`) and to
      // non-terminal jobs only.
      expect(where.queue_entry_date.type).toBe('lessThan');
      expect(where.queue_entry_date.value).toEqual(myQueueEntryDate);
      expect(where.status.type).toBe('in');
      expect(where.status.value).toEqual([
        BilateralAiJobStatus.PENDING,
        BilateralAiJobStatus.PROCESSING,
      ]);
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
          stage_updated_date: expect.any(Date),
          attempts: 0,
          retrying: false,
          error_code: null,
          error_message: null,
          started_date: null,
          completed_date: null,
          retried_date: expect.any(Date),
        }),
      );
      const [, setPayload] = stubs.jobRepository.update.mock.calls[0];
      expect(setPayload).not.toHaveProperty('created_date');
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
        completed_date: expect.any(Date),
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
      stubs.jobRepository.find.mockResolvedValue(
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
      stubs.jobRepository.find.mockResolvedValue(
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
      stubs.jobRepository.find.mockResolvedValue([
        makeCompletedRow(600, 'audio'),
      ]);

      const audioResult = await service.getExpectations('audio');
      expect(audioResult.response.sampleSize).toBe(1);

      const documentsResult = await service.getExpectations('documents');
      expect(documentsResult.response.sampleSize).toBe(0);
    });

    it('caches the result per mix — a second call within the 10-minute window skips the query', async () => {
      const { service, stubs } = makeService();
      stubs.jobRepository.find.mockResolvedValue(
        [120, 240, 360, 480, 600].map((s) => makeCompletedRow(s, 'documents')),
      );

      const first = await service.getExpectations('documents');
      const second = await service.getExpectations('documents');

      expect(stubs.jobRepository.find).toHaveBeenCalledTimes(1);
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
          stage_updated_date: expect.any(Date),
          attempts: 3,
          retrying: false,
          started_date: expect.any(Date),
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
          stage_updated_date: expect.any(Date),
          attempts: 2,
          retrying: false,
          started_date: expect.any(Date),
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
          completed_date: expect.any(Date),
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
          stage_updated_date: expect.any(Date),
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
          completed_date: expect.any(Date),
        },
      );
      expect(stubs.notificationsService.notifyTerminal).toHaveBeenCalledTimes(
        1,
      );
      const [notifiedJob, outcome] =
        stubs.notificationsService.notifyTerminal.mock.calls[0];
      expect(notifiedJob.error_code).toBe('HTTP_503');
      expect(outcome).toBe('failed');
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
          completed_date: expect.any(Date),
        },
      );
    });
  });
});
