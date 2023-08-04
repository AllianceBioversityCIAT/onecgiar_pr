import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { UpdateShareResultRequestDto } from './dto/update-share-result-request.dto';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { ResultRepository } from '../result.repository';
import { getResultIdFullData } from '../dto/get-result-id-full.dto';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../../versioning/entities/version.entity';
import { ResultsTocResult } from '../results-toc-results/entities/results-toc-result.entity';
import { ResultsTocResultRepository } from '../results-toc-results/results-toc-results.repository';
import { Result } from '../entities/result.entity';
import { getRepository } from 'typeorm';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';

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
  ) {}

  create(createShareResultRequestDto: CreateShareResultRequestDto) {
    return 'This action adds a new shareResultRequest';
  }

  async resultRequest(
    createTocShareResult: CreateTocShareResult,
    resultId: number,
    user: TokenDto,
  ) {
    try {
      
      
      /*const result: any = await this._resultRepository.getResultById(
        parseInt(`${resultId}`),
      );*/
      let result: { initiative_id: number } = { initiative_id: null };
      const res = await this._resultByInitiativesRepository.InitiativeByResult(
        resultId,
      );
      result['initiative_id'] = res.length ? res[0].id : null;

      let saveData = [];
      if (createTocShareResult?.initiativeShareId?.length) {
        const { initiativeShareId } = createTocShareResult;
        let saredInit: ShareResultRequest[] = [];
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
      const requestData =
        await this._shareResultRequestRepository.getRequestByUser(user.id);
      const requestPendingData =
        await this._shareResultRequestRepository.getPendingByUser(user.id);
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

  async updateResultRequestByUser(data: ShareResultRequest, user: TokenDto) {
    try {
      
      
      const res = await this._resultRepository.findOne({
        where: {
          id: data.result_id,
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

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      if (!data?.share_result_request_id) {
        throw {
          response: {},
          message: 'No valid share_result_request_id found',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      data.approved_by = user.id;
      data.aprovaed_date = new Date();
      const requestData = await this._shareResultRequestRepository.save(data);

      const {
        shared_inititiative_id,
        result_id,
        request_status_id,
        toc_result_id,
        action_area_outcome_id,
        planned_result,
      } = requestData;
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
          const newRtR = new ResultsTocResult();
          newRtR.planned_result = planned_result;
          newRtR.created_by = user.id;
          newRtR.last_updated_by = user.id;
          newRtR.results_id = result.id;
          newRtR.initiative_id = shared_inititiative_id;
          if (result.result_level_id == 2) {
            newRtR.action_area_outcome_id = action_area_outcome_id || null;
          } else {
            newRtR.toc_result_id = toc_result_id || null;
          }

          const newReIni = await this._resultByInitiativesRepository.save(
            newResultByInitiative,
          );

          await this._resultInitiativeBudgetRepository.save({
            result_initiative_id: newReIni.id,
            created_by: user.id,
            last_updated_by: user.id,
          });

          const resultTocResult =
            await this._resultsTocResultRepository.existsResultTocResult(
              result.id,
              shared_inititiative_id,
            );
          if (!resultTocResult) {
            await this._resultsTocResultRepository.save(newRtR);
          } else {
            await this._resultsTocResultRepository.update(
              resultTocResult.result_toc_result_id,
              {
                planned_result: planned_result,
                toc_result_id: toc_result_id,
                action_area_outcome_id: action_area_outcome_id,
              },
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

          const resultTocResult =
            await this._resultsTocResultRepository.existsResultTocResult(
              result.id,
              shared_inititiative_id,
            );
          if (!resultTocResult) {
            const newRtR = new ResultsTocResult();
            newRtR.planned_result = planned_result;
            newRtR.created_by = user.id;
            newRtR.last_updated_by = user.id;
            newRtR.results_id = result.id;
            newRtR.initiative_id = shared_inititiative_id;
            if (result.result_level_id == 2) {
              newRtR.action_area_outcome_id = action_area_outcome_id || null;
            } else {
              newRtR.toc_result_id = toc_result_id || null;
            }
            await this._resultsTocResultRepository.save(newRtR);
          } else {
            resultTocResult.is_active = true;
            resultTocResult.planned_result = planned_result;
            if (result.result_level_id == 2) {
              resultTocResult.action_area_outcome_id =
                action_area_outcome_id || null;
            } else {
              resultTocResult.toc_result_id = toc_result_id || null;
            }
            const rtr_id = resultTocResult.result_toc_result_id;
            delete resultTocResult.result_toc_result_id;
            await this._resultsTocResultRepository.update(rtr_id, {
              toc_result_id: resultTocResult.toc_result_id,
              action_area_outcome_id: resultTocResult.action_area_outcome_id,
              planned_result: resultTocResult.planned_result,
              last_updated_by: user.id,
            });
          }
        }
        let auxBody:any = data;
        await this._resultsTocResultRepository.saveSectionNewTheoryOfChange(auxBody?.bodyNewTheoryOfChanges)
      }

      return {
        response: requestData,
        message: 'The requests have been updated successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
