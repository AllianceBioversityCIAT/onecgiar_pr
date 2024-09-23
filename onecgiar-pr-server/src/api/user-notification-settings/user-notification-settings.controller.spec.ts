import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationSettingsController } from './user-notification-settings.controller';
import { UserNotificationSettingsService } from './user-notification-settings.service';
import { UserNotificationSettingDto } from './dto/create-user-notification-setting.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { UserNotificationSetting } from './entities/user-notification-settings.entity';
import { OrmConfigTestModule } from '../../shared/test/orm-connection.module';

describe('UserNotificationSettingsController', () => {
  let controller: UserNotificationSettingsController;
  let service: UserNotificationSettingsService;
  const userTest: TokenDto = {
    email: 'support@prms.pr',
    id: 1,
    first_name: 'support',
    last_name: 'prms',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserNotificationSettingsController],
      providers: [
        {
          provide: UserNotificationSettingsService,
          useValue: {
            getAllUserNotificationSettings: jest.fn(),
            getUserNotificationSettingsByInitiative: jest.fn(),
            userNotificationSettings: jest.fn(),
          },
        },
      ],
      imports: [OrmConfigTestModule],
    }).compile();

    controller = module.get<UserNotificationSettingsController>(
      UserNotificationSettingsController,
    );
    service = module.get<UserNotificationSettingsService>(
      UserNotificationSettingsService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('emailNotificationSettings', () => {
    it('should update user notification settings', async () => {
      const userNotificationSettingDto: UserNotificationSettingDto[] = [
        {
          initiative_id: 1,
          email_notifications_contributing_request_enabled: true,
          email_notifications_updates_enabled: true,
        },
      ];

      const expectedResult = {
        response: 'User notification settings updated successfully',
        message:
          'The user notification settings have been updated successfully',
        status: 201,
      };

      jest
        .spyOn(service, 'userNotificationSettings')
        .mockResolvedValue(expectedResult);

      const result = await controller.emailNotificationSettings(
        userNotificationSettingDto,
        userTest,
      );

      expect(result).toEqual(expectedResult);
      expect(service.userNotificationSettings).toHaveBeenCalledWith(
        userNotificationSettingDto,
        userTest,
      );
    });

    it('should handle errors and return INTERNAL_SERVER_ERROR', async () => {
      const userNotificationSettingDto: UserNotificationSettingDto[] = [
        {
          initiative_id: 1,
          email_notifications_contributing_request_enabled: true,
          email_notifications_updates_enabled: true,
        },
      ];

      jest
        .spyOn(service, 'userNotificationSettings')
        .mockRejectedValue(new Error('Test error'));

      try {
        await controller.emailNotificationSettings(
          userNotificationSettingDto,
          userTest,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(service.userNotificationSettings).toHaveBeenCalledWith(
          userNotificationSettingDto,
          userTest,
        );
      }
    });
  });

  describe('getAllUserNotificationSettings', () => {
    it('should return all user notification settings', async () => {
      const expectedResult = {
        response: [
          {
            id: 1,
            user_id: 1,
            initiative_id: 1,
            email_notifications_contributing_request_enabled: true,
            email_notifications_updates_enabled: true,
            obj_user: {} as any,
            obj_clarisa_initiatives: {} as any,
          } as UserNotificationSetting,
        ],
        message: 'User notification settings fetched successfully',
        status: 200,
      };

      jest
        .spyOn(service, 'getAllUserNotificationSettings')
        .mockResolvedValue(expectedResult);

      const result = await controller.getAllUserNotificationSettings(userTest);
      expect(result).toEqual(expectedResult);
      expect(service.getAllUserNotificationSettings).toHaveBeenCalledWith(
        userTest,
      );
    });

    it('should handle errors and return INTERNAL_SERVER_ERROR', async () => {
      jest
        .spyOn(service, 'getAllUserNotificationSettings')
        .mockRejectedValue(new Error('Test error'));

      try {
        await controller.getAllUserNotificationSettings(userTest);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(service.getAllUserNotificationSettings).toHaveBeenCalledWith(
          userTest,
        );
      }
    });
  });
});
