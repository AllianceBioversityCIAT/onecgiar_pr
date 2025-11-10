import { forwardRef, Inject, Injectable, HttpStatus } from '@nestjs/common';
import { In, Not } from 'typeorm';
import { env } from 'process';
import Handlebars from 'handlebars';
import {
  ContributorResultTocResult,
  CreateResultsTocResultDto,
} from './dto/create-results-toc-result.dto';
import { CreateResultsTocResultV2Dto } from './dto/create-results-toc-result-v2.dto';
import { ResultsTocResultRepository } from './repositories/results-toc-results.repository';
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
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { ConfigMessageDto } from '../../../shared/microservices/email-notification-management/dto/send-email.dto';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';

type ResultTocResultWithInitiativeInfo = Partial<ResultsTocResult> & {
  initiative_id?: number | null;
  official_code?: string | null;
  short_name?: string | null;
};

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
    @Inject(forwardRef(() => ShareResultRequestService))
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
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
        await this.saveResultTocResultPrimary(
          createResultsTocResultDto,
          user,
          result,
          result_id,
        );

        await this.saveResultTocResultContributor(
          createResultsTocResultDto.contributors_result_toc_result,
          user,
          result,
          result_id,
          initSubmitter.initiative_id,
        );

        if (result.result_level_id > 2) {
          await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
            createResultsTocResultDto,
            result_id,
            user.id,
          );
          await this._resultsTocResultRepository.saveIndicatorsContributors(
            createResultsTocResultDto,
            result_id,
            user.id,
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

  async getTocByResultV2(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const resultInit =
        await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
          resultId,
        );

      if (!result?.id || !resultInit?.id) {
        throw {
          response: { resultId },
          message: 'Result or Initiative not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const [conAccepted, conPending, contributingAndPrimary] =
        await Promise.all([
          this._resultByInitiativesRepository.getContributorInitiativeByResult(
            resultId,
          ),
          this._resultByInitiativesRepository.getPendingInit(resultId),
          this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
            resultId,
          ),
        ]);

      const contributingInitiatives = {
        accepted_contributing_initiatives: conAccepted ?? [],
        pending_contributing_initiatives: conPending ?? [],
      };

      const initiativeIds = new Set<number>();
      initiativeIds.add(resultInit.id);
      for (const init of conAccepted ?? []) {
        if (init?.id) {
          initiativeIds.add(Number(init.id));
        }
      }

      const mappingRows =
        initiativeIds.size > 0
          ? await this._resultsTocResultRepository.getRTRPrimaryV2(
              resultId,
              Array.from(initiativeIds),
            )
          : [];

      interface IndicatorAccumulator {
        result_toc_result_indicator_id: number;
        toc_results_indicator_id: string | null;
        indicator_contributing: string | null;
        status_id: number | null;
        targets: Array<{
          indicators_targets: number | null;
          number_target: number | null;
          contributing_indicator: number | null;
          target_date: number | null;
          target_progress_narrative: string | null;
          indicator_question: boolean | null;
        }>;
      }

      interface ResultAccumulator {
        result_toc_result_id: number;
        toc_result_id: number | null;
        planned_result: boolean | null;
        initiative_id: number | null;
        toc_progressive_narrative: string | null;
        toc_level_id: number | null;
        indicatorsMap: Map<number, IndicatorAccumulator>;
      }

      interface InitiativeAccumulator {
        initiative_id: number;
        official_code: string | null;
        short_name: string | null;
        planned_result: boolean | null;
        resultsMap: Map<number, ResultAccumulator>;
        toc_progressive_narrative?: string | null;
      }

      const initiativesMap = new Map<number, InitiativeAccumulator>();

      for (const row of mappingRows ?? []) {
        const initiativeId = Number(row?.initiative_id);
        if (!Number.isFinite(initiativeId)) {
          continue;
        }

        const resultTocResultId = Number(row?.result_toc_result_id);

        let initiativeEntry = initiativesMap.get(initiativeId);
        if (!initiativeEntry) {
          initiativeEntry = {
            initiative_id: initiativeId,
            official_code:
              typeof row?.official_code === 'string' ? row.official_code : null,
            short_name:
              typeof row?.short_name === 'string' ? row.short_name : null,
            planned_result:
              row?.planned_result === null || row?.planned_result === undefined
                ? null
                : Boolean(row.planned_result),
            resultsMap: new Map(),
          };
          initiativesMap.set(initiativeId, initiativeEntry);
        } else if (
          initiativeEntry.planned_result === null &&
          row?.planned_result !== null &&
          row?.planned_result !== undefined
        ) {
          initiativeEntry.planned_result = Boolean(row.planned_result);
        }

        if (!Number.isFinite(resultTocResultId)) {
          continue;
        }

        let resultEntry = initiativeEntry.resultsMap.get(resultTocResultId);
        if (!resultEntry) {
          resultEntry = {
            result_toc_result_id: resultTocResultId,
            toc_result_id:
              row?.toc_result_id !== null && row?.toc_result_id !== undefined
                ? Number(row.toc_result_id)
                : null,
            planned_result:
              row?.planned_result === null || row?.planned_result === undefined
                ? null
                : Boolean(row.planned_result),
            initiative_id:
              row?.initiative_id !== null && row?.initiative_id !== undefined
                ? Number(row.initiative_id)
                : null,
            toc_progressive_narrative:
              typeof row?.toc_progressive_narrative === 'string'
                ? row.toc_progressive_narrative
                : null,
            toc_level_id:
              row?.toc_level_id !== null && row?.toc_level_id !== undefined
                ? Number(row.toc_level_id)
                : null,
            indicatorsMap: new Map(),
          };
          initiativeEntry.resultsMap.set(resultTocResultId, resultEntry);
        }

        const indicatorId = Number(row?.result_toc_result_indicator_id);
        if (Number.isFinite(indicatorId)) {
          let indicatorEntry = resultEntry.indicatorsMap.get(indicatorId);
          if (!indicatorEntry) {
            indicatorEntry = {
              result_toc_result_indicator_id: indicatorId,
              toc_results_indicator_id: row?.toc_results_indicator_id ?? null,
              indicator_contributing: row?.indicator_contributing ?? null,
              status_id:
                row?.indicator_status !== null &&
                row?.indicator_status !== undefined
                  ? Number(row.indicator_status)
                  : null,
              targets: [],
            };
            resultEntry.indicatorsMap.set(indicatorId, indicatorEntry);
          }

          const targetIdRaw = row?.indicators_targets;
          if (targetIdRaw !== undefined) {
            const targetId = targetIdRaw !== null ? Number(targetIdRaw) : null;
            const existingTarget = indicatorEntry.targets.find(
              (target) => target.indicators_targets === targetId,
            );

            if (!existingTarget) {
              indicatorEntry.targets.push({
                indicators_targets: targetId,
                number_target:
                  row?.number_target !== null &&
                  row?.number_target !== undefined
                    ? Number(row.number_target)
                    : null,
                contributing_indicator:
                  row?.contributing_indicator !== null &&
                  row?.contributing_indicator !== undefined
                    ? Number(row.contributing_indicator)
                    : null,
                target_date:
                  row?.target_date !== null && row?.target_date !== undefined
                    ? Number(row.target_date)
                    : null,
                target_progress_narrative:
                  row?.target_progress_narrative ?? null,
                indicator_question:
                  row?.indicator_question !== null &&
                  row?.indicator_question !== undefined
                    ? Boolean(row.indicator_question)
                    : null,
              });
            }
          }
        }
      }

      const serializeInitiativeEntry = (
        initiativeId: number,
        fallback: {
          official_code?: string | null;
          short_name?: string | null;
        } = {},
      ) => {
        const entry = initiativesMap.get(initiativeId);
        const resultArray =
          entry?.resultsMap !== undefined
            ? Array.from(entry.resultsMap.values()).map((result) => ({
                result_toc_result_id: result.result_toc_result_id,
                toc_result_id: result.toc_result_id,
                planned_result: result.planned_result,
                initiative_id: result.initiative_id,
                toc_progressive_narrative: result.toc_progressive_narrative,
                toc_level_id: result.toc_level_id,
                indicators: Array.from(result.indicatorsMap.values()).map(
                  (indicator) => ({
                    result_toc_result_indicator_id:
                      indicator.result_toc_result_indicator_id,
                    toc_results_indicator_id:
                      indicator.toc_results_indicator_id,
                    indicator_contributing: indicator.indicator_contributing,
                    status_id: indicator.status_id,
                    targets: indicator.targets,
                  }),
                ),
              }))
            : [];

        const isPlanned = entry?.planned_result === true;
        const resultTocResults = isPlanned ? resultArray : null;
        const tocProgressiveNarrative = isPlanned
          ? null
          : (resultArray?.[0]?.toc_progressive_narrative ?? null);

        return {
          planned_result: entry?.planned_result ?? null,
          initiative_id: initiativeId,
          official_code: entry?.official_code ?? fallback.official_code ?? null,
          short_name: entry?.short_name ?? fallback.short_name ?? null,
          result_toc_results: resultTocResults,
          ...(isPlanned
            ? {}
            : { toc_progressive_narrative: tocProgressiveNarrative }),
        };
      };

      const primaryMapping = serializeInitiativeEntry(resultInit.id, {
        official_code: resultInit.official_code ?? null,
        short_name: resultInit.short_name ?? null,
      });

      const contributorMappings =
        (conAccepted ?? []).map((initiative) =>
          serializeInitiativeEntry(Number(initiative?.id), {
            official_code: initiative?.official_code ?? null,
            short_name: initiative?.short_name ?? null,
          }),
        ) ?? [];

      for (const pending of conPending ?? []) {
        const pendingId = Number(pending?.id);
        if (!Number.isFinite(pendingId)) {
          continue;
        }
        const existing = contributorMappings.find(
          (entry) => entry.initiative_id === pendingId,
        );
        if (!existing) {
          contributorMappings.push({
            planned_result: null,
            initiative_id: pendingId,
            official_code: pending?.official_code ?? null,
            short_name: pending?.short_name ?? null,
            result_toc_results: [],
            toc_progressive_narrative: null,
          });
        }
      }

      return {
        response: {
          contributing_initiatives: contributingInitiatives,
          contributing_and_primary_initiative: contributingAndPrimary ?? [],
          result_toc_result: primaryMapping,
          contributors_result_toc_result: contributorMappings,
          impacts: null,
          impactsTarge: null,
          sdgTargets: null,
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
            ${env.DB_TOC}}.toc_results tr
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
      const primaryInitiativeId =
        (createResultsTocResultDto.result_toc_result as any)?.initiative_id ??
        result?.initiative_id ??
        null;

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
              initiative_ids: primaryInitiativeId ?? RtR.initiative_ids ?? null,
              is_active: true,
              toc_progressive_narrative: toc.toc_progressive_narrative || null,
            },
          );
        } else if (toc) {
          await this._resultsTocResultRepository.save({
            initiative_ids: toc?.initiative_id ?? primaryInitiativeId ?? null,
            toc_result_id: toc?.toc_result_id,
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
    createResultsTocResultDto: ContributorResultTocResult[],
    user: TokenDto,
    result: any,
    result_id: number,
    initSubmitter: number,
  ) {
    try {
      if (!createResultsTocResultDto?.length) return;

      const incomingRtRIds = createResultsTocResultDto.flatMap(
        (contributor) =>
          contributor?.result_toc_results?.map(
            (rtrc) => rtrc?.result_toc_result_id,
          ) || [],
      );

      const allRtRsContributors = await this._resultsTocResultRepository.findBy(
        {
          result_id,
          initiative_id: Not(initSubmitter),
          is_active: true,
        },
      );

      await Promise.all(
        allRtRsContributors.map(async (storedRtR) => {
          if (!incomingRtRIds.includes(storedRtR.result_toc_result_id)) {
            return this._resultsTocResultRepository.update(
              storedRtR.result_toc_result_id,
              { is_active: false },
            );
          }
        }),
      );

      await Promise.all(
        createResultsTocResultDto.map(async (contributor) => {
          const initInactive = await this._resultByInitiativesRepository.findBy(
            {
              initiative_id: contributor.initiative_id,
              result_id,
              is_active: false,
            },
          );

          if (!contributor?.result_toc_results?.length || initInactive.length) {
            contributor.result_toc_results = [];
          }

          await Promise.all(
            contributor.result_toc_results.map(async (rtrc) => {
              if (!rtrc?.result_toc_result_id && !rtrc?.toc_result_id) return;

              const existingRtR =
                await this._resultsTocResultRepository.getRTRById(
                  rtrc?.result_toc_result_id,
                );

              if (existingRtR) {
                const updatePayload: Record<string, any> = {
                  toc_result_id: rtrc?.toc_result_id,
                  action_area_outcome_id: rtrc?.action_area_outcome_id || null,
                  toc_progressive_narrative:
                    rtrc?.toc_progressive_narrative || null,
                  planned_result: contributor?.planned_result,
                  last_updated_by: user.id,
                  is_active: true,
                };

                const normalizedInitiative = Number(contributor?.initiative_id);
                if (
                  Number.isFinite(normalizedInitiative) &&
                  normalizedInitiative > 0
                ) {
                  updatePayload.initiative_ids = normalizedInitiative;
                }

                return this._resultsTocResultRepository.update(
                  existingRtR.result_toc_result_id,
                  updatePayload,
                );
              } else {
                return this._resultsTocResultRepository.insert({
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
            }),
          );
        }),
      );
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
            relations: { obj_user: true },
          }),
        ]);
      const users = initMembers.map((m) => m.obj_user.id);

      const userEnable = await this._userNotificationSettingsRepository.find({
        where: {
          user_id: In(users),
          email_notifications_contributing_request_enabled: true,
          initiative_id: init,
        },
        relations: { obj_user: true },
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

  async createTocMappingV2(
    dto: CreateResultsTocResultDto | CreateResultsTocResultV2Dto,
    user: TokenDto,
  ) {
    try {
      const {
        result_id,
        contributing_initiatives,
        accepted_contributing_initiatives,
        pending_contributing_initiatives,
        cancel_pending_requests,
        changePrimaryInit,
        email_template,
        result_toc_result,
        contributors_result_toc_result = [],
      } = dto as CreateResultsTocResultV2Dto & CreateResultsTocResultDto;

      const result = await this._resultRepository.getResultById(result_id);
      if (!result?.id) {
        throw {
          response: { result_id },
          message: 'Result Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let initSubmitter = await this._resultByInitiativesRepository.findOne({
        where: { result_id, initiative_role_id: 1 },
      });

      if (
        initSubmitter?.initiative_id &&
        initSubmitter.initiative_id !== changePrimaryInit
      ) {
        const newInit =
          await this._resultByInitiativesRepository.updateIniciativeSubmitter(
            result_id,
            initSubmitter.initiative_id,
            changePrimaryInit,
          );
        initSubmitter = newInit;
      }

      let acceptedIds: number[] = accepted_contributing_initiatives?.length
        ? accepted_contributing_initiatives
        : [];
      let pendingIds: number[] = pending_contributing_initiatives?.length
        ? pending_contributing_initiatives
        : [];

      if (contributing_initiatives?.accepted_contributing_initiatives?.length) {
        acceptedIds = contributing_initiatives.accepted_contributing_initiatives
          .map((i) => i.id)
          .filter((id) => id !== initSubmitter.initiative_id);
      } else {
        acceptedIds = acceptedIds.filter(
          (id) => id !== initSubmitter.initiative_id,
        );
      }
      if (contributing_initiatives?.pending_contributing_initiatives?.length) {
        pendingIds =
          contributing_initiatives.pending_contributing_initiatives.map(
            (i) => i.id,
          );
      }

      const contributingInit =
        await this._resultByInitiativesRepository.updateResultByInitiative(
          result_id,
          acceptedIds,
          user.id,
          false,
          pendingIds,
        );

      if (contributingInit.length > 0) {
        await this.sendEmailNotification(
          contributingInit,
          result_id,
          initSubmitter.initiative_id,
          user,
        );
      }

      if (pendingIds.length) {
        const dataRequest: CreateTocShareResult = {
          isToc: false,
          initiativeShareId: pendingIds,
          email_template,
        };
        await this._shareResultRequestService.resultRequest(
          dataRequest,
          result_id,
          user,
        );
      }

      const toCancelIds =
        cancel_pending_requests ??
        contributing_initiatives?.pending_contributing_initiatives
          ?.filter((e) => !e.is_active)
          ?.map((e) => e.share_result_request_id);
      if (toCancelIds?.length) {
        await this._shareResultRequestRepository.cancelRequest(toCancelIds);
      }

      const normalizeInitiativeId = (value: any): number | null => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      };

      const primaryInitiativeId =
        normalizeInitiativeId((result_toc_result as any)?.initiative_id) ??
        normalizeInitiativeId(changePrimaryInit) ??
        normalizeInitiativeId(initSubmitter?.initiative_id) ??
        normalizeInitiativeId(result?.initiative_id);

      const incomingIdsPrimary: number[] = (
        result_toc_result?.result_toc_results ?? []
      )
        .map((t) => Number(t.result_toc_result_id))
        .filter(Boolean);

      const incomingIdsContrib: number[] =
        contributors_result_toc_result.flatMap((c) =>
          (c.result_toc_results ?? [])
            .map((t) => Number(t.result_toc_result_id))
            .filter(Boolean),
        );

      const keepIds = new Set<number>([
        ...incomingIdsPrimary,
        ...incomingIdsContrib,
      ]);

      const existingAll = await this._resultsTocResultRepository.find({
        where: { result_id },
      });

      await Promise.all(
        existingAll.map(async (row) => {
          if (row.is_active && !keepIds.has(Number(row.result_toc_result_id))) {
            await this._resultsTocResultRepository.update(
              row.result_toc_result_id,
              {
                is_active: false,
                last_updated_by: user.id,
              },
            );
          }
        }),
      );

      if (
        result_toc_result?.result_toc_results?.length &&
        result_toc_result?.planned_result === true
      ) {
        console.log('result_toc_result', result_toc_result);
        for (const t of result_toc_result.result_toc_results) {
          if (!t?.result_toc_result_id && !t?.toc_result_id) continue;

          if (t?.result_toc_result_id) {
            const resolvedInitiativeId =
              normalizeInitiativeId((t as any)?.initiative_id) ??
              primaryInitiativeId;

            const updatePayload: Record<string, any> = {
              toc_result_id: t?.toc_result_id ?? null,
              toc_progressive_narrative: t?.toc_progressive_narrative ?? null,
              toc_level_id: t?.toc_level_id ?? null,
              planned_result: result_toc_result?.planned_result ?? null,
              action_area_outcome_id: null,
              is_active: true,
              last_updated_by: user.id,
            };

            if (resolvedInitiativeId != null) {
              updatePayload.initiative_ids = resolvedInitiativeId;
            }

            await this._resultsTocResultRepository.update(
              Number(t.result_toc_result_id),
              updatePayload,
            );
          } else {
            const resolvedInitiativeId =
              normalizeInitiativeId((t as any)?.initiative_id) ??
              primaryInitiativeId;

            await this._resultsTocResultRepository.insert({
              initiative_ids: resolvedInitiativeId ?? null,
              toc_result_id: t?.toc_result_id ?? null,
              toc_progressive_narrative: t?.toc_progressive_narrative ?? null,
              toc_level_id: t?.toc_level_id ?? null,
              planned_result: result_toc_result?.planned_result ?? null,
              action_area_outcome_id: null,
              result_id: result.id,
              is_active: true,
              created_by: user.id,
              last_updated_by: user.id,
            });
          }
        }
      } else if (
        result_toc_result &&
        result_toc_result?.planned_result === false
      ) {
        console.log('result_toc_result else', result_toc_result);

        interface SpecialCaseResultTocResult {
          planned_result: boolean;
          initiative_id: number;
          toc_progressive_narrative: string;
        }

        const rtr = result_toc_result as unknown as SpecialCaseResultTocResult;
        const isSpecialCase = rtr.planned_result === false && rtr.initiative_id;

        if (isSpecialCase) {
          await this._resultsTocResultRepository.update(
            { result_id, initiative_ids: rtr.initiative_id },
            {
              is_active: false,
              last_updated_by: user.id,
            },
          );

          await this._resultsTocResultRepository.insert({
            initiative_ids: rtr.initiative_id,
            toc_result_id: null,
            toc_level_id: null,
            toc_progressive_narrative: rtr.toc_progressive_narrative ?? null,
            planned_result: rtr.planned_result,
            action_area_outcome_id: null,
            result_id: result.id,
            is_active: true,
            created_by: user.id,
            last_updated_by: user.id,
          });
        }
      }

      if (Array.isArray(contributors_result_toc_result)) {
        for (const contrib of contributors_result_toc_result) {
          const initInactive = await this._resultByInitiativesRepository.findBy(
            {
              initiative_id: contrib.initiative_id,
              result_id,
              is_active: false,
            },
          );
          if (initInactive?.length) continue;

          for (const t of contrib.result_toc_results ?? []) {
            if (!t?.result_toc_result_id && !t?.toc_result_id) continue;

            if (t?.result_toc_result_id) {
              const resolvedContribInit = normalizeInitiativeId(
                contrib?.initiative_id,
              );

              const updatePayload: Record<string, any> = {
                toc_result_id: t?.toc_result_id ?? null,
                toc_progressive_narrative: t?.toc_progressive_narrative ?? null,
                toc_level_id: t?.toc_level_id ?? null,
                planned_result: contrib?.planned_result ?? null,
                action_area_outcome_id: null,
                is_active: true,
                last_updated_by: user.id,
              };

              if (resolvedContribInit != null) {
                updatePayload.initiative_ids = resolvedContribInit;
              }

              await this._resultsTocResultRepository.update(
                Number(t.result_toc_result_id),
                updatePayload,
              );
            } else {
              await this._resultsTocResultRepository.insert({
                initiative_ids: normalizeInitiativeId(contrib?.initiative_id),
                toc_result_id: t?.toc_result_id ?? null,
                toc_progressive_narrative: t?.toc_progressive_narrative ?? null,
                toc_level_id: t?.toc_level_id ?? null,
                planned_result: contrib?.planned_result ?? null,
                action_area_outcome_id: null,
                result_id: result.id,
                is_active: true,
                created_by: user.id,
                last_updated_by: user.id,
              });
            }
          }
        }
      }

      const hasPrimaryIndicators =
        Array.isArray(result_toc_result?.result_toc_results) &&
        result_toc_result.result_toc_results.some((item) =>
          Array.isArray((item as any)?.indicators),
        );
      const hasContributorIndicators =
        Array.isArray(contributors_result_toc_result) &&
        contributors_result_toc_result.some(
          (contrib) =>
            Array.isArray(contrib?.result_toc_results) &&
            contrib.result_toc_results.some((item) =>
              Array.isArray((item as any)?.indicators),
            ),
        );

      if (
        result.result_level_id > 2 &&
        (hasPrimaryIndicators || hasContributorIndicators)
      ) {
        const indicatorsPayload = {
          result_id,
          result_toc_result,
          contributors_result_toc_result,
        } as CreateResultsTocResultDto;

        if (hasPrimaryIndicators) {
          await this._resultsTocResultRepository.saveIndicatorsPrimarySubmitter(
            indicatorsPayload,
            result_id,
            user.id,
          );
        }
        if (hasContributorIndicators) {
          await this._resultsTocResultRepository.saveIndicatorsContributors(
            indicatorsPayload,
            result_id,
            user.id,
          );
        }
      }

      const [conInit, conPending, conAndPriInit] = await Promise.all([
        this._resultByInitiativesRepository.getContributorInitiativeByResult(
          result_id,
        ),
        this._resultByInitiativesRepository.getPendingInit(result_id),
        this._resultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult(
          result_id,
        ),
      ]);

      const primaryList = (await this._resultsTocResultRepository.getRTRPrimary(
        result_id,
        [changePrimaryInit],
        true,
      )) as ResultTocResultWithInitiativeInfo[];
      const primaryBox: ResultTocResultWithInitiativeInfo[] =
        primaryList?.length
          ? primaryList
          : [
              {
                action_area_outcome_id: null,
                toc_result_id: null,
                planned_result: result_toc_result?.planned_result ?? null,
                result_id,
                initiative_id: changePrimaryInit,
                short_name: conAndPriInit?.[0]?.short_name ?? null,
                official_code: conAndPriInit?.[0]?.official_code ?? null,
              },
            ];

      const contributorsResp: any[] = [];
      for (const c of conInit) {
        const items = (await this._resultsTocResultRepository.getRTRPrimary(
          result_id,
          [changePrimaryInit],
          false,
          [c.id],
        )) as ResultTocResultWithInitiativeInfo[];

        items?.forEach((el) => {
          if (el['planned_result'] === false) el['toc_level_id'] = 3;
        });

        const contribPlanned = items?.[0]?.planned_result === true;
        const contribTocProgressiveNarrative = contribPlanned
          ? null
          : (items?.[0]?.toc_progressive_narrative ?? null);
        contributorsResp.push({
          planned_result: items?.[0]?.planned_result ?? null,
          initiative_id: items?.[0]?.initiative_id ?? c.id,
          official_code: items?.[0]?.official_code ?? c.official_code,
          short_name: items?.[0]?.short_name ?? c.short_name,
          result_toc_results: contribPlanned ? (items ?? []) : null,
          toc_progressive_narrative: contribTocProgressiveNarrative,
        });
      }

      for (const p of conPending) {
        contributorsResp.push({
          planned_result: null,
          initiative_id: p.id,
          official_code: p.official_code,
          short_name: p.short_name,
          result_toc_results: null,
        });
      }

      const isPrimaryPlanned = result_toc_result?.planned_result === true;
      const resultTocResults = isPrimaryPlanned ? primaryBox : null;
      const tocProgressiveNarrative = isPrimaryPlanned
        ? null
        : (primaryBox?.[0]?.toc_progressive_narrative ?? null);
      const showMultipleWPsContent =
        isPrimaryPlanned &&
        (result_toc_result?.result_toc_results?.length ?? 0) > 1;

      return {
        response: {
          contributing_initiatives: {
            accepted_contributing_initiatives: conInit,
            pending_contributing_initiatives: conPending,
          },
          contributing_and_primary_initiative: conAndPriInit,
          result_toc_result: {
            planned_result: result_toc_result?.planned_result ?? null,
            initiative_id: changePrimaryInit,
            official_code: primaryBox?.[0]?.official_code ?? null,
            short_name: primaryBox?.[0]?.short_name ?? null,
            result_toc_results: resultTocResults,
            toc_progressive_narrative: tocProgressiveNarrative,
            showMultipleWPsContent,
          },
          contributors_result_toc_result: contributorsResp,
          impacts: null,
          impactsTarge: null,
          sdgTargets: null,
          changePrimaryInit: changePrimaryInit,
          bodyActionArea: [],
          email_template: dto.email_template ?? 'email_template_contribution',
        },
        message: 'ToC mapping (P25) created/updated successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getVersionIdV2(result_id: number, init: number) {
    try {
      const initiative = await this._clarisaInitiatives.findOne({
        select: ['official_code'],
        where: { id: init },
      });

      if (!initiative?.official_code) {
        return {
          response: { version_id: null },
          message: 'Initiative not found or missing official code',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const versionResult = await this._resultsTocResultRepository.query(
        `SELECT v.toc_pahse_id
         FROM result r
         JOIN version v ON r.version_id = v.id
         WHERE r.id = ?
         LIMIT 1`,
        [result_id],
      );

      const version_id =
        versionResult.length && versionResult[0].toc_pahse_id != null
          ? versionResult[0].toc_pahse_id
          : initiative.official_code;

      return {
        response: { version_id },
        message: 'Version ID retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async getTocResultIndicatorByResultTocIdV2(
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
      const extra_info =
        await this._resultsTocResultRepository.getWpExtraInfoV2(
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
}
