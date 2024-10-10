import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SocketManagementService } from './socket-management.service';
import axios from 'axios';
import { NotificationDto } from './dto/create-socket.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SocketManagementService', () => {
  let service: SocketManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketManagementService],
    }).compile();

    service = module.get<SocketManagementService>(SocketManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should log successful connection', async () => {
      const logSpy = jest.spyOn(service['_logger'], 'log');
      await service.onModuleInit();
      expect(logSpy).toHaveBeenCalledWith(
        `Successfully connected to Sockets Microservice ${service['url']}`,
      );
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      const mockResponse = { data: { clients: ['user1', 'user2'] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.getActiveUsers();
      expect(result).toEqual({
        response: mockResponse.data.clients,
        message: 'Active users fetched successfully',
        status: HttpStatus.OK,
      });
    });

    it('should handle error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const result = await service.getActiveUsers();
      expect(result).toEqual({
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe('sendNotificationToUsers', () => {
    it('should send notification successfully', async () => {
      const mockResponse = { data: 'Notification sent' };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const notificationDto: NotificationDto = {
        title: 'Test',
        desc: 'Test body',
        result: 'Test result',
      };
      const result = await service.sendNotificationToUsers(
        ['user1'],
        notificationDto,
      );
      expect(result).toEqual({
        response: mockResponse.data,
        message: 'Notification sent successfully',
        status: HttpStatus.OK,
      });
    });

    it('should handle error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      const notificationDto: NotificationDto = {
        title: 'Test',
        desc: 'Test body',
        result: 'Test result',
      };
      const result = await service.sendNotificationToUsers(
        ['user1'],
        notificationDto,
      );
      expect(result).toEqual({
        response: null,
        message: 'An error occurred while sending notification',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    });
  });

  describe('environmentCheck', () => {
    it('should return PRMS-PROD for production', () => {
      process.env.IS_PRODUCTION = 'true';
      expect(service['environmentCheck']()).toBe('PRMS-PROD');
    });

    it('should return PRMS-TEST for non-production', () => {
      process.env.IS_PRODUCTION = 'false';
      expect(service['environmentCheck']()).toBe('PRMS-TEST');
    });
  });
});
