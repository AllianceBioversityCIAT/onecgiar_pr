import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationSettingsService } from './user-notification-settings.service';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { UserNotificationSettingRepository } from './user-notification-settings.repository';
import { Logger } from '@nestjs/common';
import { User } from '../../auth/modules/user/entities/user.entity';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { OrmConfigTestModule } from '../../shared/test/orm-connection.module';

describe('UserNotificationSettingsService', () => {
  let service: UserNotificationSettingsService;
  let userRepository: UserRepository;
  let userNotificationSettingRepository: UserNotificationSettingRepository;
  let clarisaInitiativeRepository: ClarisaInitiativesRepository;
  let roleByUserRepository: RoleByUserRepository;
  const userTest: TokenDto = {
    email: 'support@prms.pr',
    id: 1,
    first_name: 'support',
    last_name: 'prms',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationSettingsService,
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: UserNotificationSettingRepository,
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            insert: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: RoleByUserRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        Logger,
      ],
      imports: [OrmConfigTestModule],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    service = module.get<UserNotificationSettingsService>(
      UserNotificationSettingsService,
    );
    userRepository = module.get<UserRepository>(UserRepository);
    userNotificationSettingRepository =
      module.get<UserNotificationSettingRepository>(
        UserNotificationSettingRepository,
      );
    clarisaInitiativeRepository = module.get<ClarisaInitiativesRepository>(
      ClarisaInitiativesRepository,
    );
    roleByUserRepository =
      module.get<RoleByUserRepository>(RoleByUserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUserNotificationSettings', () => {
    it('should return user notification settings if user exists', async () => {
      const mockUser = { id: 1, email: 'guest' } as User;
      const mockSettings = [{ id: 1, user_id: 1 }] as any[];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(userNotificationSettingRepository, 'find')
        .mockResolvedValue(mockSettings);

      const result = await service.getAllUserNotificationSettings(userTest);

      expect(result).toEqual({
        response: mockSettings,
        message: 'User notification settings fetched successfully',
        status: 200,
      });
    });

    it('should return NOT_FOUND if user does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getAllUserNotificationSettings(userTest);

      expect(result).toEqual({
        response: null,
        message: 'User not found',
        status: 404,
      });
    });

    it('should return INTERNAL_SERVER_ERROR on error', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Test error'));

      const result = await service.getAllUserNotificationSettings(userTest);

      expect(result).toEqual({
        response: null,
        message: 'Internal server error',
        status: 500,
      });
    });
  });

  describe('getUserNotificationSettingsByInitiative', () => {
    it('should return notification settings if user and initiative exist', async () => {
      const mockUser = { id: 1, active: true } as User;
      const mockInitiative = { id: 1, active: true } as ClarisaInitiative;
      const mockSetting = { id: 1, user_id: 1, initiative_id: 1 } as any;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(clarisaInitiativeRepository, 'findOne')
        .mockResolvedValue(mockInitiative);
      jest.spyOn(roleByUserRepository, 'findOne').mockResolvedValue({} as any);
      jest
        .spyOn(userNotificationSettingRepository, 'findOne')
        .mockResolvedValue(mockSetting);

      const result = await service.getUserNotificationSettingsByInitiative(
        1,
        userTest,
      );

      expect(result).toEqual({
        response: mockSetting,
        message: 'User notification settings fetched successfully',
        status: 200,
      });
    });

    it('should return NOT_FOUND if user or initiative does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserNotificationSettingsByInitiative(
        1,
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'User or Initiative not found',
        status: 404,
      });
    });

    it('should return NOT_FOUND if user is not part of the initiative', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({} as User);
      jest
        .spyOn(clarisaInitiativeRepository, 'findOne')
        .mockResolvedValue({} as ClarisaInitiative);
      jest.spyOn(roleByUserRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getUserNotificationSettingsByInitiative(
        1,
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'User is not part of the Initiative',
        status: 404,
      });
    });

    it('should return INTERNAL_SERVER_ERROR on error', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Test error'));

      const result = await service.getUserNotificationSettingsByInitiative(
        1,
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'Internal server error',
        status: 500,
      });
    });
  });

  describe('userNotificationSettings', () => {
    it('should update or insert notification settings if user and initiative exist', async () => {
      const mockUser = { id: 1, active: true } as User;
      const mockInitiative = { id: 1, active: true } as ClarisaInitiative;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(clarisaInitiativeRepository, 'findOne')
        .mockResolvedValue(mockInitiative);
      jest.spyOn(roleByUserRepository, 'findOne').mockResolvedValue({} as any);
      jest
        .spyOn(userNotificationSettingRepository, 'insert')
        .mockResolvedValue({} as any);

      const result = await service.userNotificationSettings(
        [
          {
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
          },
        ],
        userTest,
      );

      expect(result).toEqual({
        response: 'User notification settings updated successfully',
        message:
          'The user notification settings have been updated successfully',
        status: 201,
      });
    });

    it('should update notification settings if user and initiative exist', async () => {
      const mockUser = { id: 1, active: true } as User;
      const mockInitiative = { id: 1, active: true } as ClarisaInitiative;
      const mockSetting = { id: 1, user_id: 1, initiative_id: 1 } as any;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(clarisaInitiativeRepository, 'findOne')
        .mockResolvedValue(mockInitiative);
      jest.spyOn(roleByUserRepository, 'findOne').mockResolvedValue({} as any);
      jest
        .spyOn(userNotificationSettingRepository, 'findOne')
        .mockResolvedValue(mockSetting);
      jest
        .spyOn(userNotificationSettingRepository, 'update')
        .mockResolvedValue({} as any);

      const result = await service.userNotificationSettings(
        [
          {
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
          },
        ],
        userTest,
      );

      expect(result).toEqual({
        response: 'User notification settings updated successfully',
        message:
          'The user notification settings have been updated successfully',
        status: 201,
      });
    });

    it('should return NOT_FOUND if user or initiative does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.userNotificationSettings(
        [
          {
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
          },
        ],
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'User or Initiative not found',
        status: 404,
      });
    });

    it('should return NOT_FOUND if user is not part of the initiative', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({} as User);
      jest
        .spyOn(clarisaInitiativeRepository, 'findOne')
        .mockResolvedValue({} as ClarisaInitiative);
      jest.spyOn(roleByUserRepository, 'findOne').mockResolvedValue(null);

      const result = await service.userNotificationSettings(
        [
          {
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
          },
        ],
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'User is not part of the Initiative',
        status: 404,
      });
    });

    it('should return INTERNAL_SERVER_ERROR on error', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockRejectedValue(new Error('Test error'));
      const result = await service.userNotificationSettings(
        [
          {
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
          },
        ],
        userTest,
      );

      expect(result).toEqual({
        response: null,
        message: 'Internal server error',
        status: 500,
      });
    });
  });
});
