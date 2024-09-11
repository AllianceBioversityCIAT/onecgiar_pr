import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateAnnouncementNotificationDto } from './dto/create-notification.dto';
import { NotificationLevelRepository } from './repositories/notification-level.respository';
import { NotificationTypeRepository } from './repositories/notification-type.respository';
import { NotificationRepository } from './repositories/notification.respository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from './enum/notification.enum';
import { SocketManagementService } from '../../shared/microservices/socket-management/socket-management.service';
import { NotificationDto } from '../../shared/microservices/socket-management/dto/create-socket.dto';

@Injectable()
export class NotificationService {
  private readonly _logger = new Logger(NotificationService.name);

  constructor(
    private readonly _notificationLevelRepository: NotificationLevelRepository,
    private readonly _notificationTypeRepository: NotificationTypeRepository,
    private readonly _notificationRepository: NotificationRepository,
    private readonly _socketManagementService: SocketManagementService,
  ) {}

  async emitResultNotification(
    notificationLevel: NotificationLevelEnum,
    notificationType: NotificationTypeEnum,
    userIds: number[],
    emmiterUser: number,
    notification: NotificationDto,
  ) {
    try {
      const notificationLevelData =
        await this._notificationLevelRepository.findOne({
          where: { type: notificationLevel },
        });

      const notificationTypeData =
        await this._notificationTypeRepository.findOne({
          where: { type: notificationType },
        });

      for (const userId of userIds) {
        await this._notificationRepository.save({
          target_user: userId,
          emitter_user: emmiterUser,
          notification_level: notificationLevelData.notifications_level_id,
          notification_type: notificationTypeData.notifications_type_id,
        });
      }

      const usersOnline = await this._socketManagementService.getActiveUsers();

      const usersOnlineIds = usersOnline.response.map((user: any) => user.id);

      const matchUsers = userIds.filter((userId) =>
        usersOnlineIds.includes(userId),
      );

      const newNotification =
        await this._socketManagementService.sendNotificationToUsers(
          matchUsers,
          notification,
        );

      return {
        response: newNotification,
        message: 'Notification created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async createAnouncement(
    createNotificationDto: CreateAnnouncementNotificationDto,
    user: TokenDto,
  ) {
    try {
      const notificationLevel = await this._notificationLevelRepository.findOne(
        {
          where: { notifications_level_id: 1 },
        },
      );

      const notificationType = await this._notificationTypeRepository.findOne({
        where: { notifications_type_id: 4 },
      });

      const notification = await this._notificationRepository.save({
        text: createNotificationDto.text,
        emitter_user: user.id,
        notifications_level_id: notificationLevel.notifications_level_id,
        notifications_type_id: notificationType.notifications_type_id,
      });

      return {
        response: notification,
        message: 'Notification created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllNotifications(user: TokenDto) {
    try {
      const [notificationsViewed, notificationsPending, notificationAnnouncement] = await Promise.all([
        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationWhere(),
          where: {
            target_user: user.id,
            read: true,
            obj_result: { is_active: true },
          },
        }),

        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationWhere(),
          where: {
            target_user: user.id,
            read: false,
            obj_result: { is_active: true },
          },
        }),

        await this._notificationRepository.find({
          select: {
            text: true,
            created_date: true,
            obj_emitter_user: {
              first_name: true,
              last_name: true,
            },
            obj_notification_level: { type: true },
            obj_notification_type: { type: true },
          },
          relations: {
            obj_notification_level: true,
            obj_notification_type: true,
          },
          where: {
            target_user: user.id,
            obj_notification_level: { type: NotificationLevelEnum.APPLICATION },
            obj_notification_type: { type: NotificationTypeEnum.ANNOUNCEMENT },
          },
        })
      ]);

      const notifications = {
        notificationsViewed,
        notificationsPending,
        notificationAnnouncement,
      }

      return {
        response: notifications,
        message: 'List of all notifications retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message: '',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  private getNotificattionSelect() {
    return {
      obj_notification_level: {
        type: true,
      },
      obj_notification_type: {
        type: true,
      },
      obj_emitter_user: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
      obj_target_user: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
      obj_result: {
        result_code: true,
        title: true,
        status_id: true,
        obj_result_by_initiatives: {
          obj_initiative: {
            id: true,
            official_code: true,
            name: true,
          },
        },
        obj_version: {
          phase_name: true,
        },
      },
    };
  }

  private getNotificationWhere() {
    return {
      obj_notification_level: true,
      obj_notification_type: true,
      obj_emitter_user: true,
      obj_target_user: true,
      obj_result: {
        obj_result_by_initiatives: {
          obj_initiative: true,
        },
        obj_version: true,
      },
    };
  }
}
