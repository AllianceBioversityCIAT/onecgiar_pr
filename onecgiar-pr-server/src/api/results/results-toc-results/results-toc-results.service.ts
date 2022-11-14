import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { UpdateResultsTocResultDto } from './dto/update-results-toc-result.dto';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProject } from '../non-pooled-projects/entities/non-pooled-project.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByInititiative } from '../results_by_inititiatives/entities/results_by_inititiative.entity';
import { VersionsService } from '../versions/versions.service';
import { Version } from '../versions/entities/version.entity';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultRepository } from '../result.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';

@Injectable()
export class ResultsTocResultsService {

  constructor(
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionsService: VersionsService,
    private readonly _userRepository: UserRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _tocResultsRepository: TocResultsRepository
  ) { }

  async create(createResultsTocResultDto: CreateResultsTocResultDto, user: TokenDto) {
    try {
      const { contributing_np_projects, result_id, contributing_center, contributing_initiatives, result_toc_result, contributors_result_toc_result } = createResultsTocResultDto;
      const version = await this._versionsService.findBaseVersion();
      const result = await this._resultRepository.getResultById(result_id);
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const titleArray = contributing_np_projects.map(el => el.grant_title);

      if (contributing_center.filter(el => el.primary == true).length > 1) {
        contributing_center.map(el => { el.primary = false; });
      }

      if (contributing_initiatives?.length) {
        const initiativeArray = contributing_initiatives.map(el => el.id);
        await this._resultByInitiativesRepository.updateResultByInitiative(result_id, initiativeArray, user.id, false);
        let resultsByInititiativeArray: ResultsByInititiative[] = [];
        for (let index = 0; index < contributing_initiatives.length; index++) {
          const exists = await this._resultByInitiativesRepository.getResultsByInitiativeByResultIdAndInitiativeIdAndRole(result_id, contributing_initiatives[index].id, false);
          if (!exists) {
            const newResultByInitiative = new ResultsByInititiative();
            newResultByInitiative.initiative_id = contributing_initiatives[index].id;
            newResultByInitiative.initiative_role_id = 2;
            newResultByInitiative.result_id = result_id;
            newResultByInitiative.last_updated_by = user.id;
            newResultByInitiative.created_by = user.id;
            newResultByInitiative.version_id = vrs.id;
            resultsByInititiativeArray.push(newResultByInitiative);
          }
        }
        await this._resultByInitiativesRepository.save(resultsByInititiativeArray);
      } else {
        await this._resultByInitiativesRepository.updateResultByInitiative(result_id, [], user.id, false);
      }

      if (contributing_np_projects?.length) {

        await this._nonPooledProjectRepository.updateNPProjectById(result_id, titleArray, user.id);
        let resultTocResultArray: NonPooledProject[] = [];
        for (let index = 0; index < contributing_np_projects.length; index++) {
          if (contributing_np_projects[index]?.grant_title.length) {
            const resultData = await this._nonPooledProjectRepository.getAllNPProjectById(result_id, contributing_np_projects[index].grant_title);

            if (resultData) {
              resultData.center_grant_id = contributing_np_projects[index].center_grant_id;
              resultData.funder_institution_id = contributing_np_projects[index].funder.institutions_id;
              resultData.lead_center_id = contributing_np_projects[index].lead_center;
              resultData.is_active = true;
              resultData.last_updated_by = user.id;
              resultTocResultArray.push(resultData);
            } else {
              const newNpProject = new NonPooledProject();
              newNpProject.results_id = result_id;
              newNpProject.center_grant_id = contributing_np_projects[index].center_grant_id;
              newNpProject.funder_institution_id = contributing_np_projects[index].funder.institutions_id;
              newNpProject.lead_center_id = contributing_np_projects[index].lead_center;
              newNpProject.grant_title = contributing_np_projects[index].grant_title;
              newNpProject.created_by = user.id;
              newNpProject.last_updated_by = user.id;
              resultTocResultArray.push(newNpProject);
            }
          }
        }
        await this._nonPooledProjectRepository.save(resultTocResultArray);
      } else {
        await this._nonPooledProjectRepository.updateNPProjectById(result_id, [], user.id);
      }

      if (contributing_center?.length) {
        const centerArray = contributing_center.map(el => el.code);
        await this._resultsCenterRepository.updateCenter(result_id, centerArray, user.id);
        let resultCenterArray: ResultsCenter[] = [];
        for (let index = 0; index < contributing_center.length; index++) {
          const exists = await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(result_id, contributing_center[index].code);
          if (!exists) {
            const newResultCenter = new ResultsCenter();
            newResultCenter.center_id = contributing_center[index].code;
            newResultCenter.result_id = result_id;
            newResultCenter.created_by = user.id;
            newResultCenter.last_updated_by = user.id;
            newResultCenter.is_primary = contributing_center[index].primary || false;
            resultCenterArray.push(newResultCenter);
          } else if (contributing_center[index]?.primary) {
            exists.is_primary = contributing_center[index].primary;
            exists.last_updated_by = user.id;
            resultCenterArray.push(exists);
          }
        }
        await this._resultsCenterRepository.save(resultCenterArray);
      } else {
        await this._resultsCenterRepository.updateCenter(result_id, [], user.id);
      }

      if (result.result_level_id != 2) {
        let RtR = await this._resultsTocResultRepository.getRTRById(result_toc_result?.result_toc_result_id, result_id, result_toc_result?.initiative_id);
        if(await this._tocResultsRepository.isTocResoultByInitiative(result.id, result_toc_result?.toc_result_id)){
          if (RtR) {
            RtR.toc_result_id = result_toc_result?.toc_result_id ?? null;
            RtR.last_updated_by = user.id;
            await this._resultsTocResultRepository.save(RtR);
          } else if(result_toc_result) {
            const newRtR = new ResultsTocResult();
            newRtR.version_id = vrs.id;
            newRtR.initiative_id = result_toc_result?.initiative_id;
            newRtR.created_by = user.id;
            newRtR.last_updated_by = user.id;
            newRtR.results_id = result.id;
            newRtR.toc_result_id = result_toc_result?.toc_result_id ?? null;
            newRtR.planned_result = result_toc_result?.planned_result ?? null;
            await this._resultsTocResultRepository.save(newRtR);
          }
        }
        
      } else {
        /**
         * !Implementar Action Area
         */
      }

      if (contributors_result_toc_result?.length) {
        if (result.result_level_id != 2) {
          let RtRArray: ResultsTocResult[] = [];
          for (let index = 0; index < contributors_result_toc_result.length; index++) {
            let RtR = await this._resultsTocResultRepository.getRTRById(contributors_result_toc_result[index].result_toc_result_id, result_id, contributors_result_toc_result[index].initiative_id );
            if (RtR) {
              RtR.toc_result_id = contributors_result_toc_result[index]?.toc_result_id ?? null;
              RtR.last_updated_by = user.id;
              RtRArray.push(RtR);
            } else {
              const newRtR = new ResultsTocResult();
              newRtR.version_id = vrs.id;
              newRtR.created_by = user.id;
              newRtR.last_updated_by = user.id;
              newRtR.results_id = result.id;
              newRtR.initiative_id = contributors_result_toc_result[index]?.initiative_id ?? null;
              newRtR.toc_result_id = contributors_result_toc_result[index]?.toc_result_id ?? null;
              newRtR.planned_result = contributors_result_toc_result[index]?.planned_result ?? null;
              RtRArray.push(newRtR);
            }

          }
          await this._resultsTocResultRepository.save(RtRArray);
        } else {
          /**
          * !Implementar Action Area
          */
        }
      }



      /*
      if (this.validResultRocResult(result_toc_result?.planned_result, result_toc_result?.action_area_outcome_id, result_toc_result?.toc_result_id)) {
        const restulTocResultsave = await this.resultTocResultSave(result_toc_result, result_toc_result.planned_result, user, result_id, vrs.id, result.result_level_id);
        await this._resultsTocResultRepository.save(restulTocResultsave);
      }
      if (contributors_result_toc_result?.length) {
        let restulTocResultsaveArray: ResultsTocResult[] = [];
        for (let index = 0; index < contributors_result_toc_result.length; index++) {
          if (true) {
            restulTocResultsaveArray.push(await this.resultTocResultSave(contributors_result_toc_result[index], contributors_result_toc_result[index].planned_result, user, contributors_result_toc_result[index]?.results_id, vrs.id, result.result_level_id));
          }
        }
        console.log(restulTocResultsaveArray)
        await this._resultsTocResultRepository.save(restulTocResultsaveArray);
      }*/


      return {
        response: {},
        message: 'The toc data is successfully created',
        status: HttpStatus.CREATED,
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private validResultRocResult(planned_result?: boolean, outcome_id?: number, toc_result_id?: number) {
    return ((!planned_result && outcome_id) ||
      (planned_result && toc_result_id));
  }


  findAll() {
    return `This action returns all resultsTocResults`;
  }

  async getTocByResult(resultId: number) {
    try {

      const result = await this._resultRepository.getResultById(resultId);
      const resultInit = await this._resultByInitiativesRepository.getOwnerInitiativeByResult(resultId);
      const conInit = await this._resultByInitiativesRepository.getContributorInitiativeByResult(resultId);
      const npProject = await this._nonPooledProjectRepository.getAllNPProjectByResultId(resultId);
      const resCenters = await this._resultsCenterRepository.getAllResultsCenterByResultId(resultId);
      let resTocRes: any = {};
      let conResTocRes: any = [];
      if(result.result_level_id != 2){
        resTocRes = await this._resultsTocResultRepository.getRTRPrimary(resultId, true);
        if(resTocRes){
          resTocRes['inititiative_id'] = resultInit.id;
          resTocRes['official_code'] = resultInit.official_code;
          resTocRes['short_name'] = resultInit.short_name;
        }else{
          resTocRes = {
            action_area_outcome_id: null,
            toc_result_id: null,
            planned_result: null,
            results_id: resultId,
            inititiative_id: resultInit.id,
            short_name: resultInit.short_name,
            official_code: resultInit.official_code
          }
        }
        conResTocRes = await this._resultsTocResultRepository.getRTRPrimary(resultId, false);
        
      }else{
        /**
         * !Implementar Action Area
         */
      }
      return {
        response: {
          contributing_initiatives: conInit,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: resTocRes,
          contributors_result_toc_result: conResTocRes
        },
        message: 'The toc data is successfully created',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  update(id: number, updateResultsTocResultDto: UpdateResultsTocResultDto) {
    return `This action updates a #${id} resultsTocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsTocResult`;
  }
}

interface resultToResultInterfaceToc {
  toc_result_id?: number;
  results_id: number;
  action_area_outcome_id?: number;
  planned_result: boolean;
}
