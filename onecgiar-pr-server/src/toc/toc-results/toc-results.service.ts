import { Injectable, HttpStatus } from '@nestjs/common';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './toc-results.repository';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';
import { ResultRepository } from '../../api/results/result.repository';
import { YearRepository } from '../../api/results/years/year.repository';
import { throwServiceError } from '../../shared/utils/service-error.util';

@Injectable()
export class TocResultsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _tocResultsRepository: TocResultsRepository,
    private readonly _returnResponse: ReturnResponse,
    private readonly _resultRepository: ResultRepository,
    private readonly _yearRepository: YearRepository,
  ) {}

  async findTocResultByConfig(
    result_id: number,
    init_id: number,
    toc_level: number,
  ) {
    try {
      let res = await this._tocResultsRepository.$_getResultTocByConfig(
        result_id,
        init_id,
        toc_level,
      );
      if (!res.length && toc_level == 4) {
        res =
          await this._tocResultsRepository.getAllOutcomeByInitiative(toc_level);
      }
      return this._returnResponse.format({
        message: 'Successful response',
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findAllByinitiativeId(initiativeId: number, levelId: number) {
    try {
      const tocResults =
        await this._tocResultsRepository.getAllTocResultsByInitiative(
          initiativeId,
          levelId,
        );

      if (!tocResults.length) {
        throwServiceError('ToC Results Not Found', HttpStatus.NOT_FOUND);
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findFullInitiativeTocByResult(resultId: number) {
    try {
      const tocResults =
        await this._tocResultsRepository.getFullInitiativeTocByResult(resultId);
      if (!tocResults.length) {
        throwServiceError('ToC Results Not Found', HttpStatus.NOT_FOUND);
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findFullInitiativeTocByInitiative(initiativeId: number) {
    try {
      const tocResults =
        await this._tocResultsRepository.getFullInitiativeTocByInitiative(
          initiativeId,
        );
      if (!tocResults.length) {
        throwServiceError('ToC by Initiative Not Found', HttpStatus.NOT_FOUND);
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findTocResultByConfigV2(
    result_id: number,
    init_id: number,
    toc_level: number,
    planned?: boolean,
  ) {
    try {
      const result = await this._resultRepository.findOne({
        select: {
          id: true,
          version_id: true,
          result_type_id: true,
          obj_version: {
            id: true,
            phase_year: true,
            toc_pahse_id: true,
          },
        },
        where: { id: result_id, is_active: true },
        relations: {
          obj_version: true,
        },
      });

      if (!result) {
        throwServiceError('The result was not found.', HttpStatus.NOT_FOUND);
      }

      const reportingYear = Number(result.obj_version?.phase_year);
      if (!Number.isFinite(reportingYear) || reportingYear < 0) {
        throwServiceError(
          'The result does not have a valid reporting phase year.',
          HttpStatus.BAD_REQUEST,
        );
      }

      let tocPhaseId =
        result.obj_version?.toc_pahse_id !== null &&
        result.obj_version?.toc_pahse_id !== undefined
          ? String(result.obj_version.toc_pahse_id).trim()
          : '';

      if (!tocPhaseId && result.version_id) {
        const resolvedPhaseId =
          await this._tocResultsRepository.getTocPhaseIdByVersionId(
            Number(result.version_id),
          );
        tocPhaseId = resolvedPhaseId ?? '';
      }

      if (!tocPhaseId) {
        throwServiceError(
          `No TOC phase is configured for the result reporting year ${reportingYear}.`,
          HttpStatus.NOT_FOUND,
        );
      }

      const activeYearRow = await this._yearRepository.findOne({
        where: { active: true },
        select: ['year'],
      });
      const activeReportingYear = Number(activeYearRow?.year);
      const includeInactiveIndicators =
        Number.isFinite(activeReportingYear) &&
        reportingYear < activeReportingYear;

      const res = await this._tocResultsRepository.$_getResultTocByConfigV2(
        init_id,
        toc_level,
        reportingYear,
        result.result_type_id,
        result_id,
        planned ?? true,
        tocPhaseId,
      );

      let enrichedResults;

      if (res?.length) {
        const tocResultIds = Array.from(
          new Set<number>(
            res
              .map((row) => Number(row?.toc_result_id))
              .filter((id) => Number.isFinite(id)),
          ),
        );

        if (tocResultIds.length) {
          const mappingRows =
            await this._tocResultsRepository.getResultIndicatorMappings(
              result_id,
              init_id,
              tocResultIds,
            );

          const linkedIndicatorNodeIds = Array.from(
            new Set(
              (mappingRows ?? [])
                .map((row) => row?.toc_results_indicator_id)
                .filter(
                  (identifier): identifier is string =>
                    typeof identifier === 'string' && identifier.trim() !== '',
                ),
            ),
          );

          const indicatorRows =
            await this._tocResultsRepository.getTocIndicatorsByResultIds(
              result,
              reportingYear,
              tocResultIds,
              result.result_type_id,
              linkedIndicatorNodeIds,
              result_id,
              init_id,
              includeInactiveIndicators,
            );

          const indicatorMap = new Map<
            number,
            Array<{
              indicator_id: number;
              toc_result_indicator_id: string | null;
              related_node_id: string | null;
              indicator_description: string | null;
              unit_messurament: string | null;
              type_value: string | null;
              type_name: string | null;
              location: string | null;
              result_toc_result_indicator_id: number | null;
              indicator_contributing: number | null;
              status_id: number | null;
              target_value: number | null;
              targets: Array<{
                target_value: number | null;
              }>;
            }>
          >();

          const resultMappingInfo = new Map<
            number,
            {
              result_toc_result_id: number | null;
              planned_result: boolean | null;
              toc_progressive_narrative: string | null;
              indicatorMappings: Map<
                string,
                {
                  result_toc_result_indicator_id: number | null;
                  indicator_contributing: number | null;
                  status_id: number | null;
                }
              >;
            }
          >();

          for (const mapping of mappingRows ?? []) {
            const tocId = Number(mapping?.toc_result_id);
            if (!Number.isFinite(tocId)) {
              continue;
            }

            const indicatorKey = mapping?.toc_results_indicator_id
              ? String(mapping.toc_results_indicator_id)
              : null;

            let info = resultMappingInfo.get(tocId);
            if (!info) {
              info = {
                result_toc_result_id:
                  mapping?.result_toc_result_id !== null &&
                  mapping?.result_toc_result_id !== undefined
                    ? Number(mapping.result_toc_result_id)
                    : null,
                planned_result:
                  mapping?.planned_result === null ||
                  mapping?.planned_result === undefined
                    ? null
                    : Boolean(mapping.planned_result),
                toc_progressive_narrative:
                  typeof mapping?.toc_progressive_narrative === 'string'
                    ? mapping.toc_progressive_narrative
                    : null,
                indicatorMappings: new Map(),
              };
              resultMappingInfo.set(tocId, info);
            }

            if (indicatorKey) {
              info.indicatorMappings.set(indicatorKey, {
                result_toc_result_indicator_id:
                  mapping?.result_toc_result_indicator_id !== null &&
                  mapping?.result_toc_result_indicator_id !== undefined
                    ? Number(mapping.result_toc_result_indicator_id)
                    : null,
                indicator_contributing:
                  mapping?.indicator_contributing !== null &&
                  mapping?.indicator_contributing !== undefined
                    ? Number(mapping.indicator_contributing)
                    : null,
                status_id:
                  mapping?.indicator_status !== null &&
                  mapping?.indicator_status !== undefined
                    ? Number(mapping.indicator_status)
                    : null,
              });
            }
          }

          for (const indicator of indicatorRows ?? []) {
            const tocId = Number(indicator?.toc_result_id);
            if (!Number.isFinite(tocId)) {
              continue;
            }

            if (!indicatorMap.has(tocId)) {
              indicatorMap.set(tocId, []);
            }

            const mappingInfo = this.resolveIndicatorMappingInfo(
              resultMappingInfo.get(tocId),
              indicator,
            );

            const arr = indicatorMap.get(tocId);
            let idx = -1;
            if (indicator.related_node_id) {
              idx = arr.findIndex(
                (it) => it.related_node_id === indicator.related_node_id,
              );
            } else if (indicator.toc_result_indicator_id) {
              idx = arr.findIndex(
                (it) =>
                  it.toc_result_indicator_id ===
                  indicator.toc_result_indicator_id,
              );
            } else {
              idx = arr.findIndex(
                (it) => it.indicator_id === Number(indicator.indicator_id),
              );
            }

            if (idx >= 0) {
              const existing = arr[idx];
              if (
                existing.result_toc_result_indicator_id == null &&
                mappingInfo?.result_toc_result_indicator_id != null
              ) {
                existing.result_toc_result_indicator_id =
                  mappingInfo.result_toc_result_indicator_id;
              }
              if (
                existing.indicator_contributing == null &&
                mappingInfo?.indicator_contributing != null
              ) {
                existing.indicator_contributing =
                  mappingInfo.indicator_contributing;
              }
              if (
                existing.status_id == null &&
                mappingInfo?.status_id != null
              ) {
                existing.status_id = mappingInfo.status_id;
              }
              if (
                existing.target_value == null &&
                indicator.target_value != null
              ) {
                existing.target_value = indicator.target_value;
              }
              const targetVal =
                indicator.target_value === undefined
                  ? null
                  : (indicator.target_value ?? null);
              const already = existing.targets.some(
                (t) => t.target_value === targetVal,
              );
              if (!already) {
                existing.targets.push({ target_value: targetVal });
              }
            } else {
              arr.push({
                indicator_id: Number(indicator.indicator_id),
                toc_result_indicator_id:
                  indicator.toc_result_indicator_id ?? null,
                related_node_id: indicator.related_node_id ?? null,
                indicator_description: indicator.indicator_description ?? null,
                unit_messurament: indicator.unit_messurament ?? null,
                type_value: indicator.type_value ?? null,
                type_name: indicator.type_name ?? null,
                location: indicator.location ?? null,
                result_toc_result_indicator_id:
                  mappingInfo?.result_toc_result_indicator_id ?? null,
                indicator_contributing:
                  mappingInfo?.indicator_contributing ?? null,
                status_id: mappingInfo?.status_id ?? null,
                target_value: indicator.target_value ?? null,
                targets: [
                  {
                    target_value:
                      indicator.target_value === undefined
                        ? null
                        : (indicator.target_value ?? null),
                  },
                ],
              });
            }
          }

          const [partnerRows, synergyRows, centerRows] = await Promise.all([
            this._tocResultsRepository.getTocPartnersByResultIds(
              tocResultIds,
              tocPhaseId,
            ),
            this._tocResultsRepository.getTocSynergyProgramsByResultIds(
              tocResultIds,
              tocPhaseId,
            ),
            this._tocResultsRepository.getTocTargetCentersByResultIds(
              tocResultIds,
              tocPhaseId,
              reportingYear,
            ),
          ]);

          const partnersMap = this.groupTocPartnersByResultId(
            partnerRows ?? [],
          );
          const synergyMap = this.groupSynergyProgramsByResultId(
            synergyRows ?? [],
          );
          const centersMap = this.groupTargetCentersByResultAndIndicator(
            centerRows ?? [],
          );

          enrichedResults = res.map((row) => {
            const tocId = Number(row?.toc_result_id);
            const mappingInfo = resultMappingInfo.get(tocId);
            const indicators = (indicatorMap.get(tocId) ?? []).map(
              (indicator) =>
                this.enrichIndicatorCatalogItem(
                  indicator,
                  centersMap.get(`${tocId}:${indicator.indicator_id}`) ?? [],
                ),
            );

            return this.enrichTocCatalogRow(
              row,
              {
                result_toc_result_id: mappingInfo?.result_toc_result_id ?? null,
                planned_result: mappingInfo?.planned_result ?? null,
                toc_progressive_narrative:
                  mappingInfo?.toc_progressive_narrative ?? null,
                indicators,
              },
              partnersMap.get(tocId) ?? [],
              synergyMap.get(tocId) ?? [],
            );
          });
        } else {
          enrichedResults = res.map((row) =>
            this.enrichTocCatalogRow(
              row,
              {
                result_toc_result_id: null,
                planned_result: null,
                toc_progressive_narrative: null,
                indicators: [],
              },
              [],
              [],
            ),
          );
        }
      } else {
        enrichedResults = Array.isArray(res)
          ? res.map((row) =>
              this.enrichTocCatalogRow(
                row,
                {
                  result_toc_result_id: null,
                  planned_result: null,
                  toc_progressive_narrative: null,
                  indicators: [],
                },
                [],
                [],
              ),
            )
          : [];
      }

      return this._returnResponse.format({
        message: 'Successful response',
        response: enrichedResults,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(
        error,
        !EnvironmentExtractor.isProduction(),
      );
    }
  }

  async findAllByinitiativeIdV2(initiativeId: number, levelId: number) {
    try {
      const tocResults =
        await this._tocResultsRepository.getAllTocResultsByInitiativeV2(
          initiativeId,
          levelId,
        );

      if (!tocResults.length) {
        throwServiceError('ToC Results Not Found', HttpStatus.NOT_FOUND);
      }

      return {
        response: tocResults,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private resolveIndicatorMappingInfo(
    mappingInfo:
      | {
          indicatorMappings: Map<
            string,
            {
              result_toc_result_indicator_id: number | null;
              indicator_contributing: number | null;
              status_id: number | null;
            }
          >;
        }
      | undefined,
    indicator: {
      related_node_id?: string | null;
      toc_result_indicator_id?: string | null;
      indicator_id?: number | null;
    },
  ) {
    if (!mappingInfo) {
      return null;
    }

    const candidateKeys = [
      indicator.related_node_id,
      indicator.toc_result_indicator_id,
      indicator.indicator_id != null ? String(indicator.indicator_id) : null,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim() !== '',
      )
      .map((value) => value.trim());

    for (const key of candidateKeys) {
      const match = mappingInfo.indicatorMappings.get(key);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private enrichTocCatalogRow(
    row: Record<string, unknown>,
    mapping: {
      result_toc_result_id: number | null;
      planned_result: boolean | null;
      toc_progressive_narrative: string | null;
      indicators: Array<Record<string, unknown>>;
    },
    tocPartners: Array<{ code: number | string }>,
    synergyProgramInitiativeIds: number[],
  ) {
    const description =
      typeof row?.description === 'string' ? row.description : null;

    return {
      ...row,
      outcome_statement: description,
      toc_partners: tocPartners,
      contributing_synergy_program_initiative_ids: synergyProgramInitiativeIds,
      result_toc_result_id: mapping.result_toc_result_id,
      planned_result: mapping.planned_result,
      toc_progressive_narrative: mapping.toc_progressive_narrative,
      indicators: mapping.indicators,
    };
  }

  private enrichIndicatorCatalogItem<
    T extends {
      type_value: string | null;
      indicator_id: number;
    },
  >(indicator: T, centerIds: number[]) {
    return {
      ...indicator,
      indicator_typology: indicator.type_value ?? null,
      toc_target_center_ids: centerIds,
    };
  }

  private groupTocPartnersByResultId(
    rows: Array<{ toc_result_id: number; code: number | string }>,
  ): Map<number, Array<{ code: number | string }>> {
    const map = new Map<number, Array<{ code: number | string }>>();

    for (const row of rows ?? []) {
      const tocId = Number(row?.toc_result_id);
      if (
        !Number.isFinite(tocId) ||
        row?.code === null ||
        row?.code === undefined
      ) {
        continue;
      }

      const current = map.get(tocId) ?? [];
      if (!current.some((item) => `${item.code}` === `${row.code}`)) {
        current.push({ code: row.code });
      }
      map.set(tocId, current);
    }

    return map;
  }

  private groupSynergyProgramsByResultId(
    rows: Array<{ toc_result_id: number; initiative_id: number }>,
  ): Map<number, number[]> {
    const map = new Map<number, number[]>();

    for (const row of rows ?? []) {
      const tocId = Number(row?.toc_result_id);
      const initiativeId = Number(row?.initiative_id);
      if (!Number.isFinite(tocId) || !Number.isFinite(initiativeId)) {
        continue;
      }

      const current = map.get(tocId) ?? [];
      if (!current.includes(initiativeId)) {
        current.push(initiativeId);
      }
      map.set(tocId, current);
    }

    return map;
  }

  private groupTargetCentersByResultAndIndicator(
    rows: Array<{
      toc_result_id: number;
      indicator_id: number;
      center_id: number | string;
    }>,
  ): Map<string, number[]> {
    const map = new Map<string, number[]>();

    for (const row of rows ?? []) {
      const tocId = Number(row?.toc_result_id);
      const indicatorId = Number(row?.indicator_id);
      const centerId = Number(row?.center_id);
      if (
        !Number.isFinite(tocId) ||
        !Number.isFinite(indicatorId) ||
        !Number.isFinite(centerId)
      ) {
        continue;
      }

      const key = `${tocId}:${indicatorId}`;
      const current = map.get(key) ?? [];
      if (!current.includes(centerId)) {
        current.push(centerId);
      }
      map.set(key, current);
    }

    return map;
  }
}
