import { HttpStatus, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { AoWBilateralRepository } from '../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultRepository } from '../results/result.repository';
import { ResultsService } from '../results/results.service';
import {
  CreateResultsFrameworkResultDto,
  ResultsFrameworkTocIndicatorDto,
} from './dto/create-results-framework.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultsKnowledgeProductsService } from '../results/results-knowledge-products/results-knowledge-products.service';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsKnowledgeProductDto } from '../results/results-knowledge-products/dto/results-knowledge-product.dto';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { CreateTocShareResult } from '../results/share-result-request/dto/create-toc-share-result.dto';
import { ResultsByProjectsService } from '../results/results_by_projects/results_by_projects.service';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';

@Injectable()
export class ResultsFrameworkReportingService {
  constructor(
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
    private readonly _clarisaGlobalUnitRepository: ClarisaGlobalUnitRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _handlersError: HandlersError,
    private readonly _tocResultsRepository: AoWBilateralRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultsService: ResultsService,
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultsTocResultIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsIndicatorsTargetsRepository: ResultsTocTargetIndicatorRepository,
    private readonly _shareResultRequestService: ShareResultRequestService,
    private readonly _resultsByProjectsService: ResultsByProjectsService,
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

      const tocResultsOutcomes = (tocResults || []).filter(
        (r) => (r.category || '').toUpperCase() === 'OUTCOME',
      );
      const tocResultsOutputs = (tocResults || []).filter(
        (r) => (r.category || '').toUpperCase() === 'OUTPUT',
      );

      if (!tocResultsOutcomes.length && !tocResultsOutputs.length) {
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
          tocResultsOutcomes,
          tocResultsOutputs,
          metadata: {
            total: tocResults.length,
            outcomes: tocResultsOutcomes.length,
            outputs: tocResultsOutputs.length,
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
        throw {
          response: {},
          message: 'The program identifier is required in the query params.',
          status: HttpStatus.BAD_REQUEST,
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

      const resolvedYear = Number(activeYear.year);

      if (!Number.isFinite(resolvedYear) || resolvedYear < 0) {
        throw {
          response: {},
          message: 'The active reporting year configured is invalid.',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      const toc2030Outcomes = await this._tocResultsRepository.find2030Outcomes(
        normalizedProgram.toUpperCase(),
        resolvedYear,
      );

      if (!toc2030Outcomes?.length) {
        throw {
          response: {},
          message:
            'No ToC 2030 outcomes were found for the provided program identifier.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      return {
        response: {
          program: normalizedProgram.toUpperCase(),
          year: resolvedYear,
          tocResults: toc2030Outcomes,
          metadata: {
            total: toc2030Outcomes.length,
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
      if (!payload?.result) {
        throw {
          response: {},
          message: 'The result header information is required.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const baseResultDto = { ...payload.result };
      const initiativeId = Number(baseResultDto.initiative_id);

      if (!Number.isFinite(initiativeId) || initiativeId <= 0) {
        throw {
          response: {},
          message:
            'A valid initiative identifier is required to create the result.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      let createdResultId: number;
      let knowledgeProductResponse: ResultsKnowledgeProductDto | undefined;

      if (
        Number(baseResultDto.result_type_id) ===
        ResultTypeEnum.KNOWLEDGE_PRODUCT
      ) {
        if (!payload.knowledge_product) {
          throw {
            response: {},
            message:
              'Knowledge product payload is required for knowledge product results.',
            status: HttpStatus.BAD_REQUEST,
          };
        }

        if (
          (!baseResultDto.result_name ||
            `${baseResultDto.result_name}`.trim() === '') &&
          payload.knowledge_product?.title
        ) {
          baseResultDto.result_name = payload.knowledge_product.title;
        }

        if (!payload.knowledge_product.result_data) {
          payload.knowledge_product.result_data = baseResultDto;
        } else {
          payload.knowledge_product.result_data = {
            ...payload.knowledge_product.result_data,
            ...baseResultDto,
          };
        }

        const knowledgeCreation =
          await this._resultsKnowledgeProductsService.create(
            payload.knowledge_product,
            user,
          );

        if (knowledgeCreation.status >= HttpStatus.BAD_REQUEST) {
          throw knowledgeCreation;
        }

        knowledgeProductResponse =
          knowledgeCreation.response as ResultsKnowledgeProductDto;
        createdResultId = Number(knowledgeProductResponse.id);
      } else {
        const creationResponse = await this._resultsService.createOwnerResultV2(
          baseResultDto,
          user,
        );

        if (creationResponse.status >= HttpStatus.BAD_REQUEST) {
          throw creationResponse;
        }

        createdResultId = Number((creationResponse.response as any).id);
      }

      if (!Number.isFinite(createdResultId) || createdResultId <= 0) {
        throw {
          response: {},
          message: 'Result creation failed to return a valid identifier.',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      const resultSummary =
        await this._resultRepository.getResultById(createdResultId);

      if (!resultSummary) {
        throw {
          response: {},
          message: 'The result could not be retrieved after creation.',
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }

      let primaryTocRecordId: number | null = null;

      if (payload.toc_result_id !== undefined) {
        const resolvedTocResultId = Number(payload.toc_result_id);

        if (!Number.isFinite(resolvedTocResultId) || resolvedTocResultId <= 0) {
          throw {
            response: {},
            message: 'The provided ToC result identifier is invalid.',
            status: HttpStatus.BAD_REQUEST,
          };
        }

        const tocResult =
          await this._tocResultsRepository.findResultById(resolvedTocResultId);

        if (!tocResult) {
          throw {
            response: {},
            message:
              'No ToC result was found with the provided identifier in the Integration catalogue.',
            status: HttpStatus.NOT_FOUND,
          };
        }

        let primaryTocRecord = await this._resultsTocResultRepository.findOne({
          where: {
            result_id: createdResultId,
            initiative_ids: initiativeId,
            is_active: true,
          },
        });

        if (primaryTocRecord) {
          await this._resultsTocResultRepository.update(
            primaryTocRecord.result_toc_result_id,
            {
              toc_result_id: resolvedTocResultId,
              toc_progressive_narrative:
                payload.toc_progressive_narrative ?? null,
              last_updated_by: user.id,
              is_active: true,
            },
          );
        } else {
          primaryTocRecord = await this._resultsTocResultRepository.save({
            initiative_ids: initiativeId,
            toc_result_id: resolvedTocResultId,
            result_id: createdResultId,
            planned_result: true,
            toc_progressive_narrative:
              payload.toc_progressive_narrative ?? null,
            created_by: user.id,
            last_updated_by: user.id,
            is_active: true,
          });
        }

        primaryTocRecordId = primaryTocRecord.result_toc_result_id;

        await this.upsertTocIndicators(
          primaryTocRecord.result_toc_result_id,
          resolvedTocResultId,
          payload.indicators ?? null,
          payload.contributing_indicator ?? null,
          user.id,
          payload.number_target ?? null,
          payload.target_date ?? null,
        );
      }

      if (payload.contributors_result_toc_result?.length) {
        const initiativeShareId = payload.contributors_result_toc_result
          .map((contributor) => Number(contributor.initiative_id))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (initiativeShareId.length) {
          const shareRequest: CreateTocShareResult = {
            initiativeShareId,
            isToc: false,
            contributors_result_toc_result:
              payload.contributors_result_toc_result,
          };

          await this._shareResultRequestService.resultRequest(
            shareRequest,
            createdResultId,
            user,
          );
        }
      }

      if (
        Array.isArray(payload.bilateral_project) &&
        payload.bilateral_project.length
      ) {
        for (const project of payload.bilateral_project) {
          const projectIdNum = Number(project?.project_id);
          if (Number.isFinite(projectIdNum) && projectIdNum > 0) {
            await this._resultsByProjectsService.linkBilateralProjectToResult(
              createdResultId,
              projectIdNum,
              user.id,
            );
          }
        }
      }

      return {
        response: {
          result: resultSummary,
          knowledgeProduct: knowledgeProductResponse ?? null,
          tocResultLinkId: primaryTocRecordId,
        },
        message: 'Result created successfully through the reporting workflow.',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async upsertTocIndicators(
    resultTocResultId: number,
    tocResultId: number,
    indicatorsInput:
      | ResultsFrameworkTocIndicatorDto
      | ResultsFrameworkTocIndicatorDto[]
      | null
      | undefined,
    defaultContributingIndicator: number | null,
    userId: number,
    fallbackNumberTarget?: string | number | null,
    fallbackTargetDate?: string | null,
  ) {
    const indicatorsArray = Array.isArray(indicatorsInput)
      ? indicatorsInput
      : indicatorsInput
        ? [indicatorsInput]
        : [];

    if (!indicatorsArray.length) {
      return;
    }

    for (const indicator of indicatorsArray) {
      const indicatorIdRaw =
        (indicator as any)?.indicator_id ?? (indicator as any)?.id;
      const indicatorId = Number(indicatorIdRaw);
      if (!Number.isFinite(indicatorId) || indicatorId <= 0) {
        throw {
          response: {},
          message: 'One of the provided ToC indicator identifiers is invalid.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const indicatorRow =
        await this._tocResultsRepository.findIndicatorById(indicatorId);

      if (!indicatorRow) {
        throw {
          response: {},
          message: `No ToC indicator was found with id '${indicatorId}'.`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (Number(indicatorRow.toc_results_id) !== Number(tocResultId)) {
        throw {
          response: {},
          message: `The indicator '${indicatorId}' does not belong to the provided ToC result '${tocResultId}'.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const existingIndicator =
        await this._resultsTocResultIndicatorsRepository.findOne({
          where: {
            results_toc_results_id: resultTocResultId,
            toc_results_indicator_id: indicatorRow.related_node_id,
            is_active: true,
          },
        });

      let indicatorRecord =
        existingIndicator ??
        (await this._resultsTocResultIndicatorsRepository.save({
          results_toc_results_id: resultTocResultId,
          toc_results_indicator_id: indicatorRow.related_node_id,
          created_by: userId,
          last_updated_by: userId,
          is_active: true,
        }));

      if (!indicatorRecord?.result_toc_result_indicator_id) {
        indicatorRecord =
          await this._resultsTocResultIndicatorsRepository.findOne({
            where: {
              results_toc_results_id: resultTocResultId,
              toc_results_indicator_id: indicatorRow.related_node_id,
              is_active: true,
            },
          });
      }

      if (!indicatorRecord?.result_toc_result_indicator_id) {
        continue;
      }

      const numberTargetValue = ((indicator as any)?.number_target ??
        fallbackNumberTarget ??
        null) as string | number | null;

      const targetDateValue = ((indicator as any)?.target_date ??
        fallbackTargetDate ??
        null) as string | null;

      const contributingValue = ((indicator as any)?.contributing_indicator ??
        defaultContributingIndicator ??
        null) as number | null;

      await this.upsertIndicatorTargetRecord(
        indicatorRecord.result_toc_result_indicator_id,
        numberTargetValue,
        targetDateValue,
        contributingValue,
        userId,
      );
    }
  }

  private async upsertIndicatorTargetRecord(
    indicatorResultId: number,
    numberTarget: string | number | null,
    targetDate: string | null,
    contributingIndicator: number | null,
    userId: number,
  ) {
    const hasNumberTarget =
      numberTarget !== undefined &&
      numberTarget !== null &&
      `${numberTarget}`.trim() !== '';

    if (!hasNumberTarget) {
      return;
    }

    const parsedNumberTarget = Number(numberTarget);

    if (!Number.isFinite(parsedNumberTarget)) {
      throw {
        response: {},
        message:
          'The provided number_target value for the indicator contribution is invalid.',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const parsedContributingIndicator =
      contributingIndicator !== null && contributingIndicator !== undefined
        ? Number(contributingIndicator)
        : null;
    const normalizedContributing =
      parsedContributingIndicator !== null &&
      Number.isFinite(parsedContributingIndicator) &&
      parsedContributingIndicator >= 0
        ? parsedContributingIndicator
        : null;

    const normalizedTargetDate =
      targetDate && targetDate.trim() !== '' ? targetDate.trim() : null;
    const parsedTargetDate =
      normalizedTargetDate !== null ? Number(normalizedTargetDate) : null;
    const numericTargetDate =
      parsedTargetDate !== null && Number.isFinite(parsedTargetDate)
        ? parsedTargetDate
        : null;

    const existingTarget =
      await this._resultsIndicatorsTargetsRepository.findOne({
        where: {
          result_toc_result_indicator_id: indicatorResultId,
          number_target: parsedNumberTarget,
          is_active: true,
        },
      });

    if (existingTarget) {
      await this._resultsIndicatorsTargetsRepository.update(
        existingTarget.indicators_targets,
        {
          contributing_indicator: normalizedContributing,
          target_date: numericTargetDate,
          last_updated_by: userId,
          is_active: true,
        },
      );
      return;
    }

    await this._resultsIndicatorsTargetsRepository.save({
      result_toc_result_indicator_id: indicatorResultId,
      number_target: parsedNumberTarget,
      contributing_indicator: normalizedContributing,
      target_date: numericTargetDate,
      created_by: userId,
      last_updated_by: userId,
      is_active: true,
    });
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

  async getBilateralProjectsByProgramAndTocResult(tocResultId?: number) {
    try {
      const resolvedTocResultId = Number(tocResultId);

      if (!Number.isFinite(resolvedTocResultId) || resolvedTocResultId <= 0) {
        throw {
          response: {},
          message:
            'A valid tocResultId query parameter is required (must be a positive integer).',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const bilateralProjects =
        await this._tocResultsRepository.findBilateralProjectById(tocResultId);

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
    resultTocResultId: string | number,
    tocResultIndicatorId: string,
  ) {
    try {
      const parsedResultTocResultId = Number(resultTocResultId);

      if (
        !Number.isFinite(parsedResultTocResultId) ||
        parsedResultTocResultId <= 0
      ) {
        throw {
          response: {},
          message: 'Invalid resultTocResultId provided.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!tocResultIndicatorId || `${tocResultIndicatorId}`.trim() === '') {
        throw {
          response: {},
          message: 'Invalid tocResultIndicatorId provided.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const resultContributionExists =
        await this._resultsTocResultRepository.find({
          relations: {
            obj_results: {
              obj_status: true,
            },
          },
          where: {
            toc_result_id: parsedResultTocResultId,
            is_active: true,
            obj_results: { is_active: true },
          },
          select: {
            result_toc_result_id: true,
            result_id: true,
            toc_result_id: true,
            obj_results: {
              title: true,
              result_code: true,
              result_type_id: true,
              version_id: true,
              obj_status: {
                result_status_id: true,
                status_name: true,
                status_description: true,
              },
            },
          },
        });

      if (!resultContributionExists || resultContributionExists.length === 0) {
        throw {
          response: {},
          message:
            'No result contribution record was found with the provided resultTocResultId.',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const tocResultIdsWithIndicator = resultContributionExists.map(
        (contrib) => contrib.result_toc_result_id,
      );

      const indicatorsForResults =
        await this._resultsTocResultIndicatorsRepository.find({
          where: {
            results_toc_results_id: In(tocResultIdsWithIndicator),
            toc_results_indicator_id: tocResultIndicatorId,
            is_active: true,
          },
          select: ['results_toc_results_id'],
        });

      if (!indicatorsForResults || indicatorsForResults.length === 0) {
        return {
          response: {
            contributors: [],
            resultTocResultId: parsedResultTocResultId,
            tocResultIndicatorId,
          },
          message: 'No contributions found for the specified indicator.',
          status: HttpStatus.OK,
        };
      }

      const contributingTocResultIds = indicatorsForResults.map(
        (ind) => ind.results_toc_results_id,
      );

      const contributors = resultContributionExists
        .filter((contrib) =>
          contributingTocResultIds.includes(contrib.result_toc_result_id),
        )
        .map((contrib) => ({
          result_id: contrib.result_id,
          title: contrib.obj_results?.title,
          result_code: contrib.obj_results?.result_code,
          status_name: contrib.obj_results?.obj_status?.status_name,
          version_id: contrib.obj_results?.version_id,
        }));

      return {
        response: {
          contributors,
          resultTocResultId: parsedResultTocResultId,
          tocResultIndicatorId,
        },
        message: 'Existing result contributors retrieved successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async getDashboardStats(programId: string) {
    try {
      const normalizedProgram = programId?.trim().toUpperCase();

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
          INNER JOIN results_toc_result rtr
            ON rtr.results_id = r.id
            AND (rtr.is_active = 1 OR r.is_active = 1)
          INNER JOIN results_toc_result_indicators rtri
            ON rtri.results_toc_results_id = rtr.result_toc_result_id
            AND rtri.is_active = 1
            AND rtri.is_not_aplicable = 0
          INNER JOIN result_indicators_targets rit
            ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
            AND rit.is_active = 1
          WHERE
            r.is_active = 1
            AND r.status_id IN (1, 2, 3)
            AND r.result_level_id IN (3, 4)
            AND r.result_type_id IN (1, 2, 3, 4, 5, 6, 7, 8)
          GROUP BY
            r.status_id,
            r.result_level_id,
            r.result_type_id;
        `,
        [initiative.id],
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
        [ResultTypeEnum.CAPACITY_CHANGE, 'otherOutcome'],
      ]);

      for (const row of rawDashboardData ?? []) {
        const statusId = Number(row.status_id);
        const levelId = Number(row.result_level_id);
        const typeId = Number(row.result_type_id);
        const total = Number(row.total_results) || 0;

        if (!statusConfig.has(statusId) || total <= 0) {
          continue;
        }

        const { key } = statusConfig.get(statusId)!;
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
