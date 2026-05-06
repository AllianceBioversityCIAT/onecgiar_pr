import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, Logger } from '@nestjs/common';
import { ReportingFullMetadataExportService } from './reporting-full-metadata-export.service';
import { ResultsService } from '../results.service';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ReportingMetadataExportQueuePublisherService } from '../../../shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue-publisher.service';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

jest.mock('aws-sdk', () => {
  const putObject = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  });
  const getSignedUrl = jest.fn(
    () => 'https://example-bucket.s3.amazonaws.com/signed',
  );
  const S3 = jest.fn().mockImplementation(() => ({
    putObject,
    getSignedUrl,
  }));
  return { S3 };
});

async function flushBackgroundJobs(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
  await new Promise<void>((r) => setImmediate(r));
  await Promise.resolve();
}

async function waitForTerminalJob(
  getJob: () => ReturnType<ReportingFullMetadataExportService['getJob']> | null,
  timeoutMs = 10000,
): Promise<ReturnType<ReportingFullMetadataExportService['getJob']>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = getJob();
    if (job?.status === 'completed' || job?.status === 'failed') {
      return job;
    }
    await new Promise<void>((r) => setImmediate(r));
    await Promise.resolve();
  }
  return getJob();
}

function okReport<T>(response: T) {
  return {
    status: HttpStatus.OK,
    message: 'Successful response',
    response,
  };
}

