import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotificationManagementService } from './email-notification-management.service';

describe('EmailNotificationManagementService', () => {
  let service: EmailNotificationManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailNotificationManagementService],
    }).compile();

    service = module.get<EmailNotificationManagementService>(
      EmailNotificationManagementService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
