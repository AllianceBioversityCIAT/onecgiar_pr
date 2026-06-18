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
import { ReportingTocContextService } from './reporting-toc-context/reporting-toc-context.service';
import type { ReportingTocContext } from './reporting-toc-context/reporting-toc-context.interface';
import { CreateResultFromFrameworkCommand } from './application/commands/create-result-from-framework/create-result-from-framework.command';
import { CreateResultFromFrameworkHandler } from './application/commands/create-result-from-framework/create-result-from-framework.handler';
import { GetExistingResultContributorsToIndicatorsQuery } from './application/queries/get-existing-result-contributors/get-existing-result-contributors.query';
import { GetExistingResultContributorsToIndicatorsHandler } from './application/queries/get-existing-result-contributors/get-existing-result-contributors.handler';
import { throwServiceError } from '../../shared/utils/service-error.util';

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
    private readonly _resultRepository: ResultRepository,
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

      const resultCountsByUnit = await this.getResultsCountByUnitAndStatus(
        initiative.id,
        workPackages.map((u) => u.code),
        tocContext,
      );

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
            editing: resultCountsByUnit.get(`${unitKey}_1`) ?? 0,
            submitted: resultCountsByUnit.get(`${unitKey}_3`) ?? 0,
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

      const tocContext =
        await this._reportingTocContextService.resolve(normalizedYear);
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
          );

        const centersMap = new Map<
          number,
          { center_id: number; center_acronym: string; center_name: string }
        >();

        const targets = targetsWithCenters.map((target) => {
          target.centers.forEach((center) => {
            if (!centersMap.has(center.center_id)) {
              centersMap.set(center.center_id, {
                center_id: center.center_id,
                center_acronym: center.center_acronym,
                center_name: center.center_name,
              });
            }
          });

          return {
            toc_indicator_target_id: target.toc_indicator_target_id,
            year: target.year,
            target_value: target.target_value,
            number_target: target.number_target,
          };
        });

        indicator.targets_by_center = centersMap.size
          ? { targets, centers: Array.from(centersMap.values()) }
          : {};
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

      return {
        response: {
          compositeCode,
          year: resolvedYear,
          tocResultsOutcomes,
          tocResultsOutputs,
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

  async getToc2030Outcomes(programId?: string) {
    try {
      const normalizedProgram = programId?.trim();

      if (!normalizedProgram) {
        throwServiceError(
          'The program identifier is required in the query params.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tocContext = await this._reportingTocContextService.resolve();
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

  async getProgramIndicatorContributionSummary(program?: string) {
    try {
      const { initiative, activeYearValue } =
        await this.resolveInitiativeAndYear(program ?? '');

      const [rawSummary, activeResultTypes] = await Promise.all([
        this._resultRepository.getIndicatorContributionSummaryByProgram(
          initiative.id,
          activeYearValue,
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

  async getExistingResultContributorsToIndicators(
    user: TokenDto,
    resultTocResultId: string | number,
    tocResultIndicatorId: string,
  ) {
    try {
      return await this._getExistingResultContributorsToIndicatorsHandler.execute(
        new GetExistingResultContributorsToIndicatorsQuery(
          user,
          resultTocResultId,
          tocResultIndicatorId,
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
        AND r.status_id IN (1, 3)
        AND rtr.initiative_id = ?
        AND UPPER(wp.acronym) IN (${placeholders})
        AND tr.phase = ?
    `;

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

  private buildHttpError(status: number, message: string) {
    const error: any = new Error(message);
    error.response = {};
    error.status = status;
    return error;
  }

  private async resolveInitiativeAndYear(programId: string) {
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
}
