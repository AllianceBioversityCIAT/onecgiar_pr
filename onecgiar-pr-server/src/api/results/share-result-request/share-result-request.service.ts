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
import { ConfigMessageDto } from '../../../shared/email-notification-management/dto/send-email.dto';
import { EmailNotificationManagementService } from '../../../shared/email-notification-management/email-notification-management.service';

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

      const saveData =
        await this._shareResultRequestRepository.save(shareInitRequests);

      await this.sendEmailsForShareRequests(
        shareInitRequests,
        user,
        resultId,
        createTocShareResult.email_template,
      );

      return {
        response: saveData,
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

      console.log(
        !requestExist,
        requestExist?.request_status_id !== 1,
        !initExist?.is_active,
      );
      if (
        !requestExist &&
        requestExist?.request_status_id !== 1 &&
        !initExist?.is_active
      ) {
        const newShare = this.buildShareResultRequest(
          createTocShareResult,
          resultId,
          initiativeId,
          shareInitId,
          user,
        );
        shareInitRequests.push(newShare);

        if (createTocShareResult.isToc === true) {
          console.log('shi');

          await this._resultsTocResultService.saveResultTocResultContributor(
            createTocShareResult.contributors_result_toc_result,
            user,
            resultId,
            resultId,
            initiativeId,
          );
        }
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
    newShare.is_map_to_toc = createTocShareResult?.isToc ? true : false;

    newShare.requested_by = user.id;

    return newShare;
  }

  private async sendEmailsForShareRequests(
    shareInitRequests: ShareResultRequest[],
    user: TokenDto,
    resultId: number,
    emailTemplate: string,
  ) {
    for (const request of shareInitRequests) {
      const [initOwner, result, initContributing, initMembers] =
        await Promise.all([
          this._clarisaInitiativeRepository.findOne({
            where: { id: request.owner_initiative_id },
          }),
          this._resultRepository.findOne({ where: { id: resultId } }),
          this._clarisaInitiativeRepository.findOne({
            where: { id: request.shared_inititiative_id },
          }),
          this._roleByUserRepository.find({
            where: {
              initiative_id: request.shared_inititiative_id,
              role: In([3, 4, 5]),
              active: true,
            },
            relations: ['obj_user'],
          }),
        ]);

      const users = initMembers.map((m) => m.obj_user.id);

      const userEnable = await this._userNotificationSettingsRepository.find({
        where: {
          user_id: In(users),
          email_notifications_contributing_request_enabled: true,
          initiative_id: request.shared_inititiative_id,
        },
        relations: ['obj_user'],
      });

      const to = userEnable.map((u) => u.obj_user.email);

      const template = await this._templateRepository.findOne({
        where: { name: emailTemplate },
      });

      if (!template?.template) {
        throw new Error(`Template with name ${template.template} not found`);
      }

      const handle = Handlebars.compile(template.template);

      const emailData = this._emailNotificationManagementService.buildEmailData(
        template.name,
        {
          initContributing,
          user,
          initOwner,
          result,
        },
      );

      const email: ConfigMessageDto = {
        from: { email: 'ClarisaSupport@cgiar.org', name: 'PRMS' },
        emailBody: {
          subject: emailData.subject,
          to,
          cc: [user.email, 'j.delgado@cgiar.org', 'k.collazos@cgiar.org'],
          message: {
            text: 'Contribution request',
            socketFile: handle(emailData),
          },
        },
      };

      this._emailNotificationManagementService.sendEmail(email);
    }
  }

  async getReceivedResultRequest(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);

      const inits = await this._roleByUserRepository.find({
        where: {
          user: user.id,
          active: true,
          initiative_id: Not(IsNull()),
        },
      });

      const wherePendingConditionSharing: any = {
        request_status_id: 1,
        is_active: true,
        obj_result: {
          is_active: true,
        },
      };

      const wherePendingConditionOwner: any = {
        request_status_id: 1,
        is_active: true,
        is_map_to_toc: true,
        obj_result: {
          is_active: true,
        },
      };

      const whereDoneCondition: any = {
        request_status_id: In([2, 3]),
        is_active: true,
        obj_result: {
          is_active: true,
        },
      };

      if (role !== 1) {
        wherePendingConditionSharing.shared_inititiative_id = In(
          inits.map((i) => i.initiative_id),
        );

        wherePendingConditionOwner.owner_initiative_id = In(
          inits.map((i) => i.initiative_id),
        );

        whereDoneCondition.shared_inititiative_id = In(
          inits.map((i) => i.initiative_id),
        );
      }

      const receivedContributionsPendingOwner =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: wherePendingConditionOwner,
        });

      const receivedContributionsPendingShared =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: wherePendingConditionSharing,
        });

      const receivedContributionsDone =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: whereDoneCondition,
        });

      return {
        response: {
          receivedContributionsPending: [
            ...receivedContributionsPendingOwner,
            ...receivedContributionsPendingShared,
          ],
          receivedContributionsDone,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getSentResultRequest(user: TokenDto) {
    try {
      const role = await this._roleByUserRepository.$_getMaxRoleByUser(user.id);

      const inits = await this._roleByUserRepository.find({
        where: {
          user: user.id,
          active: true,
          initiative_id: Not(IsNull()),
        },
      });

      const wherePendingConditionSharing: any = {
        request_status_id: 1,
        is_active: true,
        requested_by: user.id,
        obj_result: {
          is_active: true,
        },
      };

      const wherePendingConditionOwner: any = {
        request_status_id: 1,
        is_active: true,
        is_map_to_toc: true,
        requested_by: user.id,
        obj_result: {
          is_active: true,
        },
      };

      const whereDoneCondition: any = {
        request_status_id: In([2, 3]),
        requested_by: user.id,
        is_active: true,
        obj_result: {
          obj_results_toc_result: {
            is_active: true,
          },
        },
      };

      if (role !== 1) {
        wherePendingConditionSharing.owner_initiative_id = In(
          inits.map((i) => i.initiative_id),
        );

        wherePendingConditionOwner.owner_initiative_id = In(
          inits.map((i) => i.initiative_id),
        );

        whereDoneCondition.owner_initiative_id = In(
          inits.map((i) => i.initiative_id),
        );
      }

      const sentContributionsPendingOwner =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: wherePendingConditionOwner,
        });

      const sentContributionsPendingShared =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: wherePendingConditionSharing,
        });

      const sentContributionsDone =
        await this._shareResultRequestRepository.find({
          select: {
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
          },
          relations: {
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
          },
          where: whereDoneCondition,
        });

      return {
        response: {
          sentContributionsPending: [
            ...sentContributionsPendingOwner,
            ...sentContributionsPendingShared,
          ],
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
      const { result_request: rr, result_toc_result: rtr } =
        createShareResultsRequestDto;

      const res = await this._resultRepository.findOne({
        where: {
          id: rr.result_id,
          is_active: true,
        },
        relations: {
          obj_version: true,
        },
      });

      if (!res.obj_version.status) {
        return {
          response: {},
          message: 'The result is not active',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!rr?.share_result_request_id) {
        return {
          response: {},
          message: 'No valid share_result_request_id found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      await this._shareResultRequestRepository.update(
        rr.share_result_request_id,
        {
          approved_by: user.id,
          aprovaed_date: new Date(),
          request_status_id: createShareResultsRequestDto.request_status_id,
        },
      );

      const findShare = await this._shareResultRequestRepository.findOne({
        where: {
          share_result_request_id: rr.share_result_request_id,
        },
      });

      const {
        shared_inititiative_id,
        result_id,
        request_status_id,
        is_map_to_toc,
      } = findShare;

      if (request_status_id == 2) {
        const exists =
          await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(
            result_id,
            shared_inititiative_id,
            false,
          );
        if (!exists) {
          const newResultByInitiative = new ResultsByInititiative();
          newResultByInitiative.initiative_id = shared_inititiative_id;
          newResultByInitiative.initiative_role_id = 2;
          newResultByInitiative.result_id = result_id;
          newResultByInitiative.last_updated_by = user.id;
          newResultByInitiative.created_by = user.id;
          const result = await this._resultRepository.getResultById(result_id);
          const newReIni = await this._resultByInitiativesRepository.save(
            newResultByInitiative,
          );

          await this._resultInitiativeBudgetRepository.save({
            result_initiative_id: newReIni.id,
            created_by: user.id,
            last_updated_by: user.id,
          });

          if (!is_map_to_toc) {
            // * Map multiple WPs to the same initiative
            for (const toc of rtr.result_toc_results) {
              if (toc) {
                await this._resultsTocResultRepository.save({
                  initiative_ids: shared_inititiative_id,
                  toc_result_id: toc?.toc_result_id,
                  created_by: user.id,
                  last_updated_by: user.id,
                  result_id: result.id,
                  planned_result: rtr?.planned_result,
                  action_area_outcome_id: toc?.action_area_outcome_id,
                  is_active: true,
                  toc_progressive_narrative: toc?.toc_progressive_narrative,
                });
              }
            }

            if (rtr?.result_toc_results?.length) {
              await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
                createShareResultsRequestDto,
                result_id,
              );
            }
          }
        } else {
          const result = await this._resultRepository.getResultById(result_id);
          await this._resultByInitiativesRepository.update(exists.id, {
            is_active: true,
            last_updated_by: user.id,
          });

          const initBudget =
            await this._resultInitiativeBudgetRepository.findOne({
              where: {
                result_initiative_id: exists.id,
              },
            });

          if (!initBudget) {
            await this._resultInitiativeBudgetRepository.save({
              result_initiative_id: exists.id,
              created_by: user.id,
              last_updated_by: user.id,
            });
          } else {
            await this._resultInitiativeBudgetRepository.update(exists.id, {
              is_active: true,
              last_updated_by: user.id,
            });
          }

          // * Map multiple WPs to the same initiative
          for (const toc of rtr.result_toc_results) {
            if (toc) {
              await this._resultsTocResultRepository.save({
                initiative_ids: shared_inititiative_id,
                toc_result_id: toc?.toc_result_id,
                created_by: user.id,
                last_updated_by: user.id,
                result_id: result.id,
                planned_result: rtr?.planned_result,
                action_area_outcome_id: toc?.action_area_outcome_id,
                toc_progressive_narrative: toc?.toc_progressive_narrative,
                is_active: true,
              });
            }
          }
          if (rtr?.result_toc_results?.length) {
            await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
              createShareResultsRequestDto,
            );
          }
        }
        const auxBody: any = rr;
        await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
          auxBody?.bodyNewTheoryOfChanges,
        );
      }

      return {
        response: 'requestData',
        message: 'The requests have been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
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
        response: {
          requestData,
          requestPendingData,
        },
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
