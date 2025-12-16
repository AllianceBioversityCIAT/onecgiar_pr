import { Injectable, HttpStatus } from '@nestjs/common';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './toc-results.repository';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';
import { ResultRepository } from '../../api/results/result.repository';
import { YearRepository } from '../../api/results/years/year.repository';

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
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
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
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
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
        throw {
          response: {},
          message: 'ToC by Initiative Not Found',
          status: HttpStatus.NOT_FOUND,
        };
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
          },
        },
        where: { id: result_id, is_active: true },
        relations: {
          obj_version: true,
        },
      });

      const year = await this._yearRepository.findOne({
        select: {
          year: true,
        },
        where: {
          active: true,
        },
      });

      const res = await this._tocResultsRepository.$_getResultTocByConfigV2(
        init_id,
        toc_level,
        result?.result_type_id,
        result_id,
      );

      let enrichedResults = res ?? [];

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
              year,
              tocResultIds,
              result?.result_type_id,
              linkedIndicatorNodeIds,
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

            if (!resultMappingInfo.has(tocId)) {
              resultMappingInfo.set(tocId, {
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
              });
            }

            if (indicatorKey) {
              const info = resultMappingInfo.get(tocId)!;
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

            const indicatorKey = indicator.related_node_id
              ? String(indicator.related_node_id)
              : indicator.toc_result_indicator_id
                ? String(indicator.toc_result_indicator_id)
                : null;

            const mappingInfo = indicatorKey
              ? (resultMappingInfo
                  .get(tocId)
                  ?.indicatorMappings.get(indicatorKey) ?? null)
              : null;

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

          enrichedResults = res.map((row) => {
            const tocId = Number(row?.toc_result_id);
            const mappingInfo = resultMappingInfo.get(tocId);
            return {
              ...row,
              result_toc_result_id: mappingInfo?.result_toc_result_id ?? null,
              planned_result: mappingInfo?.planned_result ?? null,
              toc_progressive_narrative:
                mappingInfo?.toc_progressive_narrative ?? null,
              indicators: indicatorMap.get(tocId) ?? [],
            };
          });
        } else {
          enrichedResults = res.map((row) => ({
            ...row,
            result_toc_result_id: null,
            planned_result: null,
            toc_progressive_narrative: null,
            indicators: [],
          }));
        }
      } else {
        enrichedResults = Array.isArray(res)
          ? res.map((row) => ({
              ...row,
              result_toc_result_id: null,
              planned_result: null,
              toc_progressive_narrative: null,
              indicators: [],
            }))
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
        throw {
          response: {},
          message: 'ToC Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
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
}
