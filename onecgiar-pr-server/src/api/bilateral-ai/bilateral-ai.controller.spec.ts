import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { BilateralAiController } from './bilateral-ai.controller';
import { BilateralAiService } from './services/bilateral-ai.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateBilateralAiJobDto } from './dto/create-bilateral-ai-job.dto';

describe('BilateralAiController', () => {
  let controller: BilateralAiController;
  let service: jest.Mocked<BilateralAiService>;

  const user: TokenDto = {
    id: 42,
    email: 'test@cgiar.org',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralAiController],
      providers: [
        {
          provide: BilateralAiService,
          useValue: {
            createJob: jest.fn().mockResolvedValue({
              jobId: 'job-123',
              status: 'PENDING',
            }),
            getJob: jest.fn().mockResolvedValue({
              job_id: 'job-123',
              status: 'COMPLETED',
            }),
            listDrafts: jest.fn().mockResolvedValue([]),
            getDraft: jest.fn().mockResolvedValue({ id: 1, evidence: [] }),
            setFormalEvidence: jest.fn().mockResolvedValue({
              id: 1,
              is_formal_evidence: true,
            }),
            promoteDraft: jest.fn().mockResolvedValue({ id: 1 }),
            discardDraft: jest.fn().mockResolvedValue({
              id: 1,
              discarded: true,
            }),
            getSignedUrl: jest.fn().mockResolvedValue({
              response: { url: 'https://signed.url' },
              message: 'Signed URL generated',
              status: 200,
            }),
            retryJob: jest.fn().mockResolvedValue({
              response: { jobId: 'job-123', jobStatus: 'PENDING' },
              message: 'AI job re-queued for retry',
              status: 202,
            }),
            getExpectations: jest.fn().mockResolvedValue({
              response: {
                mix: 'documents',
                sampleSize: 6,
                p25Minutes: 4,
                p75Minutes: 9,
              },
              message: 'AI job expectations found',
              status: 200,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<BilateralAiController>(BilateralAiController);
    service = module.get(BilateralAiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createJob', () => {
    it('should delegate to service.createJob with documents and audio', async () => {
      const dto: CreateBilateralAiJobDto = {
        project_id: 10,
        center_id: 7,
        program_code: 'WLE',
      };
      const documents = [{ originalname: 'doc.pdf', buffer: Buffer.from('') }];
      const audio = [];

      const result = await controller.createJob(
        dto,
        { documents, audio },
        user,
      );

      expect(service.createJob).toHaveBeenCalledWith(
        dto,
        documents,
        audio,
        user,
      );
      expect(result).toEqual({ jobId: 'job-123', status: 'PENDING' });
    });

    it('should pass empty arrays when files are undefined', async () => {
      const dto: CreateBilateralAiJobDto = {
        project_id: 10,
        center_id: 7,
        program_code: 'WLE',
      };

      await controller.createJob(dto, undefined as any, user);

      expect(service.createJob).toHaveBeenCalledWith(dto, [], [], user);
    });
  });

  describe('getSignedUrl', () => {
    it('should delegate to service.getSignedUrl with key and user', async () => {
      const result = await controller.getSignedUrl(
        'prms/bilateral-ai/job-123/file.pdf',
        user,
      );

      expect(service.getSignedUrl).toHaveBeenCalledWith(
        'prms/bilateral-ai/job-123/file.pdf',
        user,
      );
      expect(result).toEqual({
        response: { url: 'https://signed.url' },
        message: 'Signed URL generated',
        status: 200,
      });
    });
  });

  describe('getJob', () => {
    it('should delegate to service.getJob with jobId and userId', async () => {
      const result = await controller.getJob('job-123', user);

      expect(service.getJob).toHaveBeenCalledWith('job-123', user.id);
      expect(result).toEqual({ job_id: 'job-123', status: 'COMPLETED' });
    });
  });

  describe('retryJob', () => {
    it('should delegate to service.retryJob with jobId and the decoded user', async () => {
      const result = await controller.retryJob('job-123', user);

      expect(service.retryJob).toHaveBeenCalledWith('job-123', user);
      expect(result).toEqual({
        response: { jobId: 'job-123', jobStatus: 'PENDING' },
        message: 'AI job re-queued for retry',
        status: 202,
      });
    });
  });

  describe('getExpectations', () => {
    it('should delegate to service.getExpectations with the raw mix query param', async () => {
      const result = await controller.getExpectations('documents');

      expect(service.getExpectations).toHaveBeenCalledWith('documents');
      expect(result).toEqual({
        response: {
          mix: 'documents',
          sampleSize: 6,
          p25Minutes: 4,
          p75Minutes: 9,
        },
        message: 'AI job expectations found',
        status: 200,
      });
    });
  });

  describe('listDrafts', () => {
    it('should delegate to service.listDrafts with centerId and userId', async () => {
      const result = await controller.listDrafts(7, user);

      expect(service.listDrafts).toHaveBeenCalledWith(user.id, 7);
      expect(result).toEqual([]);
    });
  });

  describe('getDraft', () => {
    it('should delegate to service.getDraft with draftId and userId', async () => {
      const result = await controller.getDraft(5, user);

      expect(service.getDraft).toHaveBeenCalledWith(5, user.id);
      expect(result).toEqual({ id: 1, evidence: [] });
    });
  });

  describe('setFormalEvidence', () => {
    it('should delegate to service.setFormalEvidence with correct params', async () => {
      const body = { is_formal_evidence: true };

      const result = await controller.setFormalEvidence(1, 2, body, user);

      expect(service.setFormalEvidence).toHaveBeenCalledWith(
        1,
        2,
        true,
        user.id,
      );
      expect(result).toEqual({ id: 1, is_formal_evidence: true });
    });

    it('should pass false when is_formal_evidence is not true', async () => {
      const body = { is_formal_evidence: false };

      await controller.setFormalEvidence(1, 2, body, user);

      expect(service.setFormalEvidence).toHaveBeenCalledWith(
        1,
        2,
        false,
        user.id,
      );
    });
  });

  describe('promoteDraft', () => {
    it('should delegate to service.promoteDraft with draftId and userId', async () => {
      const result = await controller.promoteDraft(3, user);

      expect(service.promoteDraft).toHaveBeenCalledWith(3, user.id);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('discardDraft', () => {
    it('should delegate to service.discardDraft with draftId and userId', async () => {
      const result = await controller.discardDraft(4, user);

      expect(service.discardDraft).toHaveBeenCalledWith(4, user.id);
      expect(result).toEqual({ id: 1, discarded: true });
    });
  });
});

describe('BilateralAiController — route ordering (supertest)', () => {
  // `design.md` §4.1: `GET center/ai/expectations` is declared as its own top-level path under
  // `center/ai/`, NOT `center/ai/jobs/expectations` — so it can never be shadowed by the
  // `jobs/:jobId` parameter route. This boots a real Nest HTTP server around the controller (no
  // ResponseInterceptor/exception filter — Nest's default HttpException handling is enough to
  // observe the status code) so the proof is about actual route dispatch, not a direct method call.
  let app: INestApplication;
  let getJob: jest.Mock;
  let getExpectations: jest.Mock;

  beforeAll(async () => {
    getJob = jest
      .fn()
      .mockRejectedValue(new NotFoundException('AI job not found.'));
    getExpectations = jest.fn().mockResolvedValue({
      response: {
        mix: 'documents',
        sampleSize: 0,
        p25Minutes: null,
        p75Minutes: null,
      },
      message: 'AI job expectations found',
      status: 200,
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [BilateralAiController],
      providers: [
        {
          provide: BilateralAiService,
          useValue: { getJob, getExpectations },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    getJob.mockClear();
    getExpectations.mockClear();
  });

  it('GET /center/ai/expectations resolves to the expectations handler', async () => {
    const res = await request(app.getHttpServer())
      .get('/center/ai/expectations')
      .query({ mix: 'documents' });

    expect(getExpectations).toHaveBeenCalledWith('documents');
    expect(getJob).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('GET /center/ai/jobs/expectations is NOT shadowed — it still 404s as a job id lookup', async () => {
    const res = await request(app.getHttpServer()).get(
      '/center/ai/jobs/expectations',
    );

    expect(getJob).toHaveBeenCalledWith('expectations', 0);
    expect(getExpectations).not.toHaveBeenCalled();
    expect(res.status).toBe(404);
  });
});
