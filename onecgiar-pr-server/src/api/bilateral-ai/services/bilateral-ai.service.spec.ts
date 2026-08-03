import {
  BadRequestException,
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
      update: jest.fn(),
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
    };
    const textMining = {
      extract: jest.fn().mockResolvedValue({}),
      normalize: jest
        .fn()
        .mockReturnValue({ results: [], interactionId: null }),
    };

    const bilateralService = {
      populateResultFromExtractedMds: jest.fn().mockResolvedValue(undefined),
      populateInitiativeAndTocFromProgramCode: jest
        .fn()
        .mockResolvedValue(undefined),
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
        service.createJob({ project_id: 1, program_code: 'WLE' }, [], [], user),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should validate sources before creating job', async () => {
      const { service, stubs } = makeService();
      const dto = { project_id: 1, program_code: 'WLE' };
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
        { project_id: 1, program_code: 'WLE' },
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
        { project_id: 1, program_code: 'WLE' },
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
        service.createJob({ project_id: 1, program_code: 'WLE' }, [], [], user),
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
        { project_id: 1, program_code: 'WLE', text: '  hello  ' },
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
        { project_id: 1, program_code: 'WLE' },
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
    it('should return job when found', async () => {
      const { service, stubs } = makeService();
      const mockJob = { job_id: 'j1', user_id: 42 };
      stubs.jobRepository.findOne.mockResolvedValue(mockJob);

      const result = await service.getJob('j1', 42);

      expect(result).toEqual({
        response: mockJob,
        message: 'AI job found',
        status: 200,
      });
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
    it('should return non-discarded drafts for the user', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.find.mockResolvedValue([{ id: 1 }]);

      const result = await service.listDrafts(42);

      expect(stubs.draftRepository.find).toHaveBeenCalledWith({
        where: { is_discarded: false, job: { user_id: 42 } },
        relations: { job: true, result: true },
        order: { created_date: 'DESC' },
      });
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getDraft', () => {
    it('should return draft with evidence when found', async () => {
      const { service, stubs } = makeService();
      const mockDraft = { id: 5, is_discarded: false };
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
  });

  describe('setFormalEvidence', () => {
    it('should mark evidence as formal when source type is DOCUMENT', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
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
        job: { program_code: 'EXCELLENCE', user_id: 42 },
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
        job: { program_code: 'CLIMATE', user_id: 42 },
        extracted_mds: null,
      });
      stubs.evidenceRepository.find.mockResolvedValue([]);

      await service.promoteDraft(5, 42);

      expect(
        stubs.bilateralService.populateInitiativeAndTocFromProgramCode,
      ).toHaveBeenCalledWith(100, 'CLIMATE', 42);
    });

    it('should throw BadRequestException when non-DOCUMENT formal evidence exists', async () => {
      const { service, stubs } = makeService();
      stubs.draftRepository.findOne.mockResolvedValue({
        id: 5,
        is_discarded: false,
        result_id: 100,
        job: { program_code: null, user_id: 42 },
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

    it('should set status to PROCESSING and increment attempts', async () => {
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
      });

      await service.processJob('j1');

      expect(stubs.jobRepository.update).toHaveBeenCalledWith('j1', {
        status: BilateralAiJobStatus.PROCESSING,
        attempts: 3,
        started_date: expect.any(Date),
        error_code: null,
        error_message: null,
      });
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
      });

      await service.processJob('j1');

      expect(stubs.textMining.extract).toHaveBeenCalledWith({
        bucketName: 'my-bucket',
        keys: ['key1'],
        audio_keys: ['audio1'],
        text: 'some text',
        user_id: '42',
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

      expect(stubs.jobRepository.update).toHaveBeenCalledWith('j1', {
        status: BilateralAiJobStatus.COMPLETED,
        result_count: 0,
        external_interaction_id: 'int-123',
        response_snapshot: expect.any(Object),
        completed_date: expect.any(Date),
      });
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

    it('should mark job as FAILED and throw on retryable errors', async () => {
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

      expect(stubs.jobRepository.update).toHaveBeenCalledWith('j1', {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'PROCESSING_ERROR',
        error_message: 'Service down',
        completed_date: expect.any(Date),
      });
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

      expect(stubs.jobRepository.update).toHaveBeenCalledWith('j1', {
        status: BilateralAiJobStatus.FAILED,
        error_code: 'HTTP_400',
        error_message: 'Bad request',
        completed_date: expect.any(Date),
      });
    });
  });
});
