import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
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
import { ResultsTocResultIndicatorsRepository } from './repositories/results-toc-results-indicators.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { Not } from 'typeorm';
import { TocLevelEnum } from '../../../shared/constants/toc-level.enum';

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
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
  ) {}

  async create(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
  ) {
    try {
      const {
        contributing_np_projects,
        result_id,
        contributing_center,
        contributing_initiatives,
        pending_contributing_initiatives,
        impactsTarge,
        sdgTargets,
        bodyActionArea,
        changePrimaryInit,
      } = createResultsTocResultDto;

      let initSubmitter: any =
        await this._resultByInitiativesRepository.findOne({
          where: { result_id: result_id, initiative_role_id: 1 },
        });

      const result = await this._resultRepository.getResultById(result_id);
      let initiativeArray: number[] = [];
      let initiativeArrayRtr: number[] = [];
      let initiativeArrayPnd: number[] = [];

      const titleArray = contributing_np_projects.map((el) => el.grant_title);

      if (initSubmitter.initiative_id !== changePrimaryInit) {
        const newInit =
          await this._resultByInitiativesRepository.updateIniciativeSubmitter(
            result_id,
            initSubmitter.initiative_id,
            changePrimaryInit,
          );
        initSubmitter = newInit;
        return {
          response: {},
          message: 'The Primary Submitter was changed successfully',
          status: HttpStatus.CREATED,
        };
      }

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
        if (initSubmitter.initiative_id) {
          initiativeArray = initiativeArray.filter(
            (init) => init !== initSubmitter.initiative_id,
          );
        }
        initiativeArrayPnd = pending_contributing_initiatives.map(
          (pend) => pend.id,
        );
        await this._resultByInitiativesRepository.updateResultByInitiative(
          result_id,
          [...initiativeArray],
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
        await this._nonPooledProjectRepository.update(
          { results_id: result_id },
          {
            is_active: false,
          },
        );
        for (let index = 0; index < contributing_np_projects.length; index++) {
          if (contributing_np_projects[index]?.grant_title?.length) {
            const resultData = await this._nonPooledProjectRepository.findOne({
              where: {
                results_id: result_id,
                grant_title: contributing_np_projects[index].grant_title,
                funder_institution_id: contributing_np_projects[index].funder,
                non_pooled_project_type_id: 1,
              },
            });

            if (resultData) {
              await this._nonPooledProjectRepository.update(resultData.id, {
                center_grant_id:
                  contributing_np_projects[index].center_grant_id,
                funder_institution_id: contributing_np_projects[index].funder,
                lead_center_id: contributing_np_projects[index].lead_center,
                is_active: true,
                last_updated_by: user.id,
              });
            } else {
              await this._nonPooledProjectRepository.save({
                results_id: result_id,
                center_grant_id:
                  contributing_np_projects[index].center_grant_id,
                funder_institution_id: contributing_np_projects[index].funder,
                lead_center_id: contributing_np_projects[index].lead_center,
                grant_title: contributing_np_projects[index].grant_title,
                created_by: user.id,
                last_updated_by: user.id,
                non_pooled_project_type_id: 1,
              });
            }
          }
        }

        const npps = await this._nonPooledProjectRepository.find({
          where: {
            results_id: result_id,
            is_active: true,
          },
        });
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

        // * Save Primary Submitter ResultTocResult
        await this.saveResultTocResultPrimary(
          createResultsTocResultDto,
          user,
          result,
          result_id,
        );

        // * Save Contributors ResultTocResult
        await this.saveResultTocResultContributor(
          createResultsTocResultDto,
          user,
          result,
          result_id,
          initSubmitter.initiative_id,
        );

        // * Save Indicators & Indicators Targets
        if (result.result_level_id > 2) {
          await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
            createResultsTocResultDto,
            result_id,
          );
          await this._resultsTocResultRepository.saveIndicatorsContributors(
            createResultsTocResultDto,
            result_id,
          );
        }

        // * Save Action Area, Impact Area & SDGs
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
              initSubmitter?.initiative_id,
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
      let consImpactTarget: any[] = [];
      let consSdgTargets: any[] = [];
      let result_toc_results: any[] = [];
      let resTocResConResponse: any[] = [];
      const individualResponses = [];
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
          resTocRes[0]['planned_result'] == 0 &&
          resTocRes[0]['toc_level_id'] !== TocLevelEnum.ACTION_AREA_OUTCOME
            ? 3
            : resTocRes[0]['toc_level_id'];
        for (const init of conInit) {
          result_toc_results =
            await this._resultsTocResultRepository.getRTRPrimary(
              resultId,
              [resultInit.id],
              false,
              [init.id],
            );
          result_toc_results.forEach((el) => {
            if (
              el['planned_result'] === false &&
              el['toc_level_id'] !== TocLevelEnum.ACTION_AREA_OUTCOME
            ) {
              el['toc_level_id'] = 3;
            }
          });

          resTocResConResponse = [
            {
              planned_result: null,
              initiative_id: resTocRes
                ? result_toc_results[0]?.initiative_id
                : null,
              official_code: resTocRes
                ? result_toc_results[0]?.official_code
                : null,
              short_name: resTocRes ? result_toc_results[0]?.short_name : null,
              result_toc_results,
            },
          ];

          resTocResConResponse.forEach((response) => {
            individualResponses.push({
              planned_result: response?.planned_result,
              initiative_id: response?.initiative_id,
              official_code: response?.official_code,
              short_name: response?.short_name,
              result_toc_results: response?.result_toc_results,
            });
          });
        }
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

      return {
        response: {
          contributing_initiatives: conInit,
          contributing_and_primary_initiative: conAndPriInit,
          pending_contributing_initiatives: conPending,
          contributing_np_projects: npProject,
          contributing_center: resCenters,
          result_toc_result: {
            planned_result: null,
            initiative_id: resTocRes ? resTocRes[0]?.initiative_id : null,
            official_code: resTocRes ? resTocRes[0]?.official_code : null,
            short_name: resTocRes ? resTocRes[0]?.short_name : null,
            result_toc_results: resTocRes,
          },
          contributors_result_toc_result: individualResponses,
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
      const result = await this._resultsTocResultRepository.query(`
      SELECT
          rtr.is_sdg_action_impact
      FROM
          results_toc_result rtr
      WHERE
          rtr.results_id = ${resultIdToc}
          AND rtr.initiative_id = ${init}
          AND rtr.toc_result_id = ${toc_result_id}
          AND rtr.is_active = TRUE
      `);
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
      const extra_info = await this._resultsTocResultRepository.getWpExtraInfo(
        resultIdToc,
        toc_result_id,
        init,
      );
      const wp_info =
        await this._resultsTocResultRepository.getWpInformation(toc_result_id);

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
          wpinformation: {
            extraInformation: extra_info[0],
            wp_info,
          },
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

  async getVersionId(result_id: number, init: number) {
    try {
      const resultinit = await this._clarisaInitiatives.findOne({
        select: ['toc_id'],
        where: { id: init },
      });
      let version_id = null;
      if (resultinit.toc_id) {
        const vesion_id = await this._resultsTocResultRepository.query(
          `SELECT
            DISTINCT tr.phase
          FROM
            Integration_information.toc_results tr
          WHERE
            tr.id_toc_initiative = ?
            AND tr.phase = (
              SELECT
                v.toc_pahse_id
              FROM
                result r
              JOIN version v ON
                r.version_id = v.id
              WHERE
                r.id = ?
            );
          `,
          [resultinit.toc_id, result_id],
        );
        if (!vesion_id.length || vesion_id[0].phase == null) {
          version_id = resultinit.toc_id;
        } else {
          version_id = vesion_id[0].phase;
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

  async saveResultTocResultPrimary(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
    result: any,
    result_id: number,
  ) {
    try {
      // * Remove WPs that are not in the incoming DTO
      const incomingResultTocResultIds = [];
      createResultsTocResultDto.result_toc_result.result_toc_results.forEach(
        (toc) => {
          if (toc?.result_toc_result_id) {
            incomingResultTocResultIds.push(toc.result_toc_result_id);
          }
        },
      );

      const storedResultTocResults =
        await this._resultsTocResultRepository.find({
          where: { result_id: result_id },
        });

      storedResultTocResults.forEach(async (storedResultTocResult) => {
        if (
          !incomingResultTocResultIds.includes(
            storedResultTocResult.result_toc_result_id,
          )
        ) {
          await this._resultsTocResultRepository.update(
            storedResultTocResult.result_toc_result_id,
            { is_active: false },
          );
        }
      });

      // * Map multiple WPs to the same initiative
      for (const toc of createResultsTocResultDto.result_toc_result
        .result_toc_results) {
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
        const saveResultTocResult =
          this.validPermissionToSaveResultTocId<number>(
            toc.toc_level_id,
            toc.toc_result_id,
          );
        if (RtR) {
          if (result.result_level_id == 2) {
            RtR.action_area_outcome_id = toc?.action_area_outcome_id || null;
          } else {
            RtR.toc_result_id = toc?.toc_result_id || null;
          }
          RtR.is_active = true;
          RtR.last_updated_by = user.id;
          RtR.planned_result =
            createResultsTocResultDto.result_toc_result?.planned_result;

          await this._resultsTocResultRepository.update(
            RtR.result_toc_result_id,
            {
              toc_result_id: saveResultTocResult,
              toc_level_id: toc.toc_level_id,
              action_area_outcome_id: toc.action_area_outcome_id,
              last_updated_by: user.id,
              planned_result:
                createResultsTocResultDto.result_toc_result?.planned_result,
              is_active: true,
              toc_progressive_narrative: toc.toc_progressive_narrative || null,
            },
          );
        } else if (toc) {
          await this._resultsTocResultRepository.save({
            initiative_ids: toc?.initiative_id,
            toc_result_id: saveResultTocResult,
            toc_level_id: toc.toc_level_id,
            created_by: user.id,
            last_updated_by: user.id,
            result_id: result.id,
            planned_result:
              createResultsTocResultDto.result_toc_result?.planned_result,
            action_area_outcome_id: toc?.action_area_outcome_id,
            is_active: true,
            toc_progressive_narrative: toc.toc_progressive_narrative || null,
          });
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveResultTocResultContributor(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
    result: any,
    result_id: number,
    initSubmitter: number,
  ) {
    const { contributors_result_toc_result } = createResultsTocResultDto;
    try {
      // * Logic to map multiple WPs to multiple Initiatives Contributors
      if (contributors_result_toc_result?.length) {
        // * Logic to delete a WP from Contributors
        const incomingRtRIds = [];
        contributors_result_toc_result.forEach((contributor) => {
          contributor?.result_toc_results?.forEach((rtrc) => {
            incomingRtRIds.push(rtrc?.result_toc_result_id);
          });
        });

        const allRtRsContributors =
          await this._resultsTocResultRepository.findBy({
            result_id,
            initiative_id: Not(initSubmitter),
            is_active: true,
          });

        allRtRsContributors.forEach(async (storedRtR) => {
          if (!incomingRtRIds.includes(storedRtR.result_toc_result_id)) {
            await this._resultsTocResultRepository.update(
              storedRtR.result_toc_result_id,
              { is_active: false },
            );
          }
        });

        // * Map multiple WPs to the same initiative
        const RtRArray: ResultsTocResult[] = [];
        for (const contributor of contributors_result_toc_result) {
          if (!contributor.result_toc_results?.length) {
            contributor.result_toc_results = [];
          }
          for (const rtrc of contributor.result_toc_results) {
            if (!rtrc?.result_toc_result_id && !rtrc?.toc_result_id) {
              continue;
            }
            const RtR = await this._resultsTocResultRepository.getRTRById(
              rtrc?.result_toc_result_id,
            );

            if (RtR) {
              const saveResultTocResult =
                this.validPermissionToSaveResultTocId<number>(
                  rtrc.toc_level_id,
                  rtrc.toc_result_id,
                );
              await this._resultsTocResultRepository.update(
                RtR.result_toc_result_id,
                {
                  toc_result_id: saveResultTocResult,
                  action_area_outcome_id: rtrc?.action_area_outcome_id || null,
                  toc_level_id: rtrc?.toc_level_id,
                  toc_progressive_narrative:
                    rtrc?.toc_progressive_narrative || null,
                  planned_result: contributor?.planned_result,
                  last_updated_by: user.id,
                  is_active: true,
                },
              );
            } else {
              const newRtR = new ResultsTocResult();
              newRtR.created_by = user.id;
              newRtR.planned_result = contributor?.planned_result;
              newRtR.results_id = result.id;
              newRtR.initiative_id = contributor?.initiative_id || null;
              newRtR.is_active = true;
              newRtR.toc_level_id = rtrc?.toc_level_id;
              if (result.result_level_id == 2) {
                newRtR.action_area_outcome_id =
                  rtrc?.action_area_outcome_id || null;
              } else {
                newRtR.toc_result_id =
                  this.validPermissionToSaveResultTocId<number>(
                    newRtR.toc_level_id,
                    newRtR.toc_result_id,
                  );
              }
              newRtR.planned_result = contributor?.planned_result || null;
              newRtR.toc_progressive_narrative =
                rtrc?.toc_progressive_narrative || null;
              RtRArray.push(newRtR);
              await this._resultsTocResultRepository.save({
                initiative_ids: newRtR.initiative_id,
                toc_result_id: newRtR.toc_result_id,
                toc_level_id: newRtR.toc_level_id,
                created_by: newRtR.created_by,
                last_updated_by: newRtR.last_updated_by,
                result_id: newRtR.results_id,
                planned_result: newRtR.planned_result,
                action_area_outcome_id: newRtR.action_area_outcome_id,
                toc_progressive_narrative: newRtR.toc_progressive_narrative,
                is_active: true,
              });
            }
          }
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  validPermissionToSaveResultTocId<T>(tocLevelId: TocLevelEnum, data: T): T {
    if (TocLevelEnum.ACTION_AREA_OUTCOME === tocLevelId) return null;
    return data ?? null;
  }
}
