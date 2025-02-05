import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';
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
import { env } from 'process';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { SocketManagementService } from '../../../shared/microservices/socket-management/socket-management.service';
import { NotificationDto } from '../../../shared/microservices/socket-management/dto/create-socket.dto';

@Injectable()
export class ShareResultRequestService {
  private readonly _logger = new Logger(ShareResultRequestService.name);

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
    @Inject(forwardRef(() => SocketManagementService))
    private readonly _socketManagementService: SocketManagementService,
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

      if (!this.shouldCreateNewShareRequest(requestExist, initExist)) {
        continue;
      }

      if (initiativeId === shareInitId) {
        this._logger.warn('The owner initiative cannot be shared with itself');
        throw {
          message: 'The owner initiative cannot be shared with itself',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const newShare = this.buildShareResultRequest(
        createTocShareResult,
        resultId,
        initiativeId,
        shareInitId,
        user,
      );
      shareInitRequests.push(newShare);

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

  private shouldCreateNewShareRequest(
    requestExist: any,
    initExist: any,
  ): boolean {
    return (
      !requestExist &&
      requestExist?.request_status_id !== 1 &&
      !initExist?.is_active
    );
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
    newShare.requested_by = user.id;
    return newShare;
  }

  private async saveShareResultRequests(
    shareInitRequests: ShareResultRequest[],
    emailTemplate: string,
    resultId: number,
    user: TokenDto,
  ) {
    await this._shareResultRequestRepository.save(shareInitRequests);

    await this.sendEmailsForShareRequests(
      shareInitRequests,
      user,
      resultId,
      emailTemplate,
    );

    await this.sendSocketNotification(
      shareInitRequests,
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

      const to = await this.getEmailAndNotificationRecipients(
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

  private async sendSocketNotification(
    shareInitRequests: ShareResultRequest[],
    resultId: number,
    emailTemplate: string,
  ) {
    try {
      const usersOnlineResponse =
        await this._socketManagementService.getActiveUsers();

      const usersOnlineIds = usersOnlineResponse.response.map(
        (user: { userId: number }) => user.userId,
      );

      for (const request of shareInitRequests) {
        const [initOwner, result, , initMembers] =
          await this.getRequestRelatedData(request, resultId, emailTemplate);

        const receivers = await this.getEmailAndNotificationRecipients(
          initMembers,
          emailTemplate,
          request.shared_inititiative_id,
          initOwner.id,
        );

        if (!receivers.userNotification.length) {
          this._logger.warn(
            `No recipients found for request ID: ${request.share_result_request_id}`,
          );
          continue;
        }

        const matchUsers = receivers.userNotification.filter((userId) =>
          usersOnlineIds.includes(userId),
        );

        if (!matchUsers.length) {
          this._logger.warn(
            `No online users to notify for request ID: ${request.share_result_request_id}`,
          );
          continue;
        }

        const data = await this._shareResultRequestRepository.findOne({
          select: this.getRequestSelectFields(),
          relations: this.getRequestRelations(),
          where: {
            result_id: result.id,
            shared_inititiative_id: request.shared_inititiative_id,
          },
        });

        const description = data.is_map_to_toc
          ? `Request as contributor for result ${result.result_code}`
          : `Contribution request for result ${result.result_code}`;

        const notification: NotificationDto = {
          title: 'Contribution request',
          desc: description,
          result: data,
        };

        await this._socketManagementService.sendNotificationToUsers(
          matchUsers.map(String),
          notification,
        );
      }
    } catch (error) {
      this._logger.error('Error sending socket notifications', error);
      this._handlersError.returnErrorRes({ error, debug: true });
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

  private async getEmailAndNotificationRecipients(
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

    const usersNotification = initMembers.map((m) => m.obj_user.id);
    const userNotificationEnable =
      await this._userNotificationSettingsRepository.find({
        where: {
          user_id: In(usersNotification),
          email_notifications_updates_enabled: true,
          initiative_id:
            emailTemplate === EmailTemplate.CONTRIBUTION
              ? sharedInitiativeId
              : initOwner,
        },
        relations: { obj_user: true },
      });
    return {
      userEmail: userEmailEnable.map((u) => u.obj_user.email),
      userNotification: userNotificationEnable.map((u) => u.obj_user.id),
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

  async getReceivedResultRequest(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);
      const whereConditions = this.buildWhereReceivedConditions(inits, role);

      const receivedContributionsPendingOwner = await this.getRequest(
        whereConditions.pendingOwner,
      );
      const receivedContributionsPendingShared = await this.getRequest(
        whereConditions.pendingShared,
      );
      const receivedContributionsDone = await this.getRequest(
        whereConditions.done,
      );

      return {
        response: {
          receivedContributionsPending: this.combineAndDistinct(
            receivedContributionsPendingOwner,
            receivedContributionsPendingShared,
          ),
          receivedContributionsDone,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
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

      const receivedContributionsPendingOwner = await this.getRequest(
        whereConditions.pendingOwner,
      );
      const receivedContributionsPendingShared = await this.getRequest(
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
      done: [
        {
          ...commonConditions,
          request_status_id: In([2, 3]),
          is_active: true,
          obj_result: { is_active: true },
          shared_inititiative_id: In(sharedInitiativeIds),
          is_map_to_toc: false,
        },
        {
          ...commonConditions,
          request_status_id: In([2, 3]),
          is_active: true,
          obj_result: { is_active: true },
          owner_initiative_id: In(sharedInitiativeIds),
          is_map_to_toc: true,
        },
      ],
    };
  }

  private async getRequest(whereCondition: any) {
    return await this._shareResultRequestRepository.find({
      select: this.getRequestSelectFields(),
      relations: this.getRequestRelations(),
      where: whereCondition,
    });
  }

  private getRequestSelectFields(): FindOptionsSelect<ShareResultRequest> {
    return {
      share_result_request_id: true,
      result_id: true,
      requested_date: true,
      aprovaed_date: true,
      request_status_id: true,
      is_map_to_toc: true,
      obj_request_status: {
        request_status_id: true,
        name: true,
      },
      obj_result: {
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
        obj_version: true,
        obj_result_type: true,
        obj_result_level: true,
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

  async getSentResultRequest(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);
      const inits = await this.getUserInitiatives(user);

      const extraContidions: any = {
        requested_by: user.id,
      };
      const whereConditions = this.buildWhereSentConditions(
        inits,
        role,
        extraContidions,
      );

      const sentContributionsPendingOwner = await this.getRequest(
        whereConditions.pendingOwner,
      );
      const sentContributionsPendingShared = await this.getRequest(
        whereConditions.pendingShared,
      );
      const sentContributionsDone = await this.getRequest(whereConditions.done);

      return {
        response: {
          sentContributionsPending: this.combineAndDistinct(
            sentContributionsPendingOwner,
            sentContributionsPendingShared,
          ),
          sentContributionsDone,
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
      done: [
        {
          ...commonConditions,
          request_status_id: In([2, 3]),
          is_active: true,
          obj_result: { is_active: true },
          owner_initiative_id: In(sharedInitiativeIds),
          is_map_to_toc: false,
        },
        {
          ...commonConditions,
          request_status_id: In([2, 3]),
          is_active: true,
          obj_result: { is_active: true },
          shared_inititiative_id: In(sharedInitiativeIds),
          is_map_to_toc: true,
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
        await this.activateExistingInitiativeEntry(exists, user);
        await this.createOrUpdateBudgetForInitiative(exists.id, user);

        // await this.mapWorkPackagesToInitiative(
        //   rtr.result_toc_results,
        //   result_id,
        //   shared_inititiative_id,
        //   user,
        //   rtr?.planned_result,
        // );
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
  ) {
    const newResultByInitiative = new ResultsByInititiative();
    newResultByInitiative.initiative_id = shared_initiative_id;
    newResultByInitiative.initiative_role_id = 2;
    newResultByInitiative.result_id = result_id;
    newResultByInitiative.last_updated_by = user.id;
    newResultByInitiative.created_by = user.id;

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

  private async activateExistingInitiativeEntry(exists: any, user: TokenDto) {
    await this._resultByInitiativesRepository.update(exists.id, {
      is_active: true,
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
}
