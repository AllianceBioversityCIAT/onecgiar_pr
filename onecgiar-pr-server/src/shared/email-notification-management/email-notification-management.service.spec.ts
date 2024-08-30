import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { EmailNotificationManagementService } from './email-notification-management.service';
import { ConfigMessageDto } from './dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { TokenDto } from '../globalInterfaces/token.dto';

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
      const data = {
        initOwner: { official_code: 'INIT1', name: 'Owner Initiative' },
        initContributing: { name: 'Contributing Initiative' },
        user: { first_name: 'John', last_name: 'Doe' },
        result: { result_code: 'R001', title: 'Sample Result' },
      };
      const result = service.buildEmailData(
        'email_template_contribution',
        data,
      );
      expect(result).toEqual({
        subject:
          '[PRMS] Result Contributing: INIT1 confirmation required for contribution to Result R001',
        initContributingName: 'Contributing Initiative',
        requesterName: 'John Doe',
        initOwner: 'INIT1 Owner Initiative',
        urlNotification: process.env.RESULTS_URL,
        result: 'R001 - Sample Result',
      });
    });

    it('should throw an error for an unknown template', () => {
      expect(() => service.buildEmailData('unknown_template', {})).toThrow(
        'No email data configuration found for template unknown_template',
      );
    });
  });
});
