import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ShareResultRequestSeenRepository } from './repositories/share-result-request-seen.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import {
  ApprovalChainInitiativeRoleRow,
  ApprovalChainRequestRow,
  composeApprovalChain,
  ShareResultRequestRepository,
} from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from './entities/share-result-request.entity';
import { SourceEnum } from '../entities/result.entity';
import {
  PrimaryDecisionOutcome,
  PrimaryProgramRequestService,
} from './services/primary-program-request.service';
import { NotificationService } from '../../notification/notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../../notification/enum/notification.enum';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultRepository } from '../result.repository';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/repositories/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import {
  FindOptionsRelations,
  FindOptionsSelect,
  In,
  IsNull,
  MoreThan,
  Not,
} from 'typeorm';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import Handlebars from 'handlebars';
import { ResultsTocResultsService } from '../results-toc-results/results-toc-results.service';
import { env } from 'node:process';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import {
  applyKeysetCursor,
  decodeCursor,
  KEYSET_PAGE_SIZE,
  sliceKeysetPage,
} from '../../../shared/utils/keyset-cursor.util';

/** @akili-spec notifications/inbox-paginated-load — shared keyset fields (PAGE-R-3). */
const DONE_KEYSET_FIELDS = {
  dateField: 'requested_date',
  idField: 'share_result_request_id',
} as const;

/** Parsed/validated `version_id` + `scope` + `cursor` query params (PAGE-R-1, R-3, R-6). */
export interface SharedRequestPagingParams {
  versionId?: string;
  scope?: string;
  cursor?: string;
  /** @akili-spec notifications/admin-pending-paging (PPG-R-6): validated by the controller (1..200). */
  limit?: number;
  /** PPG-R-6: caller-seen filter for the paged pending mode, parsed by the controller. */
  seen?: boolean;
}

interface ParsedPagingParams {
  versionId?: number;
  scope?: 'pending' | 'history';
  cursor?: string;
  limit?: number;
  seen?: boolean;
}

/** PPG-R-6: one pending request in the light index (id + date + the caller's own seen flag). */
export interface PendingReceivedIndexEntry {
  id: number;
  requested_date: Date;
  seen: boolean;
}

@Injectable()
export class ShareResultRequestService {
  private readonly _logger = new Logger(ShareResultRequestService.name);

  /**
   * `PDR-R-3` / `PDR-DD-4` — the exact 400 message for a blank/missing justification on a primary
   * decline, shared between the dispatcher's pre-service guard and the `invalid_input` mapping
   * (the service can also return `invalid_input` if reached another way, e.g. directly in tests).
   */
  private static readonly JUSTIFICATION_REQUIRED_MESSAGE =
    'Justification is required when declining a primary request';

