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
}
