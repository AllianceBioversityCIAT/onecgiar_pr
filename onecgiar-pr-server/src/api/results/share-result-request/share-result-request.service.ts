import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { UpdateShareResultRequestDto } from './dto/update-share-result-request.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';
import { ResultRepository } from '../result.repository';
import { getResultIdFullData } from '../dto/get-result-id-full.dto';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../versions/entities/version.entity';
import { ResultsTocResult } from '../results-toc-results/entities/results-toc-result.entity';
import { ResultsTocResultRepository } from '../results-toc-results/results-toc-results.repository';

@Injectable()
export class ShareResultRequestService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository
  ) { }

  create(createShareResultRequestDto: CreateShareResultRequestDto) {
    return 'This action adds a new shareResultRequest';
  }

  async resultRequest(createTocShareResult: CreateTocShareResult, resultId: number, user: TokenDto) {
    try {
      const result: getResultIdFullData = await <any>this._resultRepository.getResultById(resultId);
      let saveData = [];
      if (createTocShareResult?.initiativeShareId?.length) {
        const { initiativeShareId } = createTocShareResult;
        let saredInit: ShareResultRequest[] = [];
        for (let index = 0; index < initiativeShareId.length; index++) {
          const shareInitId = initiativeShareId[index];
          const initExist = await this._resultByInitiativesRepository.getContributorInitiativeByResultAndInit(resultId, shareInitId);
          const requestExist = await this._shareResultRequestRepository.shareResultRequestExists(resultId, result.initiative_id, shareInitId);
          if (!requestExist && !(requestExist?.request_status_id == 1 || requestExist?.request_status_id == 2) && !initExist) {
            const newShare = new ShareResultRequest();
            newShare.result_id = resultId;
            newShare.request_status_id = 1;
            newShare.owner_initiative_id = result.initiative_id;
            newShare.requester_initiative_id = createTocShareResult?.isToc? result.initiative_id: shareInitId;
            newShare.shared_inititiative_id = shareInitId;
            newShare.approving_inititiative_id = createTocShareResult?.isToc ? shareInitId : result.initiative_id;
            if (!createTocShareResult?.isToc) {
              newShare.action_area_outcome_id = createTocShareResult?.action_area_outcome_id;
              newShare.toc_result_id = createTocShareResult?.toc_result_id;
            }
            newShare.requested_by = user.id;
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
      const requestData = await this._shareResultRequestRepository.getRequestByUser(user.id);
      const requestPendingData = await this._shareResultRequestRepository.getPendingByUser(user.id);
      return {
        response: {
          requestData,
          requestPendingData
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
      const status = await this._shareResultRequestRepository.getAllRequestStatus();
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

      const { shared_inititiative_id, result_id, request_status_id, toc_result_id, action_area_outcome_id } = requestData;
      if (request_status_id == 2) {
        const exists = await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(result_id, shared_inititiative_id, false);
        if (!exists) {
          const newResultByInitiative = new ResultsByInititiative();
          newResultByInitiative.initiative_id = shared_inititiative_id
          newResultByInitiative.initiative_role_id = 2;
          newResultByInitiative.result_id = result_id;
          newResultByInitiative.last_updated_by = user.id;
          newResultByInitiative.created_by = user.id;
          newResultByInitiative.version_id = vrs.id;
          
          const result = await this._resultRepository.getResultById(result_id);
          const newRtR = new ResultsTocResult();
          newRtR.version_id = vrs.id;
          newRtR.created_by = user.id;
          newRtR.last_updated_by = user.id;
          newRtR.planned_result = null;
          newRtR.results_id = result.id;
          newRtR.initiative_id = shared_inititiative_id;
          if (result.result_level_id == 2) {
            newRtR.action_area_outcome_id = action_area_outcome_id || null;
          } else {
            newRtR.toc_result_id = toc_result_id || null;
          }

          await this._resultByInitiativesRepository.save(newResultByInitiative);
          const resultTocResult = await this._resultsTocResultRepository.existsResultTocResult(result.id, shared_inititiative_id);
          if(!resultTocResult){
            await this._resultsTocResultRepository.save(newRtR);
          }
        }
      }

      return {
        response: requestData,
        message: 'The requests have been updated corrector',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }



  findAll() {
    return `This action returns all shareResultRequest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} shareResultRequest`;
  }

  update(id: number, updateShareResultRequestDto: UpdateShareResultRequestDto) {
    return `This action updates a #${id} shareResultRequest`;
  }

  remove(id: number) {
    return `This action removes a #${id} shareResultRequest`;
  }
}

