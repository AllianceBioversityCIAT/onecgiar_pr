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
import { env } from 'process';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { MoreThan } from 'typeorm';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly _logger = new Logger(NotificationService.name);

  constructor(
    private readonly _notificationLevelRepository: NotificationLevelRepository,
    private readonly _notificationTypeRepository: NotificationTypeRepository,
    private readonly _notificationRepository: NotificationRepository,
    private readonly _socketManagementService: SocketManagementService,
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _userRepository: UserRepository,
  ) {}

  async emitResultNotification(
    notificationLevel: NotificationLevelEnum,
    notificationType: NotificationTypeEnum,
    userIds: number[],
    emmiterUser: number,
    resultId: number,
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

      const filteredUserIds = userIds.filter(
        (userId) => userId !== emmiterUser,
      );

      for (const userId of filteredUserIds) {
        await this._notificationRepository.save({
          target_user: userId,
          emitter_user: emmiterUser,
          result_id: resultId,
          notification_level: notificationLevelData.notifications_level_id,
          notification_type: notificationTypeData.notifications_type_id,
        });
      }
      const usersOnline = await this._socketManagementService.getActiveUsers();
      const usersOnlineIds = usersOnline.response.map((user: any) => user.id);
      const matchUsers = userIds.filter((userId) =>
        usersOnlineIds.includes(userId),
      );

      const resultData: Notification[] =
        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationRelations(),
          where: {
            result_id: resultId,
            emitter_user: emmiterUser,
            notification_level: notificationLevelData.notifications_level_id,
            notification_type: notificationTypeData.notifications_type_id,
          },
          take: 1,
        });

      const desc =
        notificationType === NotificationTypeEnum.RESULT_SUBMITTED
          ? `The result ${resultData[0].obj_result.result_code} has been submitted`
          : `The result ${resultData[0].obj_result.result_code} has been unsubmitted`;

      const notification: NotificationDto = {
        title: 'New Notification',
        desc,
        result: resultData[0],
      };

      const newSocketNotification =
        await this._socketManagementService.sendNotificationToUsers(
          matchUsers,
          notification,
        );

      return {
        response: newSocketNotification,
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

  async emitApplicationAnouncement(
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
        result_id: null,
        target_user: null,
        read_date: null,
        emitter_user: user.id,
        created_date: new Date(),
        notification_level: notificationLevel.notifications_level_id,
        notification_type: notificationType.notifications_type_id,
      });

      return {
        response: notification,
        message: 'Notification created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: error,
        message: 'An error occurred while creating the notification',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async updateReadStatus(notificationId: number, user: TokenDto) {
    try {
      const notification = await this._notificationRepository.findOne({
        where: {
          notification_id: notificationId,
          target_user: user.id,
        },
      });

      if (!notification) {
        return {
          response: null,
          message: 'Notification not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      notification.read = !notification.read;

      if (notification.read) notification.read_date = new Date();
      if (!notification.read) notification.read_date = null;

      await this._notificationRepository.save(notification);

      return {
        response: notification,
        message: 'Notification updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message:
          'An error occurred while updating the notification read status',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async updateAllReadStatus(user: TokenDto) {
    try {
      const notifications = await this._notificationRepository.find({
        where: {
          target_user: user.id,
          read: false,
        },
      });

      if (!notifications) {
        return {
          response: null,
          message: 'Notifications not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      notifications.forEach((notification) => {
        notification.read = true;
        notification.read_date = new Date();
      });

      await this._notificationRepository.save(notifications);

      return {
        response: notifications,
        message: 'Notifications updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: null,
        message:
          'An error occurred while updating the notifications read status',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllNotifications(user: TokenDto) {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [
        notificationsViewed,
        notificationsPending,
        notificationAnnouncement,
      ] = await Promise.all([
        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationRelations(),
          where: {
            target_user: user.id,
            read: true,
            obj_result: {
              is_active: true,
              obj_result_by_initiatives: { initiative_role_id: 1 },
            },
          },
        }),

        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationRelations(),
          where: {
            target_user: user.id,
            read: false,
            obj_result: {
              is_active: true,
              obj_result_by_initiatives: { initiative_role_id: 1 },
            },
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
            obj_notification_level: {
              notifications_level_id: true,
              type: true,
            },
            obj_notification_type: { notifications_type_id: true, type: true },
          },
          relations: {
            obj_notification_level: true,
            obj_notification_type: true,
          },
          where: {
            obj_notification_level: { type: NotificationLevelEnum.APPLICATION },
            obj_notification_type: { type: NotificationTypeEnum.ANNOUNCEMENT },
            created_date: MoreThan(oneWeekAgo),
          },
        }),
      ]);

      const notifications = {
        notificationsViewed,
        notificationsPending,
        notificationAnnouncement,
      };

      return {
        response: notifications,
        message: 'List of all notifications retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: error,
        message: 'An error occurred while retrieving the notifications',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getPopUpNotifications(user: TokenDto) {
    try {
      const userLastViewed = await this._userRepository.findOne({
        where: { id: user.id },
      });

      const whereConditions: any = {
        target_user: user.id,
        read: false,
        obj_result: {
          is_active: true,
          obj_result_by_initiatives: { initiative_role_id: 1 },
        },
      };

      if (userLastViewed.last_pop_up_viewed) {
        whereConditions.created_date = MoreThan(
          userLastViewed.last_pop_up_viewed,
        );
      }

      const notificationsUpdates = await this._notificationRepository.find({
        select: this.getNotificattionSelect(),
        relations: this.getNotificationRelations(),
        where: whereConditions,
      });

      const shareResultPendings =
        await this._shareResultRequestService.getReceivedResultRequestPopUp(
          user,
        );

      const isError = (shareResultPendings as any)?.response;
      const notifications = isError
        ? notificationsUpdates
        : [
            ...notificationsUpdates,
            ...(Array.isArray(shareResultPendings) ? shareResultPendings : []),
          ];

      return {
        response: notifications,
        message: 'List of all notifications retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(error);
      return {
        response: [],
        message: 'An error occurred while retrieving the notifications',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  private getNotificattionSelect() {
    return {
      obj_notification_level: {
        notifications_level_id: true,
        type: true,
      },
      obj_notification_type: {
        notifications_type_id: true,
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
          initiative_id: true,
          obj_initiative: {
            id: true,
            official_code: true,
          },
        },
        obj_version: {
          id: true,
          phase_name: true,
        },
      },
    };
  }

  private getNotificationRelations() {
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
