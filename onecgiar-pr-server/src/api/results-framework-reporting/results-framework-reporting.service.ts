import { HttpStatus, Injectable } from '@nestjs/common';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { TocResultsRepository } from './repositories/toc-work-packages.repository';

@Injectable()
export class ResultsFrameworkReportingService {
  constructor(
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _clarisaGlobalUnitRepository: ClarisaGlobalUnitRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _handlersError: HandlersError,
    private readonly _tocResultsRepository: TocResultsRepository,
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
          units: childUnits.map((unit) => ({
            id: unit.id,
            code: unit.code,
            name: unit.name,
            composeCode: unit.composeCode,
            year: unit.year,
            level: unit.level,
            parentId: unit.parentId,
          })),
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

      const compositeCode = `${normalizedProgram.toUpperCase()}-${normalizedArea.toUpperCase()}`;

      const tocResults = await this._tocResultsRepository.findByCompositeCode(
        normalizedProgram.toUpperCase(),
        compositeCode,
        normalizedYear,
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
          year: normalizedYear ?? null,
          tocResults,
        },
        message: 'Work packages retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
