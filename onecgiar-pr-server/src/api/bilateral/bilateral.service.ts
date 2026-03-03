import {
  Injectable,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ResultBilateralDto,
  RootResultsDto,
  CreateBilateralDto,
} from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ClarisaRegionsRepository } from '../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { DataSource, In, IsNull, Like, SelectQueryBuilder } from 'typeorm';
import {
  ListResultsQueryDto,
  ListResultsResultTypeEnum,
  ListResultsSourceEnum,
  LIST_RESULTS_PAGINATION,
} from './dto/list-results-query.dto';
import { ClarisaGeographicScopeRepository } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { ClarisaCountriesRepository } from '../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ClarisaSubnationalScopeRepository } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { YearRepository } from '../results/years/year.repository';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultInstitutionsBudget } from '../results/result_budget/entities/result_institutions_budget.entity';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductsService } from '../results/results-knowledge-products/results-knowledge-products.service';
import { ClarisaCentersRepository } from '../../clarisa/clarisa-centers/clarisa-centers.repository';
import { UserService } from '../../auth/modules/user/user.service';
import { CreateUserDto } from '../../auth/modules/user/dto/create-user.dto';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ClarisaProjectsRepository } from '../../clarisa/clarisa-projects/clarisa-projects.repository';
import { ResultsByProjectsRepository } from '../results/results_by_projects/results_by_projects.repository';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { KnowledgeProductBilateralHandler } from './handlers/knowledge-product.handler';
import { CapacityChangeBilateralHandler } from './handlers/capacity-change.handler';
import { InnovationDevelopmentBilateralHandler } from './handlers/innovation-development.handler';
import { InnovationUseBilateralHandler } from './handlers/innovation-use.handler';
import { PolicyChangeBilateralHandler } from './handlers/policy-change.handler';
import { BilateralResultTypeHandler } from './handlers/bilateral-result-type-handler.interface';
import { NoopBilateralHandler } from './handlers/noop.handler';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsService } from '../results/results.service';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';

/** Map result_type name (ListResultsResultTypeEnum) to result_type.id */
const RESULT_TYPE_NAME_TO_ID: Partial<
  Record<ListResultsResultTypeEnum, number>
> = {
  [ListResultsResultTypeEnum.PolicyChange]: 1,
  [ListResultsResultTypeEnum.InnovationUse]: 2,
  [ListResultsResultTypeEnum.OtherOutcome]: 4,
  [ListResultsResultTypeEnum.CapacitySharingForDevelopment]: 5,
  [ListResultsResultTypeEnum.KnowledgeProduct]: 6,
  [ListResultsResultTypeEnum.InnovationDevelopment]: 7,
  [ListResultsResultTypeEnum.OtherOutput]: 8,
  [ListResultsResultTypeEnum.ImpactContribution]: 9,
  [ListResultsResultTypeEnum.InnovationPackage]: 10,
};

