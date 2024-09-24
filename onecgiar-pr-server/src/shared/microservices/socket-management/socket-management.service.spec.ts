import { Test, TestingModule } from '@nestjs/testing';
import { SocketManagementService } from './socket-management.service';
import { HttpStatus } from '@nestjs/common';
import { NotificationDto } from './dto/create-socket.dto';

describe('SocketManagementService', () => {
  let service: SocketManagementService;
  const notification: NotificationDto = {
    title: 'Test Notification',
    desc: 'Test Notification Description',
    result: {
      notification_id: 27,
      notification_level: 2,
      notification_type: 1,
      target_user: 326,
      emitter_user: 323,
      result_id: 7819,
      text: null,
      read: false,
      created_date: new Date(),
      read_date: null,
      obj_notification_level: {
        notifications_level_id: 2,
        type: 'Result',
        notifications: [],
      },
      obj_notification_type: {
        notifications_type_id: 1,
        type: 'Result Submitted',
      },
      obj_emitter_user: {
        id: 323,
        first_name: 'Admin',
        last_name: 'Test',
        email: 'admin@prms.pr',
      },
      obj_target_user: {
        id: 326,
        first_name: 'Guest',
        last_name: 'Test',
        email: 'guest@prms.pr',
      },
      obj_result: {
        result_code: '5651',
        title: 'Test - Notification Update and Sockets',
        status_id: '3',
        obj_result_by_initiatives: [
          {
            initiative_id: 3,
            obj_initiative: {
              id: 3,
              official_code: 'INIT-03',
            },
          },
        ],
        obj_version: {
          id: '30',
          phase_name: 'Reporting 2024',
        },
      },
    },
  };
  let expectedPlatform: string;

  beforeEach(async () => {
    process.env.SOCKET_URL = 'http://localhost:3000';
    process.env.IS_PRODUCTION = 'false';
    expectedPlatform = 'PRMS-TEST';

    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketManagementService],
    }).compile();

    service = module.get<SocketManagementService>(SocketManagementService);

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should log success message when initialized', async () => {
      const logSpy = jest.spyOn(service['_logger'], 'log');

      await service.onModuleInit();

      expect(logSpy).toHaveBeenCalledWith(
        `Successfully connected to Sockets Microservice ${service['url']}`,
      );
    });

    it('should log error when an exception occurs', async () => {
      const error = new Error('Initialization Error');
      jest.spyOn(service['_logger'], 'log').mockImplementation(() => {
        throw error;
      });
      const errorSpy = jest.spyOn(service['_logger'], 'error');

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users when fetch is successful in test environment', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ clients: ['user1', 'user2'] }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getActiveUsers();

      expect(fetch).toHaveBeenCalledWith(
        `${service['url']}/socket/users/${expectedPlatform}`,
      );
      expect(result).toEqual({
        response: ['user1', 'user2'],
        message: 'Active users fetched successfully',
        status: HttpStatus.OK,
      });
    });

    it('should handle errors during fetch', async () => {
      const error = new Error('Fetch Error');
      (global.fetch as jest.Mock).mockRejectedValue(error);
      const errorSpy = jest.spyOn(service['_logger'], 'error');

      const result = await service.getActiveUsers();

      expect(errorSpy).toHaveBeenCalledWith(error);
      expect(result).toEqual({
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });

    it('should return active users when fetch is successful in production environment', async () => {
      process.env.IS_PRODUCTION = 'true';
      expectedPlatform = 'PRMS-PROD';

      const mockResponse = {
        json: jest.fn().mockResolvedValue({ clients: ['1', '2'] }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getActiveUsers();

      expect(fetch).toHaveBeenCalledWith(
        `${service['url']}/socket/users/${expectedPlatform}`,
      );
      expect(result).toEqual({
        response: ['1', '2'],
        message: 'Active users fetched successfully',
        status: HttpStatus.OK,
      });
    });
  });

  describe('sendNotificationToUsers', () => {
    it('should send notification successfully', async () => {
      const userIds = ['1', '2', '3'];

      const mockResponse = {
        json: jest.fn().mockResolvedValue({ success: true }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.sendNotificationToUsers(
        userIds,
        notification,
      );

      expect(fetch).toHaveBeenCalledWith(
        `${service['url']}/socket/notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userIds,
            platform: expectedPlatform,
            notification,
          }),
        },
      );
      expect(result).toEqual({
        response: { success: true },
        message: 'Notification sent successfully',
        status: HttpStatus.OK,
      });
    });

    it('should warn when no userIds are provided', async () => {
      const userIds = null;
      const warnSpy = jest.spyOn(service['_logger'], 'warn');

      const result = await service.sendNotificationToUsers(
        userIds,
        notification,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        'No users online to send notification',
      );
      expect(result).toEqual({
        response: null,
        message: 'No users online to send notification',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should handle errors during notification sending', async () => {
      const userIds = ['1', '2', '3'];
      const error = new Error('Notification Error');
      (global.fetch as jest.Mock).mockRejectedValue(error);
      const errorSpy = jest.spyOn(service['_logger'], 'error');

      const result = await service.sendNotificationToUsers(
        userIds,
        notification,
      );

      expect(errorSpy).toHaveBeenCalledWith(error);
      expect(result).toEqual({
        response: null,
        message: 'AN error occurred while sending notification',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });
});
