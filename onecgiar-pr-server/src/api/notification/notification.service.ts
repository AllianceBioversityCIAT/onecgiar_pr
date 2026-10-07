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
import { FindOperator, In, MoreThan, Not } from 'typeorm';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { Notification } from './entities/notification.entity';
import {
  applyKeysetCursor,
  KeysetFields,
  KEYSET_PAGE_SIZE,
  mergeKeysetLists,
} from '../../shared/utils/keyset-cursor.util';
import { BILATERAL_DECISION_NOTICE_COPY } from './constants/bilateral-decision-notice.constants';

/**
 * `PSR-T-7`/`PSR-DD-7` — the 3 Center-notice types (`emitCenterNotice` in
 * `primary-program-request.service.ts`). Excluded from the role-1-joined queries below and read
 * back only through {@link NotificationService.findCenterNoticeNotifications}'s ownerless path,
 * so a notice for an ownerless (declined/sent-back) result is never silently dropped, and one for
 * an already-owned result (accepted) is never merged in twice.
 */
const CENTER_NOTICE_TYPES = [
  NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED,
  NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED,
  NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_MOVED,
];

/**
 * @akili-spec notifications/inbox-paginated-load
 * PAGE-T-3 — keyset ordering for `notification` rows: `(created_date DESC, notification_id
 * DESC)`. Shared by every history (viewed) query in `getAllNotifications` so cursors stay
 * consistent across the 3 merged sources.
 */
const NOTIFICATION_KEYSET_FIELDS: KeysetFields = {
  dateField: 'created_date',
  idField: 'notification_id',
};

