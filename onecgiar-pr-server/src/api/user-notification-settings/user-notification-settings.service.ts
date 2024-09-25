import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UserNotificationSettingDto } from './dto/create-user-notification-setting.dto';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { User } from '../../auth/modules/user/entities/user.entity';
import { UserNotificationSettingRepository } from './user-notification-settings.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ClarisaInitiative } from '../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { UserNotificationSetting } from './entities/user-notification-settings.entity';
import { In } from 'typeorm';

@Injectable()
export class UserNotificationSettingsService {
  private readonly _logger = new Logger(UserNotificationSettingsService.name);

  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _userNotificationSettingRepository: UserNotificationSettingRepository,
    private readonly _clarisaInitiativeRepository: ClarisaInitiativesRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
  ) {}

  private async verifyUserExists(userId: number): Promise<User | null> {
    return await this._userRepository.findOne({
      where: { id: userId, active: true },
    });
  }

  private async verifyInitiativeExists(
    initiativeId: number,
  ): Promise<ClarisaInitiative | null> {
    return await this._clarisaInitiativeRepository.findOne({
      where: { id: initiativeId, active: true },
    });
  }

  private async verifyUserInit(
    userId: number,
    initiativeId: number,
  ): Promise<boolean> {
    const userInit = await this._roleByUserRepository.findOne({
      where: { user: userId, initiative_id: initiativeId, active: true },
    });
    return !!userInit;
  }

  async getAllUserNotificationSettings(user: TokenDto) {
    try {
      const userExists = await this.verifyUserExists(user.id);

      if (!userExists) {
        return {
          response: null,
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const userNotificationSettings =
        await this._userNotificationSettingRepository.find({
          where: { user_id: user.id, is_active: true },
        });

      return {
        response: userNotificationSettings,
        message: 'User notification settings fetched successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(
        `Error fetching user notification settings: ${error.message}`,
        error.stack,
      );
      return {
        response: null,
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getUserNotificationSettingsByInitiative(
    initiativeId: number,
    user: TokenDto,
  ) {
    try {
      const userExists = await this.verifyUserExists(user.id);
      const initExists = await this.verifyInitiativeExists(initiativeId);

      if (!userExists || !initExists) {
        return {
          response: null,
          message: 'User or Initiative not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isUserInInitiative = await this.verifyUserInit(
        user.id,
        initiativeId,
      );

      if (!isUserInInitiative) {
        return {
          response: null,
          message: 'User is not part of the Initiative',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const userNotificationSettings =
        await this._userNotificationSettingRepository.findOne({
          where: {
            user_id: user.id,
            initiative_id: initiativeId,
            is_active: true,
          },
        });

      return {
        response: userNotificationSettings,
        message: 'User notification settings fetched successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(
        `Error fetching user notification settings by initiative: ${error.message}`,
        error.stack,
      );
      return {
        response: null,
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async userNotificationSettings(
    userNotificationSettingDto: UserNotificationSettingDto[],
    user: TokenDto,
  ) {
    try {
      const userExists = await this.verifyUserExists(user.id);
      if (!userExists) {
        return {
          response: null,
          message: 'User not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      for (const us of userNotificationSettingDto) {
        const initExists = await this.verifyInitiativeExists(us.initiative_id);

        if (!initExists) {
          continue;
        }

        const isUserInInitiative = await this.verifyUserInit(
          user.id,
          us.initiative_id,
        );

        if (!isUserInInitiative) {
          continue;
        }

        const userNotificationSettings: UserNotificationSetting =
          await this._userNotificationSettingRepository.findOne({
            where: {
              user_id: user.id,
              initiative_id: us.initiative_id,
              is_active: true,
            },
          });

        if (!userNotificationSettings) {
          const newUserNotificationSettings = new UserNotificationSetting();
          newUserNotificationSettings.user_id = user.id;
          newUserNotificationSettings.initiative_id = us.initiative_id;
          newUserNotificationSettings.email_notifications_contributing_request_enabled =
            us.email_notifications_contributing_request_enabled;
          newUserNotificationSettings.email_notifications_updates_enabled =
            us.email_notifications_updates_enabled;
          newUserNotificationSettings.is_active = true;
          newUserNotificationSettings.created_by = user.id;
          newUserNotificationSettings.last_updated_by = user.id;

          await this._userNotificationSettingRepository.insert(
            newUserNotificationSettings,
          );
        } else {
          await this._userNotificationSettingRepository.update(
            {
              id: userNotificationSettings.id,
            },
            {
              email_notifications_contributing_request_enabled:
                us.email_notifications_contributing_request_enabled,
              email_notifications_updates_enabled:
                us.email_notifications_updates_enabled,
              last_updated_by: user.id,
            },
          );
        }
      }
      return {
        response: 'User notification settings updated successfully',
        message:
          'The user notification settings have been updated successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this._logger.error(
        `Error updating user notification settings: ${error.message}`,
        error.stack,
      );
      return {
        response: null,
        message: 'Internal server error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getNotificationUpdatesRecipients(
    initiativeId: number,
  ): Promise<number[]> {
    const initMembers = await this._roleByUserRepository.find({
      relations: {
        obj_user: {
          obj_user_notification_setting: true,
        },
      },
      where: {
        initiative_id: initiativeId,
        role: In([3, 4, 5]),
        active: true,
        obj_user: {
          obj_user_notification_setting: {
            email_notifications_updates_enabled: true,
          },
        },
      },
    });
    return initMembers.map((m) => m.obj_user.id);
  }
}
