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
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { FindOperator, MoreThan } from 'typeorm';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
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
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
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

      if (!notificationLevelData || !notificationTypeData) {
        this._logger.warn(
          `Notification catalog data missing for level ${notificationLevel} or type ${notificationType}.`,
        );
        return {
          response: null,
          message: 'Notification configuration not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const filteredUserIds = userIds.filter(
        (userId) => userId !== emmiterUser,
      );

      const notificationsToPersist = filteredUserIds.map((userId) => ({
        target_user: userId,
        emitter_user: emmiterUser,
        result_id: resultId,
        notification_level: notificationLevelData.notifications_level_id,
        notification_type: notificationTypeData.notifications_type_id,
      }));

      if (notificationsToPersist.length) {
        await this._notificationRepository.save(notificationsToPersist);
      }

      const usersOnline = await this._socketManagementService.getActiveUsers();
      const usersOnlineIds = usersOnline.response.map(
        (user: { userId: number }) => user.userId,
      );
      const matchUsers = filteredUserIds.filter((userId) =>
        usersOnlineIds.includes(userId),
      );

      if (matchUsers.length === 0) {
        this._logger.warn('No online users to notify.');
        return {
          response: null,
          message: 'Notifications stored; no online recipients.',
          status: HttpStatus.CREATED,
        };
      }

      const resultData = await this._notificationRepository.findOne({
        select: this.getNotificattionSelect(),
        relations: this.getNotificationRelations(),
        where: {
          result_id: resultId,
          emitter_user: emmiterUser,
          notification_level: notificationLevelData.notifications_level_id,
          notification_type: notificationTypeData.notifications_type_id,
        },
        order: { created_date: 'DESC' },
      });

      const emitterName = resultData?.obj_emitter_user
        ? `${resultData.obj_emitter_user.first_name ?? ''} ${resultData.obj_emitter_user.last_name ?? ''}`.trim() ||
          resultData.obj_emitter_user.email ||
          null
        : null;

      const desc = this.buildResultNotificationDescription(
        notificationType,
        resultData?.obj_result?.result_code,
        emitterName,
      );

      const notification: NotificationDto = {
        title: 'New Notification',
        desc,
        result: resultData,
        byUser: resultData?.obj_emitter_user
          ? {
              id: resultData.obj_emitter_user.id ?? null,
              name: emitterName,
              email: resultData.obj_emitter_user.email ?? null,
            }
          : null,
      };

      const newSocketNotification =
        await this._socketManagementService.sendNotificationToUsers(
          matchUsers.map(String),
          notification,
        );

      return {
        response: newSocketNotification,
        message: 'Notification created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      this._logger.error('Error emitting result notification:', error);
      return {
        response: null,
        message: 'Failed to create notification',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getRecentResultActivity(user: TokenDto, limit: number) {
    try {
      const level = await this._notificationLevelRepository.findOne({
        where: { type: NotificationLevelEnum.RESULT },
      });

      if (!level) {
        return {
          response: [],
          message: 'Result notification level not configured',
          status: HttpStatus.OK,
        };
      }

      const userInitiatives = await this._userRepository.InitiativeByUser(
        user.id,
      );
      const hasInitiativeRoles =
        Array.isArray(userInitiatives) && userInitiatives.length > 0;

      let notifications: Notification[] = [];

      if (hasInitiativeRoles) {
        notifications = await this.buildResultNotificationBaseQuery(
          level.notifications_level_id,
        )
          .andWhere('notification.target_user = :userId', { userId: user.id })
          .orderBy('notification.created_date', 'DESC')
          .take(limit)
          .getMany();
      } else {
        notifications = await this.getGlobalResultNotifications(
          level.notifications_level_id,
          limit,
        );
      }

      const missingOwnerResultIds = notifications
        .filter(
          (notification) =>
            !notification.obj_result?.obj_result_by_initiatives?.some(
              (initiativeRelation) =>
                initiativeRelation?.initiative_role_id === 1 &&
                initiativeRelation?.is_active,
            ),
        )
        .map((notification) =>
          notification.result_id ? Number(notification.result_id) : null,
        )
        .filter((id): id is number => Boolean(id));

      const ownerInitiativesFallback = new Map<
        number,
        {
          id: number;
          official_code: string | null;
          initiative_name: string | null;
        }
      >();

      if (missingOwnerResultIds.length) {
        const uniqueResultIds = [...new Set(missingOwnerResultIds)];
        const ownerInitiatives = await Promise.all(
          uniqueResultIds.map((resultId) =>
            this._resultByInitiativesRepository.getOwnerInitiativeByResult(
              resultId,
            ),
          ),
        );

        ownerInitiatives.forEach((owner, index) => {
          if (owner) {
            ownerInitiativesFallback.set(uniqueResultIds[index], {
              id: owner.id,
              official_code: owner.official_code ?? null,
              initiative_name: owner.initiative_name ?? null,
            });
          }
        });
      }

      const response = notifications.map((notification) => {
        const ownerInitiative =
          notification.obj_result?.obj_result_by_initiatives?.find(
            (initiativeRelation) =>
              initiativeRelation?.initiative_role_id === 1,
          );

        const initiative = ownerInitiative?.obj_initiative;
        const resultIdNumber = notification.result_id
          ? Number(notification.result_id)
          : null;
        const fallback =
          resultIdNumber !== null
            ? ownerInitiativesFallback.get(resultIdNumber)
            : undefined;
        const notificationType = notification.obj_notification_type?.type as
          | NotificationTypeEnum
          | undefined;

        const emitterName = notification.obj_emitter_user
          ? `${notification.obj_emitter_user.first_name ?? ''} ${notification.obj_emitter_user.last_name ?? ''}`.trim() ||
            null
          : null;

        return {
          id: Number(notification.notification_id),
          resultId: resultIdNumber,
          resultCode: notification.obj_result?.result_code ?? null,
          resultTitle: notification.obj_result?.title ?? null,
          initiativeId: ownerInitiative?.initiative_id ?? fallback?.id ?? null,
          initiativeName: initiative?.name ?? fallback?.initiative_name ?? null,
          initiativeOfficialCode:
            initiative?.official_code ?? fallback?.official_code ?? null,
          eventType: notificationType ?? null,
          message: this.buildResultNotificationDescription(
            notificationType,
            notification.obj_result?.result_code,
            emitterName,
          ),
          emitterId: notification.emitter_user ?? null,
          emitterName,
          createdAt: notification.created_date ?? null,
        };
      });

      return {
        response,
        message: 'Recent result notifications retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error('Error fetching recent result activity', error);
      return {
        response: [],
        message: 'Failed to fetch recent result activity',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  private buildResultNotificationBaseQuery(levelId: number) {
    return this._notificationRepository
      .createQueryBuilder('notification')
      .innerJoinAndSelect('notification.obj_result', 'result')
      .innerJoin(
        'result.obj_version',
        'version',
        'version.is_active = :versionActive AND version.status = :versionStatus AND version.app_module_id = :appModuleId',
        {
          versionActive: true,
          versionStatus: true,
          appModuleId: AppModuleIdEnum.REPORTING,
        },
      )
      .leftJoinAndSelect(
        'result.obj_result_by_initiatives',
        'resultInitiative',
        'resultInitiative.initiative_role_id = 1 AND resultInitiative.is_active = true',
      )
      .leftJoinAndSelect('resultInitiative.obj_initiative', 'initiative')
      .leftJoinAndSelect('notification.obj_notification_type', 'type')
      .leftJoinAndSelect('notification.obj_emitter_user', 'emitter')
      .where('notification.notification_level = :levelId', {
        levelId,
      });
  }

  private async getGlobalResultNotifications(
    levelId: number,
    limit: number,
  ): Promise<Notification[]> {
    const latestNotifications = await this._notificationRepository
      .createQueryBuilder('notification')
      .select('MAX(notification.notification_id)', 'notification_id')
      .addSelect('notification.result_id', 'result_id')
      .where('notification.notification_level = :levelId', { levelId })
      .andWhere('notification.result_id IS NOT NULL')
      .groupBy('notification.result_id')
      .orderBy('MAX(notification.created_date)', 'DESC')
      .limit(limit)
      .getRawMany<{ notification_id: string | number }>();

    const notificationIds = latestNotifications
      .map((row) => Number(row.notification_id))
      .filter((id) => !Number.isNaN(id));

    if (!notificationIds.length) {
      return [];
    }

    return this.buildResultNotificationBaseQuery(levelId)
      .andWhere('notification.notification_id IN (:...notificationIds)', {
        notificationIds,
      })
      .orderBy('notification.created_date', 'DESC')
      .getMany();
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

      const whereConditions: WhereConditions = {
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

  private buildResultNotificationDescription(
    notificationType: NotificationTypeEnum | undefined,
    resultCode?: number,
    userName?: string,
  ): string {
    const codeText = resultCode ? `result ${resultCode}` : 'the result';
    switch (notificationType) {
      case NotificationTypeEnum.RESULT_CREATED:
        return `The ${codeText} has been created by ${userName ?? 'a user'}`;
      case NotificationTypeEnum.RESULT_SUBMITTED:
        return `The ${codeText} has been submitted by ${userName ?? 'a user'}`;
      case NotificationTypeEnum.RESULT_UNSUBMITTED:
        return `The ${codeText} has been unsubmitted by ${userName ?? 'a user'}`;
      case NotificationTypeEnum.RESULT_QUALITY_ASSESED:
        return `The ${codeText} has been quality assessed by ${userName ?? 'a user'}`;
      default:
        return `There is a new update on ${codeText}`;
    }
  }
}

interface WhereConditions {
  target_user: number;
  read: boolean;
  obj_result: {
    is_active: boolean;
    obj_result_by_initiatives: {
      initiative_role_id: number;
    };
  };
  created_date?: FindOperator<Date>;
}
