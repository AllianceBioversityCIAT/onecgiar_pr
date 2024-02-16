import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { ResultRepository } from '../result.repository';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { ResultsTocResultRepository } from '../results-toc-results/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';

@Injectable()
export class ShareResultRequestService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultInitiativeBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
  ) {}

  async resultRequest(
    createTocShareResult: CreateTocShareResult,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      const result: { initiative_id: number } = { initiative_id: null };
      const res = await this._resultByInitiativesRepository.find({
        where: { result_id: resultId, initiative_role_id: 1, is_active: true },
      });

      result['initiative_id'] = res.length ? res[0]?.['initiative_id'] : null;
      let saveData = [];
      if (createTocShareResult?.initiativeShareId?.length) {
        const { initiativeShareId } = createTocShareResult;
        const saredInit: ShareResultRequest[] = [];
        for (let index = 0; index < initiativeShareId.length; index++) {
          const shareInitId = initiativeShareId[index];
          const initExist =
            await this._resultByInitiativesRepository.getContributorInitiativeByResultAndInit(
              resultId,
              shareInitId,
            );
          const requestExist =
            await this._shareResultRequestRepository.shareResultRequestExists(
              resultId,
              result.initiative_id,
              shareInitId,
            );
          if (
            !requestExist &&
            !(requestExist?.request_status_id == 1) &&
            !initExist?.is_active
          ) {
            const newShare = new ShareResultRequest();
            newShare.result_id = resultId;
            newShare.request_status_id = 1;
            newShare.owner_initiative_id = result.initiative_id;
            newShare.requester_initiative_id = createTocShareResult?.isToc
              ? result.initiative_id
              : shareInitId;
            newShare.shared_inititiative_id = shareInitId;
            newShare.approving_inititiative_id = createTocShareResult?.isToc
              ? shareInitId
              : result.initiative_id;
            if (!createTocShareResult?.isToc) {
              newShare.action_area_outcome_id =
                createTocShareResult?.action_area_outcome_id;
              newShare.toc_result_id = createTocShareResult?.toc_result_id;
            }
            newShare.requested_by = user.id;
            newShare.planned_result = createTocShareResult.planned_result;
            saredInit.push(newShare);
          }
        }
        saveData = await this._shareResultRequestRepository.save(saredInit);
      }

      return {
        response: saveData,
        message: 'The initiative was correctly reported',
        status: HttpStatus.CREATED,
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
        throw {
          response: res.obj_version,
          message: 'The version is closed',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!rr?.share_result_request_id) {
        throw {
          response: {},
          message: 'No valid share_result_request_id found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      rr.approved_by = user.id;
      rr.aprovaed_date = new Date();
      rr.request_status_id = createShareResultsRequestDto.request_status_id;
      const requestData = await this._shareResultRequestRepository.save({
        ...rr,
        last_updated_by: user.id,
      });

      const { shared_inititiative_id, result_id, request_status_id } =
        requestData;

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
              });
            }
          }

          if (rtr?.result_toc_results?.length) {
            await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
              createShareResultsRequestDto,
              result_id,
            );
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
}