  /**
   * P2-3188 — `request_status_id` → notification type. Only the two terminal decisions are here;
   * `1` (pending) and anything added later map to undefined and emit nothing, which is safer than
   * a default that would label an unknown status as one of these two.
   */
  private static readonly CONTRIBUTION_DECISION_TYPES: Record<
    number,
    NotificationTypeEnum
  > = {
    2: NotificationTypeEnum.RESULT_CONTRIBUTION_ACCEPTED,
    3: NotificationTypeEnum.RESULT_CONTRIBUTION_DECLINED,
  };

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultInitiativeBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
    private readonly _clarisaInitiativeRepository: ClarisaInitiativesRepository,
    private readonly _templateRepository: TemplateRepository,
    private readonly _userNotificationSettingsRepository: UserNotificationSettingRepository,
    @Inject(forwardRef(() => ResultsTocResultsService))
    private readonly _resultsTocResultService: ResultsTocResultsService,
    private readonly _globalParametersRepository: GlobalParameterRepository,
    @Inject(forwardRef(() => VersioningService))
    private readonly _versioningService: VersioningService,
    private readonly _userRepository: UserRepository,
    // P2-3188. `ResultsCenterRepository` resolves the lead centre; `NotificationService` comes in
    // behind a forwardRef because `NotificationModule` imports this module for one method
    // (`getReceivedResultRequestPopUp`). @Optional() keeps every existing spec that builds this
    // service without it compiling — the one caller null-checks it.
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    // `PSR-T-4` — the `primary` branch of `results/request/update` (design.md §4, DD-6). Safe to
    // inject directly (no cycle): `PrimaryProgramRequestService` does not inject
    // `ShareResultRequestService` (T-2/T-3 doc comments), and both are providers of the same
    // `ShareResultRequestModule`. @Optional(): `ResultsTocResultsModule` and
    // `ResultsPackageTocResultModule` re-provide this service locally (they only call
    // `resultRequest()`) without `PrimaryProgramRequestService`; without @Optional() Nest fails at
    // boot. The decide endpoint lives in `ShareResultRequestModule`, where it always resolves.
    @Optional()
    private readonly _primaryProgramRequestService?: PrimaryProgramRequestService,
    @Optional()
    @Inject(forwardRef(() => NotificationService))
    private readonly _notificationService?: NotificationService,
    // `BRS-T-2`. @Optional() for the same reason as above: other modules re-provide this service
    // locally (they only call `resultRequest()`) and do not register the seen repository.
    @Optional()
    private readonly _shareResultRequestSeenRepository?: ShareResultRequestSeenRepository,
  ) {}

  async resultRequest(
    createTocShareResult: CreateTocShareResult,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const initiativeId = await this.getOwnerInitiativeId(resultId);

      if (!createTocShareResult?.initiativeShareId?.length) {
        return this.createNoInitiativeResponse();
      }

      const shareInitRequests = await this.createShareResultRequests(
        createTocShareResult,
        resultId,
        initiativeId,
        user,
      );

      await this.saveShareResultRequests(
        shareInitRequests,
        createTocShareResult.email_template,
        resultId,
        user,
      );

      return {
        response: shareInitRequests,
        message: 'The initiative was correctly reported',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async getOwnerInitiativeId(resultId: number): Promise<number | null> {
    const res = await this._resultByInitiativesRepository.find({
      where: { result_id: resultId, initiative_role_id: 1, is_active: true },
    });
    return res.length ? res[0]?.initiative_id : null;
  }

  private createNoInitiativeResponse() {
    return {
      response: [],
      message: 'No initiatives to share were provided',
      status: HttpStatus.CREATED,
    };
  }

  private async createShareResultRequests(
    createTocShareResult: CreateTocShareResult,
    resultId: number,
    initiativeId: number | null,
    user: TokenDto,
  ): Promise<ShareResultRequest[]> {
    const shareInitRequests: ShareResultRequest[] = [];

    for (const shareInitId of createTocShareResult.initiativeShareId) {
      const [initExist, requestExist] = await Promise.all([
        this._resultByInitiativesRepository.getContributorInitiativeByResultAndInit(
          resultId,
          shareInitId,
        ),
        this._shareResultRequestRepository.shareResultRequestExists(
          resultId,
          initiativeId,
          shareInitId,
        ),
      ]);

      if (initExist?.is_active) {
        continue;
      }

      if (requestExist && requestExist.request_status_id !== 4) {
        const existingShare = this.buildShareResultRequest(
          createTocShareResult,
          resultId,
          initiativeId,
          shareInitId,
          user,
        );
        existingShare.share_result_request_id =
          requestExist.share_result_request_id;
        existingShare.request_status_id = requestExist.request_status_id;
        existingShare.is_active = true;
        shareInitRequests.push(existingShare);
        continue;
      }

      if (initiativeId === shareInitId) {
        this._logger.warn('The owner initiative cannot be shared with itself');
        throw {
          message: 'The owner initiative cannot be shared with itself',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // If request exists with status_id = 4, update it; otherwise create new
      if (requestExist?.request_status_id === 4) {
        const existingShare = this.buildShareResultRequest(
          createTocShareResult,
          resultId,
          initiativeId,
          shareInitId,
          user,
        );
        existingShare.share_result_request_id =
          requestExist.share_result_request_id;
        existingShare.is_active = true;

        shareInitRequests.push(existingShare);
      } else {
        // Create new request only if it doesn't exist
        const newShare = this.buildShareResultRequest(
          createTocShareResult,
          resultId,
          initiativeId,
          shareInitId,
          user,
        );
        shareInitRequests.push(newShare);
      }

      if (createTocShareResult.isToc === true) {
        await this._resultsTocResultService.saveMapToToc(
          createTocShareResult.contributors_result_toc_result,
          user,
          resultId,
        );
      }
    }

    return shareInitRequests;
  }

  private buildShareResultRequest(
    createTocShareResult: CreateTocShareResult,
    resultId: number,
    initiativeId: number | null,
    shareInitId: number,
    user: TokenDto,
  ): ShareResultRequest {
    const newShare = new ShareResultRequest();
    newShare.result_id = resultId;
    newShare.request_status_id = 1;
    newShare.owner_initiative_id = initiativeId;
    newShare.requester_initiative_id = createTocShareResult?.isToc
      ? initiativeId
      : shareInitId;
    newShare.shared_inititiative_id = shareInitId;
    newShare.approving_inititiative_id = createTocShareResult?.isToc
      ? shareInitId
      : initiativeId;
    newShare.is_map_to_toc = !!createTocShareResult?.isToc;
    newShare.from_toc =
      !!createTocShareResult?.initiativeFromToc?.[shareInitId];
    newShare.requested_by = user.id;
    return newShare;
  }

  /**
   * Persists the requests and mails the receiving programme. Deliberately NO `notification` row
   * (P2-3430, 2026-09-08): the bell already shows every pending request the user can act on —
   * `NotificationService.getPopUpNotifications` merges unread `notification` rows with
   * `getReceivedResultRequestPopUp`, and the Requests tab lists them too — so the request row in
   * `share_result_request` IS the durable in-app notification. Emitting a second row here would
   * show the same request twice in the pop-up. The socket push that used to sit next to the mail
   * was dead code (no caller since a0892e2e8, and sockets are off on both ends); removed.
   */
  private async saveShareResultRequests(
    shareInitRequests: ShareResultRequest[],
    emailTemplate: string,
    resultId: number,
    user: TokenDto,
  ) {
    // Separate existing requests (with ID) from new ones (without ID)
    const existingRequests = shareInitRequests.filter(
      (req) => req.share_result_request_id,
    );
    const newRequests = shareInitRequests.filter(
      (req) => !req.share_result_request_id,
    );

    // Update existing requests
    if (existingRequests.length > 0) {
      await Promise.all(
        existingRequests.map((req) =>
          this._shareResultRequestRepository.update(
            req.share_result_request_id,
            {
              request_status_id: req.request_status_id,
              is_active: req.is_active,
              requested_by: req.requested_by,
              requested_date: req.requested_date,
              from_toc: req.from_toc,
            },
          ),
        ),
      );
    }

    // Save only new requests
    if (newRequests.length > 0) {
      await this._shareResultRequestRepository.save(newRequests);
    }

    await this.sendEmailsForShareRequests(
      shareInitRequests,
      user,
      resultId,
      emailTemplate,
    );
  }

  private async sendEmailsForShareRequests(
    shareInitRequests: ShareResultRequest[],
    user: TokenDto,
    resultId: number,
    emailTemplate: string,
  ) {
    for (const request of shareInitRequests) {
      const [initOwner, result, initContributing, initMembers] =
        await this.getRequestRelatedData(request, resultId, emailTemplate);

      const to = await this.getEmailRecipients(
        initMembers,
        emailTemplate,
        request.shared_inititiative_id,
        initOwner.id,
      );

      if (!to.userEmail.length) {
        return {
          response: 'No recipients found',
          message: 'No recipients found',
          status: HttpStatus.OK,
        };
      }

      const template = await this.getEmailTemplate(emailTemplate);
      const pcuEmail = await this._globalParametersRepository.findOne({
        where: { name: 'pcu_email' },
        select: {
          value: true,
        },
      });

      const technicalTeamEmailsRecord =
        await this._globalParametersRepository.findOne({
          where: { name: 'technical_team_email' },
          select: { value: true },
        });

      const emailData = this.buildEmailData(
        template,
        initContributing,
        user,
        initOwner,
        result,
        pcuEmail.value,
      );

      this._emailNotificationManagementService.sendEmail({
        from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
        emailBody: {
          subject: emailData.subject,
          to: to.userEmail,
          cc: emailData.cc,
          bcc: technicalTeamEmailsRecord.value,
          message: {
            text: 'Contribution request',
            socketFile: Handlebars.compile(template.template)(emailData),
          },
        },
      });
    }
  }

  private async getRequestRelatedData(
    request: ShareResultRequest,
    resultId: number,
    emailTemplate: string,
  ) {
    return await Promise.all([
      this._clarisaInitiativeRepository.findOne({
        where: { id: request.owner_initiative_id },
      }),
      this._resultRepository.findOne({ where: { id: resultId } }),
      this._clarisaInitiativeRepository.findOne({
        where: { id: request.shared_inititiative_id },
      }),
      this._roleByUserRepository.find({
        where: {
          initiative_id:
            emailTemplate === EmailTemplate.CONTRIBUTION
              ? request.shared_inititiative_id
              : request.owner_initiative_id,
          role: In([3, 4, 5]),
          active: true,
        },
        relations: { obj_user: true },
      }),
    ]);
  }

  /** Members of the receiving programme who opted in to contribution-request mails. */
  private async getEmailRecipients(
    initMembers: any[],
    emailTemplate: string,
    sharedInitiativeId?: number,
    initOwner?: number,
  ) {
    const usersEmail = initMembers.map((m) => m.obj_user.id);
    const userEmailEnable = await this._userNotificationSettingsRepository.find(
      {
        where: {
          user_id: In(usersEmail),
          email_notifications_contributing_request_enabled: true,
          initiative_id:
            emailTemplate === EmailTemplate.CONTRIBUTION
              ? sharedInitiativeId
              : initOwner,
        },
        relations: { obj_user: true },
      },
    );

    return {
      userEmail: userEmailEnable.map((u) => u.obj_user.email),
    };
  }

  private async getEmailTemplate(emailTemplate: string) {
    const template = await this._templateRepository.findOne({
      where: { name: emailTemplate },
    });
    if (!template?.template) {
      throw new Error(`Template with name ${template.template} not found`);
    }
    return template;
  }

  private buildEmailData(
    template: any,
    initContributing: any,
    user: TokenDto,
    initOwner: any,
    result: any,
    pcuEmail: string,
  ) {
    return this._emailNotificationManagementService.buildEmailData(
      template.name as
        | EmailTemplate.CONTRIBUTION
        | EmailTemplate.REQUEST_AS_CONTRIBUTION,
      { initContributing, user, initOwner, result, pcuEmail },
    );
  }

  // @akili-spec notifications/inbox-paginated-load
  async getReceivedResultRequest(
    user: TokenDto,
    pagingParams?: SharedRequestPagingParams,
  ) {
    try {
      const parsedParams = this.parsePagingParams(pagingParams);
      const { versionId, scope, cursor } = parsedParams;
      // @akili-spec notifications/admin-pending-paging (PPG-R-6, PPG-DD-1): opt-in paged mode.
      // Only `scope=pending` + `limit` take it; every other call keeps the legacy path below.
      if (scope === 'pending' && parsedParams.limit !== undefined) {
        return await this.getReceivedPendingPage(user, {
          versionId,
          cursor,
          limit: parsedParams.limit,
          seen: parsedParams.seen,
        });
      }
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);
      const extraConditions =
        versionId !== undefined
          ? { obj_result: { version_id: versionId } }
          : undefined;
      const whereConditions = this.buildWhereReceivedConditions(
        inits,
        role,
        extraConditions,
      );

      // @akili-spec bugfix/notifications-inbox-slow-load
      // PERF-DD-1 / PERF-DD-2: the 3 buckets are independent reads — fetch them concurrently.
      // For admins, `pendingOwner`/`pendingShared` are the identical `commonConditions` object
      // (see buildWhereReceivedConditions), so fetch it once and reuse the same result for both
      // positions instead of issuing the query twice.
      //
      // @akili-spec notifications/inbox-paginated-load
      // PAGE-R-2/R-3: `scope` now gates which buckets are fetched at all (not fetched-then-
      // discarded) and `done` is keyset-paginated (PAGE-R-3) via `fetchThreeBucketsScoped`.
      const {
        pendingOwner: receivedContributionsPendingOwner,
        pendingShared: receivedContributionsPendingShared,
        done: receivedContributionsDone,
        doneMeta,
      } = await this.fetchThreeBucketsScoped(whereConditions, {
        scope,
        cursor,
      });

      const receivedContributionsPending = this.combineAndDistinct(
        receivedContributionsPendingOwner,
        receivedContributionsPendingShared,
      );
      // `BRS-T-2` / BRS-DD-2: one per-user lookup for the whole pending set; `done` is untouched.
      await this.tagPendingWithSeen(user.id, receivedContributionsPending);

      return {
        response: {
          receivedContributionsPending,
          receivedContributionsDone,
          doneMeta,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * @akili-spec notifications/admin-pending-paging (PPG-R-6, PPG-DD-3)
   * Paged pending, id-first: the light index gives the full id set and the exact `seen`
   * partition; only the page's ids (`limit + 1`) go through the heavy relation fetch, whose rows
   * are re-ordered to the index order. `total` is the (seen-filtered) index length. `seen` on
   * each row comes from the index, so a row's flag always agrees with the partition it was
   * paged under (and no second seen lookup is needed).
   */
  private async getReceivedPendingPage(
    user: TokenDto,
    params: {
      versionId?: number;
      cursor?: string;
      limit: number;
      seen?: boolean;
    },
  ) {
    const { versionId, cursor, limit, seen } = params;
    const index = await this.getPendingReceivedIndex(user, versionId);
    const candidates = (
      seen === undefined ? index : index.filter((entry) => entry.seen === seen)
    ).sort(
      (a, b) =>
        b.requested_date.getTime() - a.requested_date.getTime() || b.id - a.id,
    );
    const total = candidates.length;

    let remaining = candidates;
    if (cursor) {
      const { date, id } = decodeCursor(cursor);
      remaining = candidates.filter((entry) => {
        const time = entry.requested_date.getTime();
        return (
          time < date.getTime() || (time === date.getTime() && entry.id < id)
        );
      });
    }
    const pageEntries = remaining.slice(0, limit + 1);

    let rows: any[] = [];
    if (pageEntries.length) {
      const fetched = await this.getRequest({
        share_result_request_id: In(pageEntries.map((entry) => entry.id)),
      });
      const byId = new Map<number, any>(
        fetched.map((row: any) => [Number(row.share_result_request_id), row]),
      );
      rows = pageEntries
        .map((entry) => byId.get(entry.id))
        .filter((row) => row !== undefined);
    }
    const [enriched] = await this.enrichBucketsOnce([rows]);

    const seenById = new Map(
      pageEntries.map((entry) => [entry.id, entry.seen]),
    );
    for (const row of enriched) {
      row.seen = seenById.get(Number(row.share_result_request_id)) ?? false;
    }

    const page = sliceKeysetPage(enriched, DONE_KEYSET_FIELDS, limit);
    return {
      response: {
        receivedContributionsPending: page.rows,
        receivedContributionsDone: [],
        doneMeta: { hasMore: false, nextCursor: null },
        pendingMeta: {
          // From the id list, not the fetched rows: a row removed between the two queries
          // must not hide the next page.
          hasMore: pageEntries.length > limit,
          nextCursor: page.nextCursor,
          total,
        },
      },
      message: 'Successful response',
      status: HttpStatus.OK,
    };
  }

  /**
   * @akili-spec notifications/admin-pending-paging (PPG-R-1, PPG-R-6, PPG-DD-2)
   * One light query (`share_result_request_id` + `requested_date`, no relations) over the same
   * pending wheres as the inbox. Non-admins pass owner + shared as a where-array (OR), which
   * replaces `combineAndDistinct`. One `findSeenIds` for the caller only (never another user).
   * `versionId` narrows to one phase; omitted = all phases (the bell, `BELL-R-1`).
   */
  async getPendingReceivedIndex(
    user: TokenDto,
    versionId?: number,
  ): Promise<PendingReceivedIndexEntry[]> {
    const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
    const inits = await this.getUserInitiatives(user);
    const extraConditions =
      versionId !== undefined
        ? { obj_result: { version_id: versionId } }
        : undefined;
    const { pendingOwner, pendingShared } = this.buildWhereReceivedConditions(
      inits,
      role,
      extraConditions,
    );
    const where =
      pendingOwner === pendingShared
        ? pendingOwner
        : [pendingOwner, pendingShared];

    const rows = await this._shareResultRequestRepository.find({
      select: { share_result_request_id: true, requested_date: true },
      where,
    });
    const seenIds = await this._shareResultRequestSeenRepository.findSeenIds(
      user.id,
      rows.map((row) => Number(row.share_result_request_id)),
    );
    return rows.map((row) => ({
      id: Number(row.share_result_request_id),
      requested_date: new Date(row.requested_date),
      seen: seenIds.has(Number(row.share_result_request_id)),
    }));
  }

  /**
   * @akili-spec notifications/admin-pending-paging (PPG-R-1) — the request half of the bell
   * counts: all phases, caller-scoped. `pendingRequests` = index length; `unseenRequests` = the
   * ones without the caller's own seen row.
   */
  async countPendingReceived(
    user: TokenDto,
  ): Promise<{ pendingRequests: number; unseenRequests: number }> {
    const index = await this.getPendingReceivedIndex(user);
    return {
      pendingRequests: index.length,
      unseenRequests: index.filter((entry) => !entry.seen).length,
    };
  }

  /** `BRS-T-2`: adds `seen` (this user only) to each pending row, with a single query. */
  private async tagPendingWithSeen(userId: number, pending: any[]) {
    if (!pending.length) {
      return;
    }
    const seenIds = await this._shareResultRequestSeenRepository.findSeenIds(
      userId,
      pending.map((row) => row.share_result_request_id),
    );
    for (const row of pending) {
      row.seen = seenIds.has(Number(row.share_result_request_id));
    }
  }

  /**
   * `BRS-T-2` / BRS-DD-3: records that the caller has seen one PENDING request. 404 comes from the
   * pre-check (missing, inactive or already decided), never from the insert: `insertIgnore`
   * returning 0 (already seen) is a normal result. Never writes `share_result_request` (D4).
   */
  async markSeen(user: TokenDto, shareResultRequestId: number) {
    try {
      const request = await this._shareResultRequestRepository.findOne({
        select: { share_result_request_id: true },
        where: {
          share_result_request_id: shareResultRequestId,
          is_active: true,
          request_status_id: 1,
        },
      });
      if (!request) {
        return {
          response: {},
          message: 'The request was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      await this._shareResultRequestSeenRepository.insertIgnore(user.id, [
        shareResultRequestId,
      ]);

      return {
        response: { seen: true },
        message: 'Request marked as seen',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(`markSeen failed for user ${user.id}`);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * `BRS-T-2` / BRS-DD-3: marks every request the bell lists as pending for the caller. The pending
   * set is resolved server-side with the SAME role + initiatives + `buildWhereReceivedConditions`
   * as `getReceivedResultRequest`, minus the version filter (all phases, `BRS-R-5`), selecting ids
   * only (no relations, no enrichment). One bulk `insertIgnore`; `recorded: 0` is not an error.
   */
  async markAllSeen(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);
      const { pendingOwner, pendingShared } = this.buildWhereReceivedConditions(
        inits,
        role,
      );

      const whereList =
        pendingOwner === pendingShared
          ? [pendingOwner]
          : [pendingOwner, pendingShared];
      const rowSets = await Promise.all(
        whereList.map((where) =>
          this._shareResultRequestRepository.find({
            select: { share_result_request_id: true },
            where,
          }),
        ),
      );
      const ids = Array.from(
        new Set(
          rowSets.flat().map((row) => Number(row.share_result_request_id)),
        ),
      );

      const recorded =
        await this._shareResultRequestSeenRepository.insertIgnore(user.id, ids);

      return {
        response: { recorded },
        message: 'Requests marked as seen',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error(`markAllSeen failed for user ${user.id}`);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * @akili-spec notifications/inbox-paginated-load
   * PAGE-R-1, R-3, R-6 — validates `version_id` (positive integer, else 400) and `cursor`
   * (via `decodeCursor`, else 400 — eagerly, so a malformed cursor 400s even under
   * `scope=pending`, which would otherwise never reach the history bucket that consumes it;
   * design.md §4.1/§5). `scope` is normalized to `'pending' | 'history' | undefined`; any other
   * value is treated as absent (both buckets fetched) — the spec defines no 400 for an unknown
   * scope value.
   */
  private parsePagingParams(
    params?: SharedRequestPagingParams,
  ): ParsedPagingParams {
    const versionIdRaw = params?.versionId;
    let versionId: number | undefined;
    if (versionIdRaw !== undefined && versionIdRaw !== '') {
      if (!/^[1-9]\d*$/.test(String(versionIdRaw))) {
        throw new BadRequestException('Invalid version_id');
      }
      versionId = Number(versionIdRaw);
    }

    const scopeRaw = params?.scope;
    const scope: 'pending' | 'history' | undefined =
      scopeRaw === 'pending' || scopeRaw === 'history' ? scopeRaw : undefined;

    const cursor = params?.cursor || undefined;
    if (cursor) {
      decodeCursor(cursor); // validates eagerly; result re-derived inside applyKeysetCursor
    }

    return {
      versionId,
      scope,
      cursor,
      limit: params?.limit,
      seen: params?.seen,
    };
  }

  /**
   * @akili-spec notifications/inbox-paginated-load
   * PAGE-R-2 (pending complete & skippable), PAGE-R-3 (done keyset-paginated, 200/page),
   * PAGE-DD-1 — the scoped 3-bucket orchestration shared by `getReceivedResultRequest` and
   * `getSentResultRequest`. `scope=history` skips the pending buckets entirely (not fetched,
   * never truncated when it IS fetched — falsifier (f)); `scope=pending` skips `done` entirely
   * (falsifier (b)). `done` is cursor-expanded (`applyKeysetCursor`) and fetched with
   * `take: KEYSET_PAGE_SIZE + 1` ordered `(requested_date DESC, share_result_request_id DESC)`,
   * then sliced to a page (`sliceKeysetPage`). Enrichment (`enrichBucketsOnce`) runs once over
   * whichever buckets were actually fetched — legacy (no scope) fetches all 3, same as before.
   */
  private async fetchThreeBucketsScoped(
    whereConditions: { pendingOwner: any; pendingShared: any; done: any },
    pagingParams: { scope?: 'pending' | 'history'; cursor?: string },
  ): Promise<{
    pendingOwner: any[];
    pendingShared: any[];
    done: any[];
    doneMeta: { hasMore: boolean; nextCursor: string | null };
  }> {
    const { scope, cursor } = pagingParams;
    const fetchPending = scope !== 'history';
    const fetchDone = scope !== 'pending';

    let pendingOwner: any[] = [];
    let pendingShared: any[] = [];
    let doneRows: any[] = [];
    let doneMeta: { hasMore: boolean; nextCursor: string | null } = {
      hasMore: false,
      nextCursor: null,
    };

    const tasks: Promise<void>[] = [];

    if (fetchPending) {
      if (whereConditions.pendingOwner === whereConditions.pendingShared) {
        tasks.push(
          this.getRequest(whereConditions.pendingOwner).then((rows) => {
            pendingOwner = rows;
            pendingShared = rows;
          }),
        );
      } else {
        tasks.push(
          this.getRequest(whereConditions.pendingOwner).then((rows) => {
            pendingOwner = rows;
          }),
        );
        tasks.push(
          this.getRequest(whereConditions.pendingShared).then((rows) => {
            pendingShared = rows;
          }),
        );
      }
    }

    if (fetchDone) {
      const doneWhere = applyKeysetCursor(
        whereConditions.done,
        cursor,
        DONE_KEYSET_FIELDS,
      );
      tasks.push(
        this.getRequest(doneWhere, {
          order: {
            requested_date: 'DESC',
            share_result_request_id: 'DESC',
          },
          take: KEYSET_PAGE_SIZE + 1,
        }).then((rows) => {
          const page = sliceKeysetPage(rows, DONE_KEYSET_FIELDS);
          doneRows = page.rows;
          doneMeta = { hasMore: page.hasMore, nextCursor: page.nextCursor };
        }),
      );
    }

    await Promise.all(tasks);

    const [enrichedPendingOwner, enrichedPendingShared, enrichedDone] =
      await this.enrichBucketsOnce([pendingOwner, pendingShared, doneRows]);

    return {
      pendingOwner: enrichedPendingOwner,
      pendingShared: enrichedPendingShared,
      done: enrichedDone,
      doneMeta,
    };
  }

  async getReceivedResultRequestPopUp(user: TokenDto) {
    try {
      const userLastViewed = await this._userRepository.findOne({
        where: { id: user.id },
      });
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);
      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );

      const extraConditions: any = {
        obj_result: { version_id: version.id },
      };

      if (userLastViewed.last_pop_up_viewed) {
        extraConditions.requested_date = MoreThan(
          userLastViewed.last_pop_up_viewed,
        );
      }

      const whereConditions = this.buildWhereReceivedConditions(
        inits,
        role,
        extraConditions,
      );

      // @akili-spec bugfix/notifications-inbox-slow-load
      // PERF-DD-1 / PERF-DD-2 (2-bucket case, no `done`): same admin-dedupe + concurrency pattern
      // as getReceivedResultRequest/getSentResultRequest, per premise PERF-P-5 consumer.
      const [
        receivedContributionsPendingOwner,
        receivedContributionsPendingShared,
      ] = await this.fetchTwoBucketsDeduped(
        whereConditions.pendingOwner,
        whereConditions.pendingShared,
      );

      const receivedContributionsPending = this.combineAndDistinct(
        receivedContributionsPendingOwner,
        receivedContributionsPendingShared,
      );

      return receivedContributionsPending;
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async getUserInitiatives(user: TokenDto) {
    return await this._roleByUserRepository.find({
      where: { user: user.id, active: true, initiative_id: Not(IsNull()) },
    });
  }

  private buildWhereReceivedConditions(
    inits: any[],
    role: number,
    extraConditions?: any,
  ) {
    const sharedInitiativeIds = inits.map((i) => i.initiative_id);
    const commonConditions: any = {
      request_status_id: 1,
      is_active: true,
      obj_result: { is_active: true },
    };

    if (extraConditions) {
      for (const key in extraConditions) {
        if (extraConditions.hasOwnProperty(key)) {
          if (
            typeof commonConditions[key] === 'object' &&
            typeof extraConditions[key] === 'object'
          ) {
            commonConditions[key] = {
              ...commonConditions[key],
              ...extraConditions[key],
            };
          } else {
            commonConditions[key] = extraConditions[key];
          }
        }
      }
    }

    return {
      pendingOwner:
        role !== 1
          ? {
              ...commonConditions,
              shared_inititiative_id: In(sharedInitiativeIds),
              is_map_to_toc: false,
            }
          : commonConditions,
      pendingShared:
        role !== 1
          ? {
              ...commonConditions,
              owner_initiative_id: In(sharedInitiativeIds),
              is_map_to_toc: true,
            }
          : commonConditions,
      // NOTIF-BUG-1 (2026-09-30, user-reported: accepted/declined requests invisible for an
      // application-level admin without an initiative-level role row): `pendingOwner`/`pendingShared`
      // above bypass the `sharedInitiativeIds` scoping entirely for role===1 (app admin) — the
      // `done` bucket did NOT, so an admin whose `getUserInitiatives()` returns [] (no
      // initiative-level role_by_user row, only an application-level one) got `In([])` on every
      // resolved-request query, matching zero rows regardless of which requests actually exist.
      // Mirror the same bypass here: admin sees every resolved request unfiltered, exactly like
      // every pending one.
      // @akili-spec notifications/inbox-paginated-load
      // PAGE-R-1: `obj_result` is read back from `commonConditions` (not re-literaled) so a
      // `version_id` merged into it via `extraConditions` (PAGE-P-2) reaches `done` too, not
      // just the pending buckets above.
      done:
        role !== 1
          ? [
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
                shared_inititiative_id: In(sharedInitiativeIds),
                is_map_to_toc: false,
              },
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
                owner_initiative_id: In(sharedInitiativeIds),
                is_map_to_toc: true,
              },
            ]
          : [
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
              },
            ],
    };
  }

  /**
   * @akili-spec bugfix/notifications-inbox-slow-load
   * PERF-DD-1 / PERF-DD-2 (2-bucket variant): `getReceivedResultRequestPopUp`'s case — same
   * admin-dedupe/concurrency rule as `fetchThreeBucketsScoped`
   * (@akili-spec notifications/inbox-paginated-load — superseded `fetchThreeBucketsDeduped`,
   * which this popup 2-bucket helper never used), without a `done` bucket.
   *
   * PERF-DD-3: orchestration step for the popup call site (premise PERF-P-5's 3rd consumer) —
   * enrich the union of its 2 buckets exactly once via `enrichBucketsOnce`, so it does not
   * silently lose `toc_contribution_review` data now that `getRequest` stopped enriching.
   */
  private async fetchTwoBucketsDeduped(
    pendingOwnerCondition: any,
    pendingSharedCondition: any,
  ): Promise<[any[], any[]]> {
    let pendingOwner: any[];
    let pendingShared: any[];

    if (pendingOwnerCondition === pendingSharedCondition) {
      pendingOwner = await this.getRequest(pendingOwnerCondition);
      pendingShared = pendingOwner;
    } else {
      [pendingOwner, pendingShared] = await Promise.all([
        this.getRequest(pendingOwnerCondition),
        this.getRequest(pendingSharedCondition),
      ]);
    }

    return this.enrichBucketsOnce([pendingOwner, pendingShared]) as any;
  }

  /**
   * @akili-spec bugfix/notifications-inbox-slow-load
   * PERF-DD-3 — the single shared orchestration step for all 3 call sites (premise PERF-P-5):
   * dedupes buckets by ARRAY REFERENCE first (the admin case hands the same array in two
   * positions — `fetchThreeBucketsScoped`/`fetchTwoBucketsDeduped` above), concatenates only the
   * unique buckets, enriches that union exactly once, then re-splits the enriched rows back into
   * every caller-supplied bucket position by `share_result_request_id` (never by index/length —
   * see the task's re-split note). Because the map below is keyed by the ORIGINAL bucket
   * reference, an admin's two positions both come back pointing at the same enriched array — the
   * pair is never double-counted and both positions still carry the enriched rows.
   */
  private async enrichBucketsOnce(buckets: any[][]): Promise<any[][]> {
    const uniqueBuckets = Array.from(new Set(buckets));
    const concatenated = uniqueBuckets.flat();
    const tocEnriched =
      await this.enrichRequestsWithTocContributionReview(concatenated);
    // `PSR-T-4` (design.md §8 Performance): derived entirely from fields/relations the SAME
    // `getRequest()` query already selects (`request_type`, `obj_result.result_center_array`,
    // `obj_owner_initiative.official_code`) — zero extra queries, so it cannot scale with row
    // count regardless of how many rows land in the union.
    const enriched = this.attachPrimaryRequestFields(tocEnriched);

    const enrichedByShareRequestId = new Map<any, any>(
      enriched.map((row) => [row.share_result_request_id, row]),
    );

    const enrichedUniqueBuckets = new Map<any[], any[]>(
      uniqueBuckets.map((bucket) => [
        bucket,
        bucket.map(
          (row) =>
            enrichedByShareRequestId.get(row.share_result_request_id) ?? row,
        ),
      ]),
    );

    return buckets.map((bucket) => enrichedUniqueBuckets.get(bucket));
  }

  /**
   * @akili-spec notifications/inbox-paginated-load
   * PAGE-R-3 — `options.order`/`options.take` are additive (only the `done` bucket passes them,
   * via `fetchThreeBucketsScoped`); every pre-existing caller omits `options` and keeps fetching
   * the full unordered/untaken result set, unchanged (PAGE-R-2, PAGE-R-6).
   */
  private async getRequest(
    whereCondition: any,
    options?: { order?: any; take?: number },
  ) {
    const results = await this._shareResultRequestRepository.find({
      select: this.getRequestSelectFields(),
      relations: this.getRequestRelations(),
      where: whereCondition,
      ...(options?.order ? { order: options.order } : {}),
      ...(options?.take ? { take: options.take } : {}),
    });

    return results.map((result: any) => {
      if (result.obj_result && !Array.isArray(result.obj_result)) {
        result.obj_result = {
          ...result.obj_result,
          source_name:
            result.obj_result.source === 'Result' ? 'W1/W2' : 'W3/Bilaterals',
        };
        // P2-3188 REWORK (NOTIF-T-16 review): `results_by_projects` is soft-deleted
        // (`is_active: false`), not removed, when a project is unlinked from a result. Strip the
        // inactive links here so a result never surfaces under a project it is no longer tagged
        // to — both as a facet option and as a filter match on the client.
        result.obj_result.obj_result_by_project = (
          result.obj_result.obj_result_by_project ?? []
        ).filter((link: any) => link.is_active);
      }
      return result;
    });
  }

  /**
   * P2-3086 / P2-3003: attach ToC review fields for contribution-request notifications.
   */
  private async enrichRequestsWithTocContributionReview(
    requests: any[],
  ): Promise<any[]> {
    if (!requests?.length) {
      return requests;
    }

    const pairMap = new Map<
      string,
      { resultId: number; initiativeId: number }
    >();

    for (const request of requests) {
      if (!request?.is_map_to_toc) {
        continue;
      }

      const resultId = Number(request.result_id);
      const contributorInitiativeId = Number(
        request.shared_inititiative_id ?? request.obj_shared_inititiative?.id,
      );

      if (
        !Number.isFinite(resultId) ||
        !Number.isFinite(contributorInitiativeId)
      ) {
        continue;
      }

      pairMap.set(`${resultId}:${contributorInitiativeId}`, {
        resultId,
        initiativeId: contributorInitiativeId,
      });
    }

    const reviewCache = new Map<string, any[]>();
    await Promise.all(
      Array.from(pairMap.entries()).map(async ([cacheKey, pair]) => {
        reviewCache.set(
          cacheKey,
          await this._resultsTocResultRepository.getContributionReviewTocByResultAndInitiative(
            pair.resultId,
            pair.initiativeId,
          ),
        );
      }),
    );

    return requests.map((request) => {
      if (!request?.is_map_to_toc) {
        return request;
      }

      const resultId = Number(request.result_id);
      const contributorInitiativeId = Number(
        request.shared_inititiative_id ?? request.obj_shared_inititiative?.id,
      );

      if (
        !Number.isFinite(resultId) ||
        !Number.isFinite(contributorInitiativeId)
      ) {
        return { ...request, toc_contribution_review: [] };
      }

      const cacheKey = `${resultId}:${contributorInitiativeId}`;
      return {
        ...request,
        toc_contribution_review: reviewCache.get(cacheKey) ?? [],
      };
    });
  }

  /**
   * `PSR-T-4` (design.md §4, §8) — attaches `request_type`, `creating_center` (every row) and
   * `owner_program_code` (bilateral contribution rows only) to each request row, derived purely
   * from data `getRequestSelectFields()`/`getRequestRelations()` already fetch in the ONE query
   * per bucket — no additional lookup, so this cannot introduce an N+1.
   */
  private attachPrimaryRequestFields(requests: any[]): any[] {
    return requests.map((request) => {
      const requestType: RequestTypeEnum =
        request.request_type ?? RequestTypeEnum.CONTRIBUTION;

      const enriched: any = {
        ...request,
        request_type: requestType,
        creating_center: this.deriveCreatingCenter(request.obj_result),
      };

      // `PSR-R-10` — only bilateral CONTRIBUTION rows carry the primary SP's code for the
      // "on behalf of {Center}" sentence; a `primary` row has no separate "owner" concept yet
      // (design.md §3.1: owner == shared on that row itself).
      if (
        requestType !== RequestTypeEnum.PRIMARY &&
        request.obj_result?.source === SourceEnum.Bilateral
      ) {
        enriched.owner_program_code =
          request.obj_owner_initiative?.official_code ?? null;
      }

      return enriched;
    });
  }

  /**
   * `PSR-R-9` scenario "missing Center acronym" — the server sends BOTH `acronym` and `name`
   * exactly as stored (never collapsed here); the client picks the fallback. `null` is returned
   * only when the result has no active leading centre at all.
   */
  private deriveCreatingCenter(
    objResult: any,
  ): { acronym: string | null; name: string | null } | null {
    const centers: any[] = objResult?.result_center_array ?? [];
    const leadCenter = centers.find(
      (center) => center?.is_active && Number(center?.is_leading_result) === 1,
    );
    const institution = leadCenter?.clarisa_center_object?.clarisa_institution;
    if (!institution) {
      return null;
    }

    return {
      acronym: institution.acronym ?? null,
      name: institution.name ?? null,
    };
  }

  private getRequestSelectFields(): FindOptionsSelect<ShareResultRequest> {
    return {
      share_result_request_id: true,
      result_id: true,
      shared_inititiative_id: true,
      owner_initiative_id: true,
      // `PSR-T-4` (design.md §4): rows gain `request_type` so the client can render the primary
      // / bilateral-contributor / contribution row variants.
      request_type: true,
      requested_date: true,
      aprovaed_date: true,
      request_status_id: true,
      is_map_to_toc: true,
      obj_request_status: {
        request_status_id: true,
        name: true,
      },
      obj_result: {
        id: true,
        source: true,
        result_code: true,
        title: true,
        status_id: true,
        obj_version: {
          id: true,
          status: true,
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
        obj_results_toc_result: {
          result_toc_result_id: true,
          initiative_id: true,
          is_active: true,
        },
        result_center_array: {
          center_id: true,
          is_primary: true,
          is_leading_result: true,
          is_active: true,
          clarisa_center_object: {
            code: true,
            institutionId: true,
            financial_code: true,
            clarisa_institution: {
              id: true,
              name: true,
              acronym: true,
            },
          },
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
      obj_requested_by: {
        id: true,
        first_name: true,
        last_name: true,
      },
      obj_approved_by: {
        id: true,
        first_name: true,
        last_name: true,
      },
      obj_owner_initiative: {
        id: true,
        official_code: true,
        name: true,
      },
      obj_shared_inititiative: {
        id: true,
        official_code: true,
        name: true,
      },
    };
  }

  private getRequestRelations(): FindOptionsRelations<ShareResultRequest> {
    return {
      obj_request_status: true,
      obj_result: {
        obj_version: {
          obj_portfolio: true,
        },
        obj_result_type: true,
        obj_result_level: true,
        result_center_array: {
          clarisa_center_object: {
            clarisa_institution: true,
          },
        },
        obj_result_by_project: {
          obj_clarisa_project: true,
        },
      },
      obj_requested_by: true,
      obj_approved_by: true,
      obj_owner_initiative: true,
      obj_shared_inititiative: true,
    };
  }

  private combineAndDistinct(...arrays: any[][]) {
    const combined = arrays.flat();
    return Array.from(
      new Map(
        combined.map((item) => [item.share_result_request_id, item]),
      ).values(),
    );
  }

  // @akili-spec notifications/inbox-paginated-load
  async getSentResultRequest(
    user: TokenDto,
    pagingParams?: SharedRequestPagingParams,
  ) {
    try {
      const { versionId, scope, cursor } = this.parsePagingParams(pagingParams);
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);

      const extraContidions: any = {
        requested_by: user.id,
      };
      if (versionId !== undefined) {
        extraContidions.obj_result = { version_id: versionId };
      }
      const whereConditions = this.buildWhereSentConditions(
        inits,
        role,
        extraContidions,
      );

      // @akili-spec bugfix/notifications-inbox-slow-load
      // PERF-DD-1 / PERF-DD-2 — same admin-dedupe + concurrency pattern as
      // getReceivedResultRequest.
      //
      // @akili-spec notifications/inbox-paginated-load
      // PAGE-R-2/R-3 — see `fetchThreeBucketsScoped` doc comment.
      const {
        pendingOwner: sentContributionsPendingOwner,
        pendingShared: sentContributionsPendingShared,
        done: sentContributionsDone,
        doneMeta,
      } = await this.fetchThreeBucketsScoped(whereConditions, {
        scope,
        cursor,
      });

      return {
        response: {
          sentContributionsPending: this.combineAndDistinct(
            sentContributionsPendingOwner,
            sentContributionsPendingShared,
          ),
          sentContributionsDone,
          doneMeta,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private buildWhereSentConditions(
    inits: any[],
    role: number,
    extraConditions?: any,
  ) {
    const sharedInitiativeIds = inits.map((i) => i.initiative_id);
    const commonConditions: any = {
      request_status_id: 1,
      is_active: true,
      obj_result: { is_active: true },
    };

    if (extraConditions) {
      for (const key in extraConditions) {
        if (extraConditions.hasOwnProperty(key)) {
          if (
            typeof commonConditions[key] === 'object' &&
            typeof extraConditions[key] === 'object'
          ) {
            commonConditions[key] = {
              ...commonConditions[key],
              ...extraConditions[key],
            };
          } else {
            commonConditions[key] = extraConditions[key];
          }
        }
      }
    }

    return {
      pendingOwner:
        role !== 1
          ? {
              ...commonConditions,
              owner_initiative_id: In(sharedInitiativeIds),
              is_map_to_toc: false,
            }
          : commonConditions,
      pendingShared:
        role !== 1
          ? {
              ...commonConditions,
              shared_inititiative_id: In(sharedInitiativeIds),
              is_map_to_toc: true,
            }
          : commonConditions,
      // NOTIF-BUG-1 (2026-09-30): same admin bypass fix as `buildWhereReceivedConditions` — see
      // that method's comment for the full rationale.
      // @akili-spec notifications/inbox-paginated-load
      // PAGE-R-1: `obj_result` is read back from `commonConditions` (see
      // `buildWhereReceivedConditions`'s matching comment) so `version_id` reaches `done` too.
      done:
        role !== 1
          ? [
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
                owner_initiative_id: In(sharedInitiativeIds),
                is_map_to_toc: false,
              },
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
                shared_inititiative_id: In(sharedInitiativeIds),
                is_map_to_toc: true,
              },
            ]
          : [
              {
                ...commonConditions,
                request_status_id: In([2, 3]),
                is_active: true,
                obj_result: commonConditions.obj_result,
              },
            ],
    };
  }

  async getAllStatus() {
    try {
      const status =
        await this._shareResultRequestRepository.getAllRequestStatus();
      return {
        response: status,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async updateResultRequestByUser(
    createShareResultsRequestDto: CreateShareResultRequestDto,
    user: TokenDto,
  ) {
    try {
      const {
        result_request: rr,
        result_toc_result: rtr,
        request_status_id,
      } = createShareResultsRequestDto;

      const res = await this._resultRepository.findOne({
        where: { id: rr.result_id, is_active: true },
        relations: { obj_version: true },
      });

      if (!res) {
        return {
          response: {},
          message: 'The result was not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!rr?.share_result_request_id) {
        return this.createInvalidShareRequestResponse();
      }

      // `PSR-T-4` (design.md §4, §5 item 2; forward pointers 1 and 2): dispatch on the LOADED
      // row's `request_type`, never on a DTO field, and never derive the acting user from the
      // DTO — `user` here is the JWT-decoded `@UserToken()` the controller already passes in.
      const loadedRequest = await this._shareResultRequestRepository.findOne({
        where: { share_result_request_id: rr.share_result_request_id },
      });

      if (loadedRequest?.request_type === RequestTypeEnum.PRIMARY) {
        return this.dispatchPrimaryDecision(
          loadedRequest,
          request_status_id,
          user,
          createShareResultsRequestDto.justification,
        );
      }

      await this.updateShareResultRequest(rr, user, request_status_id);

      const findShare = await this._shareResultRequestRepository.findOne({
        where: { share_result_request_id: rr.share_result_request_id },
      });

      await this.handleRequestApproval(
        findShare,
        rtr,
        user,
        createShareResultsRequestDto,
      );

      // P2-3188: tell the reporting centre what the SP contributor decided. Last thing in the
      // flow and non-blocking on purpose — the decision is already persisted.
      await this.emitContributionDecisionNotification(
        findShare,
        request_status_id,
        user,
      );

      return {
        response: 'requestData',
        message: 'The requests have been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error('Error updating share result request', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * `PSR-T-4` — the `primary` branch of `results/request/update` (V1 and V2 both call this).
   * Forward pointer 4: the DTO decision only selects accept (`2`) or decline (`3`); nothing else
   * from the DTO reaches `PrimaryProgramRequestService`.
   */
  private async dispatchPrimaryDecision(
    row: ShareResultRequest,
    requestStatusId: number,
    user: TokenDto,
    // Sourced from `CreateShareResultRequestDto.justification` (`PDR-T-2`). Blank is rejected with
    // 400 both here (pre-service, "Justification is required when declining a primary request")
    // and in `decline()` (`PDR-DD-4`, `invalid_input` → 400 via `mapPrimaryDecisionOutcomeToResponse`).
    justification?: string,
  ): Promise<{ response: any; message: string; status: HttpStatus }> {
    if (requestStatusId !== 2 && requestStatusId !== 3) {
      return {
        response: {},
        message:
          'A primary Science Program request can only be accepted or declined',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    // `PSR-T-4` rework attempt 2 (Reviewer FAIL, issue 1): a Center re-pick cancels the round by
    // setting `is_active=false` on the old round's rows ONLY (`request_status_id` stays `1` —
    // `primary-program-request.service.ts`'s `request()`, design.md §2.2 "Center re-picks SP12").
    // Without this check, the status re-check alone (`1 === PENDING`) still lets a stale
    // tab/pop-up/hand-built PATCH decide an already-cancelled row. requirements.md PSR-R-2: "no
    // longer actionable"; PSR-R-8: the server MUST enforce this. Same 409 shape as
    // `PrimaryDecisionOutcome`'s `conflict`, so the client's existing 409 handling covers it too.
    if (!row.is_active) {
      return this.mapPrimaryDecisionOutcomeToResponse({
        ok: false,
        reason: 'conflict',
      });
    }

    // `PDR-R-3` / `PDR-DD-4`: validated here too (not just inside `decline()`), so a blank
    // justification is rejected with 400 BEFORE taking the row's pessimistic lock. Accept (`2`)
    // and contribution decisions never reach this branch, so the justification is ignored there.
    if (requestStatusId === 3 && !justification?.trim()) {
      return {
        response: {},
        message: ShareResultRequestService.JUSTIFICATION_REQUIRED_MESSAGE,
        status: HttpStatus.BAD_REQUEST,
      };
    }

    if (!this._primaryProgramRequestService) {
      this._logger.error(
        `Primary decision unavailable in this module context (request ${row.share_result_request_id})`,
      );
      return this.mapPrimaryDecisionOutcomeToResponse({
        ok: false,
        reason: 'internal_error',
      });
    }

    const outcome =
      requestStatusId === 2
        ? await this._primaryProgramRequestService.accept(
            row.share_result_request_id,
            user,
          )
        : await this._primaryProgramRequestService.decline(
            row.share_result_request_id,
            user,
            justification,
          );

    return this.mapPrimaryDecisionOutcomeToResponse(outcome);
  }

  /**
   * `PSR-T-4` forward pointer 3 (lens B guarantee, execution.md T-3): `forbidden` → 403,
   * `conflict` → 409 with the exact "already answered" message, `not_found` → 404,
   * `internal_error` → a generic 500 that never echoes the underlying error (already logged with
   * ids only by `PrimaryProgramRequestService`). Response envelope unchanged, plus `request_type`.
   */
  private mapPrimaryDecisionOutcomeToResponse(
    outcome: PrimaryDecisionOutcome,
  ): { response: any; message: string; status: HttpStatus } {
    if (outcome.ok) {
      return {
        response: {
          share_result_request_id: outcome.shareResultRequestId,
          request_type: RequestTypeEnum.PRIMARY,
          state: outcome.state,
        },
        message: 'The requests have been updated successfully',
        status: HttpStatus.OK,
      };
    }

    // `strictNullChecks` is off in this project's tsconfig, which keeps the compiler from
    // narrowing `PrimaryDecisionOutcome` down to its `{ ok: false; reason }` members past the
    // `if (outcome.ok)` early return above; the explicit `Extract<>` cast recovers that shape.
    const failure = outcome as Extract<PrimaryDecisionOutcome, { ok: false }>;
    switch (failure.reason) {
      case 'forbidden':
        return {
          response: {},
          message: 'You are not authorized to decide this request',
          status: HttpStatus.FORBIDDEN,
        };
      case 'conflict':
        return {
          response: {},
          message: 'This request was already answered',
          status: HttpStatus.CONFLICT,
        };
      case 'not_found':
        return {
          response: {},
          message: 'The request was not found',
          status: HttpStatus.NOT_FOUND,
        };
      case 'invalid_input':
        return {
          response: {},
          message: ShareResultRequestService.JUSTIFICATION_REQUIRED_MESSAGE,
          status: HttpStatus.BAD_REQUEST,
        };
      case 'internal_error':
      default:
        return {
          response: {},
          message: 'An unexpected error occurred',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
    }
  }

  /**
   * P2-3188 — notify the reporting centre when a Science Program contributor accepts or declines a
   * contribution.
   *
   * Recipients are the users of the result's **lead centre**, not of the owning initiative. The
   * `share_result_request` rows are initiative-scoped (`owner_initiative_id` /
   * `requester_initiative_id`) and the story asks for the centre, so the centre is derived from
   * `results_center`. A user belongs to a centre through `role_by_user.center_id` with
   * `role = CENTER_USER`, which is exactly what `getUserIdsByCenter` already queries.
   *
   * Never throws: accepting or declining must not fail because a notification could not be sent.
   */
  private async emitContributionDecisionNotification(
    findShare: any,
    requestStatusId: number,
    user: TokenDto,
  ): Promise<void> {
    try {
      const notificationType =
        ShareResultRequestService.CONTRIBUTION_DECISION_TYPES[requestStatusId];

      // Only the two terminal decisions notify. Anything else (a request still pending, or a
      // status added later) is deliberately silent rather than sending a misleading message.
      if (!notificationType) {
        return;
      }

      if (!this._notificationService) {
        this._logger.warn(
          `NotificationService unavailable; skipping contribution decision notification for result ${findShare?.result_id}`,
        );
        return;
      }

      const resultId = Number(findShare?.result_id);
      if (!Number.isFinite(resultId) || resultId <= 0) {
        return;
      }

      const leadCenterCode = await this.resolveLeadCenterCode(resultId);
      if (!leadCenterCode) {
        // A result with no lead centre has nobody to tell. Normal for initiative-only results.
        this._logger.log(
          `Result ${resultId} has no lead centre; no contribution decision notification sent`,
        );
        return;
      }

      const recipientIds =
        await this._roleByUserRepository.getUserIdsByCenter(leadCenterCode);

      const recipients = recipientIds.filter((id) => id !== user.id);
      if (!recipients.length) {
        this._logger.log(
          `No centre users to notify for result ${resultId} (centre ${leadCenterCode})`,
        );
        return;
      }

      const suffix = await this.buildContributionDecisionSuffix(
        findShare,
        requestStatusId,
      );

      await this._notificationService.emitResultNotification(
        NotificationLevelEnum.RESULT,
        notificationType,
        recipients,
        user.id,
        resultId,
        suffix,
      );
    } catch (error) {
      this._logger.error(
        `Failed to emit contribution decision notification for result ${findShare?.result_id}`,
        error as Error,
      );
    }
  }

  /** CLARISA code of the result's lead centre, or null when none is flagged. */
  private async resolveLeadCenterCode(
    resultId: number,
  ): Promise<string | null> {
    const centers =
      await this._resultsCenterRepository.getAllResultsCenterByResultId(
        resultId,
      );

    const leadCenter = (centers ?? []).find(
      (center: any) => Number(center?.is_leading_result) === 1,
    );

    return leadCenter?.code ? String(leadCenter.code) : null;
  }

  /**
   * The half of the sentence that cannot be derived when the notification is read: which Science
   * Program decided, and what it decided. Stored on `notification.text`; the client supplies the
   * `"The result <code> - <title>"` lead-in. Same split as P2-3214.
   */
  private async buildContributionDecisionSuffix(
    findShare: any,
    requestStatusId: number,
  ): Promise<string> {
    const verb = requestStatusId === 2 ? 'accepted' : 'declined';

    let programCode: string | null = null;
    const sharedInitiativeId = Number(findShare?.shared_inititiative_id);

    if (Number.isFinite(sharedInitiativeId) && sharedInitiativeId > 0) {
      try {
        const initiative = await this._clarisaInitiativeRepository.findOne({
          where: { id: sharedInitiativeId },
        });
        programCode = initiative?.official_code ?? null;
      } catch (error) {
        this._logger.warn(
          `Could not resolve the deciding Science Program for initiative ${sharedInitiativeId}`,
          error as Error,
        );
      }
    }

    const by = programCode ? ` by ${programCode}` : '';
    return `contribution was ${verb}${by}. Click to see the result.`;
  }

  private createInvalidShareRequestResponse() {
    return {
      response: {},
      message: 'No valid share_result_request_id found',
      status: HttpStatus.BAD_REQUEST,
    };
  }

  private async updateShareResultRequest(
    rr: any,
    user: TokenDto,
    request_status_id: number,
  ) {
    await this._shareResultRequestRepository.update(
      rr.share_result_request_id,
      {
        approved_by: user.id,
        aprovaed_date: new Date(),
        request_status_id: request_status_id,
      },
    );
  }

  private async handleRequestApproval(
    findShare: any,
    rtr: any,
    user: TokenDto,
    dto: CreateShareResultRequestDto,
  ) {
    const { shared_inititiative_id, result_id, is_map_to_toc } = findShare;

    if (dto.request_status_id == 2) {
      await this.approveRequest(
        shared_inititiative_id,
        result_id,
        rtr,
        user,
        is_map_to_toc,
        dto,
        !!findShare?.from_toc,
      );
    } else {
      await this.deactivateTocResults(result_id, shared_inititiative_id);
    }
  }

  private async approveRequest(
    shared_inititiative_id: number,
    result_id: number,
    rtr: any,
    user: TokenDto,
    is_map_to_toc: boolean,
    dto: CreateShareResultRequestDto,
    from_toc = false,
  ) {
    try {
      const exists =
        await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(
          result_id,
          shared_inititiative_id,
          false,
        );

      if (!exists) {
        const newReIni = await this.createNewInitiativeEntry(
          shared_inititiative_id,
          result_id,
          user,
          from_toc,
        );
        await this.createBudgetForInitiative(newReIni.id, user);

        if (!is_map_to_toc) {
          await this.mapWorkPackagesToInitiative(
            rtr.result_toc_results,
            result_id,
            shared_inititiative_id,
            user,
            rtr?.planned_result,
          );
          await this.saveIndicatorsForPrimarySubmitter(dto, result_id);
        }
      } else {
        await this.activateExistingInitiativeEntry(exists, user, from_toc);
        await this.createOrUpdateBudgetForInitiative(exists.id, user);
        if (!is_map_to_toc) {
          await this.mapWorkPackagesToInitiative(
            rtr.result_toc_results,
            result_id,
            shared_inititiative_id,
            user,
            rtr?.planned_result,
          );
        }
        await this.saveIndicatorsForPrimarySubmitter(dto, result_id);
      }
    } catch (error) {
      this._logger.error('Error approving share result request', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async createNewInitiativeEntry(
    shared_initiative_id: number,
    result_id: number,
    user: TokenDto,
    from_toc = false,
  ) {
    const newResultByInitiative = new ResultsByInititiative();
    newResultByInitiative.initiative_id = shared_initiative_id;
    newResultByInitiative.initiative_role_id = 2;
    newResultByInitiative.result_id = result_id;
    newResultByInitiative.last_updated_by = user.id;
    newResultByInitiative.created_by = user.id;
    newResultByInitiative.from_toc = from_toc;

    return await this._resultByInitiativesRepository.save(
      newResultByInitiative,
    );
  }

  private async createBudgetForInitiative(
    result_initiative_id: number,
    user: TokenDto,
  ) {
    await this._resultInitiativeBudgetRepository.save({
      result_initiative_id,
      created_by: user.id,
      last_updated_by: user.id,
    });
  }

  private async activateExistingInitiativeEntry(
    exists: any,
    user: TokenDto,
    from_toc = false,
  ) {
    await this._resultByInitiativesRepository.update(exists.id, {
      is_active: true,
      from_toc,
      last_updated_by: user.id,
    });
  }

  private async createOrUpdateBudgetForInitiative(
    result_initiative_id: number,
    user: TokenDto,
  ) {
    const initBudget = await this._resultInitiativeBudgetRepository.findOne({
      where: { result_initiative_id },
    });

    if (!initBudget) {
      await this.createBudgetForInitiative(result_initiative_id, user);
    } else {
      await this._resultInitiativeBudgetRepository.update(
        result_initiative_id,
        {
          is_active: true,
          last_updated_by: user.id,
        },
      );
    }
  }

  private async mapWorkPackagesToInitiative(
    tocResults: any[],
    result_id: number,
    initiative_id: number,
    user: TokenDto,
    planned_result: any,
  ) {
    try {
      for (const toc of tocResults) {
        if (toc) {
          await this._resultsTocResultRepository.save({
            initiative_ids: initiative_id,
            toc_result_id: toc?.toc_result_id,
            created_by: user.id,
            last_updated_by: user.id,
            result_id,
            planned_result,
            action_area_outcome_id: toc?.action_area_outcome_id,
            is_active: true,
            toc_progressive_narrative: toc?.toc_progressive_narrative,
          });
        }
      }
      this._logger.log('Work packages mapped successfully');
    } catch (error) {
      this._logger.error('Error mapping work packages', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async saveIndicatorsForPrimarySubmitter(
    dto: CreateShareResultRequestDto,
    result_id: number,
  ) {
    if (dto.result_toc_result?.result_toc_results?.length) {
      await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
        dto,
        result_id,
      );
    }
  }

  private async deactivateTocResults(result_id: number, initiative_id: number) {
    await this._resultsTocResultRepository.update(
      { result_id, initiative_id },
      { is_active: false },
    );
  }

  async getResultRequestByUser(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);

      const requestData =
        await this._shareResultRequestRepository.getRequestByUser(
          user.id,
          role,
        );
      const requestPendingData =
        await this._shareResultRequestRepository.getPendingByUser(
          user.id,
          role,
        );

      return {
        response: { requestData, requestPendingData },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  // ============================================
  // VERSION 2 METHODS
  // ============================================

  /**
   * Version 2 of updateResultRequestByUser
   * Maintains the same logic as V1 but allows for future modifications
   * @param createShareResultsRequestDto - DTO with request data
   * @param user - Authenticated user token
   * @returns Response with updated request data
   */
  async updateResultRequestByUserV2(
    createShareResultsRequestDto: CreateShareResultRequestDto,
    user: TokenDto,
  ) {
    try {
      const {
        result_request: rr,
        result_toc_result: rtr,
        request_status_id,
      } = createShareResultsRequestDto;

      const res = await this._resultRepository.findOne({
        where: { id: rr.result_id, is_active: true },
        relations: { obj_version: true },
      });

      if (!res) {
        return {
          response: {},
          message: 'The result was not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!rr?.share_result_request_id) {
        return this.createInvalidShareRequestResponse();
      }

      // `PSR-T-4` — same dispatch as V1 (see its comment): load the row server-side and branch on
      // its `request_type`, never on a DTO field.
      const loadedRequestV2 = await this._shareResultRequestRepository.findOne({
        where: { share_result_request_id: rr.share_result_request_id },
      });

      if (loadedRequestV2?.request_type === RequestTypeEnum.PRIMARY) {
        return this.dispatchPrimaryDecision(
          loadedRequestV2,
          request_status_id,
          user,
          createShareResultsRequestDto.justification,
        );
      }

      await this.updateShareResultRequestV2(rr, user, request_status_id);

      const findShare = await this._shareResultRequestRepository.findOne({
        where: { share_result_request_id: rr.share_result_request_id },
      });

      await this.handleRequestApprovalV2(
        findShare,
        rtr,
        user,
        createShareResultsRequestDto,
      );

      // P2-3188 / P2-3187: the reporting centre is told what the SP contributor decided on BOTH
      // endpoint versions. Until 2026-09-04 only V1 emitted, which made the notification depend on
      // which version the client happened to route to (an accident of global state — see the
      // client-side notification-item trap notes). Last thing in the flow and non-blocking on
      // purpose — the decision is already persisted.
      await this.emitContributionDecisionNotification(
        findShare,
        request_status_id,
        user,
      );

      return {
        response: 'requestData',
        message: 'The requests have been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      this._logger.error('Error updating share result request V2', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Version 2 of updateShareResultRequest
   * Can be modified independently from V1
   */
  private async updateShareResultRequestV2(
    rr: any,
    user: TokenDto,
    request_status_id: number,
  ) {
    // Currently same as V1, but can be modified independently
    await this.updateShareResultRequest(rr, user, request_status_id);
  }

  /**
   * Version 2 of handleRequestApproval
   * Can be modified independently from V1
   */
  private async handleRequestApprovalV2(
    findShare: any,
    rtr: any,
    user: TokenDto,
    dto: CreateShareResultRequestDto,
  ) {
    const { shared_inititiative_id, result_id, is_map_to_toc } = findShare;

    if (dto.request_status_id == 2) {
      await this.approveRequestV2(
        shared_inititiative_id,
        result_id,
        rtr,
        user,
        is_map_to_toc,
        dto,
        !!findShare?.from_toc,
      );
    } else {
      // Reuse common method if logic is the same
      await this.deactivateTocResults(result_id, shared_inititiative_id);
    }
  }

  /**
   * Version 2 of approveRequest
   * Can be modified independently from V1
   */
  private async approveRequestV2(
    shared_inititiative_id: number,
    result_id: number,
    rtr: any,
    user: TokenDto,
    is_map_to_toc: boolean,
    dto: CreateShareResultRequestDto,
    from_toc = false,
  ) {
    try {
      const exists =
        await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(
          result_id,
          shared_inititiative_id,
          false,
        );

      if (!exists) {
        // Reuse common methods if logic is the same
        const newReIni = await this.createNewInitiativeEntry(
          shared_inititiative_id,
          result_id,
          user,
          from_toc,
        );
        await this.createBudgetForInitiative(newReIni.id, user);

        if (!is_map_to_toc) {
          await this.mapWorkPackagesToInitiativeV2(
            rtr.result_toc_results,
            result_id,
            shared_inititiative_id,
            user,
            rtr?.planned_result,
          );
          await this.saveIndicatorsForPrimarySubmitterV2(dto, result_id);
        }
      } else {
        // Reuse common methods if logic is the same
        await this.activateExistingInitiativeEntry(exists, user, from_toc);
        await this.createOrUpdateBudgetForInitiative(exists.id, user);
        if (!is_map_to_toc) {
          await this.mapWorkPackagesToInitiativeV2(
            rtr.result_toc_results,
            result_id,
            shared_inititiative_id,
            user,
            rtr?.planned_result,
          );
        }
        await this.saveIndicatorsForPrimarySubmitterV2(dto, result_id);
      }
    } catch (error) {
      this._logger.error('Error approving share result request V2', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Version 2 of mapWorkPackagesToInitiative
   * Can be modified independently from V1
   */
  private async mapWorkPackagesToInitiativeV2(
    tocResults: any[],
    result_id: number,
    initiative_id: number,
    user: TokenDto,
    planned_result: any,
  ) {
    try {
      for (const toc of tocResults) {
        if (toc) {
          await this._resultsTocResultRepository.save({
            initiative_ids: initiative_id,
            toc_result_id: toc?.toc_result_id,
            created_by: user.id,
            last_updated_by: user.id,
            result_id,
            planned_result,
            action_area_outcome_id: toc?.action_area_outcome_id,
            is_active: true,
            toc_progressive_narrative: toc?.toc_progressive_narrative,
            // V2: Add toc_level_id if needed
            toc_level_id: toc?.toc_level_id ?? null,
          });
        }
      }
      this._logger.log('Work packages mapped successfully V2');
    } catch (error) {
      this._logger.error('Error mapping work packages V2', error);
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * Version 2 of saveIndicatorsForPrimarySubmitter
   * Can be modified independently from V1
   */
  private async saveIndicatorsForPrimarySubmitterV2(
    dto: CreateShareResultRequestDto,
    result_id: number,
  ) {
    // Currently same as V1, but can be modified independently
    await this.saveIndicatorsForPrimarySubmitter(dto, result_id);
  }

  // ============================================
  // APPROVAL CHAIN (notifications/detail-side-panel — DSP-R-12)
  // ============================================

  /**
   * @akili-spec notifications/detail-side-panel
   * DSP-R-12, design.md §4.1/§7 — 400 on a non-positive-integer id, 404 when the result is missing
   * or inactive, 403 when the viewer is neither an admin nor involved in the result (no response
   * body data leaks in that case — just the thrown message). Authorization goes through the real
   * `$_getMaxRoleByUser` / `role_by_user` lookups (not a stub), same source as
   * `getUserInitiatives()` above.
   */
  async getApprovalChain(resultId: number | string, user: TokenDto) {
    try {
      const parsedResultId = this.parseApprovalChainResultId(resultId);

      const resultRow =
        await this._shareResultRequestRepository.getResultForApprovalChain(
          parsedResultId,
        );

      if (!resultRow || !resultRow.is_active) {
        throw {
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const { submissionRow, initiativeRoleRows, requestRows } =
        await this._shareResultRequestRepository.getApprovalChainData(
          parsedResultId,
        );

      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const viewerInitiatives = await this.getUserInitiatives(user);
      const viewerInitiativeIds = viewerInitiatives.map((i) => i.initiative_id);

      const isAdmin = role === 1;
      const isInvolved = this.isViewerInvolvedInApprovalChain(
        viewerInitiativeIds,
        initiativeRoleRows,
        requestRows,
      );

      if (!isAdmin && !isInvolved) {
        throw {
          message: 'You are not authorized to view this approval chain',
          status: HttpStatus.FORBIDDEN,
        };
      }

      const response = composeApprovalChain(
        parsedResultId,
        resultRow,
        submissionRow,
        initiativeRoleRows,
        requestRows,
        viewerInitiativeIds,
      );

      return {
        response,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private parseApprovalChainResultId(resultId: number | string): number {
    if (
      resultId === undefined ||
      resultId === null ||
      !/^[1-9]\d*$/.test(String(resultId))
    ) {
      throw {
        message: 'resultId must be a positive integer',
        status: HttpStatus.BAD_REQUEST,
      };
    }
    return Number(resultId);
  }

  private isViewerInvolvedInApprovalChain(
    viewerInitiativeIds: number[],
    initiativeRoleRows: ApprovalChainInitiativeRoleRow[],
    requestRows: ApprovalChainRequestRow[],
  ): boolean {
    if (!viewerInitiativeIds.length) {
      return false;
    }

    const viewerSet = new Set(viewerInitiativeIds);
    const involvedIds = new Set<number>();

    for (const row of initiativeRoleRows) {
      involvedIds.add(row.initiative_id);
    }

    for (const row of requestRows) {
      [
        row.shared_inititiative_id,
        row.owner_initiative_id,
        row.requester_initiative_id,
        row.approving_inititiative_id,
      ]
        .filter((id): id is number => id !== null && id !== undefined)
        .forEach((id) => involvedIds.add(id));
    }

    for (const id of involvedIds) {
      if (viewerSet.has(id)) {
        return true;
      }
    }

    return false;
  }
}