describe('ReportingFullMetadataExportService', () => {
  let service: ReportingFullMetadataExportService;
  let resultsService: jest.Mocked<
    Pick<
      ResultsService,
      'getResultDataForBasicReport' | 'getP25ExcelRowsByResultCodes'
    >
  >;
  let emailService: jest.Mocked<
    Pick<EmailNotificationManagementService, 'sendEmail'>
  >;
  let queuePublisher: jest.Mocked<
    Pick<
      ReportingMetadataExportQueuePublisherService,
      'isEnabled' | 'publishExportJob'
    >
  >;
  let templateRepository: jest.Mocked<Pick<TemplateRepository, 'findOne'>>;

  const user: TokenDto = {
    id: 42,
    email: 'user@test.org',
    first_name: 'Test',
    last_name: 'User',
  };

  const savedBucket = process.env.AWS_BUCKET_NAME_EXPORT;
  const savedMaxRows = process.env.RESULT_METADATA_EXPORT_MAX_ROWS;
  const savedP25Years = process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS;
  const savedSender = process.env.EMAIL_SENDER;

  beforeEach(async () => {
    jest.clearAllMocks();

    process.env.AWS_BUCKET_NAME_EXPORT = 'test-bucket';
    delete process.env.RESULT_METADATA_EXPORT_MAX_ROWS;
    delete process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS;
    delete process.env.EMAIL_SENDER;

    resultsService = {
      getResultDataForBasicReport: jest.fn(),
      getP25ExcelRowsByResultCodes: jest.fn(),
    };

    emailService = {
      sendEmail: jest.fn(),
    };

    queuePublisher = {
      isEnabled: jest.fn().mockReturnValue(false),
      publishExportJob: jest.fn(),
    };

    templateRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingFullMetadataExportService,
        { provide: ResultsService, useValue: resultsService },
        {
          provide: EmailNotificationManagementService,
          useValue: emailService,
        },
        {
          provide: ReportingMetadataExportQueuePublisherService,
          useValue: queuePublisher,
        },
        { provide: TemplateRepository, useValue: templateRepository },
      ],
    }).compile();

    service = module.get(ReportingFullMetadataExportService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (savedBucket === undefined) delete process.env.AWS_BUCKET_NAME_EXPORT;
    else process.env.AWS_BUCKET_NAME_EXPORT = savedBucket;
    if (savedMaxRows === undefined)
      delete process.env.RESULT_METADATA_EXPORT_MAX_ROWS;
    else process.env.RESULT_METADATA_EXPORT_MAX_ROWS = savedMaxRows;
    if (savedP25Years === undefined)
      delete process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS;
    else process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS = savedP25Years;
    if (savedSender === undefined) delete process.env.EMAIL_SENDER;
    else process.env.EMAIL_SENDER = savedSender;
  });

  describe('getJob', () => {
    it('returns null when job belongs to another user', async () => {
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      expect(service.getJob(jobId, 999)).toBeNull();
    });

    it('returns a copy of the job for the owner', () => {
      queuePublisher.isEnabled.mockReturnValue(true);
      queuePublisher.publishExportJob.mockImplementation(() => undefined);

      const { jobId } = service.enqueueExport({}, user);
      const job = service.getJob(jobId, user.id);

      expect(job).not.toBeNull();
      expect(job?.userId).toBe(user.id);
      expect(job?.status).toBe('queued');

      if (job) {
        job.status = 'completed';
      }
      const again = service.getJob(jobId, user.id);
      expect(again?.status).toBe('queued');
    });
  });

  describe('enqueueExport', () => {
    it('publishes to queue when publisher is enabled', () => {
      queuePublisher.isEnabled.mockReturnValue(true);

      const { jobId } = service.enqueueExport({ searchText: 'x' }, user);

      expect(queuePublisher.publishExportJob).toHaveBeenCalledWith({
        jobId,
        filters: { searchText: 'x' },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    });

    it('runs inline via setImmediate when queue disabled', async () => {
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([]),
      );

      service.enqueueExport({}, user);
      await flushBackgroundJobs();

      expect(resultsService.getResultDataForBasicReport).toHaveBeenCalled();
      expect(queuePublisher.publishExportJob).not.toHaveBeenCalled();
    });
  });

  describe('executeQueuedExportJob', () => {
    it('runs export for an existing job id (consumer path)', async () => {
      queuePublisher.isEnabled.mockReturnValue(true);
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([]),
      );

      const { jobId } = service.enqueueExport({}, user);

      await service.executeQueuedExportJob({
        jobId,
        filters: {},
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });

      expect(resultsService.getResultDataForBasicReport).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ id: user.id, email: user.email }),
      );
    });
  });

  describe('export pipeline (non-P25)', () => {
    it('marks job failed when no rows returned', async () => {
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      const job = service.getJob(jobId, user.id);
      expect(job?.status).toBe('failed');
      expect(job?.errorMessage).toContain('No results match');
    });

    it('completes legacy export and sends email', async () => {
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([
          {
            result_code: 100,
            version_id: 1,
            phase_year: 2024,
            result_type: 'Innovation Use',
            title: 'T',
          },
        ]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      const job = await waitForTerminalJob(() =>
        service.getJob(jobId, user.id),
      );
      expect(job?.status).toBe('completed');
      expect(job?.rowCount).toBe(1);
      expect(job?.fileName).toMatch(/\.xlsx$/);
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('export pipeline (P25)', () => {
    beforeEach(() => {
      process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS = '2025';
    });

    it('uses getP25ExcelRowsByResultCodes when phase_year is P25', async () => {
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([
          {
            result_code: 200,
            version_id: 2,
            phase_year: 2025,
            result_type: 'X',
          },
        ]),
      );
      resultsService.getP25ExcelRowsByResultCodes.mockResolvedValue(
        okReport([
          {
            result_code: 200,
            result_type: 'Policy change',
            phase_name: 'P',
            portfolio_acronym: 'PA',
            result_level: 'L',
            submission_status: 'S',
            title: 'Title',
            result_description: 'D',
            primary_submitter_acronym: 'PS',
          },
        ]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      expect(resultsService.getP25ExcelRowsByResultCodes).toHaveBeenCalledWith([
        200,
      ]);
      const job = await waitForTerminalJob(() =>
        service.getJob(jobId, user.id),
      );
      expect(job?.status).toBe('completed');
    });
  });

  describe('limits and validation', () => {
    it('fails when row count exceeds RESULT_METADATA_EXPORT_MAX_ROWS', async () => {
      process.env.RESULT_METADATA_EXPORT_MAX_ROWS = '1';
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([
          { result_code: 1, version_id: 1, phase_year: 2024 },
          { result_code: 2, version_id: 1, phase_year: 2024 },
        ]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      expect(service.getJob(jobId, user.id)?.status).toBe('failed');
      expect(service.getJob(jobId, user.id)?.errorMessage).toContain(
        'Too many results',
      );
    });

    it('fails when mixing P25 and non-P25 phase years', async () => {
      process.env.RESULT_FULL_METADATA_P25_PHASE_YEARS = '2025';
      resultsService.getResultDataForBasicReport.mockResolvedValue(
        okReport([
          { result_code: 1, version_id: 1, phase_year: 2025 },
          { result_code: 2, version_id: 1, phase_year: 2024 },
        ]),
      );

      const { jobId } = service.enqueueExport({}, user);
      await flushBackgroundJobs();

      expect(service.getJob(jobId, user.id)?.errorMessage).toContain(
        'cannot mix P25',
      );
    });
  });
});
