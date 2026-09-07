import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'node:process';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { AoWBilateralRepository } from '../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultRepository } from '../results/result.repository';
import { CreateResultsFrameworkResultDto } from './dto/create-results-framework.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { VersioningService } from '../versioning/versioning.service';
import { ReportingTocContextService } from './reporting-toc-context/reporting-toc-context.service';
import type { ReportingTocContext } from './reporting-toc-context/reporting-toc-context.interface';
import { CreateResultFromFrameworkCommand } from './application/commands/create-result-from-framework/create-result-from-framework.command';
import { CreateResultFromFrameworkHandler } from './application/commands/create-result-from-framework/create-result-from-framework.handler';
import { GetExistingResultContributorsToIndicatorsQuery } from './application/queries/get-existing-result-contributors/get-existing-result-contributors.query';
import { GetExistingResultContributorsToIndicatorsHandler } from './application/queries/get-existing-result-contributors/get-existing-result-contributors.handler';
import { throwServiceError } from '../../shared/utils/service-error.util';
import { TocResultsRepository } from '../../toc/toc-results/toc-results.repository';
import type { TocResultResponse } from '../results/results-toc-results/repositories/aow-bilateral.repository';
import { rollUpChildren } from '../results/results-toc-results/repositories/toc-progress-rollup';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { W1_W2_RESULT_SOURCE_FILTER } from '../../shared/constants/w1-w2-result-source-filter.constant';
// @akili-spec changes/results-aow-column-filter (RAC-T-1)
import { toResultScopeDto } from './application/queries/results-scope/results-scope.mapper';
import type {
  ResultScopeDto,
  ResultScopeRow,
} from './application/queries/results-scope/results-scope.dto';

/** One entry of the additive `scopeBuckets[]` partition (design.md §5). */
export interface ScopeBucketDto {
  key: string;
  kind: 'aow' | 'outcome' | 'untagged';
  byStatus: Record<number, number>;
  total: number;
}

@Injectable()
export class ResultsFrameworkReportingService {
  private readonly _logger: Logger = new Logger(
    ResultsFrameworkReportingService.name,
  );

  constructor(
    private readonly dataSource: DataSource,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _handlersError: HandlersError,
    private readonly _reportingTocContextService: ReportingTocContextService,
    private readonly _tocResultsRepository: AoWBilateralRepository,
    private readonly _tocCatalogRepository: TocResultsRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _versioningService: VersioningService,
    private readonly _createResultFromFrameworkHandler: CreateResultFromFrameworkHandler,
    private readonly _getExistingResultContributorsToIndicatorsHandler: GetExistingResultContributorsToIndicatorsHandler,
  ) {}

