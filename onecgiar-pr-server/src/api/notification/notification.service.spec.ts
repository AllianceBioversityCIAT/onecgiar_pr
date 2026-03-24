import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationLevelRepository } from './repositories/notification-level.respository';
import { NotificationTypeRepository } from './repositories/notification-type.respository';
import { NotificationRepository } from './repositories/notification.respository';
import { SocketManagementService } from '../../shared/microservices/socket-management/socket-management.service';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from './enum/notification.enum';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

const mockNotificationLevelRepository = {
  findOne: jest.fn(),
};

const mockNotificationTypeRepository = {
  findOne: jest.fn(),
};

const mockNotificationRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockSocketManagementService = {
  getActiveUsers: jest.fn(),
  sendNotificationToUsers: jest.fn(),
};

const mockShareResultRequestService = {};
const mockUserRepository = {
  InitiativeByUser: jest.fn(),
};

const mockResultByInitiativesRepository = {
  getOwnerInitiativeByResult: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationLevelRepository,
          useValue: mockNotificationLevelRepository,
        },
        {
          provide: NotificationTypeRepository,
          useValue: mockNotificationTypeRepository,
        },
        {
          provide: NotificationRepository,
          useValue: mockNotificationRepository,
        },
        {
          provide: SocketManagementService,
          useValue: mockSocketManagementService,
        },
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('emitResultNotification', () => {
    beforeEach(() => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockNotificationTypeRepository.findOne.mockResolvedValue({
        notifications_type_id: 2,
      });
      mockNotificationRepository.save.mockResolvedValue(null);
      mockNotificationRepository.findOne.mockResolvedValue({
        obj_emitter_user: {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
        obj_result: {
          result_code: 123,
        },
      });
    });

    it('should persist notifications and emit socket payload with byUser metadata', async () => {
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [{ userId: 2 }],
        status: 200,
      });
      mockSocketManagementService.sendNotificationToUsers.mockResolvedValue({
        status: 200,
      });

      const response = await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CREATED,
        [1, 2, 3],
        1,
        99,
      );

      expect(mockNotificationRepository.save).toHaveBeenCalledWith([
        {
          target_user: 2,
          emitter_user: 1,
          result_id: 99,
          notification_level: 1,
          notification_type: 2,
        },
        {
          target_user: 3,
          emitter_user: 1,
          result_id: 99,
          notification_level: 1,
          notification_type: 2,
        },
      ]);

      expect(
        mockSocketManagementService.sendNotificationToUsers,
      ).toHaveBeenCalledTimes(1);

      const [, notificationPayload] =
        mockSocketManagementService.sendNotificationToUsers.mock.calls[0];

      expect(notificationPayload).toMatchObject({
        byUser: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        },
        desc: expect.stringContaining('John Doe'),
      });

      expect(response).toMatchObject({
        message: 'Notification created successfully',
        status: 201,
      });
    });

    it('should return without emitting when no matched online users', async () => {
      mockSocketManagementService.getActiveUsers.mockResolvedValue({
        response: [],
        status: 200,
      });

      const result = await service.emitResultNotification(
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_CREATED,
        [1, 2],
        1,
        99,
      );

      expect(
        mockSocketManagementService.sendNotificationToUsers,
      ).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        message: 'Notifications stored; no online recipients.',
        status: 201,
      });
      expect(mockNotificationRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getRecentResultActivity', () => {
    const user: TokenDto = {
      id: 10,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should resolve initiative data using fallback when missing', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockUserRepository.InitiativeByUser.mockResolvedValue([{ id: 1 }]);

      const queryBuilder: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            notification_id: '1',
            result_id: 200,
            obj_result: {
              result_code: 1234,
              title: 'Result with owner',
              obj_result_by_initiatives: [
                {
                  initiative_role_id: 1,
                  is_active: true,
                  initiative_id: 55,
                  obj_initiative: {
                    name: 'Primary Initiative',
                    official_code: 'PI-1',
                  },
                },
              ],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_SUBMITTED,
            },
            obj_emitter_user: {
              first_name: 'Alice',
              last_name: 'Smith',
            },
            emitter_user: 3,
            created_date: new Date('2024-01-01'),
          },
          {
            notification_id: '2',
            result_id: 201,
            obj_result: {
              result_code: 5678,
              title: 'Result without owner',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_CREATED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-02'),
          },
        ]),
      };

      mockNotificationRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      mockResultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValueOnce(
        {
          id: 77,
          initiative_name: 'Fallback Initiative',
          official_code: 'FB-01',
        },
      );

      const result = await service.getRecentResultActivity(user, 5);

      expect(mockUserRepository.InitiativeByUser).toHaveBeenCalledWith(user.id);
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenCalledWith(201);

      expect(result.response).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            initiativeName: 'Primary Initiative',
            initiativeOfficialCode: 'PI-1',
          }),
          expect.objectContaining({
            initiativeName: 'Fallback Initiative',
            initiativeOfficialCode: 'FB-01',
          }),
        ]),
      );
      expect(result.status).toBe(200);
    });

    it('should return global notifications when user lacks initiative roles', async () => {
      mockNotificationLevelRepository.findOne.mockResolvedValue({
        notifications_level_id: 1,
      });
      mockUserRepository.InitiativeByUser.mockResolvedValue([]);

      const rawQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { notification_id: '10', result_id: 300 },
          { notification_id: '11', result_id: 301 },
        ]),
      };

      const baseQueryBuilder: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            notification_id: '10',
            result_id: 300,
            obj_result: {
              result_code: 9001,
              title: 'Global Result 1',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_CREATED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-03'),
          },
          {
            notification_id: '11',
            result_id: 301,
            obj_result: {
              result_code: 9002,
              title: 'Global Result 2',
              obj_result_by_initiatives: [],
            },
            obj_notification_type: {
              type: NotificationTypeEnum.RESULT_SUBMITTED,
            },
            obj_emitter_user: null,
            emitter_user: null,
            created_date: new Date('2024-01-04'),
          },
        ]),
      };

      mockNotificationRepository.createQueryBuilder
        .mockReturnValueOnce(rawQueryBuilder)
        .mockReturnValueOnce(baseQueryBuilder);
      mockResultByInitiativesRepository.getOwnerInitiativeByResult.mockResolvedValue(
        null,
      );

      const result = await service.getRecentResultActivity(user, 2);

      expect(mockUserRepository.InitiativeByUser).toHaveBeenCalledWith(user.id);
      expect(rawQueryBuilder.getRawMany).toHaveBeenCalled();
      expect(baseQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.notification_id IN (:...notificationIds)',
        {
          notificationIds: [10, 11],
        },
      );
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenNthCalledWith(1, 300);
      expect(
        mockResultByInitiativesRepository.getOwnerInitiativeByResult,
      ).toHaveBeenNthCalledWith(2, 301);
      expect(result.response).toHaveLength(2);
      expect(result.status).toBe(200);
    });
  });
});
