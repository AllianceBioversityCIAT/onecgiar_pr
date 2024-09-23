import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { EmailNotificationManagementService } from './email-notification-management.service';
import { ConfigMessageDto } from './dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { EmailTemplate } from './enum/email-notification.enum';
import { BuildEmailDataDto } from './dto/email-template.dto';
import { TokenDto } from '../../globalInterfaces/token.dto';

describe('EmailNotificationManagementService', () => {
  let service: EmailNotificationManagementService;
  let clientProxy: ClientProxy;
  const userTest: TokenDto = {
    email: 'support@prms.pr',
    id: 1,
    first_name: 'support',
    last_name: 'prms',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationManagementService,
        {
          provide: 'EMAIL_SERVICE',
          useValue: {
            connect: jest.fn(),
            emit: jest.fn(),
          },
        },
        Logger,
      ],
    }).compile();

    service = module.get<EmailNotificationManagementService>(
      EmailNotificationManagementService,
    );
    clientProxy = module.get<ClientProxy>('EMAIL_SERVICE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to the client proxy', async () => {
      await service.onModuleInit();
      expect(clientProxy.connect).toHaveBeenCalled();
    });

    it('should log success message on successful connection', async () => {
      const logSpy = jest.spyOn(service['_logger'], 'log');
      await service.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(
        'Successfully connected to RabbitMQ Email MicroService',
      );
    });

    it('should log error message on failed connection', async () => {
      const errorSpy = jest.spyOn(service['_logger'], 'error');
      jest
        .spyOn(clientProxy, 'connect')
        .mockRejectedValue(new Error('Connection failed'));
      await service.onModuleInit();
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ Email MicroService',
        expect.any(Error),
      );
    });
  });

  describe('sendEmail', () => {
    it('should emit the email with correct payload', () => {
      const email: ConfigMessageDto = {
        from: { email: 'support@prms.pr', name: '[PRMS]' },
        emailBody: {
          subject: 'Test email',
          to: [userTest.email],
          cc: [userTest.email],
          message: {
            text: 'Contribution request',
          },
        },
      };
      const expectedPayload = {
        auth: {
          username: process.env.MS_NOTIFICATION_USER,
          password: process.env.MS_NOTIFICATION_PASSWORD,
        },
        data: email,
      };
      service.sendEmail(email);
      expect(clientProxy.emit).toHaveBeenCalledWith('send', expectedPayload);
    });
  });

  describe('buildEmailData', () => {
    it('should build email data for email_template_contribution', () => {
      const data: BuildEmailDataDto = {
        initOwner: {
          id: 1,
          official_code: 'INIT-01',
          name: 'Owner Initiative',
          short_name: 'Owner',
        },
        initContributing: {
          id: 2,
          name: 'Contributing Initiative',
          official_code: 'INIT-02',
          short_name: 'Contributing',
        },
        user: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'jhon@doe.com',
        },
        result: {
          result_code: 1,
          title: 'Sample Result',
          version_id: 1,
        },
      };

      const result = service.buildEmailData(EmailTemplate.CONTRIBUTION, data);

      expect(result).toEqual({
        cc: ['jhon@doe.com'],
        subject:
          '[PRMS] Result Contributing: INIT-02 confirmation required for contribution to Result 1 - ',
        initContributingName: 'Contributing',
        initContributing: 'INIT-02 Contributing',
        requesterName: 'John Doe',
        initOwner: 'INIT-01 Owner',
        resultUrl: `${process.env.RESULTS_URL}1/general-information?phase=1`,
        result: '1 - Sample Result',
        resultNotificationUrl: `${process.env.NOTIFICATION_MODULE_URL}requests/received?phase=1&init=2&search=1 - Sample Result`,
        notificationSettingUrl: `${process.env.NOTIFICATION_MODULE_URL}settings?init=2`,
      });
    });

    it('should throw an error for an unknown template', () => {
      expect(() =>
        service.buildEmailData('unknown_template' as any, {} as any),
      ).toThrow(
        'No email data configuration found for template unknown_template',
      );
    });
  });

  describe('addPcuEmailToCC', () => {
    it('should add PCU email to CC when IS_PRODUCTION is true', () => {
      process.env.IS_PRODUCTION = 'true';
      const result = service.addPcuEmailToCC(
        'john.doe@test.com',
        'pcu@test.com',
      );
      expect(result).toEqual(['john.doe@test.com', 'pcu@test.com']);
    });

    it('should not add PCU email to CC when IS_PRODUCTION is false', () => {
      process.env.IS_PRODUCTION = 'false';
      const result = service.addPcuEmailToCC(
        'john.doe@test.com',
        'pcu@test.com',
      );
      expect(result).toEqual(['john.doe@test.com']);
    });

    it('should not add PCU email to CC if pcuEmail is undefined', () => {
      process.env.IS_PRODUCTION = 'true';
      const result = service.addPcuEmailToCC('john.doe@test.com', undefined);
      expect(result).toEqual(['john.doe@test.com']);
    });
  });
});
