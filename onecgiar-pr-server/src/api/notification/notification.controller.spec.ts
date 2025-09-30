import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            emitApplicationAnouncement: jest.fn(),
            updateReadStatus: jest.fn(),
            updateAllReadStatus: jest.fn(),
            getAllNotifications: jest.fn(),
            getPopUpNotifications: jest.fn(),
            getRecentResultActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  describe('createAnouncement', () => {
    it('should call NotificationService.emitApplicationAnouncement with correct parameters', async () => {
      const createNotificationDto: CreateAnnouncementNotificationDto = {
        text: 'Announcement',
      };
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: {},
        status: 201,
        message: 'Notification created successfully',
      };
      jest
        .spyOn(service, 'emitApplicationAnouncement')
        .mockResolvedValue(result);

      const response = await controller.createAnouncement(
        createNotificationDto,
        user,
      );

      expect(service.emitApplicationAnouncement).toHaveBeenCalledWith(
        createNotificationDto,
        user,
      );
      expect(response).toBe(result);
    });
  });

  describe('updateAllReadStatus', () => {
    it('should call NotificationService.updateAllReadStatus with correct parameters', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: [],
        status: 200,
        message: 'All notifications updated successfully',
      };
      jest.spyOn(service, 'updateAllReadStatus').mockResolvedValue(result);

      const response = await controller.updateAllReadStatus(user);

      expect(service.updateAllReadStatus).toHaveBeenCalledWith(user);
      expect(response).toBe(result);
    });
  });

  describe('getAllNotifications', () => {
    it('should call NotificationService.getAllNotifications with correct parameters', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: {},
        status: 200,
        message: 'List of all notifications retrieved successfully',
      };
      jest.spyOn(service, 'getAllNotifications').mockResolvedValue(result);

      const response = await controller.getAllNotifications(user);

      expect(service.getAllNotifications).toHaveBeenCalledWith(user);
      expect(response).toBe(result);
    });
  });

  describe('getPopUpNotifications', () => {
    it('should call NotificationService.getPopUpNotifications with correct parameters', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@example.com',
        first_name: 'test',
        last_name: 'user',
      };

      const result = {
        response: [],
        status: 200,
        message: 'List of all pop-up notifications retrieved successfully',
      };
      jest.spyOn(service, 'getPopUpNotifications').mockResolvedValue(result);

      const response = await controller.getPopUpNotifications(user);

      expect(service.getPopUpNotifications).toHaveBeenCalledWith(user);
      expect(response).toBe(result);
    });
  });

  describe('getRecentActivity', () => {
    const user: TokenDto = {
      id: 1,
      email: 'test@example.com',
      first_name: 'test',
      last_name: 'user',
    };

    it('should default limit to 10 when query param missing', async () => {
      const result = {
        response: [],
        status: 200,
        message: 'ok',
      };
      jest.spyOn(service, 'getRecentResultActivity').mockResolvedValue(result);

      const response = await controller.getRecentActivity(user);

      expect(service.getRecentResultActivity).toHaveBeenCalledWith(user, 10);
      expect(response).toBe(result);
    });

    it('should pass parsed limit when valid number provided', async () => {
      const result = {
        response: [],
        status: 200,
        message: 'ok',
      };
      jest.spyOn(service, 'getRecentResultActivity').mockResolvedValue(result);

      const response = await controller.getRecentActivity(user, '5');

      expect(service.getRecentResultActivity).toHaveBeenCalledWith(user, 5);
      expect(response).toBe(result);
    });
  });
});
