import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { ResultRepository } from '../result.repository';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { In, IsNull, Not } from 'typeorm';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { UserNotificationSettingRepository } from '../../user_notification_settings/user_notification_settings.repository';
import Handlebars from 'handlebars';
import { ResultsTocResultsService } from '../results-toc-results/results-toc-results.service';
import { EmailNotificationManagementService } from '../../../shared/email-notification-management/email-notification-management.service';
import { env } from 'process';
import { EmailTemplate } from '../../../shared/email-notification-management/enum/email-notification.enum';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';

@Injectable()
export class ShareResultRequestService {
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

      console.log(technicalTeamEmailsRecord.value);
      this._emailNotificationManagementService.sendEmail({
        from: { email: env.EMAIL_SENDER, name: 'Reporting tool -' },
        emailBody: {
          subject: emailData.subject,
          to,
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
        relations: ['obj_user'],
      }),
    ]);
  }

  private async getEmailRecipients(
    initMembers: any[],
    emailTemplate: string,
    sharedInitiativeId?: number,
    initOwner?: number,
  ) {
    const users = initMembers.map((m) => m.obj_user.id);
    const userEnable = await this._userNotificationSettingsRepository.find({
      where: {
        user_id: In(users),
        email_notifications_contributing_request_enabled: true,
        initiative_id:
          emailTemplate === EmailTemplate.CONTRIBUTION
            ? sharedInitiativeId
            : initOwner,
      },
      relations: ['obj_user'],
    });
    return userEnable.map((u) => u.obj_user.email);
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

      const whereConditions = this.buildWhereConditions(inits, role);

      const receivedContributionsPendingOwner = await this.getPendingRequests(
        whereConditions.pendingOwner,
      );
      const receivedContributionsPendingShared = await this.getPendingRequests(
        whereConditions.pendingShared,
      );
      const receivedContributionsDone = await this.getDoneRequests(
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

  private async getUserInitiatives(user: TokenDto) {
    return await this._roleByUserRepository.find({
      where: { user: user.id, active: true, initiative_id: Not(IsNull()) },
    });
  }

  private buildWhereConditions(inits: any[], role: number) {
    const sharedInitiativeIds = inits.map((i) => i.initiative_id);
    const commonConditions = {
      request_status_id: 1,
      is_active: true,
      obj_result: { is_active: true },
    };

    return {
      pendingOwner:
        role !== 1
          ? {
              ...commonConditions,
              shared_inititiative_id: In(sharedInitiativeIds),
            }
          : commonConditions,
      pendingShared:
        role !== 1
          ? {
              ...commonConditions,
              owner_initiative_id: In(sharedInitiativeIds),
            }
          : commonConditions,
      done: {
        ...commonConditions,
        request_status_id: In([2, 3]),
        shared_inititiative_id: In(sharedInitiativeIds),
      },
    };
  }

  private async getPendingRequests(whereCondition: any) {
    return await this._shareResultRequestRepository.find({
      select: this.getRequestSelectFields(),
      relations: this.getRequestRelations(),
      where: whereCondition,
    });
  }

  private async getDoneRequests(whereCondition: any) {
    return await this._shareResultRequestRepository.find({
      select: this.getRequestSelectFields(),
      relations: this.getRequestRelations(),
      where: whereCondition,
    });
  }

  private getRequestSelectFields() {
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

  private getRequestRelations() {
    return {
      obj_request_status: true,
      obj_result: {
        obj_version: true,
        obj_result_type: true,
        obj_result_level: true,
        obj_results_toc_result: true,
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

      const whereConditions = this.buildWhereConditions(inits, role);

      const sentContributionsPendingOwner = await this.getPendingRequests(
        whereConditions.pendingOwner,
      );
      const sentContributionsPendingShared = await this.getPendingRequests(
        whereConditions.pendingShared,
      );
      const sentContributionsDone = await this.getDoneRequests(
        whereConditions.done,
      );

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

      if (!res?.obj_version?.status) {
        return this.createInactiveResultResponse();
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
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private createInactiveResultResponse() {
    return {
      response: {},
      message: 'The result is not active',
      status: HttpStatus.BAD_REQUEST,
    };
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

      await this.mapWorkPackagesToInitiative(
        rtr.result_toc_results,
        result_id,
        shared_inititiative_id,
        user,
        rtr?.planned_result,
      );
      await this.saveIndicatorsForPrimarySubmitter(dto, result_id);
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
