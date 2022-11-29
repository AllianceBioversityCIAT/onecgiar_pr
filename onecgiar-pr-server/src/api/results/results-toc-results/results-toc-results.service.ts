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
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsImpactAreaIndicator } from '../results-impact-area-indicators/entities/results-impact-area-indicator.entity';
import { ResultsImpactAreaTarget } from '../results-impact-area-target/entities/results-impact-area-target.entity';

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
    private readonly _tocResultsRepository: TocResultsRepository,
    private readonly _resultsImpactAreaTargetRepository: ResultsImpactAreaTargetRepository,
    private readonly _resultsImpactAreaIndicatorRepository: ResultsImpactAreaIndicatorRepository
  ) { }

  async create(createResultsTocResultDto: CreateResultsTocResultDto, user: TokenDto) {
    try {
      let { contributing_np_projects, result_id, contributing_center, contributing_initiatives, result_toc_result, contributors_result_toc_result, impacts } = createResultsTocResultDto;
      const version = await this._versionsService.findBaseVersion();
      const result = await this._resultRepository.getResultById(result_id);
      let initiativeArray: number[] = [];
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const titleArray = contributing_np_projects.map(el => el.grant_title);
      if (contributing_center.filter(el => el.primary == true).length > 1) {
        contributing_center.map(el => { el.primary = false; });
      }

      if (contributing_initiatives?.length) {
        initiativeArray = contributing_initiatives.map(el => el.id);
        await this._resultByInitiativesRepository.updateResultByInitiative(result_id, [...initiativeArray, result_toc_result.initiative_id], user.id, false);
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
          if (contributing_np_projects[index]?.grant_title?.length) {
            const resultData = await this._nonPooledProjectRepository.getAllNPProjectById(result_id, contributing_np_projects[index].grant_title);

            if (resultData) {
              resultData.center_grant_id = contributing_np_projects[index].center_grant_id;
              resultData.funder_institution_id = contributing_np_projects[index].funder;
              resultData.lead_center_id = contributing_np_projects[index].lead_center;
              resultData.is_active = true;
              resultData.last_updated_by = user.id;
              resultTocResultArray.push(resultData);
            } else {
              const newNpProject = new NonPooledProject();
              newNpProject.results_id = result_id;
              newNpProject.center_grant_id = contributing_np_projects[index].center_grant_id;
              newNpProject.funder_institution_id = contributing_np_projects[index].funder;
              newNpProject.lead_center_id = contributing_np_projects[index].lead_center;
              newNpProject.grant_title = contributing_np_projects[index].grant_title || null;
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

      if (result.result_level_id == 1) {
        impacts.forEach(async ({id, indicators, target}) => {
          if(indicators?.length){
            await this._resultsImpactAreaIndicatorRepository.updateResultImpactAreaIndicators(result_id, id, indicators?.map(el => el.targetId), user.id);
            let IndicatorArray: ResultsImpactAreaIndicator[] = [];
            for (let index = 0; index < indicators.length; index++) {
              const {targetId} = indicators[index];
              const resultsImpactAreaIndicatorData = await this._resultsImpactAreaIndicatorRepository.ResultsImpactAreaIndicatorExists(result_id, targetId);
              if(!resultsImpactAreaIndicatorData){
                const newIndicator = new ResultsImpactAreaIndicator();
                newIndicator.created_by = user.id;
                newIndicator.last_updated_by = user.id;
                newIndicator.result_id = result.id;
                newIndicator.impact_area_indicator_id = targetId;
                newIndicator.version_id = vrs.id;
                IndicatorArray.push(newIndicator);
              }
            }
            await this._resultsImpactAreaIndicatorRepository.save(IndicatorArray);
          }

          if(target?.length){
            await this._resultsImpactAreaTargetRepository.updateResultImpactAreaTarget(result_id, id, target?.map(el => el.id), user.id);
            let TargetArray: ResultsImpactAreaTarget[] = [];
            for (let index = 0; index < target.length; index++) {
              const {id} = target[index];
              const resultsImpactAreaTargetData = await this._resultsImpactAreaTargetRepository.resultsImpactAreaTargetExists(result_id, id);
              if(!resultsImpactAreaTargetData){
                const newTarget = new ResultsImpactAreaTarget();
                newTarget.created_by = user.id;
                newTarget.last_updated_by = user.id;
                newTarget.result_id = result.id;
                newTarget.impact_area_target_id = id;
                newTarget.version_id = vrs.id;
                TargetArray.push(newTarget);
              }
            }
            await this._resultsImpactAreaTargetRepository.save(TargetArray);
          }
        });
      } else {
        await this._resultsTocResultRepository.updateResultByInitiative(result_id, [...initiativeArray, result_toc_result.initiative_id], user.id);
        let RtR = await this._resultsTocResultRepository.getRTRById(result_toc_result?.result_toc_result_id, result_id, result_toc_result?.initiative_id);
        if (RtR) {
          if (result.result_level_id == 2) {
            RtR.action_area_outcome_id = result_toc_result?.action_area_outcome_id || null;
          } else {
            RtR.toc_result_id = result_toc_result?.toc_result_id || null;
          }
          RtR.is_active = true;
          RtR.last_updated_by = user.id;
          RtR.planned_result = result_toc_result.planned_result;
          await this._resultsTocResultRepository.save(RtR);
        } else if (result_toc_result) {
          const newRtR = new ResultsTocResult();
          newRtR.version_id = vrs.id;
          newRtR.initiative_id = result_toc_result?.initiative_id;
          newRtR.created_by = user.id;
          newRtR.last_updated_by = user.id;
          newRtR.results_id = result.id;
          newRtR.planned_result = result_toc_result.planned_result;
          if (result.result_level_id == 2) {
            newRtR.action_area_outcome_id = result_toc_result?.action_area_outcome_id || null;
          } else {
            newRtR.toc_result_id = result_toc_result?.toc_result_id || null;
          }
          newRtR.planned_result = result_toc_result?.planned_result || null;
          await this._resultsTocResultRepository.save(newRtR);
        }


        if (contributors_result_toc_result?.length) {
          contributors_result_toc_result = contributors_result_toc_result.filter(el => initiativeArray.includes(el.initiative_id));
          let RtRArray: ResultsTocResult[] = [];
          for (let index = 0; index < contributors_result_toc_result.length; index++) {
            let RtR = await this._resultsTocResultRepository.getRTRById(contributors_result_toc_result[index].result_toc_result_id, result_id, contributors_result_toc_result[index].initiative_id);
            if (RtR) {
              if (result.result_level_id == 2) {
                RtR.action_area_outcome_id = contributors_result_toc_result[index]?.action_area_outcome_id || null;
              } else {
                RtR.toc_result_id = contributors_result_toc_result[index]?.toc_result_id || null;
              }
              RtR.is_active = true;
              RtR.planned_result = contributors_result_toc_result[index]?.planned_result;
              RtR.last_updated_by = user.id;
              RtRArray.push(RtR);
            } else {
              const newRtR = new ResultsTocResult();
              newRtR.version_id = vrs.id;
              newRtR.created_by = user.id;
              newRtR.last_updated_by = user.id;
              newRtR.planned_result = contributors_result_toc_result[index]?.planned_result;
              newRtR.results_id = result.id;
              newRtR.initiative_id = contributors_result_toc_result[index]?.initiative_id || null;
              if (result.result_level_id == 2) {
                newRtR.action_area_outcome_id = contributors_result_toc_result[index]?.action_area_outcome_id || null;
              } else {
                newRtR.toc_result_id = contributors_result_toc_result[index]?.toc_result_id || null;
              }
              newRtR.planned_result = contributors_result_toc_result[index]?.planned_result || null;
              RtRArray.push(newRtR);
            }

          }
          await this._resultsTocResultRepository.save(RtRArray);
        }
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
      let resTocRes: any[] = [];
      let conResTocRes: any[] = [];
      if (result.result_level_id != 2) {
        resTocRes = await this._resultsTocResultRepository.getRTRPrimary(resultId, [resultInit.id], true);
        if (!resTocRes?.length) {
          resTocRes = [{
            action_area_outcome_id: null,
            toc_result_id: null,
            planned_result: null,
            results_id: resultId,
            initiative_id: resultInit.id,
            short_name: resultInit.short_name,
            official_code: resultInit.official_code
          }]
        }
        resTocRes[0]['toc_level_id'] = resTocRes[0]['planned_result'] != null && resTocRes[0]['planned_result'] == 0 ? 3 : resTocRes[0]['toc_level_id'];
        conResTocRes = await this._resultsTocResultRepository.getRTRPrimary(resultId, [resultInit.id], false, conInit.map(el => el.id));
        conResTocRes.map(el => {
          el['toc_level_id'] = el['planned_result'] == 0 && el['planned_result'] != null ? 3 : el['toc_level_id'];
        })
      } else if (result.result_level_id == 2) {
        resTocRes = await this._resultsTocResultRepository.getRTRPrimaryActionArea(resultId, [resultInit.id], true);
        if (!resTocRes?.length) {
          resTocRes = [{
            action_area_outcome_id: null,
            toc_result_id: null,
            planned_result: null,
            results_id: resultId,
            initiative_id: resultInit.id,
            short_name: resultInit.short_name,
            official_code: resultInit.official_code
          }]
        }
        conResTocRes = await this._resultsTocResultRepository.getRTRPrimaryActionArea(resultId, [resultInit.id], false, conInit.map(el => el.id));
      }

      return {
        response: {
          contributing_initiatives: conInit,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: resTocRes[0],
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
