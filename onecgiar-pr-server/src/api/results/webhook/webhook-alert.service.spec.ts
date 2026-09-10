import { Test, TestingModule } from '@nestjs/testing';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { WebhookAlertService } from './webhook-alert.service';

/**
 * P2-3166 AC5 (WH-T-7 case 5). The load-bearing assertion is the negative one: the alert must not
 * carry the destination URL, because `docs/prd.md` AC-9 forbids it. Everything else here guards the
 * paths that would otherwise fail silently.
 */
describe('WebhookAlertService', () => {
  let service: WebhookAlertService;
  let templateRepository: { findOne: jest.Mock };
  let globalParameterRepository: { findOne: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  // Renders every field the service passes, so a leak would show up in the output.
  const TEMPLATE = `
    <p>result {{result_id}} delivery {{delivery_id}} recipient {{recipient}}
    error {{error_code}} attempts {{attempts}}</p>
  `;

  const alert = {
    deliveryId: 900,
    resultId: 555,
    recipientAcronym: 'EXT',
    httpStatus: 503,
    reason: 'Recipient responded HTTP 503',
    attempts: 5,
  };

  beforeEach(async () => {
    templateRepository = {
      findOne: jest.fn().mockResolvedValue({ template: TEMPLATE }),
    };
    globalParameterRepository = {
      findOne: jest.fn().mockResolvedValue({ value: 'tech@cgiar.org' }),
    };
    emailService = { sendEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookAlertService,
        { provide: TemplateRepository, useValue: templateRepository },
        {
          provide: GlobalParameterRepository,
          useValue: globalParameterRepository,
        },
        {
          provide: EmailNotificationManagementService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<WebhookAlertService>(WebhookAlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('looks the body up by the template-table name, not a hardcoded string', async () => {
    await service.alertDeliveryExhausted(alert);

    expect(templateRepository.findOne).toHaveBeenCalledWith({
      where: { name: EmailTemplate.WEBHOOK_DELIVERY_FAILED },
    });
  });

  it('sends to the technical team addresses from the global parameter', async () => {
    globalParameterRepository.findOne.mockResolvedValue({
      value: 'tech@cgiar.org, ops@cgiar.org ',
    });

    await service.alertDeliveryExhausted(alert);

    const [payload] = emailService.sendEmail.mock.calls[0];
    expect(payload.emailBody.to).toEqual(['tech@cgiar.org', 'ops@cgiar.org']);
  });

  it('carries result id, recipient acronym, delivery id and error code', async () => {
    await service.alertDeliveryExhausted(alert);

    const [payload] = emailService.sendEmail.mock.calls[0];
    const body = payload.emailBody.message.socketFile;

    expect(body).toContain('result 555');
    expect(body).toContain('delivery 900');
    expect(body).toContain('recipient EXT');
    expect(body).toContain('error 503');
    expect(payload.emailBody.subject).toContain('555');
  });

  // AC-9 / `.cursorrules`. The URL is never handed to this service in the first place — this pins
  // that the alert cannot start carrying it by accident.
  it('never renders a destination URL', async () => {
    await service.alertDeliveryExhausted({
      ...alert,
      reason: 'Transport error (ECONNABORTED)',
      httpStatus: null,
    });

    const [payload] = emailService.sendEmail.mock.calls[0];
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).toContain('ECONNABORTED');
  });

  describe('degrades without throwing', () => {
    it('skips the mail when the template row is missing', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.alertDeliveryExhausted(alert),
      ).resolves.toBeUndefined();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('skips the mail when no technical team address is configured', async () => {
      globalParameterRepository.findOne.mockResolvedValue({ value: '' });

      await service.alertDeliveryExhausted(alert);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('does not rethrow when the email transport fails', async () => {
      emailService.sendEmail.mockImplementation(() => {
        throw new Error('rmq down');
      });

      await expect(
        service.alertDeliveryExhausted(alert),
      ).resolves.toBeUndefined();
    });

    it('falls back to "unknown" when the endpoint had no acronym', async () => {
      await service.alertDeliveryExhausted({
        ...alert,
        recipientAcronym: null,
      });

      const [payload] = emailService.sendEmail.mock.calls[0];
      expect(payload.emailBody.message.socketFile).toContain(
        'recipient unknown',
      );
    });
  });

  describe('without an email channel', () => {
    it('records the abandonment and returns', async () => {
      const module = await Test.createTestingModule({
        providers: [
          WebhookAlertService,
          { provide: TemplateRepository, useValue: templateRepository },
          {
            provide: GlobalParameterRepository,
            useValue: globalParameterRepository,
          },
        ],
      }).compile();

      const bare = module.get<WebhookAlertService>(WebhookAlertService);

      await expect(bare.alertDeliveryExhausted(alert)).resolves.toBeUndefined();
      expect(templateRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