/** `getAllNotifications` scope/cursor options (PAGE-R-1, R-2, R-3, R-6, R-7). */
export interface GetAllNotificationsOptions {
  /** Phase (`result.version_id`) to scope result-linked rows to; absent -> all phases. */
  versionId?: number;
  /** `pending` -> pending set only; `history` -> history (viewed) page only; absent -> legacy (both). */
  scope?: 'pending' | 'history';
  /** Opaque keyset cursor for the next history page (PAGE-DD-2). */
  cursor?: string;
  /** BRS-T-3: history page size, integer 1..200 (validated by the controller); absent -> `KEYSET_PAGE_SIZE`. Never applies to pending. */
  limit?: number;
}

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

  /**
   * @param renderedText Pre-composed message **suffix** (everything after the result identity),
   *   persisted on `notification.text`. Only needed by types whose copy cannot be derived from
   *   the result alone — P2-3214's tagged centre / bilateral project, where one result carries
   *   several centres and a recipient may belong to more than one, so the read path has no way
   *   to tell which link the row is about. Storing only the suffix keeps it usable by the client,
   *   which composes `[prefix, identity, suffix]` on its own. Every other type leaves it
   *   undefined and keeps building its copy at read time.
   */
  async emitResultNotification(
    notificationLevel: NotificationLevelEnum,
    notificationType: NotificationTypeEnum,
    userIds: number[],
    emmiterUser: number,
    resultId: number,
    renderedText?: string,
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
        ...(renderedText ? { text: renderedText } : {}),
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
        resultData?.obj_result?.title,
        this.resolveOwnerProgramCode(resultData),
        renderedText,
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

  /**
   * `APF-T-3`/`design.md` §6.4 "Write path" — the in-app half of a terminal bilateral AI job
   * notification. Written directly (unlike `emitResultNotification`, which requires a result to
   * hang the row on and drops every recipient equal to the emitter — exactly the uploader this
   * row is addressed to): `result_id` stays `NULL`, `target_user` is the job's owner, and `text`
   * is the fully composed outcome line the caller built (`BilateralAiNotificationsService`).
   * `notification_level` is `RESULT` — this is a targeted, per-user row like the rest of that
   * level, not a broadcast `ANNOUNCEMENT` (`emitApplicationAnouncement`, `target_user: null`).
   *
   * Never throws: a notification failure must never fail the job it reports on (`APF-R-4`).
   */
  async emitBilateralAiJobNotification(
    targetUserId: number,
    text: string,
  ): Promise<Notification | null> {
    try {
      const notificationLevelData =
        await this._notificationLevelRepository.findOne({
          where: { type: NotificationLevelEnum.RESULT },
        });
      const notificationTypeData =
        await this._notificationTypeRepository.findOne({
          where: { type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED },
        });

      if (!notificationLevelData || !notificationTypeData) {
        this._logger.warn(
          'Notification catalog data missing for BILATERAL_AI_JOB_FINISHED.',
        );
        return null;
      }

      return await this._notificationRepository.save({
        target_user: targetUserId,
        emitter_user: null,
        result_id: null,
        text,
        read: false,
        read_date: null,
        notification_level: notificationLevelData.notifications_level_id,
        notification_type: notificationTypeData.notifications_type_id,
      });
    } catch (error) {
      this._logger.error(
        'Error emitting bilateral AI job notification:',
        error,
      );
      return null;
    }
  }

  /**
   * `design.md` §6.4 "Read path" — a bilateral AI job notification carries no result
   * (`result_id NULL`), so the `innerJoin`-shaped queries in `getAllNotifications`,
   * `getPopUpNotifications` and `getRecentResultActivity` (all filtered on `obj_result` /
   * `obj_result_by_initiatives`) never return it — writing the row is not enough to satisfy
   * `APF-R-4`'s "visible in the bell" acceptance. This is the LEFT-JOIN-shaped counterpart: no
   * `obj_result` requirement at all, scoped only to the recipient (and, where the caller tracks
   * one, a `read` state or a "since" timestamp).
   */
  private async findBilateralAiJobFinishedNotifications(
    userId: number,
    options: {
      read?: boolean;
      after?: Date;
      /** PAGE-T-3: opaque keyset cursor — only meaningful when `paged` is true. */
      cursor?: string;
      /**
       * PAGE-T-3: when true, fetches `KEYSET_PAGE_SIZE + 1` rows ordered
       * `(created_date DESC, notification_id DESC)` for merging into a history page
       * (`mergeKeysetLists`) instead of returning every match. Stays unfiltered by phase
       * (P-7, PAGE-OQ-5) — a job-finished row has no linked result to scope on.
       */
      paged?: boolean;
      /** BRS-T-3: history page size when `paged`; absent -> `KEYSET_PAGE_SIZE`. */
      pageSize?: number;
    } = {},
  ): Promise<Notification[]> {
    const where = {
      target_user: userId,
      ...(options.read !== undefined ? { read: options.read } : {}),
      ...(options.after ? { created_date: MoreThan(options.after) } : {}),
      obj_notification_type: {
        type: NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED,
      },
    };
    return this._notificationRepository.find({
      select: this.getNotificattionSelect(),
      relations: this.getNotificationRelations(),
      where: options.paged
        ? applyKeysetCursor(where, options.cursor, NOTIFICATION_KEYSET_FIELDS)
        : where,
      ...(options.paged
        ? {
            take: (options.pageSize ?? KEYSET_PAGE_SIZE) + 1,
            order: { created_date: 'DESC', notification_id: 'DESC' },
          }
        : {}),
    });
  }

  /**
   * `PSR-T-7`/`PSR-DD-7` — the Center-notice read path (`design.md` §6.1, §2.2): the 3 new types
   * are read WITHOUT the `obj_result_by_initiatives: { initiative_role_id: 1 }` condition the
   * queries below use (`P-6`), so a "declined"/"moved" notice is still visible even though its
   * result has no role-1 owner. Mirrors `findBilateralAiJobFinishedNotifications`'s shape:
   * scoped to the recipient (`target_user`) and to active notifications only (`obj_result.
   * is_active`), with the same `read`/`after` narrowing the callers already use.
   */
  private async findCenterNoticeNotifications(
    userId: number,
    options: {
      read?: boolean;
      after?: Date;
      /** PAGE-T-3: phase (`result.version_id`) to scope to; absent -> all phases (PAGE-R-1). */
      versionId?: number;
      /** PAGE-T-3: opaque keyset cursor — only meaningful when `paged` is true. */
      cursor?: string;
      /** PAGE-T-3: see {@link findBilateralAiJobFinishedNotifications}'s `paged`. */
      paged?: boolean;
      /** BRS-T-3: history page size when `paged`; absent -> `KEYSET_PAGE_SIZE`. */
      pageSize?: number;
    } = {},
  ): Promise<Notification[]> {
    const where = {
      target_user: userId,
      ...(options.read !== undefined ? { read: options.read } : {}),
      ...(options.after ? { created_date: MoreThan(options.after) } : {}),
      obj_result: {
        is_active: true,
        ...(options.versionId !== undefined
          ? { version_id: options.versionId }
          : {}),
      },
      obj_notification_type: { type: In(CENTER_NOTICE_TYPES) },
    };
    return this._notificationRepository.find({
      select: this.getNotificattionSelect(),
      relations: this.getNotificationRelations(),
      where: options.paged
        ? applyKeysetCursor(where, options.cursor, NOTIFICATION_KEYSET_FIELDS)
        : where,
      ...(options.paged
        ? {
            take: (options.pageSize ?? KEYSET_PAGE_SIZE) + 1,
            order: { created_date: 'DESC', notification_id: 'DESC' },
          }
        : {}),
    });
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

      // `design.md` §6.4 read-path branch: a job notification has no result, so it cannot come
      // back from either query above — merge it in from the dedicated per-recipient lookup, then
      // re-sort/re-cap so the feed stays in recency order regardless of which query it came from.
      const jobFinishedNotifications =
        await this.findBilateralAiJobFinishedNotifications(user.id);
      if (jobFinishedNotifications.length) {
        notifications = [...notifications, ...jobFinishedNotifications]
          .sort(
            (a, b) =>
              (b.created_date?.getTime() ?? 0) -
              (a.created_date?.getTime() ?? 0),
          )
          .slice(0, limit);
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

        // NOTIF-T-12 (rework attempt 2, issue 2): this was `undefined` — the only caller of
        // `buildResultNotificationDescription` that never resolved a program code, which
        // `RESULT_BILATERAL_PROJECT_TAGGED`'s bare-label branch needs. The owning initiative's
        // `official_code` is already computed a few lines below for `initiativeOfficialCode`
        // (from the same `initiative_role_id === 1` relation, with the same repository fallback);
        // reuse it here instead of resolving it a second way.
        const ownerProgramCode =
          initiative?.official_code ?? fallback?.official_code ?? null;

        return {
          id: Number(notification.notification_id),
          resultId: resultIdNumber,
          resultCode: notification.obj_result?.result_code ?? null,
          resultTitle: notification.obj_result?.title ?? null,
          phase: notification.obj_result?.version_id ?? null,
          initiativeId: ownerInitiative?.initiative_id ?? fallback?.id ?? null,
          initiativeName: initiative?.name ?? fallback?.initiative_name ?? null,
          initiativeOfficialCode: ownerProgramCode,
          eventType: notificationType ?? null,
          message: this.buildResultNotificationDescription(
            notificationType,
            notification.obj_result?.result_code,
            emitterName,
            notification.obj_result?.title,
            ownerProgramCode ?? undefined,
            notification.text,
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
      .where(
        'notification.notification_level = :levelId AND result.is_active = :resultActive',
        {
          levelId,
          resultActive: true,
        },
      );
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

  /**
   * @akili-spec notifications/inbox-paginated-load
   * PAGE-T-3 — phase scoping (`options.versionId`), pending/history split (`options.scope`) and
   * keyset history pagination (`options.cursor`) for the Updates feed (design.md §5, §4.1).
   *
   * - `versionId` reaches the result-scoped and Center-notice where-builders (PAGE-R-1); the
   *   AI-job finder stays unfiltered (PAGE-P-7, PAGE-OQ-5 — phase-less, always shown).
   * - `scope=pending` skips every history query entirely (not "run and discard" — PAGE-R-2);
   *   `scope=history` skips every pending query the same way.
   * - The 3 history (viewed) sources are each fetched `pageSize + 1` rows at a time and
   *   merged/sorted/cut to `pageSize` by `mergeKeysetLists` (PAGE-R-3). `pageSize` is
   *   `options.limit` (BRS-T-3, 1..200) or `KEYSET_PAGE_SIZE` (200) when absent; pending is never limited.
   * - No inner `await` — every element of the `Promise.all` array is a promise started
   *   synchronously when the array literal is evaluated; `Promise.all` is what waits (PAGE-R-7).
   */
  async getAllNotifications(
    user: TokenDto,
    options: GetAllNotificationsOptions = {},
  ) {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { versionId, scope, cursor, limit } = options;
      const pageSize = limit ?? KEYSET_PAGE_SIZE;
      const runPending = scope !== 'history';
      const runHistory = scope !== 'pending';

      const resultScopeWhere = () => ({
        is_active: true,
        obj_result_by_initiatives: { initiative_role_id: 1 },
        ...(versionId !== undefined ? { version_id: versionId } : {}),
      });

      const [
        viewedResultScoped,
        notificationsPending,
        notificationAnnouncement,
        jobFinishedViewed,
        jobFinishedPending,
        centerNoticeViewed,
        centerNoticePending,
      ] = await Promise.all([
        runHistory
          ? this._notificationRepository.find({
              select: this.getNotificattionSelect(),
              relations: this.getNotificationRelations(),
              where: applyKeysetCursor(
                {
                  target_user: user.id,
                  read: true,
                  obj_result: resultScopeWhere(),
                  // `PSR-DD-7`: the Center-notice types are read back only through
                  // `findCenterNoticeNotifications`'s ownerless path below - excluded here so an
                  // already-owned (accepted) notice is never merged in by both queries.
                  obj_notification_type: {
                    type: Not(In(CENTER_NOTICE_TYPES)),
                  },
                },
                cursor,
                NOTIFICATION_KEYSET_FIELDS,
              ),
              take: pageSize + 1,
              order: { created_date: 'DESC', notification_id: 'DESC' },
            })
          : Promise.resolve([]),

        runPending
          ? this._notificationRepository.find({
              select: this.getNotificattionSelect(),
              relations: this.getNotificationRelations(),
              where: {
                target_user: user.id,
                read: false,
                obj_result: resultScopeWhere(),
                obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
              },
            })
          : Promise.resolve([]),

        runPending
          ? this._notificationRepository.find({
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
                obj_notification_type: {
                  notifications_type_id: true,
                  type: true,
                },
              },
              relations: {
                obj_notification_level: true,
                obj_notification_type: true,
              },
              where: {
                obj_notification_level: {
                  type: NotificationLevelEnum.APPLICATION,
                },
                obj_notification_type: {
                  type: NotificationTypeEnum.ANNOUNCEMENT,
                },
                created_date: MoreThan(oneWeekAgo),
              },
            })
          : Promise.resolve([]),

        // `design.md` §6.4 read-path branch — a bilateral AI job notification has no result, so
        // it can never satisfy the `obj_result` condition above; fetched separately and merged in.
        runHistory
          ? this.findBilateralAiJobFinishedNotifications(user.id, {
              read: true,
              cursor,
              paged: true,
              pageSize,
            })
          : Promise.resolve([]),
        runPending
          ? this.findBilateralAiJobFinishedNotifications(user.id, {
              read: false,
            })
          : Promise.resolve([]),

        // `PSR-T-7`/`PSR-DD-7` — same reasoning: an ownerless result's Center notice can never
        // satisfy the `initiative_role_id: 1` condition above; fetched separately and merged in.
        runHistory
          ? this.findCenterNoticeNotifications(user.id, {
              read: true,
              versionId,
              cursor,
              paged: true,
              pageSize,
            })
          : Promise.resolve([]),
        runPending
          ? this.findCenterNoticeNotifications(user.id, {
              read: false,
              versionId,
            })
          : Promise.resolve([]),
      ]);

      const viewedPage = runHistory
        ? mergeKeysetLists(
            [viewedResultScoped, jobFinishedViewed, centerNoticeViewed],
            NOTIFICATION_KEYSET_FIELDS,
            pageSize,
          )
        : { rows: [] as Notification[], hasMore: false, nextCursor: null };

      const notifications = {
        notificationsViewed: this.mapNotificationResultFields(viewedPage.rows),
        notificationsPending: [
          ...this.mapNotificationResultFields(notificationsPending),
          ...jobFinishedPending,
          ...this.mapNotificationResultFields(centerNoticePending),
        ],
        notificationAnnouncement,
        viewedMeta: {
          hasMore: viewedPage.hasMore,
          nextCursor: viewedPage.nextCursor,
        },
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
        // `PSR-DD-7`: excluded here — read back only through
        // `findCenterNoticeNotifications`'s ownerless path below.
        obj_notification_type: { type: Not(In(CENTER_NOTICE_TYPES)) },
      };

      if (userLastViewed.last_pop_up_viewed) {
        whereConditions.created_date = MoreThan(
          userLastViewed.last_pop_up_viewed,
        );
      }

      const notificationsUpdates = this.mapNotificationResultFields(
        await this._notificationRepository.find({
          select: this.getNotificattionSelect(),
          relations: this.getNotificationRelations(),
          where: whereConditions,
        }),
      );

      // `design.md` §6.4 read-path branch — same reasoning as `getAllNotifications`: a job
      // notification has no result, so `whereConditions.obj_result` above can never match it.
      const jobFinishedUpdates =
        await this.findBilateralAiJobFinishedNotifications(user.id, {
          read: false,
          ...(userLastViewed.last_pop_up_viewed
            ? { after: userLastViewed.last_pop_up_viewed }
            : {}),
        });

      // `PSR-T-7`/`PSR-DD-7` — same reasoning as `jobFinishedUpdates`: an ownerless result's
      // Center notice can never satisfy `whereConditions.obj_result` above.
      const centerNoticeUpdates = this.mapNotificationResultFields(
        await this.findCenterNoticeNotifications(user.id, {
          read: false,
          ...(userLastViewed.last_pop_up_viewed
            ? { after: userLastViewed.last_pop_up_viewed }
            : {}),
        }),
      );

      const shareResultPendings =
        await this._shareResultRequestService.getReceivedResultRequestPopUp(
          user,
        );

      const isError = (shareResultPendings as any)?.response;
      const notifications = isError
        ? [
            ...notificationsUpdates,
            ...jobFinishedUpdates,
            ...centerNoticeUpdates,
          ]
        : [
            ...notificationsUpdates,
            ...jobFinishedUpdates,
            ...centerNoticeUpdates,
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

  /**
   * NOTIF-T-8 rework: the widened `obj_result` select/relations (`source`,
   * `obj_result_by_project.obj_clarisa_project`) is copied from the Requests-side query shape, but
   * `share-result-request.service.ts::getRequest()`'s POST-PROCESSING mapper was not — this mirrors
   * that mapper for the Updates-tab (`getAllNotifications`/`getPopUpNotifications`) result-scoped
   * rows. No-op when `obj_result` is null (bilateral-AI-job notifications always have
   * `result_id: null`, so `obj_result` is never populated for them).
   */
  private mapNotificationResultFields<T extends { obj_result?: any }>(
    notifications: T[],
  ): T[] {
    return (notifications ?? []).map((notification: any) => {
      if (notification?.obj_result && !Array.isArray(notification.obj_result)) {
        notification.obj_result = {
          ...notification.obj_result,
          source_name:
            notification.obj_result.source === 'Result'
              ? 'W1/W2'
              : 'W3/Bilaterals',
          obj_result_by_project: (
            notification.obj_result.obj_result_by_project ?? []
          ).filter((link: any) => link.is_active),
          // `RSF-DD-3`: the relation `where` stays as is (it is also the existence condition, so
          // adding `is_active` there would hide every notification of an ownerless result); the
          // inactive rows are dropped here, on the loaded rows. An ownerless result keeps its
          // notification, with an empty list.
          ...(Array.isArray(notification.obj_result.obj_result_by_initiatives)
            ? {
                obj_result_by_initiatives:
                  notification.obj_result.obj_result_by_initiatives.filter(
                    (initiative: any) => initiative?.is_active,
                  ),
              }
            : {}),
        };
      }
      return notification;
    });
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
        source: true,
        obj_result_by_initiatives: {
          initiative_id: true,
          // `RSF-DD-3`: selected so the loaded rows can be filtered after loading
          // (`mapNotificationResultFields`) and so `resolveOwnerProgramCode` can tell the owner.
          initiative_role_id: true,
          is_active: true,
          obj_initiative: {
            id: true,
            official_code: true,
          },
        },
        obj_version: {
          id: true,
          phase_name: true,
        },
        obj_result_type: {
          id: true,
          name: true,
        },
        obj_result_level: {
          id: true,
          name: true,
        },
        obj_result_by_project: {
          id: true,
          project_id: true,
          is_lead: true,
          is_active: true,
          obj_clarisa_project: {
            id: true,
            shortName: true,
            fullName: true,
          },
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
        obj_result_type: true,
        obj_result_level: true,
        obj_result_by_project: {
          obj_clarisa_project: true,
        },
      },
    };
  }

  private buildResultNotificationDescription(
    notificationType: NotificationTypeEnum | undefined,
    resultCode?: number,
    userName?: string,
    resultTitle?: string,
    programCode?: string,
    storedText?: string,
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
      case NotificationTypeEnum.BILATERAL_RESULT_APPROVED:
        return this.buildBilateralReviewDescription(
          '✅',
          'Approved',
          resultCode,
          resultTitle,
          programCode,
          storedText,
        );
      case NotificationTypeEnum.BILATERAL_RESULT_REJECTED:
        return this.buildBilateralReviewDescription(
          '❌',
          'Rejected',
          resultCode,
          resultTitle,
          programCode,
          storedText,
        );
      // NOTIF-T-12 (rework attempt 2): `RESULT_BILATERAL_PROJECT_TAGGED`'s `notification.text` is
      // NOT always a composed sentence. The AC1/AC2 direct-tag flow now stores a bare project
      // label (see `result-tagged-notification.service.ts`'s `emitFor()`, no `leadIn`) —
      // composing `"The result <code> - <title> <label>"` for that shape reads as garbled, missing
      // framing entirely. Only the BCT-T-4 submission flow (`leadIn` passed) and any pre-fix/legacy
      // row still carry a whole composed sentence, which the shared fallback below handles
      // correctly. Detect the shape with the same telltale substrings the client uses
      // (`isComposedTaggedText` — keep them in sync with `notification-type.constants.ts`'s twin;
      // `RESULT_CENTER_TAGGED` below joins this same detection, WCT-T-1).
      //
      // WPT-T-2 (`w1w2-project-tagged`, design §7.3/§9, DD-2): a bare row is no longer always a
      // legacy label — WPT-T-1 now stores an enriched `"<project code> (<Center label>)"` shape
      // (WPT-R-1). `parseTaggedProjectLabel` splits the two apart; a legacy bare row (no trailing
      // `(…)`) still yields a null `centerLabel`, in which case the `from your center (...)`
      // clause is omitted entirely (WPT-R-3). The composed/empty check above still runs FIRST, so
      // a BCT row's own trailing `(ABC).` is never misparsed as this shape (WPT-R-4).
      case NotificationTypeEnum.RESULT_BILATERAL_PROJECT_TAGGED: {
        const suffix = storedText?.trim();
        // BPT-T-2 (`bilateral-project-tagged`, design §7.2, §9, DD-3): the Center-reported shape
        // (BCT project targets, after this change) is self-describing — `text` already carries
        // the reporter, project code and owner, end-anchored — so it's checked FIRST, before the
        // composed/bare detection below. A match never falls into `isComposedTaggedText`, because
        // old composed rows end in `. Click to see the result.` and say "of your center", not
        // "from your center (...)" (BPT-R-4).
        const centerReported = suffix
          ? this.parseCenterReportedProjectText(suffix)
          : null;
        if (centerReported) {
          const identity = [resultCode, resultTitle]
            .filter(Boolean)
            .join(' - ');
          return `${centerReported.reporter} has tagged the bilateral project ${centerReported.code} from your center (${centerReported.owner}) to result${identity ? ` ${identity}` : ''}`;
        }
        if (suffix && !this.isComposedTaggedText(suffix)) {
          const { code, centerLabel } = this.parseTaggedProjectLabel(suffix);
          const identity = [resultCode, resultTitle]
            .filter(Boolean)
            .join(' - ');
          const centerClause = centerLabel
            ? ` from your center (${centerLabel})`
            : ' from your center';
          return `${userName ?? 'A user'} from ${programCode ?? 'a Science Program'} has tagged the bilateral project ${code}${centerClause} to result${identity ? ` ${identity}` : ''}`;
        }
        return this.buildTaggedSuffixDescription(
          codeText,
          resultCode,
          resultTitle,
          suffix,
        );
      }
      // WCT-T-1 (design.md §7.1, requirements.md WCT-R-5 push clause, WCT-R-8): joins the same
      // bare-vs-composed shape detection as RESULT_BILATERAL_PROJECT_TAGGED above, because the
      // direct-tag flow (W1/W2, IPSR, SP review) now stores a bare Center acronym/code (no
      // `leadIn`) instead of the whole sentence — composing `"The result <code> - <title> ABC"`
      // from the shared suffix fallback below would garble it. Only the BCT-T-4 submission flow
      // (`leadIn` passed) and any pre-fix/legacy row still carry a whole composed sentence, which
      // the shared fallback (identical to RESULT_CONTRIBUTION_ACCEPTED/DECLINED's) handles.
      case NotificationTypeEnum.RESULT_CENTER_TAGGED: {
        const suffix = storedText?.trim();
        if (suffix && !this.isComposedTaggedText(suffix)) {
          const identity = [resultCode, resultTitle]
            .filter(Boolean)
            .join(' - ');
          return `${programCode ?? 'a Science Program'} has tagged your CG Center as a contributor (${suffix}) to result${identity ? ` ${identity}` : ''}`;
        }
        return this.buildTaggedSuffixDescription(
          codeText,
          resultCode,
          resultTitle,
          suffix,
        );
      }
      // P2-3188 joins the same shape: the varying half is which Science Program decided, which
      // cannot be derived when the notification is read.
      case NotificationTypeEnum.RESULT_CONTRIBUTION_ACCEPTED:
      case NotificationTypeEnum.RESULT_CONTRIBUTION_DECLINED: {
        // `notification.text` holds only the part that varies — everything after the result
        // identity — because the client composes `[prefix, identity, suffix]` itself
        // (`buildResultNotificationText`) and storing the whole sentence would repeat the
        // code and title. Rows with no text (written by hand, or before this shipped) fall
        // through to the generic line rather than rendering half a sentence.
        return this.buildTaggedSuffixDescription(
          codeText,
          resultCode,
          resultTitle,
          storedText?.trim(),
        );
      }
      // `PSR-T-7`/`PSR-R-14` (rework attempt 2, Reviewer finding 1) — Center notices
      // (accepted/declined/moved). Unlike `RESULT_CENTER_TAGGED` et al., `notification.text`
      // here is NOT a suffix that completes a sentence started by "The result <id>" — it is a
      // WHOLE sentence whose subject is the SP: "SP09 accepted to be the primary Science
      // Program of this result. Click to see the result." (`emitCenterNotice`,
      // `primary-program-request.service.ts`). Splicing the result identity in place of "this
      // result" keeps the SP as subject and names the result exactly once, matching design.md
      // §6.1's wording ("`{sp}` accepted ... of result …"). No identity to splice in (no
      // resultCode/resultTitle) → the stored sentence is already a complete, standalone line,
      // same reasoning as `BILATERAL_AI_JOB_FINISHED` below.
      case NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_ACCEPTED:
      case NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_DECLINED:
      case NotificationTypeEnum.PRIMARY_PROGRAM_REQUEST_MOVED: {
        const suffix = storedText?.trim();
        if (!suffix) return `There is a new update on ${codeText}`;
        const identity = [resultCode, resultTitle].filter(Boolean).join(' - ');
        return identity
          ? suffix.replace('of this result', `of result ${identity}`)
          : suffix;
      }
      case NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED:
        // No result to build an identity from (`result_id` is always `NULL` for this type,
        // `design.md` §6.4) — `notification.text` is already the complete, standalone sentence
        // `BilateralAiNotificationsService` composed (outcome + mix + duration + deep link).
        return (
          storedText?.trim() || 'Your AI-assisted processing job finished.'
        );
      default:
        return `There is a new update on ${codeText}`;
    }
  }

  /**
   * Shared fallback for `RESULT_CENTER_TAGGED`, `RESULT_CONTRIBUTION_ACCEPTED/DECLINED`, and
   * `RESULT_BILATERAL_PROJECT_TAGGED` rows whose `text` is a legacy/BCT-T-4 composed sentence
   * (or empty): `notification.text` holds only the part that varies, the client composes
   * `[prefix, identity, suffix]` itself. Extracted so `RESULT_BILATERAL_PROJECT_TAGGED` can reuse
   * it for its non-bare-label branch without duplicating the identity/empty logic.
   */
  private buildTaggedSuffixDescription(
    codeText: string,
    resultCode?: number,
    resultTitle?: string,
    suffix?: string,
  ): string {
    if (!suffix) return `There is a new update on ${codeText}`;
    const identity = [resultCode, resultTitle].filter(Boolean).join(' - ');
    return identity
      ? `The result ${identity} ${suffix}`
      : `The result ${suffix}`;
  }

  /**
   * Server-side twin of `notification-type.constants.ts`'s `isComposedTaggedText` — both detect
   * the same literal server template from `result-tagged-notification.service.ts`'s `emitFor()`:
   * `"${leadIn} has tagged the ${label}. Click to see the result."`. Shared by
   * `RESULT_BILATERAL_PROJECT_TAGGED` and `RESULT_CENTER_TAGGED` (type-neutral name, WCT-T-1).
   * Keep the two in sync if that template ever changes.
   */
  private isComposedTaggedText(text: string): boolean {
    return (
      text.includes(' has tagged the ') ||
      text.trim().endsWith('Click to see the result.')
    );
  }

  /**
   * WPT-T-2 (`w1w2-project-tagged`, design §7.3/§9, DD-2): splits an enriched bare
   * `RESULT_BILATERAL_PROJECT_TAGGED` row's stored text (`"<project code> (<Center label>)"`,
   * WPT-R-1) into its project code and Center label, anchored on the **last trailing** `(…)`
   * with non-empty contents. A legacy bare row (no trailing parenthetical, WPT-R-3) yields a null
   * `centerLabel`. Only called once the caller has already ruled out a composed or empty text
   * (`isComposedTaggedText`) — never apply this to a BCT/legacy composed sentence (its own
   * trailing `(ABC).` must NOT be parsed, WPT-R-4).
   *
   * `[^()]+` (not `.+`) inside the parens is what makes "last trailing" correct for a project
   * name that itself contains parentheses, e.g. `"Seeds (Phase 2) project (ABC)"` → code
   * `"Seeds (Phase 2) project"`, label `"ABC"`.
   *
   * DR-1 (accepted risk): a legacy bare row whose code came from the `fullName` fallback and
   * itself ends in `"(…)"` is misparsed as code+label — `short_name` is NOT NULL server-side, so
   * this only happens when `short_name` is empty.
   *
   * Keep in sync with the client twin:
   * `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts`
   * `parseTaggedProjectLabel`. Both pin the same five-shape table (design §9).
   */
  private parseTaggedProjectLabel(text: string): {
    code: string;
    centerLabel: string | null;
  } {
    const match = text.match(/^(.*)\(([^()]+)\)\s*$/);
    if (!match) return { code: text, centerLabel: null };

    const centerLabel = match[2].trim();
    if (!centerLabel) return { code: text, centerLabel: null };

    return { code: match[1].trim(), centerLabel };
  }

  /**
   * `BPT-T-2` (`bilateral-project-tagged`, design §7.2, §9, requirements.md BPT-R-3/R-4): parses
   * a Center-reported `RESULT_BILATERAL_PROJECT_TAGGED` row's `text` — the shape the BCT flow
   * writes for a project target from now on — into its reporter, project code and owner,
   * end-anchored: `"<reporter> has tagged the bilateral project <code> from your center
   * (<owner>)"`. Reporter is the shortest prefix before ` has tagged the bilateral project `;
   * code is everything up to the LAST ` from your center (` (so a code containing its own
   * parentheses, e.g. `Seeds (Phase 2)`, stays intact — mirrors `parseTaggedProjectLabel`'s
   * last-trailing-parens rule, R-3 accepted risk); owner is the non-empty `[^()]+` inside the
   * final parens. Returns `null` when the pattern doesn't match, or when any part is empty after
   * trimming (including an empty `()`, which the `[^()]+` requirement already rules out).
   *
   * This runs BEFORE `isComposedTaggedText` in the `RESULT_BILATERAL_PROJECT_TAGGED` case (DD-3),
   * so a legacy/BCT-T-4 composed sentence (ends in `. Click to see the result.`, says "of your
   * center") and a W1/W2 bare/enriched row (no ` has tagged the bilateral project ` substring)
   * can never match here (BPT-R-4).
   *
   * Keep in sync with the client twin:
   * `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts`
   * `parseCenterReportedProjectText`. Both pin the identical shape table (design §9, BPT-NFR-2).
   */
  private parseCenterReportedProjectText(text: string): {
    reporter: string;
    code: string;
    owner: string;
  } | null {
    const match = text.match(
      /^(.+?) has tagged the bilateral project (.+) from your center \(([^()]+)\)\s*$/,
    );
    if (!match) return null;

    const reporter = match[1].trim();
    const code = match[2].trim();
    const owner = match[3].trim();
    if (!reporter || !code || !owner) return null;

    return { reporter, code, owner };
  }

  /**
   * P2-3157 AC2: standardized copy for a bilateral review decision, e.g.
   * "✅ Your Result 1234 - Some title... has been Approved by the Science Program SP5".
   */
  private buildBilateralReviewDescription(
    icon: string,
    decisionLabel: string,
    resultCode?: number,
    resultTitle?: string,
    programCode?: string,
    storedText?: string,
  ): string {
    const identity = [resultCode, this.truncateTitle(resultTitle)]
      .filter((part) => part !== undefined && part !== null && part !== '')
      .join(' - ');
    const centerText = storedText?.trim();
    // SACN-R-3/R-4 (design §7.3): the new-shape center sentence for an Approve decision — stored
    // text ends in the fixed tail from `BILATERAL_DECISION_NOTICE_COPY`. Detected first so a
    // legacy row's own trailing wording (checked next) never double-matches. The result identity
    // is appended directly (no "The result" prefix, no comma) — when missing, the text alone.
    if (centerText?.endsWith(BILATERAL_DECISION_NOTICE_COPY.tail)) {
      return identity ? `${centerText} ${identity}` : centerText;
    }
    // Legacy center recipients (Reject, and pre-SACN Approve rows): the stored text already
    // names the relationship and the deciding program, so it replaces the "Your Result ..."
    // sentence (NDCW-R-2/R-3).
    if (centerText) {
      return identity
        ? `The result ${identity}, ${centerText}`
        : `The result, ${centerText}`;
    }
    const resultText = identity ? `Your Result ${identity}` : 'Your result';
    const programText = programCode
      ? ` by the Science Program ${programCode}`
      : ' by the Science Program';

    return `${icon} ${resultText} has been ${decisionLabel}${programText}.`;
  }

  private truncateTitle(title?: string, maxLength = 60): string {
    const clean = title?.trim();
    if (!clean) return '';
    return clean.length > maxLength
      ? `${clean.slice(0, maxLength).trimEnd()}...`
      : clean;
  }

  /**
   * The owner (submitting) Science Program of the result — `initiative_role_id = 1`.
   * The notification select only pulls that relation, so the first active entry is the owner.
   */
  private resolveOwnerProgramCode(
    notification: Notification | null,
  ): string | undefined {
    const initiatives = notification?.obj_result?.obj_result_by_initiatives;
    if (!Array.isArray(initiatives)) return undefined;

    // `RSF-R-3`: only an ACTIVE role-1 row is the owner. This query loads every initiative of the
    // result (no relation `where`), so the role and the activity flag are both checked here.
    const owner = initiatives.find(
      (initiative) =>
        Number(initiative?.initiative_role_id) === 1 && initiative?.is_active,
    );

    return owner?.obj_initiative?.official_code || undefined;
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
  obj_notification_type?: { type: FindOperator<string> };
  created_date?: FindOperator<Date>;
}
