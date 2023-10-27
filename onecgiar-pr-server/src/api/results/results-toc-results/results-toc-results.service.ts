import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { NonPooledProject } from '../non-pooled-projects/entities/non-pooled-project.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultRepository } from '../result.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ClarisaImpactAreaRepository } from '../../../clarisa/clarisa-impact-area/ClarisaImpactArea.repository';
import { ShareResultRequestService } from '../share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../share-result-request/dto/create-toc-share-result.dto';
import { ShareResultRequestRepository } from '../share-result-request/share-result-request.repository';
import { ResultsTocResultIndicatorsRepository } from './results-toc-results-indicators.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';

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
    private readonly _resultsTocResultIndicator: ResultsTocResultIndicatorsRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
  ) {}

  async create(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
  ) {
    try {
      let { contributors_result_toc_result } = createResultsTocResultDto;
      const {
        contributing_np_projects,
        result_id,
        contributing_center,
        contributing_initiatives,
        result_toc_result,
        pending_contributing_initiatives,
        bodyNewTheoryOfChanges,
        impactsTarge,
        sdgTargets,
        bodyActionArea,
      } = createResultsTocResultDto;

      const initSubmitter = await this._resultByInitiativesRepository.findOne({
        where: { result_id: result_id, initiative_role_id: 1 },
      });

      const result = await this._resultRepository.getResultById(result_id);
      let initiativeArray: number[] = [];
      let initiativeArrayRtr: number[] = [];
      let initiativeArrayPnd: number[] = [];

      const titleArray = contributing_np_projects.map((el) => el.grant_title);

      await this._resultByInitiativesRepository.updateIniciativeSubmitter(
        result_id,
        initSubmitter.initiative_id,
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
          [...initiativeArray, initSubmitter.initiative_id],
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
        await this._shareResultRequestService.resultRequest(
          dataRequst,
          result_id,
          user,
        );
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
        const resultTocResultArray: NonPooledProject[] = [];
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

        const npps = await this._nonPooledProjectRepository.save(
          resultTocResultArray,
        );
        for (const npp of npps) {
          const initBudget =
            await this._resultBilateralBudgetRepository.findOne({
              where: {
                non_pooled_projetct_id: npp.id,
              },
            });
          if (!initBudget) {
            await this._resultBilateralBudgetRepository.save({
              non_pooled_projetct_id: npp.id,
              created_by: user.id,
              last_updated_by: user.id,
            });
          } else {
            await this._resultBilateralBudgetRepository.update(npp.id, {
              is_active: true,
              last_updated_by: user.id,
            });
          }
        }
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
        const resultCenterArray: ResultsCenter[] = [];
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
        await this._resultsImpactAreaTargetRepository.saveImpactAreaTarget(
          result_id,
          impactsTarge,
          user.id,
        );
        await this._resultsTocResultRepository.saveSdgTargets(
          result_id,
          sdgTargets,
        );
      } else {
        initiativeArrayRtr = contributing_initiatives.map(
          (initiative) => initiative.id,
        );
        initiativeArrayRtr = initiativeArrayRtr.concat(
          pending_contributing_initiatives.map((pending) => pending.id),
        );
        await this._resultsTocResultRepository.updateResultByInitiative(
          result_id,
          [...initiativeArrayRtr, initSubmitter.initiative_id],
          user.id,
        );

        // * Map multiple WPs to the same initiative
        for (const toc of createResultsTocResultDto?.result_toc_result) {
          let RtR: ResultsTocResult | null;
          if (toc?.result_toc_result_id) {
            RtR =
              (await this._resultsTocResultRepository.findOne({
                where: {
                  result_toc_result_id: toc?.result_toc_result_id,
                },
              })) || null;
          } else {
            RtR = null;
          }

          if (RtR) {
            console.log('Update, ', toc.toc_result_id);
            if (result.result_level_id == 2) {
              RtR.action_area_outcome_id = toc?.action_area_outcome_id || null;
            } else {
              RtR.toc_result_id = toc?.toc_result_id || null;
            }
            RtR.is_active = true;
            RtR.last_updated_by = user.id;
            RtR.planned_result = toc.planned_result;

            await this._resultsTocResultRepository.update(
              RtR.result_toc_result_id,
              {
                toc_result_id: toc.toc_result_id,
                action_area_outcome_id: toc.action_area_outcome_id,
                last_updated_by: user.id,
                planned_result: toc.planned_result,
                is_active: true,
              },
            );
          } else if (toc) {
            console.log('Create ', toc.toc_result_id);
            const newRtR = new ResultsTocResult();
            newRtR.initiative_id = toc?.initiative_id;
            newRtR.created_by = user.id;
            newRtR.last_updated_by = user.id;
            newRtR.results_id = result.id;
            newRtR.planned_result = toc.planned_result;
            if (result.result_level_id == 2) {
              newRtR.action_area_outcome_id =
                toc?.action_area_outcome_id || null;
            } else {
              newRtR.toc_result_id = toc?.toc_result_id || null;
            }
            newRtR.planned_result = toc?.planned_result || null;
            await this._resultsTocResultRepository.save({
              initiative_ids: newRtR.initiative_id,
              toc_result_id: newRtR.toc_result_id,
              created_by: newRtR.created_by,
              last_updated_by: newRtR.last_updated_by,
              result_id: newRtR.results_id,
              planned_result: newRtR.planned_result,
              action_area_outcome_id: newRtR.action_area_outcome_id,
              is_active: true,
            });
          }
        }

        // * Logic delete a WP
        const allRtRs = await this._resultsTocResultRepository.find({
          where: { result_id },
        });
        for (const rtr of allRtRs) {
          const tocResultIds = createResultsTocResultDto?.result_toc_result.map(
            (toc) => toc.toc_result_id,
          );
          if (!tocResultIds.includes(rtr.toc_result_id)) {
            console.log('Delete ', rtr.result_toc_result_id);

            rtr.is_active = false;
            rtr.last_updated_by = user.id;
            await this._resultsTocResultRepository.update(
              rtr.result_toc_result_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }

        if (contributors_result_toc_result?.length) {
          contributors_result_toc_result =
            contributors_result_toc_result.filter((el) =>
              initiativeArray.includes(el.initiative_id),
            );
          const RtRArray: ResultsTocResult[] = [];
          for (
            let index = 0;
            index < contributors_result_toc_result.length;
            index++
          ) {
            const RtR = await this._resultsTocResultRepository.getRTRById(
              contributors_result_toc_result[index].result_toc_result_id,
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
                contributors_result_toc_result[index]?.planned_result;
              RtRArray.push(newRtR);
            }
          }
          for (const i of RtRArray) {
            const temp: any = i;
            const res = await this._resultsTocResultRepository.findOne({
              where: {
                result_id: temp.results_id,
                initiative_ids: temp.inititiative_id,
              },
            });
            if (res) {
              delete temp.result_toc_result_id;
              await this._resultsTocResultRepository.update(
                res.result_toc_result_id,
                {
                  toc_result_id: temp.toc_result_id,
                  action_area_outcome_id: temp.action_area_outcome_id,
                  planned_result: temp.planned_result,
                  last_updated_by: user.id,
                },
              );
            } else {
              await this._resultsTocResultRepository.save({
                initiative_id: res.initiative_id,
                created_by: res.created_by,
                last_updated_by: res.last_updated_by,
                result_id: res.results_id,
                planned_result: res.planned_result,
                action_area_outcome_id: res.action_area_outcome_id,
              });
            }
          }
        }

        if (result.result_level_id > 2) {
          await this._resultsTocResultRepository.saveSectionNewTheoryOfChange(
            bodyNewTheoryOfChanges,
          );
        }

        if (result.result_level_id == 2) {
          for (const resultAction of bodyActionArea) {
            await this._resultsImpactAreaTargetRepository.saveImpactAreaTarget(
              result_id,
              resultAction?.consImpactTarget,
              user.id,
            );
            await this._resultsTocResultRepository.saveSdgTargets(
              result_id,
              resultAction?.consSdgTargets,
            );

            await this._resultsTocResultRepository.saveActionAreaOutcomeResult(
              result_id,
              resultAction?.action,
              resultAction?.init,
            );
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
      const impactAreaArray =
        await this._clarisaImpactAreaRepository.getAllImpactArea();
      let resTocRes: any[] = [];
      let conResTocRes: any[] = [];
      let consImpactTarget: any[] = [];
      let consSdgTargets: any[] = [];
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

        consImpactTarget =
          await this._resultsImpactAreaTargetRepository.getResultImpactAreaTargetByResultId(
            resultId,
          );
        consSdgTargets =
          await this._resultsTocResultRepository.getSdgTargetsByResultId(
            resultId,
          );
      }

      console.clear();
      console.log(
        '🚀 ~ file: results-toc-results.service.ts:608 ~ ResultsTocResultsService ~ getTocByResult ~ resTocRes:',
        resTocRes,
      );

      return {
        response: {
          contributing_initiatives: conInit,
          contributing_and_primary_initiative: conAndPriInit,
          pending_contributing_initiatives: conPending,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: resTocRes,
          contributors_result_toc_result:
            result.result_level_id == 1 ? null : conResTocRes,
          impacts: result.result_level_id == 1 ? impactAreaArray : null,
          impactsTarge: result.result_level_id == 1 ? consImpactTarget : null,
          sdgTargets: result.result_level_id == 1 ? consSdgTargets : null,
        },
        message: 'The toc data is successfully created',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getTocResultIndicatorByResultTocId(
    resultIdToc: number,
    toc_result_id: number,
    init: number,
  ) {
    try {
      let isSdg = null;
      let isImpactArea = null;
      let is_sdg_action_impact = null;
      const result = await this._resultsTocResultRepository
        .query(`select rtr.mapping_sdg as isSdg,  rtr.mapping_impact as isImpactArea,rtr.is_sdg_action_impact
                                                                          from results_toc_result rtr where rtr.results_id = ${resultIdToc} and rtr.initiative_id = ${init}`);
      if (result.length != 0) {
        (isSdg = result[0].isSdg),
          (isImpactArea = result[0].isImpactArea),
          (is_sdg_action_impact = result[0].is_sdg_action_impact);
      } else {
        is_sdg_action_impact = false;
      }
      const informationIndicator =
        await this._resultsTocResultRepository.getResultTocResultByResultId(
          resultIdToc,
          toc_result_id,
          init,
        );
      const impactAreas =
        await this._resultsTocResultRepository.getImpactAreaTargetsToc(
          resultIdToc,
          toc_result_id,
          init,
        );
      const sdgTargets =
        await this._resultsTocResultRepository.getSdgTargetsToc(
          resultIdToc,
          toc_result_id,
          init,
        );
      const actionAreaOutcome =
        await this._resultsTocResultRepository.getActionAreaOutcome(
          resultIdToc,
          toc_result_id,
          init,
        );

      return {
        response: {
          initiative: init,
          resultId: resultIdToc,
          informationIndicator,
          impactAreas,
          sdgTargets,
          actionAreaOutcome,
          isSdg: isSdg,
          isImpactArea: isImpactArea,
          is_sdg_action_impact: is_sdg_action_impact,
        },
        message: 'The toc data indicator is successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getActionAreaOutcomeByResultTocId(resultId, init) {
    try {
      const consImpactTarget =
        await this._resultsImpactAreaTargetRepository.getResultImpactAreaTargetByResultId(
          resultId,
        );
      const consSdgTargets =
        await this._resultsTocResultRepository.getSdgTargetsByResultId(
          resultId,
        );

      const action =
        await this._resultsTocResultRepository.getActionAreaByResultid(
          resultId,
          init,
        );

      return {
        response: {
          action,
          consImpactTarget,
          consSdgTargets,
        },
        message: 'The toc data indicator is successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getVersionId(result_id, init) {
    try {
      const resultinit = await this._resultsTocResultRepository.query(
        `SELECT toc_id FROM clarisa_initiatives WHERE id = ?`,
        [init],
      );
      let version_id = null;
      if (resultinit.length != 0 && resultinit[0].toc_id != null) {
        const vesion_id = await this._resultsTocResultRepository.query(
          `SELECT DISTINCT tr.version_id FROM Integration_information.toc_results tr 
           WHERE tr.id_toc_initiative = ? AND tr.phase = (
             SELECT v.toc_pahse_id FROM result r 
             JOIN version v ON r.version_id = v.id 
             WHERE r.id = ?
           )`,
          [resultinit[0].toc_id, result_id],
        );
        if (vesion_id.length != 0 && vesion_id[0].version_id != null) {
          version_id = vesion_id[0].version_id;
        } else {
          version_id = resultinit[0].toc_id;
        }
      }
      return {
        response: {
          version_id,
        },
        message: 'The toc data indicator is successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