@Injectable()
export class BilateralService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultsService: ResultsService,
    private readonly _handlersError: HandlersError,
    private readonly _versioningService: VersioningService,
    private readonly _userRepository: UserRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _geoScopeRepository: ClarisaGeographicScopeRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _clarisaSubnationalAreasRepository: ClarisaSubnationalScopeRepository,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _evidencesService: EvidencesService,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
    private readonly _clarisaCenters: ClarisaCentersRepository,
    private readonly _userService: UserService,
    private readonly _resultsTocResultsRepository: ResultsTocResultRepository,
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
    private readonly _resultsTocResultsIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsTocTargetIndicatorRepository: ResultsTocTargetIndicatorRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _clarisaProjectsRepository: ClarisaProjectsRepository,
    private readonly _resultsByProjectsRepository: ResultsByProjectsRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _nonPooledProjectBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _knowledgeProductHandler: KnowledgeProductBilateralHandler,
    private readonly _capacityChangeHandler: CapacityChangeBilateralHandler,
    private readonly _innovationDevelopmentHandler: InnovationDevelopmentBilateralHandler,
    private readonly _innovationUseHandler: InnovationUseBilateralHandler,
    private readonly _policyChangeHandler: PolicyChangeBilateralHandler,
    private readonly _otherOutputHandler: NoopBilateralHandler,
    private readonly _otherOutcomeHandler: NoopBilateralHandler,
  ) {
    this.resultTypeHandlerMap = new Map<number, BilateralResultTypeHandler>([
      [_knowledgeProductHandler.resultType, _knowledgeProductHandler],
      [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT, _capacityChangeHandler],
      [_innovationDevelopmentHandler.resultType, _innovationDevelopmentHandler],
      [_innovationUseHandler.resultType, _innovationUseHandler],
      [_policyChangeHandler.resultType, _policyChangeHandler],
      [_otherOutputHandler.resultType, _otherOutputHandler],
      [_otherOutcomeHandler.resultType, _otherOutcomeHandler],
    ]);
  }

  private readonly logger = new Logger(BilateralService.name);
  private readonly resultTypeHandlerMap: Map<
    number,
    BilateralResultTypeHandler
  >;

  async create(rootResultsDto: RootResultsDto) {
    const incomingResults = this.unwrapIncomingResults(rootResultsDto);

    if (!incomingResults.length) {
      throw new BadRequestException(
        'At least one result payload is required in either "results" or "result".',
      );
    }

    const createdResults = [];
    let resultInfo: any = null;

    for (const result of incomingResults) {
      try {
        // Validate basic data before transaction
        if (!result?.data || typeof result.data !== 'object') {
          throw new BadRequestException(
            'Each result entry must include a "data" object with the bilateral payload.',
          );
        }

        const bilateralDto = result.data;

        // Validate science_program_id BEFORE starting the transaction
        await this.validateTocMappingInitiatives(
          bilateralDto.toc_mapping,
          bilateralDto.contributing_programs,
        );

        await this.dataSource.transaction(
          async (_transactionalEntityManager) => {
            const adminUser = await this._userRepository.findOne({
              where: { email: 'admin@prms.pr' },
            });

            const createdByUser = await this.findOrCreateUser(
              bilateralDto.created_by,
              adminUser,
            );
            const userId = createdByUser.id;

            const submittedPayload = this.resolveSubmitterPayload(bilateralDto);
            const submittedUser = await this.findOrCreateUser(
              submittedPayload,
              createdByUser,
            );
            const submittedUserId = submittedUser.id;

            const version = await this._versioningService.$_findActivePhase(
              AppModuleIdEnum.REPORTING,
            );
            if (!version)
              throw this._handlersError.returnErrorRes({
                error: version,
                debug: true,
              });

            const year = await this._yearRepository.findOne({
              where: { active: true },
            });
            if (!year) throw new NotFoundException('Active year not found');

            if (
              bilateralDto.result_type_id ===
                ResultTypeEnum.KNOWLEDGE_PRODUCT &&
              bilateralDto.knowledge_product?.metadataCG?.issue_year != null
            ) {
              const issueYearVal =
                bilateralDto.knowledge_product.metadataCG.issue_year;
              const issueYearRecord = await this._yearRepository.findOne({
                where: { year: issueYearVal },
              });
              if (!issueYearRecord) {
                throw new BadRequestException(
                  `issue_year (${issueYearVal}) is not a valid year in the system. Please use a year that exists in the system.`,
                );
              }
            }

            if (
              bilateralDto.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT
            ) {
              await this.validateKnowledgeProductBeforeCreate(
                bilateralDto,
                version,
                userId,
              );
            } else {
              await this.ensureUniqueTitle(
                bilateralDto.title ?? '',
                version.id,
              );
            }

            const resultHeader = await this.initializeResultHeader({
              bilateralDto,
              userId,
              submittedUserId,
              version,
              year,
            });
            const newResultHeader = resultHeader;
            const resultId = resultHeader.id;

            await this.handleLeadCenter(
              resultId,
              bilateralDto.lead_center,
              userId,
            );

            const isKpType =
              bilateralDto.result_type_id === ResultTypeEnum.KNOWLEDGE_PRODUCT;

            if (isKpType) {
              // For KP, save without geographic_scope_id (will be set from CGSpace)
              await this._resultRepository.save({
                ...newResultHeader,
              });
            } else if (bilateralDto.geo_focus) {
              const {
                scope_code,
                scope_label,
                regions,
                countries,
                subnational_areas,
              } = bilateralDto.geo_focus;
              const scope = await this.findScope(scope_code, scope_label);
              this.validateGeoFocus(
                scope,
                regions,
                countries,
                subnational_areas,
              );

              await this.handleRegions(newResultHeader, scope, regions);
              await this.handleCountries(
                newResultHeader,
                countries,
                subnational_areas,
                scope.id,
                userId,
              );

              await this._resultRepository.save({
                ...newResultHeader,
                geographic_scope_id: this.resolveScopeId(scope.id, countries),
              });
            } else {
              // For non-KP types, geo_focus is required
              throw new BadRequestException(
                'geo_focus is required for non-Knowledge Product results.',
              );
            }

            await this.handleTocMapping(
              bilateralDto.toc_mapping,
              bilateralDto.contributing_programs,
              userId,
              resultId,
            );
            await this.handleInstitutions(
              resultId,
              bilateralDto.contributing_partners || [],
              userId,
              bilateralDto.result_type_id,
            );
            // KP evidence is created only in populateKPFromCGSpace; avoid double/malformed evidence
            if (!isKpType) {
              await this.handleEvidence(
                resultId,
                bilateralDto.evidence,
                userId,
              );
            }
            await this.handleNonPooledProject(
              resultId,
              userId,
              bilateralDto.contributing_bilateral_projects,
              bilateralDto.result_type_id,
            );

            await this.runResultTypeHandlers({
              resultId,
              userId,
              bilateralDto,
              isDuplicateResult: false,
            });

            await this.handleContributingCenters(
              resultId,
              bilateralDto.contributing_center || [],
              userId,
              bilateralDto.lead_center,
            );

            let kpExtra: any = {};
            if (isKpType) {
              const kp = await this._resultsKnowledgeProductsRepository.findOne(
                {
                  where: { results_id: resultId },
                },
              );
              if (kp) {
                kpExtra = {
                  knowledge_product_id: kp.result_knowledge_product_id,
                  knowledge_product_handle: kp.handle,
                };
              }
            }

            createdResults.push({
              id: resultId,
              result_code: newResultHeader.result_code,
              is_duplicate_kp: false,
              ...kpExtra,
            });

            resultInfo = await this._resultRepository.findOne({
              where: { id: newResultHeader.id },
              relations: this.buildResultRelations(bilateralDto.result_type_id),
            });

            this.logger.log(
              `Successfully created bilateral result ${resultId} (code: ${newResultHeader.result_code})`,
            );
          },
        );
      } catch (error) {
        this.logger.error('Error creating bilateral', error);
        this.logger.error(error.stack);
        throw error;
      }
    }

    return {
      response: resultInfo,
      message: 'Results Bilateral created successfully.',
      status: 201,
    };
  }

  async update(resultId: number, rootResultsDto: RootResultsDto) {
    if (!resultId) {
      throw new BadRequestException('Result id is required.');
    }

    const existingResult = await this._resultRepository.findOne({
      where: { id: resultId },
    });

    if (!existingResult) {
      throw new NotFoundException('Result not found.');
    }

    if (existingResult.source !== SourceEnum.Bilateral) {
      throw new BadRequestException(
        'The provided result does not belong to the bilateral API.',
      );
    }

    const incomingResults = this.unwrapIncomingResults(rootResultsDto);
    if (!incomingResults.length) {
      throw new BadRequestException(
        'At least one result payload is required in either "results" or "result".',
      );
    }

    const firstResult = incomingResults[0];
    if (!firstResult?.data || typeof firstResult.data !== 'object') {
      throw new BadRequestException(
        'Each result entry must include a "data" object with the bilateral payload.',
      );
    }

    const bilateralDto = firstResult.data;

    // Validate science_program_id before starting to save
    await this.validateTocMappingInitiatives(
      bilateralDto.toc_mapping,
      bilateralDto.contributing_programs,
    );

    let resultInfo: any = null;

    await this.dataSource.transaction(async () => {
      const adminUser = await this._userRepository.findOne({
        where: { email: 'admin@prms.pr' },
      });

      const createdByUser = await this.findOrCreateUser(
        bilateralDto.created_by,
        adminUser,
      );
      const userId = createdByUser.id;

      const submittedPayload = this.resolveSubmitterPayload(bilateralDto);
      const submittedUser = await this.findOrCreateUser(
        submittedPayload,
        createdByUser,
      );
      const submittedUserId = submittedUser.id;

      const version = await this._versioningService.$_findActivePhase(
        AppModuleIdEnum.REPORTING,
      );
      if (!version)
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });

      const year = await this._yearRepository.findOne({
        where: { active: true },
      });
      if (!year) throw new NotFoundException('Active year not found');

      const updatedHeader = await this._resultRepository.save({
        ...existingResult,
        title: bilateralDto.title,
        description: bilateralDto.description,
        version_id: version.id,
        reported_year_id: year.year,
        result_type_id: bilateralDto.result_type_id,
        result_level_id: bilateralDto.result_level_id,
        external_submitter: submittedUserId,
        external_submitted_date:
          bilateralDto.submitted_by?.submitted_date ?? null,
        external_submitted_comment: bilateralDto.submitted_by?.comment ?? null,
        last_updated_by: userId,
        ...(bilateralDto.created_date && {
          created_date: bilateralDto.created_date,
        }),
      });

      await this._resultsCenterRepository.fisicalDelete(resultId);
      await this.handleLeadCenter(resultId, bilateralDto.lead_center, userId);

      const { scope_code, scope_label, regions, countries, subnational_areas } =
        bilateralDto.geo_focus;
      const scope = await this.findScope(scope_code, scope_label);
      this.validateGeoFocus(scope, regions, countries, subnational_areas);

      await this.handleRegions(updatedHeader, scope, regions);
      await this.handleCountries(
        updatedHeader,
        countries,
        subnational_areas,
        scope.id,
        userId,
      );

      await this._resultRepository.update(resultId, {
        geographic_scope_id: this.resolveScopeId(scope.id, countries),
        has_countries: Array.isArray(countries) && countries.length > 0,
      });

      await this.resetTocData(resultId);
      await this.handleTocMapping(
        bilateralDto.toc_mapping,
        bilateralDto.contributing_programs,
        userId,
        resultId,
      );

      await this.handleInstitutions(
        resultId,
        bilateralDto.contributing_partners || [],
        userId,
        bilateralDto.result_type_id,
      );

      await this._evidencesRepository.logicalDelete(resultId);
      if (bilateralDto.result_type_id !== ResultTypeEnum.KNOWLEDGE_PRODUCT) {
        await this.handleEvidence(
          resultId,
          bilateralDto.evidence || [],
          userId,
        );
      }

      await this._resultsByProjectsRepository.delete({ result_id: resultId });
      await this.handleNonPooledProject(
        resultId,
        userId,
        bilateralDto.contributing_bilateral_projects,
        bilateralDto.result_type_id,
      );

      await this.handleContributingCenters(
        resultId,
        bilateralDto.contributing_center || [],
        userId,
        bilateralDto.lead_center,
      );

      await this.runResultTypeHandlers({
        resultId,
        userId,
        bilateralDto,
        isDuplicateResult: false,
      });

      resultInfo = await this._resultRepository.findOne({
        where: { id: resultId },
        relations: this.buildResultRelations(bilateralDto.result_type_id),
      });

      resultInfo = this.filterActiveRelations(resultInfo);

      this.logger.log(
        `Successfully updated bilateral result ${resultId} (code: ${existingResult.result_code})`,
      );
    });

    return {
      response: resultInfo,
      message: 'Results Bilateral updated successfully.',
      status: 200,
    };
  }

  async delete(resultId: number) {
    try {
      if (!resultId) {
        throw new BadRequestException('Result id is required.');
      }

      const result = await this._resultRepository.findOne({
        where: { id: resultId },
      });

      if (!result) {
        throw new NotFoundException('Result not found.');
      }

      if (result.source !== SourceEnum.Bilateral) {
        throw new BadRequestException(
          'The provided result does not belong to the bilateral API.',
        );
      }

      const systemUser = await this.getSystemUserToken();
      return await this._resultsService.deleteResult(resultId, systemUser);
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findOne(id: number) {
    if (!id) {
      throw new BadRequestException('Result id is required.');
    }

    const result = await this._resultRepository.findOne({
      where: { id, source: SourceEnum.Bilateral },
    });

    if (!result) {
      throw new NotFoundException('Bilateral result not found.');
    }

    const resultTypeId = result.result_type_id;
    const resultInfo = await this._resultRepository.findOne({
      where: { id },
      relations: this.buildResultRelations(resultTypeId),
    });

    if (!resultInfo) {
      throw new NotFoundException('Bilateral result not found.');
    }

    const filteredResult = this.filterActiveRelations(resultInfo);

    return {
      response: filteredResult,
      message: 'Bilateral result retrieved successfully.',
      status: 200,
    };
  }

  async findAll(limit: number = 10) {
    const takeLimit = limit && limit > 0 ? limit : 10;

    const results = await this._resultRepository.find({
      where: { source: SourceEnum.Bilateral, is_active: true },
      order: { id: 'DESC' },
      take: takeLimit,
    });

    const resultsWithRelations = await Promise.all(
      results.map(async (result) => {
        const resultTypeId = result.result_type_id;
        const resultWithRelations = await this._resultRepository.findOne({
          where: { id: result.id },
          relations: this.buildResultRelations(resultTypeId),
        });
        return this.filterActiveRelations(resultWithRelations);
      }),
    );

    return {
      response: resultsWithRelations,
      message: 'Bilateral results retrieved successfully.',
      status: 200,
    };
  }

  /**
   * Escapes a string for safe use in LIKE patterns (avoids % and _ as wildcards).
   * Parameterized queries prevent SQL injection; this avoids accidental wildcard behavior.
   */
  private escapeForLike(value: string): string {
    const backslash = '\x5c';
    return value
      .split(backslash)
      .join(String.raw`\\`)
      .split('%')
      .join(String.raw`\%`)
      .split('_')
      .join(String.raw`\_`);
  }

  private applyListResultsFilters(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    this.applyListResultsFiltersSourceVersionAndType(qb, query);
    this.applyListResultsFiltersStatus(qb, query);
    this.applyListResultsFiltersDateRange(qb, query);
    this.applyListResultsFiltersCenterAndInitiative(qb, query);
    this.applyListResultsFiltersSearch(qb, query);
  }

  private applyListResultsFiltersSourceVersionAndType(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    if (query.source !== undefined) {
      const sourceValue =
        query.source === ListResultsSourceEnum.API
          ? SourceEnum.Bilateral
          : SourceEnum.Result;
      qb.andWhere('r.source = :source', { source: sourceValue });
    }
    if (query.portfolio !== undefined || query.phase_year !== undefined) {
      qb.leftJoin('r.obj_version', 'v');
      if (query.portfolio !== undefined) {
        qb.leftJoin('v.obj_portfolio', 'portfolio').andWhere(
          'portfolio.acronym = :portfolioAcronym',
          { portfolioAcronym: query.portfolio },
        );
      }
      if (query.phase_year !== undefined) {
        qb.andWhere('v.phase_year = :phaseYear', {
          phaseYear: query.phase_year,
        });
      }
    }
    if (query.result_type !== undefined) {
      const resultTypeId = RESULT_TYPE_NAME_TO_ID[query.result_type];
      if (resultTypeId !== undefined) {
        qb.andWhere('r.result_type_id = :resultTypeId', { resultTypeId });
      }
    }
  }

  private applyListResultsFiltersStatus(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    if (query.status_id !== undefined) {
      qb.andWhere('r.status_id = :statusId', { statusId: query.status_id });
    }
    if (query.status !== undefined) {
      qb.leftJoin('r.obj_status', 'rs').andWhere(
        'rs.status_name = :statusName',
        { statusName: query.status },
      );
    }
  }

  private applyListResultsFiltersDateRange(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    if (query.last_updated_from) {
      qb.andWhere('r.last_updated_date >= :lastUpdatedFrom', {
        lastUpdatedFrom: query.last_updated_from,
      });
    }
    if (query.last_updated_to) {
      qb.andWhere('r.last_updated_date <= :lastUpdatedTo', {
        lastUpdatedTo: query.last_updated_to,
      });
    }
    if (query.created_from) {
      qb.andWhere('r.created_date >= :createdFrom', {
        createdFrom: query.created_from,
      });
    }
    if (query.created_to) {
      qb.andWhere('r.created_date <= :createdTo', {
        createdTo: query.created_to,
      });
    }
  }

  private applyListResultsFiltersCenterAndInitiative(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    if (query.center) {
      qb.andWhere(
        `r.id IN (
          SELECT rc.result_id FROM results_center rc
          LEFT JOIN clarisa_center cc ON cc.code = rc.center_id
          LEFT JOIN clarisa_institutions ci ON ci.id = cc.institutionId
          WHERE rc.is_leading_result = 1 AND rc.is_active = 1
          AND (rc.center_id = :centerFilter OR ci.acronym = :centerFilter)
        )`,
        { centerFilter: query.center },
      );
    }
    if (query.initiative_lead_code) {
      qb.andWhere(
        `r.id IN (
          SELECT rbi.result_id FROM results_by_inititiative rbi
          INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id AND ci.active = 1
          WHERE rbi.is_active = 1 AND rbi.initiative_role_id = 1
          AND ci.official_code = :initiativeCode
        )`,
        { initiativeCode: query.initiative_lead_code },
      );
    }
  }

  private applyListResultsFiltersSearch(
    qb: SelectQueryBuilder<Result>,
    query: ListResultsQueryDto,
  ): void {
    if (query.search) {
      const escaped = this.escapeForLike(query.search);
      qb.andWhere('r.title LIKE :titleSearch', { titleSearch: `%${escaped}%` });
    }
  }

  async listAllResults(query: ListResultsQueryDto) {
    const pageNum = Number(query.page);
    const limitNum = Number(query.limit);
    const page =
      Number.isFinite(pageNum) && pageNum > 0
        ? pageNum
        : LIST_RESULTS_PAGINATION.defaultPage;
    const limit = Math.min(
      Math.max(
        1,
        Number.isFinite(limitNum)
          ? limitNum
          : LIST_RESULTS_PAGINATION.defaultLimit,
      ),
      LIST_RESULTS_PAGINATION.maxLimit,
    );
    const skip = (page - 1) * limit;

    const qb = this._resultRepository
      .createQueryBuilder('r')
      .where('r.is_active = :isActive', { isActive: true })
      .orderBy('r.result_code', 'DESC');

    this.applyListResultsFilters(qb, query);

    const [results, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const items = await Promise.all(
      results.map(async (result) => {
        const resultTypeId = result.result_type_id;
        const resultWithRelations = await this._resultRepository.findOne({
          where: { id: result.id },
          relations: this.buildResultRelations(resultTypeId),
        });
        return this.filterActiveRelations(resultWithRelations);
      }),
    );

    return {
      response: {
        items,
        meta: { total, page, limit, totalPages },
      },
      message: 'Results list retrieved successfully.',
      status: 200,
    };
  }

  async getResultsForSync(
    bilateral?: boolean,
    type?: string,
  ): Promise<Array<{ type: string; result_id: number; data: any }>> {
    // Build where clause
    const where: any = {
      source: SourceEnum.Bilateral,
      is_active: true,
    };

    // Filter by result type if provided
    if (type) {
      const typeMap: Record<string, number> = {
        knowledge_product: ResultTypeEnum.KNOWLEDGE_PRODUCT,
        capacity_sharing: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
        innovation_development: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        innovation_use: ResultTypeEnum.INNOVATION_USE,
        other_output: ResultTypeEnum.OTHER_OUTPUT,
        other_outcome: ResultTypeEnum.OTHER_OUTCOME,
        policy_change: ResultTypeEnum.POLICY_CHANGE,
      };

      const resultTypeId = typeMap[type.toLowerCase()];
      if (resultTypeId) {
        where.result_type_id = resultTypeId;
      } else {
        this.logger.warn(`Unknown result type: ${type}`);
      }
    }

    // Get all results matching the criteria (no limit)
    let results = await this._resultRepository.find({
      where,
      order: { id: 'DESC' },
    });

    // Filter by bilateral flag if true (only results with contributing_bilateral_projects)
    if (bilateral === true) {
      const resultIdsWithProjects = await this._resultsByProjectsRepository
        .createQueryBuilder('rbp')
        .select('DISTINCT rbp.result_id', 'result_id')
        .getRawMany();

      const ids = resultIdsWithProjects.map((r) => r.result_id);
      if (ids.length > 0) {
        results = results.filter((r) => ids.includes(r.id));
      } else {
        // No results have projects, return empty array
        results = [];
      }
    }

    // Build relations and filter active relations for each result
    const resultsWithRelations = await Promise.all(
      results.map(async (result) => {
        const resultTypeId = result.result_type_id;
        const resultWithRelations = await this._resultRepository.findOne({
          where: { id: result.id },
          relations: this.buildResultRelations(resultTypeId),
        });
        const filteredResult = this.filterActiveRelations(resultWithRelations);

        // Map result type ID to string type name
        const typeMap: Record<number, string> = {
          [ResultTypeEnum.KNOWLEDGE_PRODUCT]: 'knowledge_product',
          [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
          [ResultTypeEnum.INNOVATION_DEVELOPMENT]: 'innovation_development',
          [ResultTypeEnum.INNOVATION_USE]: 'innovation_use',
          [ResultTypeEnum.OTHER_OUTPUT]: 'other_output',
          [ResultTypeEnum.OTHER_OUTCOME]: 'other_outcome',
          [ResultTypeEnum.POLICY_CHANGE]: 'policy_change',
        };

        return {
          type: typeMap[resultTypeId] || 'unknown',
          result_id: result.id,
          data: filteredResult,
        };
      }),
    );

    return resultsWithRelations;
  }

  private buildResultRelations(resultTypeId?: number) {
    const isKpType = resultTypeId === ResultTypeEnum.KNOWLEDGE_PRODUCT;
    const isCapacitySharing =
      resultTypeId === ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;
    const isInnovationDev =
      resultTypeId === ResultTypeEnum.INNOVATION_DEVELOPMENT;
    const isInnovationUse = resultTypeId === ResultTypeEnum.INNOVATION_USE;
    const isPolicyChange = resultTypeId === ResultTypeEnum.POLICY_CHANGE;

    return {
      obj_result_by_initiatives: {
        obj_initiative: true,
      },
      obj_geographic_scope: true,
      obj_result_type: true,
      obj_result_level: true,
      obj_created: true,
      obj_external_submitter: true,
      result_region_array: {
        region_object: true,
      },
      result_country_array: {
        country_object: true,
        result_countries_subnational_array: true,
      },
      result_by_institution_array: {
        obj_institutions: {
          obj_institution_type_code: true,
        },
      },
      result_center_array: {
        clarisa_center_object: {
          clarisa_institution: true,
        },
      },
      obj_results_toc_result: true,
      obj_result_by_project: {
        obj_clarisa_project: true,
      },
      ...(isKpType && {
        result_knowledge_product_array: {
          result_knowledge_product_keyword_array: true,
          result_knowledge_product_metadata_array: true,
        },
      }),
      ...(isCapacitySharing && {
        results_capacity_development_object: true,
      }),
      ...(isInnovationDev && {
        results_innovations_dev_object: true,
      }),
      ...(isInnovationUse && {
        results_innovations_use_object: true,
      }),
      ...(isPolicyChange && {
        results_policy_changes_object: true,
      }),
    };
  }

  private async validateTocMappingInitiatives(
    tocMapping?: any,
    contributingPrograms?: any[],
  ): Promise<void> {
    this.logger.debug(
      `Validating TOC mapping initiatives. tocMapping: ${JSON.stringify(tocMapping)}, contributingPrograms: ${JSON.stringify(contributingPrograms)}`,
    );

    const scienceProgramIds = this.collectScienceProgramIds(
      tocMapping,
      contributingPrograms,
    );

    if (scienceProgramIds.length === 0) {
      this.logger.debug(
        'No science_program_id found to validate. Skipping validation.',
      );
      return;
    }

    this.logger.debug(
      `Validating ${scienceProgramIds.length} science_program_id(s): ${scienceProgramIds.join(', ')}`,
    );

    const invalidPrograms = await this.validateInitiatives(scienceProgramIds);

    if (invalidPrograms.length > 0) {
      const errorMessage = `The following science_program_id(s) do not exist in CLARISA: ${invalidPrograms.join(', ')}. Please provide valid initiative codes.`;
      this.logger.error(errorMessage);
      throw new BadRequestException(errorMessage);
    }

    this.logger.debug('All science_program_id(s) are valid.');
  }

  private collectScienceProgramIds(
    tocMapping?: any,
    contributingPrograms?: any[],
  ): string[] {
    const scienceProgramIds: string[] = [];

    const tocProgramId = this.extractProgramIdFromTocMapping(tocMapping);
    if (tocProgramId) {
      scienceProgramIds.push(tocProgramId);
    }

    const contributingIds =
      this.extractProgramIdsFromContributing(contributingPrograms);
    scienceProgramIds.push(...contributingIds);

    return scienceProgramIds;
  }

  private extractProgramIdFromTocMapping(tocMapping?: any): string | null {
    if (!tocMapping || typeof tocMapping !== 'object') {
      this.logger.debug(
        `toc_mapping is not a valid object: ${typeof tocMapping}`,
      );
      return null;
    }

    if (
      'science_program_id' in tocMapping &&
      tocMapping.science_program_id != null
    ) {
      const programId = String(tocMapping.science_program_id).trim();
      if (programId) {
        this.logger.debug(
          `Found science_program_id in toc_mapping: ${programId}`,
        );
        return programId;
      }
      this.logger.warn(
        'toc_mapping.science_program_id is empty or whitespace only',
      );
    } else {
      this.logger.debug(
        'toc_mapping.science_program_id is missing or null/undefined',
      );
    }

    return null;
  }

  private extractProgramIdsFromContributing(
    contributingPrograms?: any[],
  ): string[] {
    const programIds: string[] = [];

    if (!Array.isArray(contributingPrograms)) {
      return programIds;
    }

    contributingPrograms.forEach((program, index) => {
      if (
        program &&
        typeof program === 'object' &&
        program.science_program_id
      ) {
        const programId = String(program.science_program_id).trim();
        if (programId) {
          programIds.push(programId);
          this.logger.debug(
            `Found science_program_id in contributing_programs[${index}]: ${programId}`,
          );
        }
      }
    });

    return programIds;
  }

  private async validateInitiatives(
    scienceProgramIds: string[],
  ): Promise<string[]> {
    const invalidPrograms: string[] = [];

    for (const programId of scienceProgramIds) {
      const normalizedCode = programId.trim().toUpperCase();
      this.logger.debug(
        `Checking initiative with code: ${programId} (normalized: ${normalizedCode})`,
      );

      const init = await this._clarisaInitiatives.findOne({
        where: { official_code: normalizedCode },
      });

      if (!init) {
        this.logger.warn(
          `Initiative not found for science_program_id: ${programId} (normalized: ${normalizedCode})`,
        );
        invalidPrograms.push(programId);
      } else {
        this.logger.debug(
          `Initiative found: id=${init.id}, code=${init.official_code}`,
        );
      }
    }

    return invalidPrograms;
  }

  private unwrapIncomingResults(
    rootResultsDto: RootResultsDto,
  ): ResultBilateralDto[] {
    if (!rootResultsDto) {
      return [];
    }

    if (
      Array.isArray(rootResultsDto.results) &&
      rootResultsDto.results.length > 0
    ) {
      return rootResultsDto.results;
    }

    if (rootResultsDto.result) {
      return [rootResultsDto.result];
    }

    if (
      rootResultsDto.data &&
      typeof rootResultsDto.data === 'object' &&
      Object.keys(rootResultsDto.data).length > 0
    ) {
      return [
        {
          type: rootResultsDto.type ?? 'BILATERAL',
          data: rootResultsDto.data,
        },
      ];
    }

    return [];
  }

  private async findOrCreateUser(userData, adminUser): Promise<any> {
    if (!userData?.email) {
      throw new BadRequestException('User email is required.');
    }

    const user = await this._userRepository.findOne({
      where: { email: userData.email },
    });

    if (!user) {
      const emailDomain = (userData.email.split('@')[1] || '').toLowerCase();
      const isCgiar = /cgiar/.test(emailDomain);
      const createUserDto: CreateUserDto = {
        first_name: userData.name ?? '(no name)',
        last_name: '(external)',
        email: userData.email,
        is_cgiar: isCgiar,
        created_by: adminUser?.id,
      };

      this.logger.log(`Creating new user for email: ${createUserDto.email}`);
      try {
        const createdUserWrapper = await this._userService.createFull(
          createUserDto,
          adminUser?.id,
          { skipCgiarAdLookup: true, skipAllEmails: true },
        );

        let createdUser: any = createdUserWrapper;
        if (
          createdUserWrapper &&
          typeof createdUserWrapper === 'object' &&
          'response' in createdUserWrapper &&
          createdUserWrapper.response
        ) {
          createdUser = createdUserWrapper.response;
        }

        if (!createdUser?.id) {
          throw new Error(
            `User creation failed: createFull did not return a valid user object for email=${createUserDto.email}`,
          );
        }

        this.logger.debug(
          `Created user unwrapped: ${JSON.stringify({ id: createdUser.id, email: createUserDto.email })}`,
        );
        return createdUser;
      } catch (error) {
        this.logger.error(
          `Failed to create user for email ${createUserDto.email}:`,
          error instanceof Error ? error.stack : JSON.stringify(error),
        );
        throw new BadRequestException(
          `Unable to create user account for ${createUserDto.email}. Please contact support.`,
        );
      }
    }

    this.logger.debug(
      `Found existing user: ${JSON.stringify({ id: user.id, email: user.email })}`,
    );
    return user;
  }

  private async getSystemUserToken(): Promise<TokenDto> {
    const adminUser = await this._userRepository.findOne({
      where: { email: 'admin@prms.pr' },
    });

    if (adminUser) {
      return {
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name ?? 'Admin',
        last_name: adminUser.last_name ?? 'PRMS',
      };
    }

    return {
      id: 0,
      email: 'system@prms.pr',
      first_name: 'System',
      last_name: 'Bilateral',
    };
  }

  private resolveSubmitterPayload(bilateralDto: CreateBilateralDto) {
    if (bilateralDto?.submitted_by?.email) {
      return bilateralDto.submitted_by;
    }
    return bilateralDto?.created_by;
  }

  private async handleTocMapping(
    toc,
    contributingPrograms: any[],
    userId,
    resultId,
  ) {
    if (!toc || typeof toc !== 'object') {
      this.logger.warn(
        'handleTocMapping received invalid toc object; skipping',
      );
      return;
    }

    const mappings: Array<
      {
        science_program_id?: string;
        aow_compose_code?: string;
        result_title?: string;
        result_indicator_description?: string;
        result_indicator_type_name?: string;
      } & { roleId: number }
    > = [];

    mappings.push({ ...toc, roleId: 1 });

    if (Array.isArray(contributingPrograms)) {
      contributingPrograms.forEach((contrib) =>
        mappings.push({ ...contrib, roleId: 2 }),
      );
    }

    let ownerInitiativeId: number | null = null;
    const REQUEST_STATUS_CONTRIBUTING = 4;

    for (const mapping of mappings) {
      const {
        science_program_id,
        aow_compose_code,
        result_title,
        result_indicator_description,
        result_indicator_type_name,
        roleId,
      } = mapping;

      this.logger.debug(
        `Processing TOC mapping: science_program_id=${science_program_id}, roleId=${roleId}, hasData=${!!(aow_compose_code || result_title)}`,
      );

      // Minimum validation: science_program_id is required
      if (!science_program_id) {
        this.logger.warn(
          `TOC mapping missing required field: science_program_id (role ${roleId})`,
        );
        continue;
      }

      // Search for the initiative (normalize the code for search)
      const normalizedCode = science_program_id?.trim().toUpperCase();
      const init = await this._clarisaInitiatives.findOne({
        where: { official_code: normalizedCode },
      });

      if (!init) {
        this.logger.error(
          `TOC mapping initiative not found for official_code=${science_program_id} (normalized: ${normalizedCode}, role ${roleId}). Cannot create TOC mapping without initiative.`,
        );
        continue;
      }

      // Contributing programs (roleId 2): store in share_result_request with request_status_id = 4 only
      if (roleId === 2) {
        if (ownerInitiativeId == null) {
          this.logger.warn(
            'Contributing program processed before owner initiative; skipping. Ensure toc_mapping (role 1) is sent first.',
          );
          continue;
        }
        try {
          const existingShare =
            await this._shareResultRequestRepository.findOne({
              where: {
                result_id: resultId,
                owner_initiative_id: ownerInitiativeId,
                shared_inititiative_id: init.id,
                request_status_id: REQUEST_STATUS_CONTRIBUTING,
                is_active: true,
              },
            });
          if (!existingShare) {
            await this._shareResultRequestRepository.save({
              result_id: resultId,
              owner_initiative_id: ownerInitiativeId,
              shared_inititiative_id: init.id,
              approving_inititiative_id: init.id,
              request_status_id: REQUEST_STATUS_CONTRIBUTING,
              requested_by: userId,
              is_active: true,
            });
            this.logger.debug(
              `Created share_result_request (request_status_id=${REQUEST_STATUS_CONTRIBUTING}) for result ${resultId}, owner=${ownerInitiativeId}, shared=${init.id} (${science_program_id})`,
            );
          }
        } catch (err) {
          this.logger.error(
            `Error saving share_result_request for contributing program ${science_program_id}: ${(err as Error).message}`,
          );
          throw err;
        }
        continue;
      }

      // From here: roleId === 1 (main toc) — full flow: results_by_initiative + results_toc_result
      ownerInitiativeId = init.id;

      // Flexible: attempt toc_result_id mapping when we have at least result_title (from ToC); otherwise initiative-only
      const hasTitleForToc = !!result_title?.trim();
      const hasFullMappingData =
        hasTitleForToc &&
        (!!aow_compose_code?.trim() ||
          !!result_indicator_description?.trim() ||
          !!result_indicator_type_name?.trim());
      const attemptTocSearch = hasTitleForToc;

      if (!attemptTocSearch) {
        this.logger.log(
          `[TOC] No result_title provided for ${science_program_id} → initiative-only mapping (no toc_result_id lookup)`,
        );
      } else if (!hasFullMappingData) {
        this.logger.log(
          `[TOC] result_title provided for ${science_program_id} → attempting ToC search by title (and initiative); optional aow/indicator fields may be empty`,
        );
      }

      this.logger.debug(
        `Processing TOC mapping for ${science_program_id} (role ${roleId}): attemptTocSearch=${attemptTocSearch}, hasFullMappingData=${hasFullMappingData}`,
      );

      try {
        let mapToToc: any[] | null = null;
        let firstMap: any = null;
        let isInitiativeOnlyMapping = true; // By default, assume basic mapping

        // If we have result_title, attempt to find ToC mapping (flexible: by title + initiative; aow/indicator optional)
        if (attemptTocSearch) {
          this.logger.log(
            `[TOC] Attempting ToC mapping search for ${science_program_id} (result_title length=${result_title?.length ?? 0})`,
          );
          mapToToc =
            await this._resultsTocResultsRepository.findTocResultsForBilateral({
              ...mapping,
              initiative_id: init.id,
            });

          const foundWithTocResultId =
            Array.isArray(mapToToc) &&
            mapToToc.length > 0 &&
            mapToToc[0].toc_result_id;

          if (foundWithTocResultId) {
            firstMap = mapToToc[0];
            isInitiativeOnlyMapping = false;
            this.logger.debug(
              `ToC mapping found for ${science_program_id}: toc_result_id=${firstMap.toc_result_id}`,
            );
          } else {
            this.logger.warn(
              `TOC search did not match any ToC results for ${science_program_id}. Will create initiative-only mapping (toc_result_id=null).`,
            );
          }
        } else {
          this.logger.debug(
            `No result_title for ${science_program_id}, will create initiative-only mapping`,
          );
        }

        // If there is no full mapping, create basic initiative-only mapping
        if (isInitiativeOnlyMapping) {
          firstMap = {
            toc_result_id: null,
            toc_results_indicator_id: null,
            science_program_id: science_program_id,
            category: null,
            number_target: null,
            target_date: null,
          };
          this.logger.debug(
            `Prepared basic initiative mapping for ${science_program_id}`,
          );
        }

        if (!init.active) {
          this.logger.warn(
            `TOC mapping initiative found but is not active: id=${init.id}, official_code=${init.official_code} (role ${roleId}). Proceeding anyway.`,
          );
        }

        this.logger.debug(
          `Found initiative: id=${init.id}, name=${init.name}, official_code=${init.official_code}, active=${init.active}. Processing TOC mapping (role: ${roleId}, isInitiativeOnly: ${isInitiativeOnlyMapping})`,
        );

        // Create/update result_by_initiative relationship (main toc only)
        this.logger.debug(
          `Upserting result_by_initiative: resultId=${resultId}, initiativeId=${init.id}, roleId=${roleId}`,
        );
        try {
          await this.upsertResultInitiative(resultId, init.id, roleId, userId);
          this.logger.debug(
            `Successfully upserted result_by_initiative for result ${resultId}, initiative ${init.id}`,
          );
        } catch (err) {
          this.logger.error(
            `Error upserting result_by_initiative for result ${resultId}, initiative ${init.id}: ${(err as Error).message}`,
          );
          throw err; // Re-throw to be caught by outer catch
        }

        // Determine toc_level_id if we have category
        const categoryToLevelMap = {
          OUTPUT: 1,
          OUTCOME: 2,
          EOI: 3,
        };

        const tocLevelId = firstMap.category
          ? categoryToLevelMap[firstMap.category.toUpperCase()]
          : null;

        if (firstMap.category && !tocLevelId) {
          this.logger.warn(
            `TOC mapping has invalid category: ${firstMap.category}`,
          );
        }

        // Search if a TOC mapping already exists for this result and initiative
        // Use IsNull() when toc_result_id is null for correct search
        const whereCondition: any = {
          result_id: resultId,
          initiative_id: init.id,
          is_active: true,
        };

        if (firstMap.toc_result_id === null) {
          whereCondition.toc_result_id = IsNull();
          this.logger.debug(
            `Searching for existing TOC mapping with null toc_result_id for result ${resultId}, initiative ${init.id}`,
          );
        } else {
          whereCondition.toc_result_id = firstMap.toc_result_id;
          this.logger.debug(
            `Searching for existing TOC mapping with toc_result_id=${firstMap.toc_result_id} for result ${resultId}, initiative ${init.id}`,
          );
        }

        const existingToc = await this._resultsTocResultsRepository.findOne({
          where: whereCondition,
        });

        // Create or update the basic record in results_toc_result
        let tocMapping;

        // Validate that the found record actually corresponds to the correct initiative
        if (existingToc && existingToc.initiative_id !== init.id) {
          this.logger.warn(
            `Found TOC mapping (id: ${existingToc.result_toc_result_id}) but initiative_id mismatch: expected ${init.id}, found ${existingToc.initiative_id}. Will create new mapping.`,
          );
          // Don't use this record, create a new one
          const newTocMappingData = {
            created_by: userId,
            toc_result_id: firstMap.toc_result_id,
            initiative_ids: init.id,
            initiative_id: init.id,
            result_id: resultId,
            toc_level_id: tocLevelId,
            planned_result: true,
          };
          this.logger.debug(
            `Creating new TOC mapping due to initiative_id mismatch`,
          );
          tocMapping =
            await this._resultsTocResultsRepository.save(newTocMappingData);
          this.logger.debug(
            `Successfully created new TOC mapping (id: ${tocMapping.result_toc_result_id}) for result ${resultId}, initiative ${init.id} (${science_program_id})`,
          );
        } else if (existingToc) {
          // The record exists and corresponds to the correct initiative
          this.logger.debug(
            `Found existing TOC mapping (id: ${existingToc.result_toc_result_id}) for result ${resultId}, initiative ${init.id} (${science_program_id})`,
          );
          // Update planned_result to true if not already set
          if (existingToc.planned_result !== true) {
            await this._resultsTocResultsRepository.update(
              { result_toc_result_id: existingToc.result_toc_result_id },
              { planned_result: true, last_updated_by: userId },
            );
            existingToc.planned_result = true;
            this.logger.debug(
              `Updated planned_result to true for existing TOC mapping ${existingToc.result_toc_result_id}`,
            );
          }
          tocMapping = existingToc;
        } else {
          this.logger.debug(
            `No existing TOC mapping found. Creating new one for result ${resultId}, initiative ${init.id} (${science_program_id})`,
          );
          try {
            const newTocMappingData = {
              created_by: userId,
              toc_result_id: firstMap.toc_result_id,
              initiative_ids: init.id,
              initiative_id: init.id,
              result_id: resultId,
              toc_level_id: tocLevelId,
              planned_result: true, // Mark as planned_result = 1
            };
            this.logger.debug(
              `Attempting to save TOC mapping with data: ${JSON.stringify(newTocMappingData)}`,
            );
            const newTocMapping =
              await this._resultsTocResultsRepository.save(newTocMappingData);
            this.logger.debug(
              `Successfully created new TOC mapping (id: ${newTocMapping.result_toc_result_id}) for result ${resultId}, initiative ${init.id} (${science_program_id}) with planned_result=true, toc_result_id=${firstMap.toc_result_id}`,
            );
            tocMapping = newTocMapping;
          } catch (saveError) {
            this.logger.error(
              `Error saving TOC mapping for result ${resultId}, initiative ${init.id} (${science_program_id}): ${(saveError as Error).message}`,
            );
            this.logger.error(`Error stack: ${(saveError as Error).stack}`);
            throw saveError; // Re-throw to be caught by outer catch
          }
        }

        // If we have full mapping (with indicator), create/update indicators
        if (!isInitiativeOnlyMapping && firstMap.toc_results_indicator_id) {
          const existingIndicator =
            await this._resultsTocResultsIndicatorsRepository.findOne({
              where: {
                results_toc_results_id: tocMapping.result_toc_result_id,
                toc_results_indicator_id: firstMap.toc_results_indicator_id,
              },
            });

          const indicatorRecord =
            existingIndicator ??
            (await this._resultsTocResultsIndicatorsRepository.save({
              created_by: userId,
              results_toc_results_id: tocMapping.result_toc_result_id,
              toc_results_indicator_id: firstMap.toc_results_indicator_id,
            }));

          if (firstMap.number_target) {
            const targetDate = firstMap.target_date
              ? Number(firstMap.target_date)
              : null;

            const existingTarget =
              await this._resultsTocTargetIndicatorRepository.findOne({
                where: {
                  result_toc_result_indicator_id:
                    indicatorRecord.result_toc_result_indicator_id,
                  number_target: firstMap.number_target,
                },
              });

            if (!existingTarget) {
              await this._resultsTocTargetIndicatorRepository.save({
                number_target: firstMap.number_target,
                result_toc_result_indicator_id:
                  indicatorRecord.result_toc_result_indicator_id,
                contributing_indicator: 1,
                target_date: targetDate,
                created_by: userId,
                last_updated_by: userId,
                is_active: true,
              });
            }
          }
        }

        const mappingType = isInitiativeOnlyMapping
          ? 'basic initiative'
          : 'full TOC';
        this.logger.debug(
          `TOC mapping processed successfully for program ${science_program_id} (role ${roleId}) - ${mappingType} mapping`,
        );
      } catch (err) {
        this.logger.error(
          `TOC mapping unexpected error for program ${mapping.science_program_id} (role ${roleId}): ${
            (err as Error).message
          }`,
        );
        this.logger.error(`TOC mapping error stack: ${(err as Error).stack}`);
        // Don't continue with next mapping if there's a critical error
        // but also don't fail the entire process
        continue;
      }
    }
  }

  private async resetTocData(resultId: number) {
    await this._resultsTocTargetIndicatorRepository.logicalDelete(resultId);
    await this._resultsTocResultsIndicatorsRepository.logicalDelete(resultId);
    await this._resultsTocResultsRepository.logicalDelete(resultId);
    await this._resultByInitiativesRepository.logicalDelete(resultId);
    await this._shareResultRequestRepository.logicalDelete(resultId);
  }

  private filterActiveRelations(result: any) {
    if (!result) return result;
    const onlyActive = (arr: any[]) =>
      Array.isArray(arr)
        ? arr.filter(
            (item) =>
              item?.is_active === undefined ||
              item.is_active === null ||
              item.is_active === true ||
              item.is_active === 1,
          )
        : arr;

    result.result_region_array = onlyActive(result.result_region_array);
    result.result_country_array = onlyActive(result.result_country_array)?.map(
      (rc) => ({
        ...rc,
        result_countries_subnational_array: onlyActive(
          rc?.result_countries_subnational_array,
        ),
      }),
    );
    result.result_by_institution_array = onlyActive(
      result.result_by_institution_array,
    );
    result.result_center_array = onlyActive(result.result_center_array);
    result.obj_results_toc_result = onlyActive(result.obj_results_toc_result);
    result.obj_result_by_project = onlyActive(result.obj_result_by_project);
    result.result_knowledge_product_array = onlyActive(
      result.result_knowledge_product_array,
    );

    return result;
  }

  private async handleNonPooledProject(
    resultId: number,
    userId: number,
    bilateralProjects: any[],
    resultTypeId: number,
  ) {
    if (
      !bilateralProjects ||
      !Array.isArray(bilateralProjects) ||
      !bilateralProjects.length
    ) {
      return;
    }

    const isInnovationDevOrUse = this.isInnovationType(resultTypeId);
    const isSingleProject = bilateralProjects.length === 1;

    for (const nonpp of bilateralProjects) {
      if (!nonpp?.grant_title) continue;

      const project = await this.findProjectByGrantTitle(nonpp.grant_title);
      if (!project) continue;

      const isLead = this.determineIsLead(isSingleProject, nonpp);
      const savedResultProject = await this.saveResultProject(
        resultId,
        project.id,
        userId,
        isLead,
      );

      if (isInnovationDevOrUse && savedResultProject) {
        await this.createOrUpdateBudget(savedResultProject, nonpp, userId);
      }
    }
  }

  private isInnovationType(resultTypeId: number): boolean {
    return [
      ResultTypeEnum.INNOVATION_DEVELOPMENT,
      ResultTypeEnum.INNOVATION_USE,
      ResultTypeEnum.INNOVATION_USE_IPSR,
    ].includes(resultTypeId);
  }

  private async findProjectByGrantTitle(grantTitle: string) {
    const project = await this._clarisaProjectsRepository.findOne({
      where: [{ shortName: grantTitle }, { fullName: grantTitle }],
    });

    if (!project) {
      this.logger.warn(`Project not found for grant_title: ${grantTitle}`);
    }

    return project;
  }

  private determineIsLead(isSingleProject: boolean, nonpp: any): boolean {
    return isSingleProject
      ? true
      : nonpp?.is_lead === 1 || nonpp?.is_lead === true;
  }

  private async saveResultProject(
    resultId: number,
    projectId: number,
    userId: number,
    isLead: boolean,
  ) {
    return await this._resultsByProjectsRepository.save({
      result_id: resultId,
      project_id: projectId,
      created_by: userId,
      is_lead: isLead,
    });
  }

  private async createOrUpdateBudget(
    savedResultProject: any,
    nonpp: any,
    userId: number,
  ) {
    const resultProjectId = Array.isArray(savedResultProject)
      ? savedResultProject[0].id
      : savedResultProject.id;

    const existingBudget = await this._nonPooledProjectBudgetRepository.findOne(
      {
        where: {
          result_project_id: resultProjectId,
          is_active: true,
        },
      },
    );

    const kindCashValue = this.calculateKindCash(nonpp);

    if (existingBudget) {
      await this.updateExistingBudget(
        existingBudget,
        kindCashValue,
        nonpp,
        userId,
      );
    } else {
      await this.createNewBudget(resultProjectId, kindCashValue, nonpp, userId);
    }
  }

  private calculateKindCash(nonpp: any): number | null {
    if (nonpp.is_determined === true) {
      return null;
    }

    if (nonpp.usd_budget === null || nonpp.usd_budget === undefined) {
      return null;
    }

    return Number(nonpp.usd_budget);
  }

  private async updateExistingBudget(
    existingBudget: any,
    kindCashValue: number | null,
    nonpp: any,
    userId: number,
  ) {
    existingBudget.kind_cash = kindCashValue;
    existingBudget.is_determined = nonpp.is_determined;
    existingBudget.last_updated_by = userId;
    existingBudget.non_pooled_projetct_id = null;

    await this._nonPooledProjectBudgetRepository.save(existingBudget);
  }

  private async createNewBudget(
    resultProjectId: number,
    kindCashValue: number | null,
    nonpp: any,
    userId: number,
  ) {
    const newBudget = this._nonPooledProjectBudgetRepository.create({
      result_project_id: resultProjectId,
      non_pooled_projetct_id: null,
      kind_cash: kindCashValue,
      is_determined: nonpp.is_determined,
      created_by: userId,
      last_updated_by: userId,
      is_active: true,
    });

    await this._nonPooledProjectBudgetRepository.save(newBudget);
  }

  /**
   * Validates KP payload before any insert: handle required, no duplicate handle, MQAP year match.
   * Call this only when result_type_id is KNOWLEDGE_PRODUCT; throws if validation fails.
   */
  private async validateKnowledgeProductBeforeCreate(
    bilateralDto: CreateBilateralDto,
    version: { phase_year?: number; cgspace_year?: number },
    userId: number,
  ): Promise<void> {
    if (!bilateralDto.knowledge_product) {
      throw new BadRequestException(
        'knowledge_product object is required for KNOWLEDGE_PRODUCT results.',
      );
    }
    const handleRaw = bilateralDto.knowledge_product.handle?.trim?.() ?? '';
    if (!handleRaw) {
      throw new BadRequestException(
        'knowledge_product.handle is required for KNOWLEDGE_PRODUCT results.',
      );
    }

    // Normalize handle the same way CGSpace/mapper do (e.g. "10568/12345" from URL or raw)
    const handle =
      this._resultsKnowledgeProductsService.extractHandleIdentifier(handleRaw);

    const existingKp =
      await this._resultsKnowledgeProductsService.validateKPExistanceByHandle(
        handle,
      );
    if (existingKp) {
      this.logger.warn(
        `Knowledge Product with handle ${handle} already exists, aborting bilateral creation.`,
      );
      throw new BadRequestException(
        existingKp.message ??
          `Knowledge Product with handle ${handle} already exists.`,
      );
    }

    const versionYear = version?.phase_year ?? version?.cgspace_year;
    const userToken: TokenDto = { id: userId } as TokenDto;
    const mqapValidation =
      await this._resultsKnowledgeProductsService.findOnCGSpace(
        handle,
        userToken,
        versionYear,
        false,
      );
    if ((mqapValidation as any)?.status !== HttpStatus.OK) {
      const message =
        (mqapValidation as any)?.message ||
        'The Knowledge Product could not be validated against CGSpace for this reporting cycle.';
      throw new BadRequestException(message);
    }
  }

  private async initializeResultHeader({
    bilateralDto,
    userId,
    submittedUserId,
    version,
    year,
  }: {
    bilateralDto: CreateBilateralDto;
    userId: number;
    submittedUserId: number;
    version: any;
    year: any;
  }): Promise<Result> {
    const handler = this.resultTypeHandlerMap.get(bilateralDto.result_type_id);
    if (handler?.initializeResultHeader) {
      const custom = await handler.initializeResultHeader({
        bilateralDto,
        userId,
        submittedUserId,
        version,
        year,
      });
      if (custom?.resultHeader) {
        return this._resultRepository.findOne({
          where: { id: custom.resultHeader.id },
        });
      }
    }

    const saved = await this._resultRepository.save({
      created_by: userId,
      version_id: version.id,
      title: bilateralDto.title,
      description: bilateralDto.description,
      reported_year_id: year.year,
      result_code: 0,
      result_type_id: bilateralDto.result_type_id,
      result_level_id: bilateralDto.result_level_id,
      external_submitter: submittedUserId,
      external_submitted_date:
        bilateralDto.submitted_by?.submitted_date ?? null,
      external_submitted_comment: bilateralDto.submitted_by?.comment ?? null,
      ...(bilateralDto.created_date && {
        created_date: bilateralDto.created_date,
      }),
      source: SourceEnum.Bilateral,
      status_id: ResultStatusData.PendingReview.value,
    });

    return this._resultRepository.findOne({
      where: { id: saved.id },
    });
  }

  private async runResultTypeHandlers(context: {
    resultId: number;
    userId: number;
    bilateralDto: CreateBilateralDto;
    isDuplicateResult: boolean;
  }) {
    const handler = this.resultTypeHandlerMap.get(
      context.bilateralDto.result_type_id,
    );
    if (!handler?.afterCreate) return;
    await handler.afterCreate({
      resultId: context.resultId,
      userId: context.userId,
      bilateralDto: context.bilateralDto,
      isDuplicateResult: context.isDuplicateResult,
    });
  }

  private async ensureUniqueTitle(title: string, versionId: number) {
    const normalizedTitle = (title || '').trim();
    if (!normalizedTitle) {
      throw new BadRequestException('Result title is required.');
    }

    const existing = await this._resultRepository.findOne({
      where: {
        title: normalizedTitle,
        is_active: true,
        version_id: versionId,
      },
      select: { id: true },
    });

    if (existing) {
      this.logger.warn(
        `Duplicate result title rejected: "${normalizedTitle}" (existing result id: ${existing.id})`,
      );
      throw new BadRequestException(
        `A result with the title "${normalizedTitle}" already exists.`,
      );
    }
  }

  /** Target institution name for Alliance of Bioversity and CIAT (used when mapping known aliases). */
  private static readonly ALLIANCE_BIOVERSITY_CIAT_NAME =
    'Alliance of Bioversity and CIAT - Headquarter (Bioversity International)';

  /** Aliases that map to ALLIANCE_BIOVERSITY_CIAT_NAME (compared case-insensitively, trimmed). */
  private static readonly ALLIANCE_ALIASES = new Set([
    'ABC',
    'CIAT-BIOVERSITY',
    'CIAT (ALLIANCE)',
    'BIOVERSITY (ALLIANCE)',
  ]);

  /**
   * Normalizes institution name/acronym values.
   * Maps known aliases (ABC, CIAT-BIOVERSITY, CIAT (Alliance), Bioversity (Alliance))
   * to the full institution name for matching in Clarisa.
   */
  private normalizeInstitutionValue(
    value: string | undefined,
  ): string | undefined {
    if (!value) return value;
    const normalized = value.trim().toUpperCase();
    if (BilateralService.ALLIANCE_ALIASES.has(normalized)) {
      this.logger.debug(
        `Normalizing "${value.trim()}" to Alliance of Bioversity and CIAT for institution matching`,
      );
      return BilateralService.ALLIANCE_BIOVERSITY_CIAT_NAME;
    }
    return value;
  }

  private async handleLeadCenter(
    resultId: number,
    leadCenter: { name?: string; acronym?: string; institution_id?: number },
    userId: number,
  ) {
    if (!leadCenter || typeof leadCenter !== 'object') {
      this.logger.debug(
        'No lead_center object; skipping results_center creation',
      );
      return;
    }

    // Normalize ABC to CIAT
    const normalizedName = this.normalizeInstitutionValue(leadCenter.name);
    const normalizedAcronym = this.normalizeInstitutionValue(
      leadCenter.acronym,
    );
    const { institution_id } = leadCenter;
    const name = normalizedName;
    const acronym = normalizedAcronym;
    if (!name && !acronym && !institution_id) {
      this.logger.warn(
        'lead_center must include at least one of name, acronym, institution_id',
      );
      return;
    }

    const institutionCandidates = [];

    if (institution_id) {
      const inst = await this._clarisaInstitutionsRepository.findOne({
        where: { id: institution_id },
      });
      if (inst) institutionCandidates.push(inst);
      else
        this.logger.warn(
          `No institution found for institution_id=${institution_id}`,
        );
    }

    const fuzzyConditions = [];
    // Build flexible search conditions: if name is provided, search in both name and acronym
    // and vice versa to handle cases where users send acronym in name field or name in acronym field
    if (name) {
      fuzzyConditions.push({ name: Like(`%${name}%`) });
      // Also search in acronym field using the name value (flexible matching)
      fuzzyConditions.push({ acronym: Like(`%${name}%`) });
    }
    if (acronym) {
      fuzzyConditions.push({ acronym: Like(`%${acronym}%`) });
      // Also search in name field using the acronym value (flexible matching)
      fuzzyConditions.push({ name: Like(`%${acronym}%`) });
    }
    if (fuzzyConditions.length) {
      const fuzzy = await this._clarisaInstitutionsRepository.find({
        where: fuzzyConditions,
      });
      for (const f of fuzzy) {
        if (!institutionCandidates.find((c) => c.id === f.id)) {
          institutionCandidates.push(f);
        }
      }
    }

    if (!institutionCandidates.length) {
      this.logger.warn(
        `No institutions matched lead_center input (name='${name || ''}', acronym='${acronym || ''}', institution_id='${institution_id || ''}')`,
      );
      return;
    }

    let selectedCenter: ClarisaCenter | null = null;
    for (const inst of institutionCandidates) {
      const centers = await this._clarisaCenters.find({
        where: { institutionId: inst.id },
      });
      if (centers && centers.length) {
        selectedCenter = centers[0];
        break;
      }
    }

    if (!selectedCenter) {
      this.logger.warn(
        'Institutions matched but none have associated clarisa_center records',
      );
      return;
    }

    try {
      const existing =
        await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          selectedCenter.code,
        );
      if (existing) {
        await this._resultRepository.query(
          `update results_center set is_primary = 1, is_leading_result = 1, last_updated_date = NOW(), last_updated_by = ? where id = ?`,
          [userId, existing.id],
        );
        this.logger.debug(
          `Updated existing lead center flags (center=${selectedCenter.code}, result=${resultId})`,
        );
        return;
      }
      await this._resultsCenterRepository.save({
        result_id: resultId,
        center_id: selectedCenter.code,
        is_primary: true,
        is_leading_result: true,
        from_cgspace: false,
        is_active: true,
        created_by: userId,
      });
      this.logger.log(
        `Lead center stored for result ${resultId}: center_id=${selectedCenter.code}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to save lead center for result ${resultId}: ${selectedCenter.code}`,
        err instanceof Error ? err.stack : JSON.stringify(err),
      );
    }
  }

  /**
   * Stores contributing centers (non lead) into results_center.
   * Input objects follow InstitutionDto shape: may include institution_id, acronym, or name.
   * Avoids duplicating the lead center if already stored.
   */
  private async handleContributingCenters(
    resultId: number,
    centers: { name?: string; acronym?: string; institution_id?: number }[],
    userId: number,
    leadCenter?: { name?: string; acronym?: string; institution_id?: number },
  ) {
    if (!Array.isArray(centers) || !centers.length) return;

    for (const centerInput of centers) {
      if (!centerInput) continue;
      // Normalize ABC to CIAT
      const normalizedName = this.normalizeInstitutionValue(centerInput.name);
      const normalizedAcronym = this.normalizeInstitutionValue(
        centerInput.acronym,
      );
      const { institution_id } = centerInput;
      const name = normalizedName;
      const acronym = normalizedAcronym;
      if (!name && !acronym && !institution_id) continue;

      // Normalize leadCenter values for comparison
      const normalizedLeadName = this.normalizeInstitutionValue(
        leadCenter?.name,
      );
      const normalizedLeadAcronym = this.normalizeInstitutionValue(
        leadCenter?.acronym,
      );

      if (
        leadCenter &&
        ((leadCenter.institution_id &&
          institution_id &&
          leadCenter.institution_id === institution_id) ||
          (acronym &&
            normalizedLeadAcronym?.toLowerCase() === acronym?.toLowerCase()) ||
          (name && normalizedLeadName?.toLowerCase() === name?.toLowerCase()))
      ) {
        continue;
      }

      const institutionCandidates = [];
      if (institution_id) {
        const inst = await this._clarisaInstitutionsRepository.findOne({
          where: { id: institution_id },
        });
        if (inst) institutionCandidates.push(inst);
      }
      const fuzzyConditions = [];
      // Build flexible search conditions: if name is provided, search in both name and acronym
      // and vice versa to handle cases where users send acronym in name field or name in acronym field
      if (name) {
        fuzzyConditions.push({ name: Like(`%${name}%`) });
        // Also search in acronym field using the name value (flexible matching)
        fuzzyConditions.push({ acronym: Like(`%${name}%`) });
      }
      if (acronym) {
        fuzzyConditions.push({ acronym: Like(`%${acronym}%`) });
        // Also search in name field using the acronym value (flexible matching)
        fuzzyConditions.push({ name: Like(`%${acronym}%`) });
      }
      if (!institution_id && fuzzyConditions.length) {
        const fuzzy = await this._clarisaInstitutionsRepository.find({
          where: fuzzyConditions,
        });
        for (const f of fuzzy) {
          if (!institutionCandidates.find((c) => c.id === f.id)) {
            institutionCandidates.push(f);
          }
        }
      }
      if (!institutionCandidates.length) continue;

      let selectedCenter: ClarisaCenter = null;
      for (const inst of institutionCandidates) {
        const centersFound = await this._clarisaCenters.find({
          where: { institutionId: inst.id },
        });
        if (centersFound?.length) {
          selectedCenter = centersFound[0];
          break;
        }
      }
      if (!selectedCenter) continue;

      const existing =
        await this._resultsCenterRepository.getAllResultsCenterByResultIdAndCenterId(
          resultId,
          selectedCenter.code,
        );
      if (existing) continue;

      try {
        await this._resultsCenterRepository.save({
          result_id: resultId,
          center_id: selectedCenter.code,
          is_primary: false,
          is_leading_result: false,
          from_cgspace: false,
          is_active: true,
          created_by: userId,
        });
      } catch (err) {
        this.logger.error(
          `Failed to save contributing center ${selectedCenter.code} for result ${resultId}`,
          err instanceof Error ? err.stack : JSON.stringify(err),
        );
      }
    }
  }

  private async upsertResultInitiative(
    resultId: number,
    initiativeId: number,
    roleId: number,
    userId: number,
  ) {
    const existing = await this._resultByInitiativesRepository.findOne({
      where: { result_id: resultId, initiative_id: initiativeId },
    });

    if (existing) {
      await this._resultByInitiativesRepository.update(
        { id: existing.id },
        {
          initiative_role_id: roleId,
          is_active: true,
          last_updated_by: userId,
          last_updated_date: new Date(),
        },
      );
      return;
    }

    await this._resultByInitiativesRepository.save({
      result_id: resultId,
      initiative_id: initiativeId,
      initiative_role_id: roleId,
      is_active: true,
      created_by: userId,
      last_updated_by: userId,
    });
  }

  private async handleEvidence(resultId, evidence, userId) {
    if (!Array.isArray(evidence) || !evidence.length) return;

    const evidencesArray = evidence.filter((e) => !!e?.link);
    const testDuplicate = evidencesArray.map((e) => e.link);
    if (new Set(testDuplicate).size !== testDuplicate.length) {
      throw {
        response: {},
        message: 'Duplicate links found in the evidence',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const long: number = evidencesArray.length > 6 ? 6 : evidencesArray.length;
    for (let index = 0; index < long; index++) {
      const evidence = evidencesArray[index];

      evidence.link = await this._evidencesService.getHandleFromRegularLink(
        evidence.link,
      );

      const newEvidence = new Evidence();
      newEvidence.created_by = userId;
      newEvidence.description = evidence?.description ?? null;
      newEvidence.link = evidence.link;
      newEvidence.result_id = resultId;

      const hasQuery = (evidence.link ?? '').indexOf('?');
      const linkSplit = (evidence.link ?? '')
        .slice(0, hasQuery != -1 ? hasQuery : evidence.link?.length)
        .split('/');
      const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

      const knowledgeProduct =
        await this._resultsKnowledgeProductsRepository.findOne({
          where: { handle: Like(handleId) },
          relations: { result_object: true },
        });

      if (knowledgeProduct) {
        newEvidence.knowledge_product_related =
          knowledgeProduct.result_object.id;
      }

      await this._evidencesRepository.save(newEvidence);
    }
  }

  private async handleInstitutions(
    resultId: number,
    institutions: any[],
    userId: number,
    resultTypeId?: number,
  ) {
    if (!Array.isArray(institutions) || !institutions.length) return;

    const resolvedInstitutionIds: number[] = [];

    for (const input of institutions) {
      if (!input) continue;
      // Normalize ABC to CIAT
      const normalizedName = this.normalizeInstitutionValue(input.name);
      const normalizedAcronym = this.normalizeInstitutionValue(input.acronym);
      const { institution_id } = input;
      const name = normalizedName;
      const acronym = normalizedAcronym;
      let matched: ClarisaInstitution | null = null;

      if (institution_id) {
        matched = await this._clarisaInstitutionsRepository.findOne({
          where: { id: institution_id },
        });
      }

      if (!matched && (name || acronym)) {
        const fuzzyConds = [];
        // Build flexible search conditions: if name is provided, search in both name and acronym
        // and vice versa to handle cases where users send acronym in name field or name in acronym field
        if (name) {
          fuzzyConds.push({ name: Like(`%${name}%`) });
          // Also search in acronym field using the name value (flexible matching)
          fuzzyConds.push({ acronym: Like(`%${name}%`) });
        }
        if (acronym) {
          fuzzyConds.push({ acronym: Like(`%${acronym}%`) });
          // Also search in name field using the acronym value (flexible matching)
          fuzzyConds.push({ name: Like(`%${acronym}%`) });
        }
        if (fuzzyConds.length) {
          const fuzzy = await this._clarisaInstitutionsRepository.find({
            where: fuzzyConds,
          });
          if (fuzzy?.length) matched = fuzzy[0];
        }
      }

      if (matched && !resolvedInstitutionIds.includes(matched.id)) {
        resolvedInstitutionIds.push(matched.id);
      }
    }

    if (!resolvedInstitutionIds.length) {
      this.logger.warn(
        'handleInstitutions: no institutions resolved from provided partners; skipping.',
      );
      return;
    }

    const mappedInstitutions = resolvedInstitutionIds.map((id) => ({
      institutions_id: id,
    }));

    await this._resultByIntitutionsRepository.updateInstitutions(
      resultId,
      mappedInstitutions,
      userId,
      false,
      [InstitutionRoleEnum.PARTNER],
    );

    const toPersist: ResultsByInstitution[] = [];
    for (const instId of resolvedInstitutionIds) {
      const exists =
        await this._resultByIntitutionsRepository.getResultByInstitutionExists(
          resultId,
          instId,
          InstitutionRoleEnum.PARTNER,
        );
      if (!exists) {
        const newPartner = new ResultsByInstitution();
        newPartner.created_by = userId;
        newPartner.last_updated_by = userId;
        newPartner.result_id = resultId;
        newPartner.institution_roles_id = InstitutionRoleEnum.PARTNER;
        newPartner.institutions_id = instId;
        newPartner.is_active = true;
        toPersist.push(newPartner);
      }
    }

    if (toPersist.length) {
      const savedPartners =
        await this._resultByIntitutionsRepository.save(toPersist);

      const isInnovationDevOrUse = this.isInnovationType(resultTypeId);
      if (isInnovationDevOrUse && savedPartners.length) {
        const budgets = (
          Array.isArray(savedPartners) ? savedPartners : [savedPartners]
        ).map((rbi) => {
          const budget = new ResultInstitutionsBudget();
          budget.created_by = userId;
          budget.result_institution_id = rbi.id;
          budget.is_active = true;
          return budget;
        });
        await this._resultInstitutionsBudgetRepository.save(budgets);
      }
    }
  }

  private async findScope(scope_code?: number, scope_label?: string) {
    const where = scope_code ? { id: scope_code } : { name: scope_label };
    const scope = await this._geoScopeRepository.findOne({ where });
    if (!scope) {
      throw new NotFoundException(
        `No geographic scope found for ${scope_code ? `code ${scope_code}` : `label "${scope_label}"`}`,
      );
    }
    return scope;
  }

  private validateGeoFocus(scope, regions, countries, subnational_areas) {
    const label = scope.name;

    const validators = {
      2: {
        field: regions,
        message: `Regions are required for scope "${label}".`,
      },
      4: {
        field: countries,
        message: `Countries are required for scope "${label}".`,
      },
      5: {
        field: countries?.length && subnational_areas?.length,
        message: `Countries and subnational areas are required for scope "${label}".`,
      },
    };

    const validator = validators[scope.code];
    if (validator && !validator.field)
      throw new BadRequestException(validator.message);
  }

  private async handleRegions(result: Result, scope, regions) {
    const hasRegions = Array.isArray(regions) && regions.length > 0;
    if ((!hasRegions && scope.id !== 2) || scope.id === 3 || scope.id === 4) {
      await this._resultRegionRepository.updateRegions(result.id, []);
      result.has_regions = false;
      return;
    }

    const um49codes = regions
      .map((r) => r.um49code)
      .filter((code) => code !== null && code !== undefined);
    const names = regions
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(um49codes.length ? [{ um49Code: In(um49codes) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one region identifier (um49code or name) must be provided.',
      );
    }

    const foundRegions = await this._clarisaRegionsRepository.find({
      where: whereConditions,
    });

    if (!foundRegions.length) {
      throw new NotFoundException(
        `No regions found matching the provided data (codes: ${um49codes.join(', ') || 'N/A'}, names: ${names.join(', ') || 'N/A'}).`,
      );
    }

    const regionIds = foundRegions.map((r) => r.um49Code);

    await this._resultRegionRepository.updateRegions(result.id, regionIds);
    const resultRegionArray: ResultRegion[] = [];
    for (const region of foundRegions) {
      const exist =
        await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
          result.id,
          region.um49Code,
        );

      if (!exist) {
        const newRegion = new ResultRegion();
        newRegion.region_id = region.um49Code;
        newRegion.result_id = result.id;
        resultRegionArray.push(newRegion);
      }
    }

    if (resultRegionArray.length) {
      await this._resultRegionRepository.save(resultRegionArray);
    }

    result.has_regions = true;
    result.geographic_scope_id = scope.id === 50 ? 50 : scope.id;

    await this._resultRepository.save(result);
  }

  private resolveScopeId(scopeId: number, countries?: any[]) {
    if (scopeId === 50) return 50;
    if (scopeId === 3 && countries) return countries.length > 1 ? 3 : 4;
    return scopeId;
  }

  private async handleCountries(
    result,
    countries,
    subnational_areas,
    scopeId,
    userId,
  ) {
    const hasCountries = Array.isArray(countries) && countries.length > 0;

    if (!hasCountries) {
      if (scopeId !== 3) {
        await this._resultCountryRepository.updateCountries(result.id, []);
      }
      result.has_countries = false;
      return;
    }

    const ids = countries
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = countries
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);
    const isoAlpha3s = countries
      .map((r) => r.iso_alpha_3)
      .filter((code) => code !== null && code !== undefined);
    const isoAlpha2s = countries
      .map((r) => r.iso_alpha_2)
      .filter((code) => code !== null && code !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
      ...(isoAlpha3s.length ? [{ iso_alpha_3: In(isoAlpha3s) }] : []),
      ...(isoAlpha2s.length ? [{ iso_alpha_2: In(isoAlpha2s) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one country identifier (id, name, iso_alpha_3, or iso_alpha_2) must be provided.',
      );
    }

    const foundCountries = await this._clarisaCountriesRepository.find({
      where: whereConditions,
    });

    if (!foundCountries.length) {
      throw new NotFoundException(
        `No countries found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundCountries.map((c) => c.id);

    await this._resultCountryRepository.updateCountries(
      result.id,
      foundCountryIds,
    );

    const resultCountryArray = await this.handleResultCountryArray(
      result,
      foundCountries,
    );
    await this.handleSubnationals(
      resultCountryArray,
      subnational_areas,
      scopeId,
      userId,
    );

    result.has_countries = true;
  }

  private async handleResultCountryArray(result, countries) {
    const resultCountryArray: ResultCountry[] = [];

    for (const c of countries) {
      const exist =
        await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(
          result.id,
          c.id,
        );
      if (!exist) {
        const newCountry = new ResultCountry();
        newCountry.country_id = c.id;
        newCountry.result_id = result.id;
        resultCountryArray.push(newCountry);
      }
    }

    if (resultCountryArray.length) {
      await this._resultCountryRepository.save(resultCountryArray);
    }

    return resultCountryArray;
  }

  private async handleSubnationals(
    resultCountryArray,
    subnational_areas,
    geoScopeId,
    userId,
  ) {
    if (geoScopeId !== 5) return;

    const ids = subnational_areas
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = subnational_areas
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one subnational area identifier (id or name) must be provided.',
      );
    }

    const foundSubnationalAreas =
      await this._clarisaSubnationalAreasRepository.find({
        where: whereConditions,
      });

    if (!foundSubnationalAreas.length) {
      throw new NotFoundException(
        `No subnational areas found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundSubnationalAreas.map((c) => c.code);

    await Promise.all(
      resultCountryArray.map(async (rc) => {
        await Promise.all([
          this._resultCountrySubnationalRepository.bulkUpdateSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
          this._resultCountrySubnationalRepository.upsertSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
        ]);
      }),
    );
  }
}
