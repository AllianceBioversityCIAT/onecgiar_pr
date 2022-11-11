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

@Injectable()
export class ResultsTocResultsService {

  constructor(
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versionsService: VersionsService,
    private readonly _userRepository: UserRepository
  ) { }

  async create(createResultsTocResultDto: CreateResultsTocResultDto, user: TokenDto) {
    try {
      const { contributing_np_projects, result_id, contributing_center, contributing_initiatives, result_toc_result, contributors_result_toc_result } = createResultsTocResultDto;
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const titleArray = contributing_np_projects.map(el => el.grant_title);

      if (contributing_center.filter(el => el.primary == true).length > 1) {
        contributing_center.map(el => {el.primary = false;});
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
              resultData.lead_center_id = contributing_np_projects[index].lead_center.code;
              resultData.is_active = true;
              resultData.last_updated_by = user.id;
              resultTocResultArray.push(resultData);
            } else {
              const newNpProject = new NonPooledProject();
              newNpProject.results_id = result_id;
              newNpProject.center_grant_id = contributing_np_projects[index].center_grant_id;
              newNpProject.funder_institution_id = contributing_np_projects[index].funder.institutions_id;
              newNpProject.lead_center_id = contributing_np_projects[index].lead_center.code;
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
      
      if(this.validResultRocResult(result_toc_result?.planned_result,result_toc_result?.outcome_id, result_toc_result?.toc_result_id)){
        const restulTocResultsave = await this.resultTocResultSave(result_toc_result, result_toc_result.planned_result, user, result_id, vrs.id);
        await this._resultsTocResultRepository.save(restulTocResultsave);
      }

      if (contributors_result_toc_result?.length) {
        let restulTocResultsaveArray: ResultsTocResult[] = [];
        for (let index = 0; index < contributors_result_toc_result.length; index++) {
          const { result_toc_result: resTocRes } = contributors_result_toc_result[index];
          if (await this._userRepository.isUserInInitiative(resTocRes.results_id, user.id) || this.validResultRocResult(resTocRes?.planned_result,resTocRes?.outcome_id, resTocRes?.toc_result_id)) {
            restulTocResultsaveArray.push(await this.resultTocResultSave(resTocRes, resTocRes.planned_result, user, resTocRes.results_id, vrs.id));
          }
        }
        await this._resultsTocResultRepository.save(restulTocResultsaveArray);
      }


      return {
        response: {},
        message: 'The toc data is successfully created',
        status: HttpStatus.CREATED,
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private validResultRocResult(planned_result?:boolean, outcome_id?:number, toc_result_id?:number){
    return !((!planned_result && !outcome_id) ||
    (planned_result && !toc_result_id));
  }

  private async resultTocResultSave(result_toc_result: resultToResultInterfaceToc, result_planned: boolean, user: TokenDto, result_id: number, versionId: number) {
    const resultTocExists = await this._resultsTocResultRepository.getAllResultTocResultByResultId(result_id);

    if (resultTocExists) {
      resultTocExists.last_updated_by = user.id
      resultTocExists.planned_result = result_planned;
      if (result_planned) {
        resultTocExists.toc_result_id = result_toc_result.toc_result_id;
        resultTocExists.action_area_outcome_id = null;
      } else {
        resultTocExists.toc_result_id = null;
        resultTocExists.action_area_outcome_id = result_toc_result.outcome_id;

      }
      return resultTocExists;
    } else {
      const newResltTocResult = new ResultsTocResult();
      newResltTocResult.planned_result = result_planned;
      if (result_planned) {
        newResltTocResult.toc_result_id = result_toc_result.toc_result_id;
        newResltTocResult.action_area_outcome_id = null;
      } else {
        newResltTocResult.toc_result_id = null;
        newResltTocResult.action_area_outcome_id = result_toc_result.outcome_id;
      }
      newResltTocResult.results_id = result_id;
      newResltTocResult.last_updated_by = user.id;
      newResltTocResult.created_by = user.id;
      newResltTocResult.version_id = versionId;
      return newResltTocResult;
    }
  }


  findAll() {
    return `This action returns all resultsTocResults`;
  }

  async getTocByResult(resultId: number) {
    try {
      const conInit = await this._resultByInitiativesRepository.getContributorInitiativeByResult(resultId);
      const npProject = await this._nonPooledProjectRepository.getAllNPProjectByResultId(resultId);
      const resCenters = await this._resultsCenterRepository.getAllResultsCenterByResultId(resultId);
      const resTocRes = await this._resultsTocResultRepository.getAllResultTocResultByResultId(resultId);
      const conResTocRes = await this._resultsTocResultRepository.getAllResultTocResultContributorsByResultIdAndInitId(resultId, conInit.map(el => el.id));
      resTocRes.planned_result = !!resTocRes.planned_result;
      conResTocRes.map(el => { el.planned_result = !!el.planned_result });
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
  outcome_id?: number;
  planned_result: boolean;
}
