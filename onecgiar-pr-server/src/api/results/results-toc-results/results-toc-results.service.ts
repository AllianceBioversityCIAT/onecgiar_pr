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
import { Version } from '../../versioning/entities/version.entity';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultRepository } from '../result.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsImpactAreaIndicator } from '../results-impact-area-indicators/entities/results-impact-area-indicator.entity';
import { ResultsImpactAreaTarget } from '../results-impact-area-target/entities/results-impact-area-target.entity';
import { ClarisaImpactAreaRepository } from '../../../clarisa/clarisa-impact-area/ClarisaImpactArea.repository';
import { ShareResultRequestService } from '../share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../share-result-request/dto/create-toc-share-result.dto';
import { ShareResultRequestRepository } from '../share-result-request/share-result-request.repository';
import { log } from 'handlebars';
import { ResultsTocResultIndicatorsRepository } from './results-toc-results-indicators.repository';

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
    private readonly _resultsImpactAreaIndicatorRepository: ResultsImpactAreaIndicatorRepository,
    private readonly _clarisaImpactAreaRepository: ClarisaImpactAreaRepository,
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultsTocResultIndicator: ResultsTocResultIndicatorsRepository
  ) {}

  async create(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
  ) {
    try {
      let {
        contributing_np_projects,
        result_id,
        contributing_center,
        contributing_initiatives,
        result_toc_result,
        contributors_result_toc_result,
        impacts,
        pending_contributing_initiatives,
        targets_indicators,
        impactAreasTargets,
        sdgTargest
      } = createResultsTocResultDto;
      const version = await this._versionsService.findBaseVersion();
      const result = await this._resultRepository.getResultById(result_id);
      let initiativeArray: number[] = [];
      let initiativeArrayRtr: number[] = [];
      let initiativeArrayPnd: number[] = [];
      
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: version });
      }
      const vrs: Version = <Version>version.response;
      const titleArray = contributing_np_projects.map((el) => el.grant_title);

      

      const iniciativeSubmitter =
        this._resultByInitiativesRepository.updateIniciativeSubmitter(
          result_id,
          result_toc_result.initiative_id,
        );
      if (contributing_center.filter((el) => el.primary == true).length > 1) {
        contributing_center.map((el) => {
          el.primary = false;
        });
      }

      if (
        contributing_initiatives?.length ||
        pending_contributing_initiatives?.length
      ) {
        initiativeArray = contributing_initiatives.map((el) => el.id);
        initiativeArrayPnd = pending_contributing_initiatives.map(
          (pend) => pend.id,
        );
        await this._resultByInitiativesRepository.updateResultByInitiative(
          result_id,
          [...initiativeArray, result_toc_result.initiative_id],
          user.id,
          false,
          initiativeArrayPnd,
        );
        const dataRequst: CreateTocShareResult = {
          isToc: true,
          initiativeShareId: initiativeArray,
          action_area_outcome_id: null,
          planned_result: null,
          toc_result_id: null,
        };
        console.log('initial');
        await this._shareResultRequestService.resultRequest(
          dataRequst,
          result_id,
          user,
        );
        console.log('end');
      } else {
        await this._resultByInitiativesRepository.updateResultByInitiative(
          result_id,
          [],
          user.id,
          false,
          [],
        );
      }
      const cancelRequest = pending_contributing_initiatives?.filter(
        (e) => e.is_active == false,
      );
      if (cancelRequest?.length) {
        await this._shareResultRequestRepository.cancelRequest(
          cancelRequest.map((e) => e.share_result_request_id),
        );
      }

      if (contributing_np_projects?.length) {
        await this._nonPooledProjectRepository.updateNPProjectById(
          result_id,
          titleArray,
          user.id,
          1,
        );
        let resultTocResultArray: NonPooledProject[] = [];
        for (let index = 0; index < contributing_np_projects.length; index++) {
          if (contributing_np_projects[index]?.grant_title?.length) {
            const resultData =
              await this._nonPooledProjectRepository.getAllNPProjectById(
                result_id,
                contributing_np_projects[index].grant_title,
                1,
              );

            if (resultData) {
              resultData.center_grant_id =
                contributing_np_projects[index].center_grant_id;
              resultData.funder_institution_id =
                contributing_np_projects[index].funder;
              resultData.lead_center_id =
                contributing_np_projects[index].lead_center;
              resultData.is_active = true;
              resultData.last_updated_by = user.id;
              resultTocResultArray.push(resultData);
            } else {
              const newNpProject = new NonPooledProject();
              newNpProject.results_id = result_id;
              newNpProject.center_grant_id =
                contributing_np_projects[index].center_grant_id;
              newNpProject.funder_institution_id =
                contributing_np_projects[index].funder;
              newNpProject.lead_center_id =
                contributing_np_projects[index].lead_center;
              newNpProject.grant_title =
                contributing_np_projects[index].grant_title || null;
              newNpProject.created_by = user.id;
              newNpProject.last_updated_by = user.id;
              newNpProject.non_pooled_project_type_id = 1;
              resultTocResultArray.push(newNpProject);
            }
          }
        }

        await this._nonPooledProjectRepository.save(resultTocResultArray);
      } else {
        await this._nonPooledProjectRepository.updateNPProjectById(
          result_id,
          [],
          user.id,
          1,
        );
      }

      if (contributing_center?.length) {
        const centerArray = contributing_center.map((el) => el.code);
        await this._resultsCenterRepository.updateCenter(
          result_id,
          centerArray,
          user.id,
        );
        let resultCenterArray: ResultsCenter[] = [];
        for (let index = 0; index < contributing_center.length; index++) {
          const exists =
            await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
              result_id,
              contributing_center[index].code,
            );
          if (!exists) {
            const newResultCenter = new ResultsCenter();
            newResultCenter.center_id = contributing_center[index].code;
            newResultCenter.result_id = result_id;
            newResultCenter.created_by = user.id;
            newResultCenter.last_updated_by = user.id;
            newResultCenter.is_primary =
              contributing_center[index].primary || false;
            resultCenterArray.push(newResultCenter);
          } else if (contributing_center[index]?.primary) {
            exists.is_primary = contributing_center[index].primary;
            exists.last_updated_by = user.id;
            resultCenterArray.push(exists);
          }
        }
        await this._resultsCenterRepository.save(resultCenterArray);
      } else {
        await this._resultsCenterRepository.updateCenter(
          result_id,
          [],
          user.id,
        );
      }

      if (result.result_level_id == 1) {
        impacts.forEach(async ({ id, indicators, target }) => {
          if (indicators?.length) {
            await this._resultsImpactAreaIndicatorRepository.updateResultImpactAreaIndicators(
              result_id,
              id,
              indicators?.map((el) => el.id),
              user.id,
            );
            let IndicatorArray: ResultsImpactAreaIndicator[] = [];
            for (let index = 0; index < indicators.length; index++) {
              const { id: indicatorId } = indicators[index];
              const resultsImpactAreaIndicatorData =
                await this._resultsImpactAreaIndicatorRepository.ResultsImpactAreaIndicatorExists(
                  result_id,
                  indicatorId,
                );
              if (!resultsImpactAreaIndicatorData) {
                const newIndicator = new ResultsImpactAreaIndicator();
                newIndicator.created_by = user.id;
                newIndicator.last_updated_by = user.id;
                newIndicator.result_id = result.id;
                newIndicator.impact_area_indicator_id = indicatorId;
                IndicatorArray.push(newIndicator);
              }
            }
            await this._resultsImpactAreaIndicatorRepository.save(
              IndicatorArray,
            );
          } else {
            await this._resultsImpactAreaIndicatorRepository.updateResultImpactAreaIndicators(
              result_id,
              id,
              [],
              user.id,
            );
          }

          if (target?.length) {
            await this._resultsImpactAreaTargetRepository.updateResultImpactAreaTarget(
              result_id,
              id,
              target?.map((el) => el.targetId),
              user.id,
            );
            let TargetArray: ResultsImpactAreaTarget[] = [];
            for (let index = 0; index < target.length; index++) {
              const { targetId } = target[index];
              const resultsImpactAreaTargetData =
                await this._resultsImpactAreaTargetRepository.resultsImpactAreaTargetExists(
                  result_id,
                  targetId,
                );
              if (!resultsImpactAreaTargetData) {
                const newTarget = new ResultsImpactAreaTarget();
                newTarget.created_by = user.id;
                newTarget.last_updated_by = user.id;
                newTarget.result_id = result.id;
                newTarget.impact_area_target_id = targetId;
                TargetArray.push(newTarget);
              }
            }
            await this._resultsImpactAreaTargetRepository.save(TargetArray);
          } else {
            await this._resultsImpactAreaTargetRepository.updateResultImpactAreaTarget(
              result_id,
              id,
              [],
              user.id,
            );
          }
        });
      } else {
        initiativeArrayRtr = contributing_initiatives.map(
          (initiative) => initiative.id,
        );
        initiativeArrayRtr = initiativeArrayRtr.concat(
          pending_contributing_initiatives.map((pending) => pending.id),
        );
        await this._resultsTocResultRepository.updateResultByInitiative(
          result_id,
          [...initiativeArrayRtr, result_toc_result.initiative_id],
          user.id,
        );
        let RtR = await this._resultsTocResultRepository.getRTRById(
          result_toc_result?.result_toc_result_id,
          result_id,
          result_toc_result?.initiative_id,
        );
        if (RtR) {
          if (result.result_level_id == 2) {
            RtR.action_area_outcome_id =
              result_toc_result?.action_area_outcome_id ?? null;
          } else {
            RtR.toc_result_id = result_toc_result?.toc_result_id ?? null;
          }
          RtR.is_active = true;
          RtR.last_updated_by = user.id;
          RtR.planned_result = result_toc_result.planned_result;
          await this._resultsTocResultRepository.save(RtR);
        } else if (result_toc_result) {
          const newRtR = new ResultsTocResult();
          newRtR.initiative_id = result_toc_result?.initiative_id;
          newRtR.created_by = user.id;
          newRtR.last_updated_by = user.id;
          newRtR.results_id = result.id;
          newRtR.planned_result = result_toc_result.planned_result;
          if (result.result_level_id == 2) {
            newRtR.action_area_outcome_id =
              result_toc_result?.action_area_outcome_id ?? null;
          } else {
            newRtR.toc_result_id = result_toc_result?.toc_result_id ?? null;
          }
          newRtR.planned_result = result_toc_result?.planned_result ?? null;
          await this._resultsTocResultRepository.save(newRtR);
        }

        if (contributors_result_toc_result?.length) {
          contributors_result_toc_result =
            contributors_result_toc_result.filter((el) =>
              initiativeArray.includes(el.initiative_id),
            );
          let RtRArray: ResultsTocResult[] = [];
          for (
            let index = 0;
            index < contributors_result_toc_result.length;
            index++
          ) {
            let RtR = await this._resultsTocResultRepository.getRTRById(
              contributors_result_toc_result[index].result_toc_result_id,
              result_id,
              contributors_result_toc_result[index].initiative_id,
            );
            if (RtR) {
              if (result.result_level_id == 2) {
                RtR.action_area_outcome_id =
                  contributors_result_toc_result[index]
                    ?.action_area_outcome_id || null;
              } else {
                RtR.toc_result_id =
                  contributors_result_toc_result[index]?.toc_result_id || null;
              }
              RtR.is_active = true;
              RtR.planned_result =
                contributors_result_toc_result[index]?.planned_result;
              RtR.last_updated_by = user.id;
              RtRArray.push(RtR);
            } else {
              const newRtR = new ResultsTocResult();
              newRtR.created_by = user.id;
              newRtR.last_updated_by = user.id;
              newRtR.planned_result =
                contributors_result_toc_result[index]?.planned_result;
              newRtR.results_id = result.id;
              newRtR.initiative_id =
                contributors_result_toc_result[index]?.initiative_id || null;
              if (result.result_level_id == 2) {
                newRtR.action_area_outcome_id =
                  contributors_result_toc_result[index]
                    ?.action_area_outcome_id || null;
              } else {
                newRtR.toc_result_id =
                  contributors_result_toc_result[index]?.toc_result_id || null;
              }
              newRtR.planned_result =
                contributors_result_toc_result[index]?.planned_result || null;
              RtRArray.push(newRtR);
            }
          }
           await this._resultsTocResultRepository.save(RtRArray);
          
        }

        if(result != null && result.result_level_id > 2){
          let targets_indicatorsd = await this._resultsTocResultRepository.query(`select * from results_toc_result where results_id = ${result_id} and is_active = true and initiative_id = ${result.initiative_id};`)
          await this._resultsTocResultRepository.update({result_toc_result_id: targets_indicatorsd[0]?.result_toc_result_id}, {mapping_impact:createResultsTocResultDto.isImpactArea, mapping_sdg:createResultsTocResultDto.isSdg})
          if(targets_indicatorsd.length > 0){
              console.log("targets_indicatorsd", targets_indicatorsd);
              await this._resultsTocResultRepository.saveInditicatorsContributing(targets_indicatorsd[0]?.result_toc_result_id, targets_indicators);
              await this._resultsTocResultRepository.saveImpact(targets_indicatorsd[0]?.result_toc_result_id, impactAreasTargets);
          }
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

  private validResultRocResult(
    planned_result?: boolean,
    outcome_id?: number,
    toc_result_id?: number,
  ) {
    return (!planned_result && outcome_id) || (planned_result && toc_result_id);
  }

  findAll() {
    return `This action returns all resultsTocResults`;
  }

  async getTocByResult(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );
      const conInit =
        await this._resultByInitiativesRepository.getContributorInitiativeByResult(
          resultId,
        );
      const conAndPriInit =
        await this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
          resultId,
        );
      const conPending =
        await this._resultByInitiativesRepository.getPendingInit(resultId);
      const npProject =
        await this._nonPooledProjectRepository.getAllNPProjectByResultId(
          resultId,
          1,
        );
      const resCenters =
        await this._resultsCenterRepository.getAllResultsCenterByResultId(
          resultId,
        );
      let impactAreaArray =
        await this._clarisaImpactAreaRepository.getAllImpactArea();
      let resTocRes: any[] = [];
      let conResTocRes: any[] = [];
      if (result.result_level_id != 2 && result.result_level_id != 1) {
        resTocRes = await this._resultsTocResultRepository.getRTRPrimary(
          resultId,
          [resultInit.id],
          true,
        );
        if (!resTocRes?.length) {
          resTocRes = [
            {
              action_area_outcome_id: null,
              toc_result_id: null,
              planned_result: null,
              results_id: resultId,
              initiative_id: resultInit.id,
              short_name: resultInit.short_name,
              official_code: resultInit.official_code,
            },
          ];
        }
        resTocRes[0]['toc_level_id'] =
          resTocRes[0]['planned_result'] != null &&
          resTocRes[0]['planned_result'] == 0
            ? 3
            : resTocRes[0]['toc_level_id'];
        conResTocRes = await this._resultsTocResultRepository.getRTRPrimary(
          resultId,
          [resultInit.id],
          false,
          conInit.map((el) => el.id),
        );
        conResTocRes.map((el) => {
          el['toc_level_id'] =
            el['planned_result'] == 0 && el['planned_result'] != null
              ? 3
              : el['toc_level_id'];
        });
      } else if (result.result_level_id == 2) {
        resTocRes =
          await this._resultsTocResultRepository.getRTRPrimaryActionArea(
            resultId,
            [resultInit.id],
            true,
          );
        if (!resTocRes?.length) {
          resTocRes = [
            {
              action_area_outcome_id: null,
              toc_result_id: null,
              planned_result: null,
              results_id: resultId,
              initiative_id: resultInit.id,
              short_name: resultInit.short_name,
              official_code: resultInit.official_code,
            },
          ];
        }
        conResTocRes =
          await this._resultsTocResultRepository.getRTRPrimaryActionArea(
            resultId,
            [resultInit.id],
            false,
            conInit.map((el) => el.id),
          );
      } else if (result.result_level_id == 1) {
        const resultsImpactAreaIndicator =
          await this._resultsImpactAreaIndicatorRepository.ResultsImpactAreaIndicatorByResultId(
            resultId,
          );
        const resultsImpactAreaTarget =
          await this._resultsImpactAreaTargetRepository.resultsImpactAreaTargetByResultId(
            resultId,
          );
        impactAreaArray.map((el) => {
          el['target'] = resultsImpactAreaTarget.filter(
            (t) => t.impact_area_id == el.id,
          );
          el['indicators'] = resultsImpactAreaIndicator.filter(
            (t) => t.impact_area_id == el.id,
          );
        });
        resTocRes = [
          {
            action_area_outcome_id: null,
            toc_result_id: null,
            planned_result: null,
            results_id: resultId,
            initiative_id: resultInit.id,
            short_name: resultInit.short_name,
            official_code: resultInit.official_code,
          },
        ];
      }

      return {
        response: {
          contributing_initiatives: conInit,
          contributing_and_primary_initiative: conAndPriInit,
          pending_contributing_initiatives: conPending,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: resTocRes[0],
          contributors_result_toc_result:
            result.result_level_id == 1 ? null : conResTocRes,
          impacts: result.result_level_id == 1 ? impactAreaArray : null,
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

  async getTocResultIndicatorByResultTocId(resultIdToc: number, toc_result_id: number, init:number) {
    try {
      const result = await this._resultsTocResultRepository.query(`select rtr.mapping_sdg as isSdg,  rtr.mapping_impact as isImpactArea 
                                                                          from results_toc_result rtr where rtr.results_id = ${resultIdToc} and rtr.initiative_id = ${init}`);
      const informationIndicator = await this._resultsTocResultRepository.getResultTocResultByResultId(resultIdToc,toc_result_id,init);
      const impactAreas = await this._resultsTocResultRepository.getImpactAreaTargetsToc(resultIdToc,toc_result_id,init);
      const  sdgTargets = await this._resultsTocResultRepository.getSdgTargetsToc(resultIdToc,toc_result_id, init);
      return {
        response: {
          informationIndicator,
         impactAreas,
          sdgTargets, 
          isSdg: result[0].isSdg,
          isImpactArea: result[0].isImpactArea
        },
        message: 'The toc data indicator is successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
    
  }

}

interface resultToResultInterfaceToc {
  toc_result_id?: number;
  results_id: number;
  action_area_outcome_id?: number;
  planned_result?: boolean;
}
