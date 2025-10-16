import { HttpStatus, Injectable } from '@nestjs/common';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { TocResultsRepository } from './repositories/toc-work-packages.repository';
import { ResultRepository } from '../results/result.repository';

@Injectable()
export class ResultsFrameworkReportingService {
  constructor(
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _clarisaGlobalUnitRepository: ClarisaGlobalUnitRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _handlersError: HandlersError,
    private readonly _tocResultsRepository: TocResultsRepository,
    private readonly _resultRepository: ResultRepository,
  ) {}

  async getGlobalUnitsByProgram(user: TokenDto, programId?: string) {
    try {
      const normalizedProgramId = programId?.trim();

      if (!normalizedProgramId) {
        throw {
          response: {},
          message: 'The program identifier is required in the query params.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { official_code: normalizedProgramId, active: true },
        select: ['id', 'official_code', 'name', 'short_name', 'portfolio_id'],
      });

      if (!initiative) {
        throw {
          response: {},
          message:
            'No initiative was found with the provided program identifier.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const activeYear = await this._yearRepository.findOne({
        where: { active: true },
        select: ['year'],
      });

      if (!activeYear) {
        throw {
          response: {},
          message: 'No active reporting year was found.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const activeYearValue = Number(activeYear.year);

      const parentUnit = await this._clarisaGlobalUnitRepository.findOne({
        where: {
          code: normalizedProgramId,
          portfolioId: 3,
          year: activeYearValue,
          isActive: true,
        },
      });

      if (!parentUnit) {
        throw {
          response: {},
          message:
            'No global unit catalogue entry matches the provided program.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const childUnits = await this._clarisaGlobalUnitRepository.find({
        where: {
          parentId: parentUnit.id,
          level: 2,
          portfolioId: 3,
          year: activeYearValue,
          isActive: true,
        },
        order: { code: 'ASC' },
      });

      const tocAcronyms =
        await this._tocResultsRepository.findUnitAcronymsByProgram(
          initiative.official_code.toUpperCase(),
        );

      const filteredUnits = childUnits
        .filter((unit) => tocAcronyms.has(unit.code?.toUpperCase() ?? ''))
        .map((unit) => ({
          id: unit.id,
          code: unit.code,
          name: unit.name,
          composeCode: unit.composeCode,
          year: unit.year,
          level: unit.level,
          parentId: unit.parentId,
        }));

      return {
        response: {
          initiative: {
            id: initiative.id,
            officialCode: initiative.official_code,
            name: initiative.name,
            shortName: initiative.short_name,
          },
          parentUnit: {
            id: parentUnit.id,
            code: parentUnit.code,
            name: parentUnit.name,
            composeCode: parentUnit.composeCode,
            level: parentUnit.level,
            year: parentUnit.year,
          },
          units: filteredUnits,
          metadata: {
            activeYear: activeYearValue,
            portfolio: parentUnit.portfolioId,
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
        throw {
          response: {},
          message: 'The program identifier is required in the query params.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!normalizedArea) {
        throw {
          response: {},
          message:
            'The area of work identifier is required in the query params.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const normalizedYear =
        year !== undefined && year !== null && `${year}`.trim() !== ''
          ? Number(year)
          : undefined;

      if (
        normalizedYear !== undefined &&
        (!Number.isFinite(normalizedYear) || normalizedYear < 0)
      ) {
        throw {
          response: {},
          message:
            'The year filter must be a valid positive integer when provided.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      let resolvedYear = normalizedYear;

      if (resolvedYear === undefined) {
        const activeYear = await this._yearRepository.findOne({
          where: { active: true },
          select: ['year'],
        });

        if (!activeYear) {
          throw {
            response: {},
            message: 'No active reporting year was found.',
            status: HttpStatus.NOT_FOUND,
          };
        }

        resolvedYear = Number(activeYear.year);

        if (!Number.isFinite(resolvedYear) || resolvedYear < 0) {
          throw {
            response: {},
            message: 'The active reporting year configured is invalid.',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
          };
        }
      }

      const compositeCode = `${normalizedProgram.toUpperCase()}-${normalizedArea.toUpperCase()}`;

      const tocResults = await this._tocResultsRepository.findByCompositeCode(
        normalizedProgram.toUpperCase(),
        compositeCode,
        resolvedYear,
      );

      if (!tocResults.length) {
        throw {
          response: {},
          message:
            'No work packages were found for the provided filters in the ToC catalogue.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: {
          compositeCode,
          year: resolvedYear,
          tocResults,
        },
        message: 'Work packages retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getProgramIndicatorContributionSummary(program?: string) {
    try {
      const normalizedProgram = program?.trim().toUpperCase();

      if (!normalizedProgram) {
        throw {
          response: {},
          message: 'The program identifier is required in the query params.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const initiative = await this._clarisaInitiativesRepository.findOne({
        where: { official_code: normalizedProgram, active: true },
        select: ['id', 'official_code', 'name'],
      });

      if (!initiative) {
        throw {
          response: {},
          message:
            'No initiative was found with the provided program identifier.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const [rawSummary, activeResultTypes] = await Promise.all([
        this._resultRepository.getIndicatorContributionSummaryByProgram(
          initiative.id,
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

        if (!typeMap.has(resultTypeId)) {
          typeMap.set(resultTypeId, {
            resultTypeId,
            resultTypeName,
            totalResults: 0,
            editing: 0,
            qualityAssessed: 0,
            submitted: 0,
            others: 0,
          });
        }

        const typeEntry = typeMap.get(resultTypeId)!;
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
}