  async getGlobalUnitsByProgram(user: TokenDto, programId?: string) {
    try {
      const normalizedProgramId = programId?.trim();

      if (!normalizedProgramId) {
        throwServiceError(
          'The program identifier is required in the query params.',
        );
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { official_code: normalizedProgramId, active: true },
        select: ['id', 'official_code', 'name', 'short_name', 'portfolio_id'],
      });

      if (!initiative) {
        throwServiceError(
          'No initiative was found with the provided program identifier.',
          HttpStatus.NOT_FOUND,
        );
      }

      const tocContext = await this._reportingTocContextService.resolve();
      const workPackages =
        await this._tocResultsRepository.findWorkPackagesByProgram(
          initiative.official_code.toUpperCase(),
          tocContext,
        );

      if (!workPackages.length) {
        throwServiceError(
          'No work packages were found for the provided program in the active reporting phase.',
          HttpStatus.NOT_FOUND,
        );
      }

      const indicatorContributions =
        await this._tocResultsRepository.getIndicatorContributions(
          initiative.official_code.toUpperCase(),
          tocContext,
        );

      const [resultCountsByUnit, programLevelOutcomes, scopeBuckets] =
        await Promise.all([
          this.getResultsCountByUnitAndStatus(
            initiative.id,
            workPackages.map((u) => u.code),
            tocContext,
          ),
          this._tocResultsRepository.countProgramLevelOutcomes(
            initiative.official_code.toUpperCase(),
            tocContext,
          ),
          this.getScopeBuckets(initiative.id, workPackages, tocContext),
        ]);

      const allStatusIds = (
        Object.values(ResultStatusData) as ResultStatusData[]
      )
        .map((s) => s.value)
        .sort((a, b) => a - b);

      let totalTargetValue = 0;
      let totalActualValue = 0;
      const progressByUnit = new Map<
        string,
        {
          targetValue: number;
          actualValue: number;
          progressSum: number;
          indicatorCount: number;
        }
      >();

      const computeProgressValue = (
        targetValue: number,
        actualValue: number,
      ) => {
        let progressRaw = 0;
        if (targetValue > 0) {
          progressRaw = (actualValue / targetValue) * 100;
        } else if (targetValue === 0 && actualValue > 0) {
          progressRaw = actualValue * 100;
        }

        const progressRounded = Math.round(progressRaw * 10) / 10;
        return Number.isFinite(progressRounded) ? progressRounded : 0;
      };

      let globalProgressSum = 0;
      let globalIndicatorCount = 0;

      for (const contribution of indicatorContributions.values()) {
        totalTargetValue += contribution.target_value_sum ?? 0;
        totalActualValue += contribution.actual_achieved_value_sum ?? 0;

        const indicatorProgress = computeProgressValue(
          contribution.target_value_sum ?? 0,
          contribution.actual_achieved_value_sum ?? 0,
        );
        globalProgressSum += indicatorProgress;
        globalIndicatorCount += 1;

        const unitKey = contribution.work_package_acronym;
        if (unitKey) {
          const normalizedKey = unitKey.toUpperCase();
          const current = progressByUnit.get(normalizedKey) ?? {
            targetValue: 0,
            actualValue: 0,
            progressSum: 0,
            indicatorCount: 0,
          };

          current.targetValue += contribution.target_value_sum ?? 0;
          this._logger.log(
            `[ResultsFramework] unit=${normalizedKey}: targetValueSum=${current.targetValue}`,
          );
          current.actualValue += contribution.actual_achieved_value_sum ?? 0;
          current.progressSum += indicatorProgress;
          current.indicatorCount += 1;
          progressByUnit.set(normalizedKey, current);
        }
      }

      let globalProgressPercentage = computeProgressValue(
        totalTargetValue,
        totalActualValue,
      );
      if (globalIndicatorCount > 0) {
        const averageProgress = globalProgressSum / globalIndicatorCount;
        globalProgressPercentage = Math.round(averageProgress * 10) / 10;
      }

      const filteredUnits = workPackages.map((unit) => {
        const unitKey = unit.code?.toUpperCase() ?? '';
        const totals = progressByUnit.get(unitKey) ?? {
          targetValue: 0,
          actualValue: 0,
          progressSum: 0,
          indicatorCount: 0,
        };

        let unitProgress = computeProgressValue(
          totals.targetValue,
          totals.actualValue,
        );

        if (totals.indicatorCount > 0) {
          const unitAverage = totals.progressSum / totals.indicatorCount;
          unitProgress = Math.round(unitAverage * 10) / 10;
        }

        return {
          id: unit.id,
          code: unit.code,
          name: unit.name,
          composeCode: unit.composeCode,
          year: unit.year,
          level: 2,
          parentId: initiative.id,
          progress: unitProgress ?? 0,
          progressDetails: {
            targetValueSum: totals.targetValue,
            actualAchievedValueSum: totals.actualValue,
          },
          resultsCount: {
            // KEPT — same name, same semantics, same INNER-join population
            // (OSF-DD-2b). Widening the query's status filter to build
            // `byStatus` does not change these two values (OSF-AC-12).
            editing: resultCountsByUnit.get(`${unitKey}_1`) ?? 0,
            submitted: resultCountsByUnit.get(`${unitKey}_3`) ?? 0,
            byStatus: this.buildByStatusRecord(allStatusIds, (statusId) =>
              resultCountsByUnit.get(`${unitKey}_${statusId}`),
            ),
          },
        };
      });

      return {
        response: {
          initiative: {
            id: initiative.id,
            officialCode: initiative.official_code,
            name: initiative.name,
            shortName: initiative.short_name,
          },
          parentUnit: {
            id: initiative.id,
            code: initiative.official_code,
            name: initiative.short_name || initiative.name,
            composeCode: initiative.official_code,
            level: 1,
            year: tocContext.reportingYear,
          },
          units: filteredUnits,
          // NEW additive field (OSF-R-2, OSF-R-4). Total partition of the
          // program's W1/W2 results: every result belongs to exactly one
          // bucket, and the buckets sum to the unfiltered total (OSF-AC-3).
          scopeBuckets,
          intermediateOutcomes: {
            count: programLevelOutcomes.intermediateCount,
            hasData: programLevelOutcomes.intermediateCount > 0,
          },
          outcomes2030: {
            count: programLevelOutcomes.eoi2030Count,
            hasData: programLevelOutcomes.eoi2030Count > 0,
          },
          metadata: {
            activeYear: tocContext.reportingYear,
            phaseUuid: tocContext.phaseUuid,
            portfolio: initiative.portfolio_id,
          },
          globalProgress: {
            targetValueSum: totalTargetValue,
            actualAchievedValueSum: totalActualValue,
            progressPercentage: globalProgressPercentage,
          },
        },
        message: 'Global units retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getWorkPackagesByProgramAndArea(
    program?: string,
    areaOfWork?: string,
    year?: string,
    versionId?: number,
  ) {
    try {
      const normalizedProgram = program?.trim();
      const normalizedArea = areaOfWork?.trim();

      if (!normalizedProgram) {
        throwServiceError(
          'The program identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!normalizedArea) {
        throwServiceError(
          'The area of work identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const normalizedYear =
        year !== undefined && year !== null && `${year}`.trim() !== ''
          ? Number(year)
          : undefined;

      if (
        normalizedYear !== undefined &&
        (!Number.isFinite(normalizedYear) || normalizedYear < 0)
      ) {
        throwServiceError(
          'The year filter must be a valid positive integer when provided.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this.resolveTocContextForRequest(
        versionId,
        normalizedYear,
      );
      const resolvedYear = tocContext.reportingYear;

      const compositeCode = `${normalizedProgram.toUpperCase()}-${normalizedArea.toUpperCase()}`;

      const tocResults = await this._tocResultsRepository.findByCompositeCode(
        normalizedProgram.toUpperCase(),
        compositeCode,
        tocContext,
      );

      const tocResultsOutcomes = (tocResults || []).filter(
        (r) => (r.category || '').toUpperCase() === 'OUTCOME',
      );
      const tocResultsOutputs = (tocResults || []).filter(
        (r) => (r.category || '').toUpperCase() === 'OUTPUT',
      );

      if (!tocResultsOutcomes.length && !tocResultsOutputs.length) {
        throwServiceError(
          'No work packages were found for the provided filters in the ToC catalogue.',
          HttpStatus.NOT_FOUND,
        );
      }

      const enrichIndicatorTargets = async (indicator: any) => {
        if (!indicator?.indicator_id) {
          return;
        }

        const targetsWithCenters =
          await this._tocResultsRepository.findTargetsWithCentersByIndicatorId(
            indicator.indicator_id,
            resolvedYear,
          );

        const centerTargetsMap = new Map<
          number,
          {
            center_id: number;
            center_acronym: string;
            center_name: string;
            targets: Array<{
              toc_indicator_target_id: number;
              year: number;
              target_value: number;
              number_target: string;
            }>;
          }
        >();

        for (const target of targetsWithCenters) {
          for (const center of target.centers ?? []) {
            if (!center?.center_id) {
              continue;
            }

            if (!centerTargetsMap.has(center.center_id)) {
              centerTargetsMap.set(center.center_id, {
                center_id: center.center_id,
                center_acronym: center.center_acronym,
                center_name: center.center_name,
                targets: [],
              });
            }

            centerTargetsMap.get(center.center_id)?.targets.push({
              toc_indicator_target_id: target.toc_indicator_target_id,
              year: target.year,
              target_value: target.target_value,
              number_target: target.number_target,
            });
          }
        }

        indicator.targets_by_center = centerTargetsMap.size
          ? { centers: Array.from(centerTargetsMap.values()) }
          : {};

        this.assignIndicatorCenterContext(indicator, resolvedYear);
      };

      const enrichTocResult = async (tocResult: any) => {
        if (!Array.isArray(tocResult?.indicators)) {
          return;
        }

        await Promise.all(
          tocResult.indicators.map((indicator) =>
            enrichIndicatorTargets(indicator),
          ),
        );
      };

      const enrichTocResultsWithTargets = async (tocResultsList: any[]) => {
        await Promise.all(
          tocResultsList.map((tocResult) => enrichTocResult(tocResult)),
        );
      };

      await Promise.all([
        enrichTocResultsWithTargets(tocResultsOutcomes),
        enrichTocResultsWithTargets(tocResultsOutputs),
      ]);

      await this.enrichTocResultsWithSynergyPrograms(
        [tocResultsOutcomes, tocResultsOutputs],
        tocContext.phaseUuid,
      );

      return {
        response: {
          compositeCode,
          year: resolvedYear,
          tocResultsOutcomes,
          tocResultsOutputs,
          // P2-3296 AC3 — the Area of Work's own number, over EVERY ToC node under it.
          //
          // Both tiers, as the AC states outright: "Includes Outputs (HLOs) and Outcomes
          // (Intermediate Outcomes + 2030 Outcomes)". In this product an HLO is a High Level
          // OUTPUT, and outputs are the nodes actually scoped to one Area of Work — averaging
          // outcomes alone gave all five AoWs of a programme the identical figure, because the
          // outcomes that hang off an AoW are largely programme-level ones repeated under each.
          progress: rollUpChildren([
            ...tocResultsOutputs,
            ...tocResultsOutcomes,
          ]),
          metadata: {
            total: tocResults.length,
            outcomes: tocResultsOutcomes.length,
            outputs: tocResultsOutputs.length,
            phaseUuid: tocContext.phaseUuid,
          },
        },
        message: 'Work packages retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private assignIndicatorCenterContext(
    indicator: any,
    resolvedYear: number,
  ): void {
    // Prefer center already resolved from SQL.
    if (indicator?.center_id != null && indicator?.center_acronym) {
      return;
    }

    // P2-3255: the SQL no longer emits one row per target×centre — a target shared by N centres is
    // one row carrying `centers[]`, with the scalars left null precisely because naming one of
    // them as "the" centre is a misreport. The year+value fallback below cannot tell those N
    // apart, so it would pick an arbitrary one and put the lie back. Only fall through when a
    // single centre holds the target.
    if (Array.isArray(indicator?.centers) && indicator.centers.length > 1) {
      return;
    }

    const centers = indicator?.targets_by_center?.centers;
    if (!Array.isArray(centers) || !centers.length) {
      return;
    }

    const reportingYear = String(indicator.target_date ?? resolvedYear);
    const targetValue =
      indicator.target_value ?? indicator.target_value_sum ?? null;

    if (targetValue == null || `${targetValue}`.trim() === '') {
      return;
    }

    const normalizedTarget = String(targetValue);
    const matchedCenter = centers.find((center: any) =>
      center.targets?.some(
        (target: any) =>
          String(target.year) === reportingYear &&
          String(target.target_value) === normalizedTarget,
      ),
    );

    if (!matchedCenter) {
      return;
    }

    indicator.center_id = matchedCenter.center_id;
    indicator.center_acronym = matchedCenter.center_acronym;
    indicator.center_name = matchedCenter.center_name;
  }

  async getToc2030Outcomes(programId?: string, versionId?: number) {
    try {
      const normalizedProgram = programId?.trim();

      if (!normalizedProgram) {
        throwServiceError(
          'The program identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this.resolveTocContextForRequest(versionId);
      const resolvedYear = tocContext.reportingYear;

      const toc2030Outcomes = await this._tocResultsRepository.find2030Outcomes(
        normalizedProgram.toUpperCase(),
        tocContext,
      );

      if (!toc2030Outcomes?.length) {
        throwServiceError(
          'No ToC 2030 outcomes were found for the provided program identifier.',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.enrichTocResultsWithSynergyPrograms(
        [toc2030Outcomes],
        tocContext.phaseUuid,
      );

      return {
        response: {
          program: normalizedProgram.toUpperCase(),
          year: resolvedYear,
          tocResults: toc2030Outcomes,
          metadata: {
            total: toc2030Outcomes.length,
            phaseUuid: tocContext.phaseUuid,
          },
        },
        message: 'ToC 2030 outcomes retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getIntermediateOutcomes(programId?: string, versionId?: number) {
    try {
      const normalizedProgram = programId?.trim();

      if (!normalizedProgram) {
        throwServiceError(
          'The program identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this.resolveTocContextForRequest(versionId);

      const intermediateOutcomes =
        await this._tocResultsRepository.findIntermediateOutcomes(
          normalizedProgram.toUpperCase(),
          tocContext,
        );

      return {
        response: {
          program: normalizedProgram.toUpperCase(),
          year: tocContext.reportingYear,
          tocResults: intermediateOutcomes ?? [],
          metadata: {
            total: intermediateOutcomes?.length ?? 0,
            phaseUuid: tocContext.phaseUuid,
          },
        },
        message: 'Intermediate outcomes retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createResultFromFramework(
    payload: CreateResultsFrameworkResultDto,
    user: TokenDto,
  ) {
    try {
      return await this._createResultFromFrameworkHandler.execute(
        new CreateResultFromFrameworkCommand(payload, user),
      );
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getProgramIndicatorContributionSummary(
    program?: string,
    versionId?: number,
  ) {
    try {
      const { initiative } = await this.resolveInitiative(program ?? '');
      const resolvedVersionId =
        await this.resolveIndicatorSummaryVersionId(versionId);

      const [rawSummary, activeResultTypes] = await Promise.all([
        this._resultRepository.getIndicatorContributionSummaryByProgram(
          initiative.id,
          resolvedVersionId,
        ),
        this._resultRepository.getActiveResultTypes(),
      ]);

      const typeMap = new Map<
        number,
        {
          resultTypeId: number;
          resultTypeName: string;
          totalResults: number;
          editing: number;
          qualityAssessed: number;
          submitted: number;
          others: number;
        }
      >();

      for (const typeRow of activeResultTypes ?? []) {
        const typeId = Number(typeRow.id);
        const typeName = typeRow.name ?? 'Unknown';

        if (!Number.isFinite(typeId)) {
          continue;
        }

        typeMap.set(typeId, {
          resultTypeId: typeId,
          resultTypeName: typeName,
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        });
      }

      const statusTotals = {
        editing: 0,
        qualityAssessed: 0,
        submitted: 0,
        others: 0,
        total: 0,
      };

      for (const row of rawSummary ?? []) {
        const resultTypeId = Number(row.result_type_id);
        const resultTypeName =
          typeMap.get(resultTypeId)?.resultTypeName ??
          row.result_type_name ??
          'Unknown';
        const statusId = Number(row.status_id);
        const total = Number(row.total_results) || 0;

        let typeEntry = typeMap.get(resultTypeId);
        if (!typeEntry) {
          typeEntry = {
            resultTypeId,
            resultTypeName,
            totalResults: 0,
            editing: 0,
            qualityAssessed: 0,
            submitted: 0,
            others: 0,
          };
          typeMap.set(resultTypeId, typeEntry);
        }

        typeEntry.totalResults += total;
        statusTotals.total += total;

        switch (statusId) {
          case 1:
            typeEntry.editing += total;
            statusTotals.editing += total;
            break;
          case 2:
            typeEntry.qualityAssessed += total;
            statusTotals.qualityAssessed += total;
            break;
          case 3:
            typeEntry.submitted += total;
            statusTotals.submitted += total;
            break;
          default:
            typeEntry.others += total;
            statusTotals.others += total;
            break;
        }
      }

      const totalsByType = Array.from(typeMap.values()).sort((a, b) =>
        a.resultTypeName.localeCompare(b.resultTypeName),
      );

      return {
        response: {
          program: {
            id: initiative.id,
            officialCode: initiative.official_code,
            name: initiative.name,
          },
          totalsByType,
          statusTotals,
        },
        message:
          'Program indicator contribution summary retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * P2-3296 AC4 — the Science Program's ToC achievement, averaged over its Areas of Work,
   * each of which is itself averaged over its HLOs.
   *
   * Not to be confused with `ResultsService.getScienceProgramProgress`, which counts reported
   * results by status. This one answers "how far along are the ToC commitments".
   *
   * The mean is taken over the AoWs' own percentages, so a large AoW does not outvote a small
   * one — an AoW is one commitment. Areas with nothing measurable are skipped rather than
   * counted as zero, and `counted` / `total` say how many made it in.
   */
  async getScienceProgramTocProgress(programId?: string, versionId?: number) {
    try {
      const normalizedProgram = programId?.trim().toUpperCase();

      if (!normalizedProgram) {
        throwServiceError(
          'The program identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this.resolveTocContextForRequest(versionId);

      const workPackages =
        await this._tocResultsRepository.findWorkPackagesByProgram(
          normalizedProgram,
          tocContext,
        );

      const areas = await Promise.all(
        (workPackages ?? []).map(async (workPackage) => {
          const tocResults =
            await this._tocResultsRepository.findByCompositeCode(
              normalizedProgram,
              workPackage.composeCode,
              tocContext,
            );

          // Every ToC node under the Area of Work, outputs included — same rule as AC3 above.
          const nodes = (tocResults ?? []).filter((tocResult) =>
            ['OUTPUT', 'OUTCOME'].includes(
              (tocResult.category || '').toUpperCase(),
            ),
          );

          return {
            code: workPackage.code,
            name: workPackage.name,
            composeCode: workPackage.composeCode,
            progress: rollUpChildren(nodes),
          };
        }),
      );

      return {
        response: {
          program: normalizedProgram,
          year: tocContext.reportingYear,
          progress: rollUpChildren(areas),
          areas,
          metadata: {
            total: areas.length,
            phaseUuid: tocContext.phaseUuid,
          },
        },
        message: 'Science program ToC progress retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getBilateralProjectsByProgramAndTocResult(tocResultId?: number) {
    try {
      const resolvedTocResultId = Number(tocResultId);

      if (!Number.isFinite(resolvedTocResultId) || resolvedTocResultId <= 0) {
        throwServiceError(
          'A valid tocResultId query parameter is required (must be a positive integer).',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this._reportingTocContextService.resolve();
      const bilateralProjects =
        await this._tocResultsRepository.findBilateralProjectById(
          resolvedTocResultId,
          tocContext.phaseUuid,
        );

      return {
        response: bilateralProjects,
        message: 'Bilateral projects retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getBilateralProjectsByScienceProgram(programId?: string) {
    try {
      const normalizedProgramId = programId?.trim().toUpperCase();

      if (!normalizedProgramId) {
        throwServiceError(
          'A valid programId query parameter is required.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { official_code: normalizedProgramId, active: true },
        select: ['id', 'official_code'],
      });

      if (!initiative) {
        throwServiceError(
          'No initiative was found with the provided program identifier.',
          HttpStatus.NOT_FOUND,
        );
      }

      const tocContext = await this._reportingTocContextService.resolve();
      const rows =
        await this._tocResultsRepository.findBilateralProjectsByProgramOfficialCode(
          initiative.official_code.toUpperCase(),
          tocContext.phaseUuid,
        );

      const seenProjectIds = new Set<number>();
      const bilateralProjects = (rows ?? []).filter((row) => {
        const projectId = Number(row?.project_id);
        if (!Number.isFinite(projectId) || projectId <= 0) {
          return false;
        }
        if (seenProjectIds.has(projectId)) {
          return false;
        }
        seenProjectIds.add(projectId);
        return true;
      });

      return {
        response: bilateralProjects,
        message: 'Bilateral projects retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  // @akili-spec changes/indicator-reported-results (IRR-R-3, IRR-R-3.1)
  async getExistingResultContributorsToIndicators(
    user: TokenDto,
    resultTocResultId: string | number,
    tocResultIndicatorId: string,
    scope?: string,
  ) {
    try {
      return await this._getExistingResultContributorsToIndicatorsHandler.execute(
        new GetExistingResultContributorsToIndicatorsQuery(
          user,
          resultTocResultId,
          tocResultIndicatorId,
          scope,
        ),
      );
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async getResultsCountByUnitAndStatus(
    initiativeId: number,
    unitCodes: string[],
    tocContext: ReportingTocContext,
  ): Promise<Map<string, number>> {
    if (!unitCodes || unitCodes.length === 0) {
      return new Map();
    }

    const placeholders = unitCodes.map(() => '?').join(',');

    let query = `
      SELECT 
        UPPER(wp.acronym) AS work_package_acronym,
        r.status_id,
        COUNT(DISTINCT r.id) AS result_count
      FROM 
        result r
      INNER JOIN 
        results_toc_result rtr ON r.id = rtr.results_id 
          AND rtr.is_active = 1
      INNER JOIN 
        results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id
          AND rtri.is_active = 1
          AND rtri.is_not_aplicable = 0
      INNER JOIN 
        result_indicators_targets rit ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
          AND rit.is_active = 1
          AND rit.contributing_indicator IS NOT NULL
      INNER JOIN 
        ${env.DB_TOC}.toc_results tr ON tr.id = rtr.toc_result_id
      INNER JOIN 
        ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
          AND wp.year = ?
      WHERE
        r.is_active = 1
        AND rtr.initiative_id = ?
        AND UPPER(wp.acronym) IN (${placeholders})
        AND tr.phase = ?
    `;
    // `status_id` narrowing removed (OSF-DD-1/OSF-T-3): this INNER-join
    // population and basis are otherwise UNCHANGED — `editing`/`submitted`
    // keep their shipped meaning and values (OSF-AC-12) — but the caller now
    // needs every status, not just 1/3, to build `resultsCount.byStatus`.

    const params: (string | number)[] = [
      tocContext.reportingYear,
      initiativeId,
      ...unitCodes.map((c) => c.toUpperCase()),
      tocContext.phaseUuid,
    ];

    query += `
      GROUP BY 
        UPPER(wp.acronym),
        r.status_id
    `;

    const rawData = await this.dataSource.query(query, params);

    const countsMap = new Map<string, number>();
    for (const row of rawData) {
      const key = `${row.work_package_acronym}_${row.status_id}`;
      countsMap.set(key, Number(row.result_count) || 0);
    }

    return countsMap;
  }

  /**
   * OSF-DD-2 / OSF-DD-2b / OSF-DD-2c / OSF-DD-2d / OSF-DD-3 — the scope-bucket
   * partition for `scopeBuckets[]`.
   *
   * Deliberately a **different join basis** than `getResultsCountByUnitAndStatus`:
   * that method's INNER chain through `results_toc_result_indicators` /
   * `result_indicators_targets` means "reported against an indicator target"
   * (protected by OSF-AC-12). A scope filter needs "attributed to this ToC
   * area", so the indicator chain is LEFT here — `results_toc_result` alone
   * stays INNER, because a result with no ToC link at all has no area to
   * resolve (OSF-DD-2b).
   *
   * `UNTAGGED` is never counted directly (OSF-DD-3): it is
   * `programTotal[status] − Σ(named buckets)[status]`, computed against a
   * `programTotal` drawn from the *same* population — same initiative, same
   * `versionId`, same `r.source` predicate (OSF-DD-2c) — rather than a
   * different endpoint's total, which is what the judgment round found
   * disagreeing.
   *
   * // RAC-DD-2 — the row→bucket_key aggregation used to happen inside the
   * SQL (`GROUP BY bucket_key, status_id`); it now happens here in
   * TypeScript over the per-result rows `queryResultScopeRows` returns, so
   * the same rows can also feed `getResultsScope` (RAC-T-1). Output
   * (`ScopeBucketDto[]`) is unchanged — this method's callers see no
   * difference.
   */
  private async getScopeBuckets(
    initiativeId: number,
    workPackages: { code: string; name?: string }[],
    tocContext: ReportingTocContext,
  ): Promise<ScopeBucketDto[]> {
    const sourcePlaceholders = W1_W2_RESULT_SOURCE_FILTER.map(() => '?').join(
      ',',
    );

    // The program total, independent of any ToC link — the population the
    // residual is subtracted against. `results_by_inititiative` is the true
    // initiative↔result membership table, unlike `results_toc_result` which
    // only exists for results that have a ToC link at all.
    const totalQuery = `
      SELECT
        r.status_id AS status_id,
        COUNT(DISTINCT r.id) AS result_count
      FROM
        result r
      INNER JOIN
        results_by_inititiative rbi ON rbi.result_id = r.id
          AND rbi.is_active = 1
          AND rbi.inititiative_id = ?
      WHERE
        r.is_active = 1
        AND r.source IN (${sourcePlaceholders})
        AND r.version_id = ?
      GROUP BY
        r.status_id
    `;

    const totalParams: (string | number)[] = [
      initiativeId,
      ...W1_W2_RESULT_SOURCE_FILTER,
      tocContext.versionId,
    ];

    const [scopeRows, totalRows] = await Promise.all([
      this.queryResultScopeRows(initiativeId, tocContext, {
        sourceFilter: W1_W2_RESULT_SOURCE_FILTER,
      }),
      this.dataSource.query(totalQuery, totalParams),
    ]);

    const namedBucketCounts = new Map<string, Map<number, number>>();
    for (const row of scopeRows) {
      // RAC-DD-2 — the same precedence the SQL `CASE` used to apply, now
      // over one row per result: a named AoW wins, else the residual flags,
      // else the row is not a named bucket (falls into the UNTAGGED
      // residual below, same as a result with no ToC link at all,
      // OSF-DD-2b).
      const bucketKey = row.aow_acronym
        ? String(row.aow_acronym).toUpperCase()
        : Number(row.has_intermediate) === 1
          ? 'INTERMEDIATE'
          : Number(row.has_eoi) === 1
            ? 'EOI_2030'
            : null;

      if (!bucketKey) {
        continue;
      }

      const statusId = Number(row.status_id);
      const byStatus = namedBucketCounts.get(bucketKey) ?? new Map();
      byStatus.set(statusId, (byStatus.get(statusId) ?? 0) + 1);
      namedBucketCounts.set(bucketKey, byStatus);
    }

    const programTotalByStatus = new Map<number, number>();
    for (const row of totalRows as Array<{
      status_id: number | string;
      result_count: number | string;
    }>) {
      programTotalByStatus.set(
        Number(row.status_id),
        Number(row.result_count) || 0,
      );
    }

    const allStatusIds = (Object.values(ResultStatusData) as ResultStatusData[])
      .map((s) => s.value)
      .sort((a, b) => a - b);

    const bucketDefinitions: Array<{
      key: string;
      kind: 'aow' | 'outcome';
    }> = [
      ...workPackages.map((wp) => ({
        key: (wp.code ?? '').toUpperCase(),
        kind: 'aow' as const,
      })),
      { key: 'INTERMEDIATE', kind: 'outcome' as const },
      { key: 'EOI_2030', kind: 'outcome' as const },
    ];

    const namedBuckets: ScopeBucketDto[] = bucketDefinitions.map(
      ({ key, kind }) => {
        const counts = namedBucketCounts.get(key) ?? new Map<number, number>();
        const byStatus = this.buildByStatusRecord(allStatusIds, (statusId) =>
          counts.get(statusId),
        );
        const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
        return { key, kind, byStatus, total };
      },
    );

    // OSF-DD-3 — the residual, never counted directly. A negative value
    // means the two populations have drifted apart (a defect signal): clamp
    // to 0 and log a warning naming the bucket and status rather than ship a
    // wrong number.
    const untaggedByStatus: Record<number, number> = {};
    for (const statusId of allStatusIds) {
      const namedSum = namedBuckets.reduce(
        (sum, bucket) => sum + (bucket.byStatus[statusId] ?? 0),
        0,
      );
      const programTotal = programTotalByStatus.get(statusId) ?? 0;
      const residual = programTotal - namedSum;
      if (residual < 0) {
        this._logger.warn(
          `[ResultsFramework] UNTAGGED residual negative for bucket=UNTAGGED status=${statusId} ` +
            `(programTotal=${programTotal}, namedBucketsSum=${namedSum}) — clamped to 0. ` +
            'The scope-bucket population and the program-total population have drifted apart.',
        );
      }
      untaggedByStatus[statusId] = Math.max(residual, 0);
    }
    const untaggedTotal = Object.values(untaggedByStatus).reduce(
      (a, b) => a + b,
      0,
    );

    return [
      ...namedBuckets,
      {
        key: 'UNTAGGED',
        kind: 'untagged',
        byStatus: untaggedByStatus,
        total: untaggedTotal,
      },
    ];
  }

  /**
   * RAC-DD-1/RAC-DD-2 — the shared `result_scope` CTE lifted out of
   * `getScopeBuckets`: one row per result touching this initiative's ToC
   * links, extended with `aow_codes` (every AoW acronym the result touches,
   * `GROUP_CONCAT(DISTINCT UPPER(acronym) ORDER BY UPPER(acronym))`, RAC-R-1)
   * so both `getScopeBuckets` (passing `sourceFilter:
   * W1_W2_RESULT_SOURCE_FILTER`) and `getResultsScope` (passing no filter —
   * the Results tab lists every source, RAC A-3) read the exact same
   * population and tie-break. `sourceFilter` is the only difference between
   * the two callers' queries.
   */
  // @akili-spec changes/results-aow-column-filter (RAC-T-1)
  private async queryResultScopeRows(
    initiativeId: number,
    tocContext: ReportingTocContext,
    { sourceFilter }: { sourceFilter?: readonly string[] } = {},
  ): Promise<ResultScopeRow[]> {
    const sourceClause = sourceFilter?.length
      ? `AND r.source IN (${sourceFilter.map(() => '?').join(',')})`
      : '';

    // One result can touch more than one AoW (OSF-A-1, measured: 3.7%).
    // `MIN(...)` is the deterministic tie-break OSF-DD-2d requires — the
    // lowest acronym, stated rather than an accidental `MAX()`. `aow_codes`
    // lists every acronym touched, sorted the same way, so
    // `aow_acronym === aow_codes.split(',')[0]` always holds.
    const query = `
      WITH result_scope AS (
        SELECT
          r.id AS result_id,
          r.status_id AS status_id,
          MIN(UPPER(wp.acronym)) AS aow_acronym,
          MAX(CASE
                WHEN wp.acronym IS NULL AND tr.wp_id IS NULL
                  AND UPPER(tr.category) IN ('OUTPUT', 'OUTCOME')
                THEN 1 ELSE 0
              END) AS has_intermediate,
          MAX(CASE
                WHEN wp.acronym IS NULL AND tr.wp_id IS NULL
                  AND UPPER(tr.category) = 'EOI'
                THEN 1 ELSE 0
              END) AS has_eoi,
          GROUP_CONCAT(DISTINCT UPPER(wp.acronym) ORDER BY UPPER(wp.acronym)) AS aow_codes
        FROM
          result r
        INNER JOIN
          results_toc_result rtr ON rtr.results_id = r.id
            AND rtr.is_active = 1
            AND rtr.initiative_id = ?
        LEFT JOIN
          ${env.DB_TOC}.toc_results tr ON tr.id = rtr.toc_result_id
            AND tr.is_active = 1
            AND tr.phase = ?
        LEFT JOIN
          ${env.DB_TOC}.toc_work_packages wp ON wp.toc_id = tr.wp_id
            AND wp.year = ?
        WHERE
          r.is_active = 1
          ${sourceClause}
          AND r.version_id = ?
        GROUP BY
          r.id, r.status_id
      )
      SELECT
        result_id,
        status_id,
        aow_acronym,
        has_intermediate,
        has_eoi,
        aow_codes
      FROM
        result_scope
    `;

    const params: (string | number)[] = [
      initiativeId,
      tocContext.phaseUuid,
      tocContext.reportingYear,
      ...(sourceFilter ?? []),
      tocContext.versionId,
    ];

    return this.dataSource.query(query, params);
  }

  /**
   * RAC-R-1 — `GET results-framework-reporting/results-scope`: one bucket
   * per result of the program at this version, computed by the exact same
   * `queryResultScopeRows` the Overview's `scopeBuckets` uses, **without**
   * the W1/W2 source filter (RAC A-3). The population is
   * `results_by_inititiative` membership for the version — any
   * `initiative_role_id` (RAC-DD-6/A-5), the same membership
   * `getScopeBuckets`' program total reads — so a result present in the
   * program but with no ToC link at all still appears, mapped to
   * `UNTAGGED` (RAC-R-1.1) rather than dropped by the join.
   */
  // @akili-spec changes/results-aow-column-filter (RAC-T-1)
  async getResultsScope(programId?: string, versionId?: number) {
    try {
      const { initiative } = await this.resolveInitiative(programId ?? '');
      const tocContext = await this.resolveTocContextForRequest(versionId);

      const [scopeRows, populationRows] = await Promise.all([
        this.queryResultScopeRows(initiative.id, tocContext),
        this.queryProgramResultPopulation(initiative.id, tocContext.versionId),
      ]);

      const scopeByResultId = new Map<number, ResultScopeRow>();
      for (const row of scopeRows) {
        scopeByResultId.set(Number(row.result_id), row);
      }

      // Defense-in-depth alongside `queryProgramResultPopulation`'s `SELECT
      // DISTINCT`: a result can carry more than one active membership row
      // (owner + contributor), so guard the one-bucket-per-result contract
      // here too rather than trust the SQL alone (RAC-R-1).
      const buckets: ResultScopeDto[] = [];
      const seenResultIds = new Set<number>();
      for (const row of populationRows) {
        const resultId = Number(row.result_id);
        if (seenResultIds.has(resultId)) {
          continue;
        }
        seenResultIds.add(resultId);

        const scopeRow = scopeByResultId.get(resultId);

        // RAC-R-1.1 — no `result_scope` row at all (never had a ToC link):
        // synthesize the untagged shape rather than drop the result.
        buckets.push(
          toResultScopeDto(
            scopeRow ?? {
              result_id: resultId,
              status_id: row.status_id,
              aow_acronym: null,
              has_intermediate: 0,
              has_eoi: 0,
              aow_codes: null,
            },
          ),
        );
      }

      return {
        response: {
          programId: initiative.official_code,
          versionId: tocContext.versionId,
          buckets,
        },
        message: 'Results scope retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * RAC-DD-6/A-5 — every result the program has as a member (any
   * `initiative_role_id`), for one version, with no source filter — the
   * superset population `getResultsScope` needs so its join never drops an
   * owned row (the Results tab lists owner-only results, but this endpoint
   * returns buckets for every program-linked result).
   */
  // @akili-spec changes/results-aow-column-filter (RAC-T-1)
  private async queryProgramResultPopulation(
    initiativeId: number,
    versionId: number,
  ): Promise<
    Array<{ result_id: number | string; status_id: number | string }>
  > {
    // DISTINCT — a result can carry more than one active
    // `results_by_inititiative` membership row (e.g. contributor + owner);
    // without it the join emits duplicate rows for the same result, one per
    // membership. `getScopeBuckets`' sibling total query on this exact join
    // guards the same thing with `COUNT(DISTINCT r.id)` — this query must
    // count the same population the same way (RAC-DD-6).
    const query = `
      SELECT DISTINCT
        r.id AS result_id,
        r.status_id AS status_id
      FROM
        result r
      INNER JOIN
        results_by_inititiative rbi ON rbi.result_id = r.id
          AND rbi.is_active = 1
          AND rbi.inititiative_id = ?
      WHERE
        r.is_active = 1
        AND r.version_id = ?
    `;

    return this.dataSource.query(query, [initiativeId, versionId]);
  }

  /** Builds a `Record<statusId, number>` covering every known status. */
  private buildByStatusRecord(
    statusIds: number[],
    getCount: (statusId: number) => number | undefined,
  ): Record<number, number> {
    const record: Record<number, number> = {};
    for (const statusId of statusIds) {
      record[statusId] = getCount(statusId) ?? 0;
    }
    return record;
  }

  private buildHttpError(status: number, message: string) {
    const error: any = new Error(message);
    error.response = {};
    error.status = status;
    return error;
  }

  /**
   * Resolves the program-identifier half of `resolveInitiativeAndYear`, without the
   * `year` table lookup — the `getProgramIndicatorContributionSummary` call (W12-R-2)
   * scopes by reporting phase (`version_id`), not by the decoupled `year.active` config
   * row, so it must not depend on an active `year` row existing.
   */
  private async resolveInitiative(programId: string) {
    const normalizedProgram = programId?.trim().toUpperCase();

    if (!normalizedProgram) {
      throw this.buildHttpError(
        HttpStatus.BAD_REQUEST,
        'The program identifier is required in the query params.',
      );
    }

    const initiative = await this._clarisaInitiativesRepository.findOne({
      where: { official_code: normalizedProgram, active: true },
      select: ['id', 'official_code', 'name'],
    });

    if (!initiative) {
      throw this.buildHttpError(
        HttpStatus.NOT_FOUND,
        'No initiative was found with the provided program identifier.',
      );
    }

    return { initiative, normalizedProgram };
  }

  /**
   * Resolves `versionId` for `getProgramIndicatorContributionSummary` (W12-R-2): an
   * explicit, finite `versionId` is honored as-is; otherwise the current REPORTING
   * phase (`$_findActivePhase`) is used — never `resolveInitiativeAndYear`'s
   * `year.active` fallback (W12-DD-3).
   */
  private async resolveIndicatorSummaryVersionId(
    versionId?: number,
  ): Promise<number> {
    if (typeof versionId === 'number' && Number.isFinite(versionId)) {
      return versionId;
    }

    const activePhase = await this._versioningService.$_findActivePhase(
      AppModuleIdEnum.REPORTING,
    );

    if (!activePhase?.id) {
      throw this.buildHttpError(
        HttpStatus.NOT_FOUND,
        'No active reporting phase was found.',
      );
    }

    return Number(activePhase.id);
  }

  /**
   * Resolves the ToC context for the `toc-results` family (OPF-R-6): an explicit
   * `versionId` wins over the legacy `year` override and is resolved directly
   * from the `version` row (`ReportingTocContextService.resolveByVersionId`) —
   * never via year-equality (DD-2). Absent `versionId` falls back to the
   * existing `resolve(yearOverride)` path, byte-identical to today (OPF-R-3).
   * A non-numeric `versionId` (e.g. NaN from an unparsable query value) is
   * rejected here as a 4xx rather than silently treated as absent.
   */
  private async resolveTocContextForRequest(
    versionId?: number,
    yearOverride?: number,
  ): Promise<ReportingTocContext> {
    if (versionId !== undefined) {
      if (!Number.isFinite(versionId)) {
        throwServiceError(
          'The versionId query parameter must be a valid integer.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this._reportingTocContextService.resolveByVersionId(versionId);
    }

    return this._reportingTocContextService.resolve(yearOverride);
  }

  private async resolveInitiativeAndYear(programId: string) {
    const { initiative, normalizedProgram } =
      await this.resolveInitiative(programId);

    const activeYear = await this._yearRepository.findOne({
      where: { active: true },
      select: ['year'],
    });

    if (!activeYear) {
      throw this.buildHttpError(
        HttpStatus.NOT_FOUND,
        'No active reporting year was found.',
      );
    }

    const activeYearValue = Number(activeYear.year);

    if (!Number.isFinite(activeYearValue) || activeYearValue < 0) {
      throw this.buildHttpError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'The active reporting year configured is invalid.',
      );
    }

    return { initiative, activeYearValue, normalizedProgram };
  }

  async getDashboardStats(programId: string) {
    try {
      const { initiative, activeYearValue } =
        await this.resolveInitiativeAndYear(programId);

      const rawDashboardData = await this._resultRepository.query(
        `
          SELECT
            r.status_id,
            r.result_level_id,
            r.result_type_id,
            COUNT(DISTINCT r.id) AS total_results
          FROM result r
          INNER JOIN results_by_inititiative rbi
            ON rbi.result_id = r.id
            AND rbi.inititiative_id = ?
            AND rbi.is_active = 1
          INNER JOIN \`version\` v
            ON v.id = r.version_id
          WHERE
            r.is_active = 1
            AND r.status_id IN (1, 2, 3)
            AND r.result_level_id IN (3, 4)
            AND r.result_type_id IN (1, 2, 4, 5, 6, 7, 8, 10)
            AND COALESCE(r.reported_year_id, v.phase_year) = ?
          GROUP BY
            r.status_id,
            r.result_level_id,
            r.result_type_id;
        `,
        [initiative.id, activeYearValue],
      );

      const statusConfig = new Map([
        [
          1,
          {
            key: 'editing' as const,
            label: 'Editing results',
          },
        ],
        [
          3,
          {
            key: 'submitted' as const,
            label: 'Submitted results',
          },
        ],
        [
          2,
          {
            key: 'qualityAssessed' as const,
            label: 'Quality assessed results',
          },
        ],
      ]);

      const initialStatusBlock = (label: string) => ({
        total: 0,
        label,
        data: {
          outputs: {
            knowledgeProduct: 0,
            innovationDevelopment: 0,
            capacitySharingForDevelopment: 0,
            otherOutput: 0,
          },
          outcomes: {
            policyChange: 0,
            innovationUse: 0,
            otherOutcome: 0,
            innovationUseIpsr: 0,
          },
        },
      });

      const dashboardStats = {
        editing: initialStatusBlock('Editing results'),
        submitted: initialStatusBlock('Submitted results'),
        qualityAssessed: initialStatusBlock('Quality assessed results'),
      };

      const outputTypeMap = new Map<
        number,
        keyof typeof dashboardStats.editing.data.outputs
      >([
        [ResultTypeEnum.KNOWLEDGE_PRODUCT, 'knowledgeProduct'],
        [ResultTypeEnum.INNOVATION_DEVELOPMENT, 'innovationDevelopment'],
        [
          ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          'capacitySharingForDevelopment',
        ],
        [ResultTypeEnum.OTHER_OUTPUT, 'otherOutput'],
      ]);

      const outcomeTypeMap = new Map<
        number,
        keyof typeof dashboardStats.editing.data.outcomes
      >([
        [ResultTypeEnum.POLICY_CHANGE, 'policyChange'],
        [ResultTypeEnum.INNOVATION_USE, 'innovationUse'],
        [ResultTypeEnum.OTHER_OUTCOME, 'otherOutcome'],
        [ResultTypeEnum.INNOVATION_USE_IPSR, 'innovationUseIpsr'],
      ]);

      for (const row of rawDashboardData ?? []) {
        const statusId = Number(row.status_id);
        const levelId = Number(row.result_level_id);
        const typeId = Number(row.result_type_id);
        const total = Number(row.total_results) || 0;

        if (total <= 0) {
          continue;
        }

        const statusEntry = statusConfig.get(statusId);
        if (!statusEntry) {
          continue;
        }

        const { key } = statusEntry;
        const statusBlock = dashboardStats[key];

        if (levelId === ResultLevelEnum.INITIATIVE_OUTPUT) {
          const typeKey = outputTypeMap.get(typeId);
          if (!typeKey) {
            continue;
          }
          statusBlock.data.outputs[typeKey] += total;
          statusBlock.total += total;
        } else if (levelId === ResultLevelEnum.INITIATIVE_OUTCOME) {
          const typeKey = outcomeTypeMap.get(typeId);
          if (!typeKey) {
            continue;
          }
          statusBlock.data.outcomes[typeKey] += total;
          statusBlock.total += total;
        }
      }

      return {
        response: dashboardStats,
        message: 'Dashboard stats retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  /**
   * P2-3114: attach contributing_synergy_program_initiative_ids to AoW toc-results nodes.
   */
  private async enrichTocResultsWithSynergyPrograms(
    tocResultsLists: TocResultResponse[][],
    phaseUuid: string,
  ): Promise<void> {
    const tocResultIds = Array.from(
      new Set(
        tocResultsLists
          .flat()
          .map((node) => Number(node?.toc_result_id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );

    const synergyMap = tocResultIds.length
      ? this.groupSynergyProgramsByResultId(
          await this._tocCatalogRepository.getTocSynergyProgramsByResultIds(
            tocResultIds,
            phaseUuid,
          ),
        )
      : new Map<number, number[]>();

    for (const list of tocResultsLists) {
      this.attachSynergyProgramIds(list, synergyMap);
    }
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

  private attachSynergyProgramIds(
    tocResultsList: TocResultResponse[],
    synergyMap: Map<number, number[]>,
  ): void {
    for (const tocResult of tocResultsList ?? []) {
      const tocId = Number(tocResult?.toc_result_id);
      tocResult.contributing_synergy_program_initiative_ids = Number.isFinite(
        tocId,
      )
        ? (synergyMap.get(tocId) ?? [])
        : [];
    }
  }
}
