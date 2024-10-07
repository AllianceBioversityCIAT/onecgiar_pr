import { Injectable, HttpStatus } from '@nestjs/common';
import {
  ContributorResultTocResult,
  CreateResultsTocResultDto,
} from './dto/create-results-toc-result.dto';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultRepository } from '../result.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ClarisaImpactAreaRepository } from '../../../clarisa/clarisa-impact-area/ClarisaImpactArea.repository';
import { ShareResultRequestService } from '../share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../share-result-request/dto/create-toc-share-result.dto';
import { ShareResultRequestRepository } from '../share-result-request/share-result-request.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { In, Not } from 'typeorm';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import Handlebars from 'handlebars';
import { env } from 'process';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { ConfigMessageDto } from '../../../shared/microservices/email-notification-management/dto/send-email.dto';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';

@Injectable()
export class ResultsTocResultsService {
  constructor(
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultsImpactAreaTargetRepository: ResultsImpactAreaTargetRepository,
    private readonly _resultsImpactAreaIndicatorRepository: ResultsImpactAreaIndicatorRepository,
    private readonly _clarisaImpactAreaRepository: ClarisaImpactAreaRepository,
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultBilateralBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
    private readonly _templateRepository: TemplateRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _userNotificationSettingsRepository: UserNotificationSettingRepository,
    private readonly _globalParametersRepository: GlobalParameterRepository,
  ) {}

