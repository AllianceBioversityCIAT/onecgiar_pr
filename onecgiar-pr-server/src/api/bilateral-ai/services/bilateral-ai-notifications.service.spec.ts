import { BilateralAiNotificationsService } from './bilateral-ai-notifications.service';
import {
  BilateralAiJob,
  BilateralAiJobStatus,
} from '../entities/bilateral-ai-job.entity';

describe('BilateralAiNotificationsService (unit)', () => {
  /**
   * `elapsedSeconds` is what MySQL's
   * `TIMESTAMPDIFF(SECOND, queue_entry_date, COALESCE(completed_date, NOW()))` returns for the
   * job. It replaces the `terminalDate` every case used to pass: the duration is no longer
   * computed in the process, so the only way to drive it in a unit test is to mock the row the
   * database hands back. `null` models an unreadable clock (missing row / NULL column).
   */
  const makeService = (elapsedSeconds: number | null = 360) => {
    const durationQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValue(
          elapsedSeconds === null ? undefined : { seconds: elapsedSeconds },
        ),
    };
    const jobRepository = {
      createQueryBuilder: jest.fn(() => durationQueryBuilder),
    };
    const notificationService = {
      emitBilateralAiJobNotification: jest
        .fn()
        .mockResolvedValue({ notification_id: 1 }),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        email: 'uploader@cgiar.org',
        first_name: 'Cristian',
      }),
    };
    const clarisaInstitutionsRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 7, acronym: 'AfricaRice' }),
    };
    const templateRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ template: '<p>{{center_acronym}}</p>' }),
    };
    const emailService = { sendEmail: jest.fn() };

    const service = new BilateralAiNotificationsService(
      notificationService as any,
      userRepository as any,
      clarisaInstitutionsRepository as any,
      templateRepository as any,
      jobRepository as any,
      emailService as any,
    );

    return {
      service,
      stubs: {
        notificationService,
        userRepository,
        clarisaInstitutionsRepository,
        templateRepository,
        jobRepository,
        durationQueryBuilder,
        emailService,
      },
    };
  };

  const baseJob = (overrides: Partial<BilateralAiJob> = {}): BilateralAiJob =>
    ({
      job_id: 'job-1',
      user_id: 42,
      center_id: 7,
      project_id: 1,
      program_code: 'SP06',
      bucket_name: 'bucket',
      document_keys: ['doc1', 'doc2'],
      audio_keys: [],
      text_context: null,
      status: BilateralAiJobStatus.COMPLETED,
      attempts: 1,
      external_interaction_id: null,
      response_snapshot: null,
      result_count: 2,
      error_code: null,
      error_message: null,
      stage: 'creating_drafts',
      stage_updated_date: null,
      retrying: false,
      retried_date: null,
      created_date: new Date('2026-09-15T10:00:00Z'),
      started_date: new Date('2026-09-15T10:00:05Z'),
      completed_date: null,
      last_updated_date: new Date('2026-09-15T10:00:05Z'),
      queue_entry_date: new Date('2026-09-15T10:00:00Z'),
      ...overrides,
    }) as BilateralAiJob;

  describe('notifyTerminal — results_ready', () => {
    it('persists exactly one notification row (mix + duration) and mails when >= 2 min', async () => {
      const { service, stubs } = makeService();
      const job = baseJob({ result_count: 2 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 2,
      });

      expect(
        stubs.notificationService.emitBilateralAiJobNotification,
      ).toHaveBeenCalledTimes(1);
      const [targetUserId, text] =
        stubs.notificationService.emitBilateralAiJobNotification.mock.calls[0];
      expect(targetUserId).toBe(42);
      expect(text).toContain('2 documents · 6 min');
      expect(text).toContain('/bilateral/AfricaRice/drafts');

      expect(stubs.emailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('writes the in-app row but skips the mail when the job ran under 2 minutes', async () => {
      // Was: `const terminalDate = new Date('2026-09-15T10:01:30Z'); // 90s` passed as an option.
      const { service, stubs } = makeService(90);
      const job = baseJob({ result_count: 1 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 1,
      });

      expect(
        stubs.notificationService.emitBilateralAiJobNotification,
      ).toHaveBeenCalledTimes(1);
      expect(stubs.emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('notifyTerminal — late completion (APF-R-2 A)', () => {
    it('marks the copy "arrived after all" when late=true', async () => {
      const { service, stubs } = makeService();
      const job = baseJob({ result_count: 1 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 1,
        late: true,
      });

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('arrived after all');
    });
  });

  describe('notifyTerminal — no_candidates', () => {
    it('renders the "found no results" copy and mails via the NO_CANDIDATES template', async () => {
      const { service, stubs } = makeService();
      const job = baseJob({ result_count: 0 });

      await service.notifyTerminal(job, 'no_candidates', {
        resultCount: 0,
      });

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('found no results');
      expect(stubs.templateRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'email_template_bilateral_ai_no_candidates' },
      });
    });
  });

  describe('notifyTerminal — failed', () => {
    it('names the cause in plain words and deep-links to the create step with the job id', async () => {
      const { service, stubs } = makeService();
      const job = baseJob({
        status: BilateralAiJobStatus.FAILED,
        error_code: 'TIMED_OUT',
        result_count: 0,
      });

      await service.notifyTerminal(job, 'failed');

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('failed for AfricaRice');
      expect(text).toContain('/bilateral/AfricaRice/create?job=job-1');
      expect(stubs.templateRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'email_template_bilateral_ai_failed' },
      });
    });
  });

  describe('deep link encoding', () => {
    it('percent-encodes the centre acronym, parentheses included', async () => {
      const { service, stubs } = makeService();
      stubs.clarisaInstitutionsRepository.findOne.mockResolvedValue({
        id: 7,
        acronym: 'Bioversity (Alliance)',
      });
      const job = baseJob({ result_count: 1 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 1,
      });

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('/bilateral/Bioversity%20%28Alliance%29/drafts');
      expect(text).not.toContain('/bilateral/Bioversity (Alliance)/drafts');
    });
  });

  describe('mail template variables (design.md T-1 forward pointer)', () => {
    it('binds the RESULTS_READY variables', async () => {
      const { service, stubs } = makeService();
      stubs.templateRepository.findOne.mockResolvedValue({
        template:
          '{{user_name}}|{{center_acronym}}|{{result_count}}|{{result_plural}}',
      });
      const job = baseJob({ result_count: 2 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 2,
        late: false,
      });

      const body =
        stubs.emailService.sendEmail.mock.calls[0][0].emailBody.message
          .socketFile;
      expect(body).toBe('Cristian|AfricaRice|2|s');
    });

    it('renders the {{#if late}} block when late=true', async () => {
      const { service, stubs } = makeService();
      stubs.templateRepository.findOne.mockResolvedValue({
        template: '{{user_name}}{{#if late}}|LATE{{/if}}',
      });
      const job = baseJob({ result_count: 1 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 1,
        late: true,
      });

      const body =
        stubs.emailService.sendEmail.mock.calls[0][0].emailBody.message
          .socketFile;
      expect(body).toBe('Cristian|LATE');
    });

    it('binds the NO_CANDIDATES variables', async () => {
      const { service, stubs } = makeService();
      stubs.templateRepository.findOne.mockResolvedValue({
        template:
          '{{user_name}}|{{center_acronym}}|{{source_plural}}|{{source_mix}}|{{duration_minutes}}',
      });
      const job = baseJob({ result_count: 0 });

      await service.notifyTerminal(job, 'no_candidates', {
        resultCount: 0,
      });

      const body =
        stubs.emailService.sendEmail.mock.calls[0][0].emailBody.message
          .socketFile;
      expect(body).toBe('Cristian|AfricaRice|s|2 documents|6');
    });

    it('binds the FAILED variables', async () => {
      const { service, stubs } = makeService();
      stubs.templateRepository.findOne.mockResolvedValue({
        template: '{{user_name}}|{{center_acronym}}|{{error_cause}}',
      });
      const job = baseJob({
        status: BilateralAiJobStatus.FAILED,
        error_code: 'TIMED_OUT',
        result_count: 0,
      });

      await service.notifyTerminal(job, 'failed');

      const body =
        stubs.emailService.sendEmail.mock.calls[0][0].emailBody.message
          .socketFile;
      expect(body).toBe(
        'Cristian|AfricaRice|the AI service did not respond in time',
      );
    });
  });

  describe('timezone skew regression: the queue duration is measured by the database, never from the process clock', () => {
    it('asks MySQL for TIMESTAMPDIFF(SECOND, queue_entry_date, COALESCE(completed_date, NOW())) scoped to the job', async () => {
      const { service, stubs } = makeService(360);

      await service.notifyTerminal(baseJob(), 'results_ready', {
        resultCount: 2,
      });

      expect(stubs.jobRepository.createQueryBuilder).toHaveBeenCalledWith(
        'job',
      );
      expect(stubs.durationQueryBuilder.select).toHaveBeenCalledWith(
        'TIMESTAMPDIFF(SECOND, job.queue_entry_date, COALESCE(job.completed_date, NOW()))',
        'seconds',
      );
      expect(stubs.durationQueryBuilder.where).toHaveBeenCalledWith(
        'job.job_id = :jobId',
        { jobId: 'job-1' },
      );
    });

    it("renders the DB-computed duration even when the row's own JS timestamps would say something else", async () => {
      // The skew this fixes: `queue_entry_date` is generated by MySQL in the DB session zone while
      // a JS `new Date()` terminal instant is serialized in the Node process zone. Here the row
      // carries a `queue_entry_date` 5 h away from any plausible process clock; the copy must still
      // read "6 min", because 360 s is what the database answered.
      const { service, stubs } = makeService(360);
      const job = baseJob({
        queue_entry_date: new Date('2026-09-15T05:00:00Z'),
        completed_date: new Date('2026-09-15T10:06:00Z'),
      });

      await service.notifyTerminal(job, 'results_ready', { resultCount: 2 });

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('2 documents · 6 min');
      expect(text).not.toContain('300 min');
    });

    it('drives the 2-minute mail rule off the DB value: 90 s sends no mail, 360 s does', async () => {
      const under = makeService(90);
      await under.service.notifyTerminal(baseJob(), 'results_ready', {
        resultCount: 1,
      });
      expect(under.stubs.emailService.sendEmail).not.toHaveBeenCalled();

      const over = makeService(360);
      await over.service.notifyTerminal(baseJob(), 'results_ready', {
        resultCount: 1,
      });
      expect(over.stubs.emailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('fails open when the duration query returns no row: the in-app row still goes out and the mail is sent', async () => {
      const { service, stubs } = makeService(null);

      await service.notifyTerminal(baseJob(), 'results_ready', {
        resultCount: 1,
      });

      const text =
        stubs.notificationService.emitBilateralAiJobNotification.mock
          .calls[0][1];
      expect(text).toContain('· 0 min');
      expect(stubs.emailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('a failing duration query never suppresses the in-app notification', async () => {
      const { service, stubs } = makeService(360);
      stubs.durationQueryBuilder.getRawOne.mockRejectedValue(
        new Error('db down'),
      );

      await expect(
        service.notifyTerminal(baseJob(), 'results_ready', { resultCount: 1 }),
      ).resolves.toBeUndefined();

      expect(
        stubs.notificationService.emitBilateralAiJobNotification,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('resilience — never fails the job it reports on (APF-R-4)', () => {
    it('a mail failure is swallowed with a warn; the in-app row already went out', async () => {
      const { service, stubs } = makeService();
      stubs.templateRepository.findOne.mockRejectedValue(new Error('db down'));
      const job = baseJob({ result_count: 1 });

      await expect(
        service.notifyTerminal(job, 'results_ready', {
          resultCount: 1,
        }),
      ).resolves.toBeUndefined();

      expect(
        stubs.notificationService.emitBilateralAiJobNotification,
      ).toHaveBeenCalledTimes(1);
    });

    it('never throws when the in-app notification write itself fails', async () => {
      const { service, stubs } = makeService();
      stubs.notificationService.emitBilateralAiJobNotification.mockRejectedValue(
        new Error('db down'),
      );
      const job = baseJob({ result_count: 1 });

      await expect(
        service.notifyTerminal(job, 'results_ready', { resultCount: 1 }),
      ).resolves.toBeUndefined();
    });

    it('skips the mail (without throwing) when the email service is not configured', async () => {
      const notificationService = {
        emitBilateralAiJobNotification: jest.fn().mockResolvedValue({}),
      };
      const userRepository = { findOne: jest.fn() };
      const clarisaInstitutionsRepository = {
        findOne: jest.fn().mockResolvedValue({ acronym: 'AfricaRice' }),
      };
      const templateRepository = { findOne: jest.fn() };
      const jobRepository = {
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ seconds: 360 }),
        })),
      };
      const service = new BilateralAiNotificationsService(
        notificationService as any,
        userRepository as any,
        clarisaInstitutionsRepository as any,
        templateRepository as any,
        jobRepository as any,
        undefined,
      );
      const job = baseJob({ result_count: 1 });

      await service.notifyTerminal(job, 'results_ready', {
        resultCount: 1,
      });

      expect(
        notificationService.emitBilateralAiJobNotification,
      ).toHaveBeenCalledTimes(1);
      expect(templateRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