  async create(
    createResultsTocResultDto: CreateResultsTocResultDto,
    user: TokenDto,
  ) {
    try {
      const {
        result_id,
        contributing_initiatives,
        impactsTarge,
        sdgTargets,
        bodyActionArea,
        changePrimaryInit,
        email_template,
      } = createResultsTocResultDto;

      let initSubmitter: any =
        await this._resultByInitiativesRepository.findOne({
          where: { result_id: result_id, initiative_role_id: 1 },
        });

      const result = await this._resultRepository.getResultById(result_id);
      let initiativeArray: number[] = [];
      let initiativeArrayRtr: number[] = [];
      let initiativeArrayPnd: number[] = [];

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

      if (
        contributing_initiatives?.accepted_contributing_initiatives?.length ||
        contributing_initiatives?.pending_contributing_initiatives?.length
      ) {
        initiativeArray =
          contributing_initiatives?.accepted_contributing_initiatives.map(
            (el) => el.id,
          );
        if (initSubmitter.initiative_id) {
          initiativeArray = initiativeArray.filter(
            (init) => init !== initSubmitter.initiative_id,
          );
        }
        initiativeArrayPnd =
          contributing_initiatives?.pending_contributing_initiatives.map(
            (pend) => pend.id,
          );

        const contributingInit =
          await this._resultByInitiativesRepository.updateResultByInitiative(
            result_id,
            [...initiativeArray],
            user.id,
            false,
            initiativeArrayPnd,
          );

        if (contributingInit.length > 0) {
          await this.sendEmailNotification(
            contributingInit,
            result_id,
            initSubmitter.initiative_id,
            user,
          );
        }

        const dataRequst: CreateTocShareResult = {
          isToc: false,
          initiativeShareId: initiativeArrayPnd,
          email_template,
        };
        await this._shareResultRequestService.resultRequest(
          dataRequst,
          result_id,
          user,
        );
      } else {
        const contributingInit =
          await this._resultByInitiativesRepository.updateResultByInitiative(
            result_id,
            [],
            user.id,
            false,
            [],
          );

        if (contributingInit.length > 0) {
          await this.sendEmailNotification(
            contributingInit,
            result_id,
            initSubmitter.initiative_id,
            user,
          );
        }
      }
      const cancelRequest =
        contributing_initiatives?.pending_contributing_initiatives?.filter(
          (e) => !e.is_active,
        );
      if (cancelRequest?.length) {
        await this._shareResultRequestRepository.cancelRequest(
          cancelRequest.map((e) => e.share_result_request_id),
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
        initiativeArrayRtr =
          contributing_initiatives?.accepted_contributing_initiatives.map(
            (initiative) => initiative.id,
          );
        initiativeArrayRtr = initiativeArrayRtr.concat(
          contributing_initiatives?.pending_contributing_initiatives.map(
            (pending) => pending.id,
          ),
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
          createResultsTocResultDto.contributors_result_toc_result,
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

  async getTocByResult(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );
      const conAndPriInit =
        await this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
          resultId,
        );

      const [conInit, conPending] = await Promise.all([
        this._resultByInitiativesRepository.getContributorInitiativeByResult(
          resultId,
        ),
        this._resultByInitiativesRepository.getPendingInit(resultId),
      ]);

      const contributingInitiatives = {
        accepted_contributing_initiatives: conInit,
        pending_contributing_initiatives: conPending,
      };

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
          resTocRes[0]['planned_result'] == 0
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
            if (el['planned_result'] === false) {
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
        conPending.forEach((pending) => {
          individualResponses.push({
            planned_result: null,
            initiative_id: pending.id,
            official_code: pending.official_code,
            short_name: pending.short_name,
            result_toc_results: [],
          });
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
          // contributing_initiatives: conInit,
          // pending_contributing_initiatives: conPending,
          contributing_initiatives: contributingInitiatives,
          contributing_and_primary_initiative: conAndPriInit,
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
        isSdg = result[0].isSdg;
        isImpactArea = result[0].isImpactArea;
        is_sdg_action_impact = result[0].is_sdg_action_impact;
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
            DISTINCT tr.version_id
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
          version_id = vesion_id[0].version_id;
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
              toc_result_id: toc.toc_result_id,
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
            toc_result_id: toc?.toc_result_id,
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
    createResultsTocResultDto: ContributorResultTocResult[],
    user: TokenDto,
    result: any,
    result_id: number,
    initSubmitter: number,
  ) {
    try {
      // * Logic to map multiple WPs to multiple Initiatives Contributors
      if (createResultsTocResultDto) {
        // * Logic to delete a WP from Contributors
        const incomingRtRIds = [];
        createResultsTocResultDto.forEach((contributor) => {
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
        // Remove the declaration of RtRArray variable
        for (const contributor of createResultsTocResultDto) {
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
              await this._resultsTocResultRepository.update(
                RtR.result_toc_result_id,
                {
                  toc_result_id: rtrc?.toc_result_id,
                  action_area_outcome_id: rtrc?.action_area_outcome_id || null,
                  toc_progressive_narrative:
                    rtrc?.toc_progressive_narrative || null,
                  planned_result: contributor?.planned_result,
                  last_updated_by: user.id,
                  is_active: true,
                },
              );
            } else {
              await this._resultsTocResultRepository.insert({
                initiative_ids: contributor?.initiative_id,
                toc_result_id: rtrc?.toc_result_id,
                created_by: user.id,
                last_updated_by: user.id,
                result_id: result_id,
                planned_result: contributor?.planned_result,
                action_area_outcome_id: rtrc?.action_area_outcome_id || null,
                is_active: true,
                toc_progressive_narrative:
                  rtrc?.toc_progressive_narrative || null,
              });
            }
          }
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveMapToToc(
    createResultsTocResultDto: ContributorResultTocResult[],
    user: TokenDto,
    result_id: number,
  ) {
    try {
      // * Logic to map multiple WPs to multiple Initiatives Contributors
      if (createResultsTocResultDto) {
        for (const contributor of createResultsTocResultDto) {
          if (!contributor.result_toc_results?.length) {
            contributor.result_toc_results = [];
          }
          for (const rtrc of contributor.result_toc_results) {
            if (!rtrc?.result_toc_result_id && !rtrc?.toc_result_id) {
              continue;
            }
            await this._resultsTocResultRepository.insert({
              initiative_ids: contributor?.initiative_id,
              toc_result_id: rtrc?.toc_result_id,
              created_by: user.id,
              last_updated_by: user.id,
              result_id: result_id,
              planned_result: contributor?.planned_result,
              action_area_outcome_id: rtrc?.action_area_outcome_id || null,
              is_active: true,
              toc_progressive_narrative:
                rtrc?.toc_progressive_narrative || null,
            });
          }
        }
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private async sendEmailNotification(
    contributingInit: number[],
    result_id: number,
    initSubmitter: number,
    user: TokenDto,
  ) {
    for (const init of contributingInit) {
      const [initOwner, result, initContributing, initMembers] =
        await Promise.all([
          this._clarisaInitiatives.findOne({
            where: { id: initSubmitter },
          }),
          this._resultRepository.findOne({ where: { id: result_id } }),
          this._clarisaInitiatives.findOne({
            where: { id: init },
          }),
          this._roleByUserRepository.find({
            where: {
              initiative_id: init,
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
          initiative_id: init,
        },
        relations: ['obj_user'],
      });

      const to = userEnable.map((u) => u.obj_user.email);

      if (!to) {
        return {
          response: {},
          message: 'The email was not sent',
          status: HttpStatus.CREATED,
        };
      }

      const template = await this._templateRepository.findOne({
        where: { name: EmailTemplate.REMOVED_CONTRIBUTION },
      });
      const pcuEmail = await this._globalParametersRepository.findOne({
        where: { name: 'pcu_email' },
        select: {
          value: true,
        },
      });

      const technicalTeamEmailsRecord =
        await this._globalParametersRepository.findOne({
          where: { name: 'technical_team_email' },
          select: { value: true },
        });

      const emailData = this._emailNotificationManagementService.buildEmailData(
        template.name as EmailTemplate.REMOVED_CONTRIBUTION,
        {
          initContributing,
          result,
          initOwner,
          pcuEmail: pcuEmail.value,
          user,
        },
      );

      const handle = Handlebars.compile(template.template);

      const email: ConfigMessageDto = {
        from: { email: env.EMAIL_SENDER, name: 'PRMS Reporting Tool -' },
        emailBody: {
          subject: emailData.subject,
          to,
          cc: emailData.cc,
          bcc: technicalTeamEmailsRecord.value,
          message: {
            text: 'Contributing Initiative Removed from a Result',
            socketFile: handle(emailData),
          },
        },
      };
      this._emailNotificationManagementService.sendEmail(email);
    }
  }
}
