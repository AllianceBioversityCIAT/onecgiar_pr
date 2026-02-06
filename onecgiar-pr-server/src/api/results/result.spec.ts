import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultRepository } from './result.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultTypesService } from './result_types/result_types.service';
import {
  HandlersError,
  ReturnResponse,
  ReturnResponseDto,
} from '../../shared/handlers/error.utils';
import { YearRepository } from './years/year.repository';
import { ResultByEvidencesRepository } from './results_by_evidences/result_by_evidences.repository';
import { ResultByIntitutionsRepository } from './results_by_institutions/result_by_intitutions.repository';
import { ResultByInitiativesRepository } from './results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsTypeRepository } from './results_by_institution_types/result_by_intitutions_type.repository';
import { ResultLevelRepository } from './result_levels/resultLevel.repository';
import { ResultByLevelRepository } from './result-by-level/result-by-level.repository';
import { ResultLegacyRepository } from './legacy-result/legacy-result.repository';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ResultRegionsService } from './result-regions/result-regions.service';
import { ResultCountriesService } from './result-countries/result-countries.service';
import { GenderTagRepository } from './gender_tag_levels/genderTag.repository';
import { ResultRegionRepository } from './result-regions/result-regions.repository';
import { ResultCountryRepository } from './result-countries/result-countries.repository';
import { ResultsKnowledgeProductsRepository } from './results-knowledge-products/repositories/results-knowledge-products.repository';
import { ElasticService } from '../../elastic/elastic.service';
import { resultValidationRepository } from './results-validation-module/results-validation-module.repository';
import { ResultsKnowledgeProductAuthorRepository } from './results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductMetadataRepository } from './results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductKeywordRepository } from './results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductAltmetricRepository } from './results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductFairScoreRepository } from './results-knowledge-products/repositories/results-knowledge-product-fair-scores.repository';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { VersioningService } from '../versioning/versioning.service';
import { ResultsInvestmentDiscontinuedOptionRepository } from './results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultInitiativeBudgetRepository } from './result_budget/repositories/result_initiative_budget.repository';
import { ResultsCenterRepository } from './results-centers/results-centers.repository';
import { InitiativeEntityMapRepository } from '../initiative_entity_map/initiative_entity_map.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';
import { returnFormatService } from '../../shared/extendsGlobalDTO/returnServices.dto';
import { Result, SourceEnum } from './entities/result.entity';
import { CreateGeneralInformationResultDto } from './dto/create-general-information-result.dto';
import { GeneralInformationDto } from './dto/general-information.dto';
import { CreateResultGeoDto } from './dto/create-result-geo-scope.dto';
import { v4 } from 'uuid';
import { ScienceProgramProgressResponseDto } from './dto/science-program-progress.dto';
import { ImpactAreasScoresComponentRepository } from './impact_areas_scores_components/repositories/impact_areas_scores_components.repository';
import { ResultsTocResultRepository } from './results-toc-results/repositories/results-toc-results.repository';
import { ResultsInnovationsDevRepository } from './summary/repositories/results-innovations-dev.repository';
import { AoWBilateralRepository } from './results-toc-results/repositories/aow-bilateral.repository';
import { ResultReviewHistoryRepository } from './result-review-history/result-review-history.repository';
import { ResultsByProjectsRepository } from './results_by_projects/results_by_projects.repository';
import { GeographicLocationService } from '../results-framework-reporting/geographic-location/geographic-location.service';
import {
  ReviewDecisionDto,
  ReviewDecisionEnum,
} from './dto/review-decision.dto';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { DataSource } from 'typeorm';
import { ResultImpactAreaScoresService } from '../result-impact-area-scores/result-impact-area-scores.service';
import { ResultsByInstitutionsService } from './results_by_institutions/results_by_institutions.service';
import { ContributorsPartnersService } from '../results-framework-reporting/contributors-partners/contributors-partners.service';
import { EvidencesService } from './evidences/evidences.service';
import { SummaryService } from './summary/summary.service';
import { InnovationDevService } from '../results-framework-reporting/innovation_dev/innovation_dev.service';
import { InnovationUseService } from '../results-framework-reporting/innovation-use/innovation-use.service';
import { ReviewUpdateDto } from './dto/review-update.dto';
import { ResultsTocResultsService } from './results-toc-results/results-toc-results.service';
import { ShareResultRequestService } from './share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from './share-result-request/share-result-request.repository';

describe('ResultsService (unit, pure mocks)', () => {
  let module: TestingModule;
  let resultService: ResultsService;
  let currentResultId: number;

  const mockResultRepository = {
    getLastResultCode: jest.fn().mockResolvedValue(100),
    save: jest.fn().mockImplementation(async (data: any) => ({
      ...data,
      id: data?.id ?? 999,
      result_code: data?.result_code ?? 101,
    })),
    getResultById: jest.fn().mockImplementation(async (id: number) => {
      if (id <= 0) return null;
      return { id: id, result_type_id: 1, status_id: 1 };
    }),
    query: jest.fn().mockResolvedValue([]),
    getPendingReviewCountByProgram: jest.fn().mockResolvedValue([]),
    getResultsByProgramAndCenters: jest.fn().mockResolvedValue([]),
    getCommonFieldsBilateralResultById: jest.fn().mockResolvedValue(null),
    getTocMetadataBilateralResult: jest.fn().mockResolvedValue([]),
    getCapacitySharingBilateralResultById: jest.fn().mockResolvedValue([]),
    getKnowledgeProductBilateralResultById: jest.fn().mockResolvedValue([]),
    getInnovationDevBilateralResultById: jest.fn().mockResolvedValue([]),
    getPolicyChangeBilateralResultById: jest.fn().mockResolvedValue([]),
    getInnovationUseBilateralResultById: jest.fn().mockResolvedValue([]),
    getEvidenceBilateralResult: jest.fn().mockResolvedValue([]),
    getContributingInitiativesBilateralResult: jest.fn().mockResolvedValue([]),
    getResultAndLevelTypeById: jest
      .fn()
      .mockImplementation(async (id: number) =>
        id > 0
          ? {
              id,
              title: `Result ${id}`,
              description: `Desc ${id}`,
              result_type_id: 1,
              result_type_name: 'Type',
              result_level_id: 1,
              result_level_name: 'Level',
              status_id: 1,
              geographic_scope_id: 2,
              has_countries: true,
              has_regions: true,
              gender_tag_level_id: 1,
              climate_change_tag_level_id: 1,
              nutrition_tag_level_id: 1,
              environmental_biodiversity_tag_level_id: 1,
              poverty_tag_level_id: 1,
              krs_url: 'https://example.org',
              is_krs: true,
              phase_name: 'Reporting',
              phase_year: 2023,
              is_discontinued: null,
            }
          : null,
      ),
    AllResults: jest.fn().mockResolvedValue([{ id: '1' }]),
    resultsForElasticSearch: jest.fn().mockResolvedValue([{}]),
    getResultByIdElastic: jest.fn(),
    transformResultCode: jest
      .fn()
      .mockResolvedValue({ transformed_code: 'R-2024-001' }),
    AllResultsByRoleUserAndInitiativeFiltered: jest
      .fn()
      .mockResolvedValue({ results: [], total: 0 }),
    AllResultsLegacyNewByTitle: jest.fn().mockResolvedValue([]),
    getResultsForInnovUse: jest.fn().mockResolvedValue([]),
    getResultDataForBasicReport: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockImplementation(async (opts: any) => {
      const id = opts?.where?.id;
      if (id === 3) return { id: '3', status_id: 2, result_type_id: 1 };
      if (id === 4)
        return { id: '4', status_id: 1, legacy_id: 123, result_type_id: 1 };
      if (id === 2)
        return {
          id: 2,
          status_id: 1,
          result_type_id: 1,
          geographic_scope_id: 2,
          has_countries: true,
          has_regions: true,
        };
      if (typeof id === 'number' && id > 0)
        return { id, status_id: 1, result_type_id: 1 };
      return null;
    }),
  } as any;

  const mockClarisaInitiativesRepository = {
    findOne: jest
      .fn()
      .mockImplementation(async ({ where: { id } }) =>
        id > 0 ? { id } : null,
      ),
    find: jest.fn().mockResolvedValue([]),
  } as any;

  const mockResultTypesService = {
    findOneResultType: jest.fn().mockImplementation(async (id: number) => ({
      status: 200,
      response: { id },
    })),
  } as any;

  const mockYearRepository = {
    findOne: jest.fn().mockResolvedValue({ active: true, year: 2023 }),
  } as any;

  const mockResultByEvidencesRepository = {
    logicalElimination: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockResultByIntitutionsRepository = {
    updateInstitutions: jest.fn().mockResolvedValue([]),
    getResultByInstitutionExists: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockImplementation(async (items: any[]) => items || []),
    logicalElimination: jest.fn().mockResolvedValue(undefined),
    getResultByInstitutionActorsFull: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
  } as any;

  const mockResultByInitiativesRepository = {
    save: jest.fn().mockResolvedValue({ id: 1 }),
    logicalElimination: jest.fn().mockResolvedValue(undefined),
    getResultByInitiativeOwnerFull: jest.fn().mockResolvedValue({ id: 1 }),
    getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 1 }),
    getContributorInitiativeByResult: jest.fn().mockResolvedValue([]),
    getPendingInit: jest.fn().mockResolvedValue([]),
    getDraftInit: jest.fn().mockResolvedValue([]),
    getContributorInitiativeAndPrimaryByResult: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ initiative_id: 1, id: 1 }),
    updateResultByInitiative: jest.fn().mockResolvedValue([]),
    query: jest.fn().mockImplementation(async (query: string, params: any[]) => {
      // Mock for getDraftInit status query
      if (query && query.includes('SELECT status_id FROM result')) {
        return [{ status_id: 1 }]; // Default status_id = 1 (not 5, so request_status_id will be 1)
      }
      // Mock for getDraftInit main query
      if (query && query.includes('FROM share_result_request')) {
        return [];
      }
      // Default return for any other query
      return [];
    }),
  } as any;

  const mockResultByIntitutionsTypeRepository = {
    save: jest.fn().mockImplementation(async (items: any[]) => items || []),
    getResultByInstitutionTypeExists: jest.fn().mockResolvedValue(false),
    logicalElimination: jest.fn().mockResolvedValue(undefined),
    getResultByInstitutionTypeActorFull: jest.fn().mockResolvedValue([]),
    updateInstitutionsType: jest
      .fn()
      .mockResolvedValue({ updated: true, removed: [], added: [] }),
  } as any;

  const mockResultLevelRepository = {
    findOne: jest
      .fn()
      .mockImplementation(async ({ where: { id } }) =>
        id > 0 ? { id } : null,
      ),
  } as any;

  const mockResultByLevelRepository = {
    getByTypeAndLevel: jest
      .fn()
      .mockImplementation(async (levelId: number, typeId: number) => ({
        result_level_id: levelId,
        result_type_id: typeId,
      })),
  } as any;

  const mockResultLegacyRepository = {
    update: jest.fn().mockResolvedValue(undefined),
    findAllResultsLegacyNew: jest.fn().mockResolvedValue([]),
  } as any;

  const mockClarisaInstitutionsRepository = {
    getAllInstitutions: jest
      .fn()
      .mockResolvedValue([{ institutions_id: 1, name: 'Inst 1' }]),
    getValidInstitution: jest.fn().mockResolvedValue([]),
  } as any;

  const mockClarisaInstitutionsTypeRepository = {
    getChildlessInstitutionTypes: jest
      .fn()
      .mockResolvedValue([{ institutions_type_id: 10, name: 'Type' }]),
    getInstitutionsType: jest
      .fn()
      .mockResolvedValue([{ institutions_type_id: 10 }]),
    getValidInstitutionType: jest.fn().mockResolvedValue([]),
  } as any;

  const mockResultRegionsService = {
    create: jest.fn().mockResolvedValue({}),
  } as any;

  const mockResultCountriesService = {
    create: jest.fn().mockResolvedValue({}),
  } as any;

  const mockGenderTagRepository = {
    findOne: jest
      .fn()
      .mockImplementation(async ({ where: { id } }) => ({ id })),
  } as any;

  const mockResultRegionRepository = {
    getResultRegionByResultId: jest
      .fn()
      .mockResolvedValue([{ result_region_id: 5 }]),
  } as any;

  const mockResultCountryRepository = {
    getResultCountriesByResultId: jest
      .fn()
      .mockResolvedValue([{ result_country_id: 8 }]),
  } as any;

  const mockResultsKnowledgeProductRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
  } as any;

  const mockElasticService = {
    getBulkElasticOperationResults: jest.fn().mockReturnValue('{}'),
    sendBulkOperationToElastic: jest.fn().mockResolvedValue(undefined),
    findForElasticSearch: jest.fn(),
  } as any;

  const mockResultValidationRepository = {
    inactiveOldInserts: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockAltmetricRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;
  const mockAuthorRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;
  const mockInstitutionRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;
  const mockKeywordRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;
  const mockMetadataRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;
  const mockFairScoreRepo = {
    statusElement: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockLogRepository = { create: jest.fn(), save: jest.fn() } as any;

  const mockVersioningService = {
    $_findActivePhase: jest.fn().mockResolvedValue({ id: 1 }),
    $_findPhase: jest.fn().mockResolvedValue({ id: 1 }),
  } as any;

  const mockReturnResponse = {
    format: jest.fn().mockImplementation((data: any) => ({
      response: data.response || {},
      message: data.message || 'Internal Server Error',
      statusCode: data.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
    })),
  } as any;

  const mockInvestmentDiscontinuedRepo = {
    inactiveData: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  } as any;

  const mockInitiativeEntityMapRepository = {
    find: jest.fn().mockResolvedValue([]),
  } as any;

  const mockRoleByUserRepository = {
    find: jest.fn().mockResolvedValue([]),
  } as any;

  const mockResultInitiativeBudgetRepository = {
    save: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockResultsCenterRepository = {
    getAllResultsCenterByResultId: jest.fn().mockResolvedValue([]),
  } as any;
  const userTest: TokenDto = {
    email: 'support@prms.pr',
    id: 1,
    first_name: 'support',
    last_name: 'prms',
  };

  const mockImpactAreasScoresComponentRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 123 }),
    find: jest
      .fn()
      .mockResolvedValue([
        { id: 201 },
        { id: 202 },
        { id: 203 },
        { id: 204 },
        { id: 205 },
      ]),
  };

  const mockResultsTocResultRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 123 }),
    getRTRPrimaryV2: jest.fn().mockResolvedValue([]),
  } as any;

  const mockResultsInnovationsDevRepository = {
    findOne: jest.fn().mockResolvedValue({ id: 123 }),
  } as any;

  const mockAoWBilateralRepository = {
    getIndicatorContributions: jest.fn().mockResolvedValue(new Map()),
  } as any;

  const mockResultReviewHistoryRepository = {
    create: jest.fn(),
    save: jest.fn().mockResolvedValue({ id: 1 }),
    createReviewHistory: jest.fn().mockResolvedValue({ id: 1 }),
  } as any;

  const mockResultsByProjectsRepository = {
    findResultsByProjectsByResultId: jest.fn().mockResolvedValue([]),
  } as any;

  const mockGeographicLocationService = {
    getGeoScopeV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: { geo_scope_id: 2 },
    }),
    saveGeoScopeV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: { geo_scope_id: 2 },
    }),
  } as any;

  const mockResultsByInstitutionsService = {
    updatePartnersV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
    getInstitutionsPartnersByResultIdV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {
        institutions: [],
      },
    }),
  } as any;

  const mockContributorsPartnersService = {
    updatePartnersV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
    updateTocMappingV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
  } as any;

  const mockEvidencesService = {
    create: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
    updateEvidencesPartial: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
  } as any;

  const mockSummaryService = {
    saveCapacityDevelopents: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
    savePolicyChanges: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
  } as any;

  const mockInnovationDevService = {
    saveInnovationDev: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
  } as any;

  const mockInnovationUseService = {
    saveInnovationUse: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {},
    }),
  } as any;

  const mockResultsTocResultsService = {
    getTocByResultV2: jest.fn().mockResolvedValue({
      status: HttpStatus.OK,
      response: {
        result_toc_result: {
          planned_result: true,
          initiative_id: 1,
          result_toc_results: [],
        },
      },
    }),
    sendEmailNotification: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockShareResultRequestService = {
    resultRequest: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockShareResultRequestRepository = {
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({}),
  } as any;

  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => {
      const manager = {
        findOne: jest.fn(),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn(),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      };
      return callback(manager);
    }),
  } as any;

  const mockResultImpactAreaScoresService = {
    validateImpactAreaScores: jest
      .fn()
      .mockImplementation(
        async (
          impactAreaIds: number | number[],
          impactAreaScoresToAdd: Array<{ impact_area_score_id: number }>,
        ) => {
          const ids = Array.isArray(impactAreaIds)
            ? impactAreaIds
            : [impactAreaIds];
          for (const id of ids) {
            if (id == null) continue;
            impactAreaScoresToAdd.push({ impact_area_score_id: Number(id) });
          }
        },
      ),
    create: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue([]),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks(); 
    
    module = await Test.createTestingModule({
      providers: [
        ResultsService,
        HandlersError,
        ReturnResponse,
        { provide: ResultRepository, useValue: mockResultRepository },
        {
          provide: ClarisaInitiativesRepository,
          useValue: mockClarisaInitiativesRepository,
        },
        { provide: ResultTypesService, useValue: mockResultTypesService },
        { provide: YearRepository, useValue: mockYearRepository },
        {
          provide: ResultByEvidencesRepository,
          useValue: mockResultByEvidencesRepository,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByIntitutionsRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockResultByIntitutionsTypeRepository,
        },
        { provide: ResultLevelRepository, useValue: mockResultLevelRepository },
        {
          provide: ResultByLevelRepository,
          useValue: mockResultByLevelRepository,
        },
        {
          provide: ResultLegacyRepository,
          useValue: mockResultLegacyRepository,
        },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: mockClarisaInstitutionsRepository,
        },
        {
          provide: ClarisaInstitutionsTypeRepository,
          useValue: mockClarisaInstitutionsTypeRepository,
        },
        { provide: ResultRegionsService, useValue: mockResultRegionsService },
        {
          provide: ResultCountriesService,
          useValue: mockResultCountriesService,
        },
        { provide: GenderTagRepository, useValue: mockGenderTagRepository },
        {
          provide: ResultRegionRepository,
          useValue: mockResultRegionRepository,
        },
        {
          provide: ResultCountryRepository,
          useValue: mockResultCountryRepository,
        },
        {
          provide: ResultsKnowledgeProductsRepository,
          useValue: mockResultsKnowledgeProductRepository,
        },
        { provide: ElasticService, useValue: mockElasticService },
        {
          provide: resultValidationRepository,
          useValue: mockResultValidationRepository,
        },
        {
          provide: ResultsKnowledgeProductAltmetricRepository,
          useValue: mockAltmetricRepo,
        },
        {
          provide: ResultsKnowledgeProductAuthorRepository,
          useValue: mockAuthorRepo,
        },
        {
          provide: ResultsKnowledgeProductInstitutionRepository,
          useValue: mockInstitutionRepo,
        },
        {
          provide: ResultsKnowledgeProductKeywordRepository,
          useValue: mockKeywordRepo,
        },
        {
          provide: ResultsKnowledgeProductMetadataRepository,
          useValue: mockMetadataRepo,
        },
        {
          provide: ResultsKnowledgeProductFairScoreRepository,
          useValue: mockFairScoreRepo,
        },
        { provide: LogRepository, useValue: mockLogRepository },
        { provide: VersioningService, useValue: mockVersioningService },
        { provide: ReturnResponse, useValue: mockReturnResponse },
        {
          provide: ResultsInvestmentDiscontinuedOptionRepository,
          useValue: mockInvestmentDiscontinuedRepo,
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: mockResultInitiativeBudgetRepository,
        },
        {
          provide: ResultsCenterRepository,
          useValue: mockResultsCenterRepository,
        },
        {
          provide: InitiativeEntityMapRepository,
          useValue: mockInitiativeEntityMapRepository,
        },
        { provide: RoleByUserRepository, useValue: mockRoleByUserRepository },
        {
          provide: ImpactAreasScoresComponentRepository,
          useValue: mockImpactAreasScoresComponentRepository,
        },
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: mockResultsInnovationsDevRepository,
        },
        {
          provide: AoWBilateralRepository,
          useValue: mockAoWBilateralRepository,
        },
        {
          provide: ResultReviewHistoryRepository,
          useValue: mockResultReviewHistoryRepository,
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: mockResultsByProjectsRepository,
        },
        {
          provide: GeographicLocationService,
          useValue: mockGeographicLocationService,
        },
        {
          provide: ResultsByInstitutionsService,
          useValue: mockResultsByInstitutionsService,
        },
        {
          provide: ContributorsPartnersService,
          useValue: mockContributorsPartnersService,
        },
        {
          provide: EvidencesService,
          useValue: mockEvidencesService,
        },
        {
          provide: SummaryService,
          useValue: mockSummaryService,
        },
        {
          provide: InnovationDevService,
          useValue: mockInnovationDevService,
        },
        {
          provide: InnovationUseService,
          useValue: mockInnovationUseService,
        },
        {
          provide: ResultsTocResultsService,
          useValue: mockResultsTocResultsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ResultImpactAreaScoresService,
          useValue: mockResultImpactAreaScoresService,
        },
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
        {
          provide: ShareResultRequestRepository,
          useValue: mockShareResultRequestRepository,
        },
        // Also provide ShareResultRequestRepository with the token name for optional injection
        {
          provide: 'ShareResultRequestRepository',
          useValue: mockShareResultRequestRepository,
        },
      ],
    }).compile();

    resultService = module.get(ResultsService);
    mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered.mockResolvedValue(
      { results: [], total: 0 },
    );
    mockClarisaInitiativesRepository.find.mockResolvedValue([]);
    mockRoleByUserRepository.find.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(resultService).toBeDefined();
  });

  it('should return all results', async () => {
    const results = await resultService.findAll();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].id).toBeDefined();
    }
  });

  it('should create a new result', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test:${v4()}`,
      handler: null,
    };
    const results: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(results.response).toBeDefined();
    const data: Result = results.response;
    currentResultId = data.id;
    expect(data.id).toBeDefined();
    expect(data.title).toBeDefined();
    expect(typeof data.title).toBe('string');
    expect(data.result_level_id).toBeDefined();
    expect(data.result_type_id).toBeDefined();
  }, 10000);

  it('should error when creating a new result with invalid title', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: null,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe(
      'Missing data: Result name, Initiative or Result type',
    );
  });

  it('should error when creating a new result with result type not allowed', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.CAPACITY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail type`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.message).toBe('Result type not allowed');
  });

  it('should error when creating a new result with invalid initiative', async () => {
    const newResult: CreateResultDto = {
      initiative_id: -1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail initiative`,
      handler: null,
    };
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Initiative Not Found');
  });

  it('should error when creating a new result with invalid result level', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: -1,
      result_name: `Result test: fail result level`,
      handler: null,
    };

    mockResultLevelRepository.findOne.mockResolvedValueOnce(null);
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Result Level not found');
  });

  it('getScienceProgramProgress includes initiatives without results', async () => {
    const initiativesSeed = [
      {
        id: 50,
        official_code: 'SP01',
        name: 'Breeding for Tomorrow',
        short_name: 'Breeding',
        portfolio_id: 3,
        obj_portfolio: { name: 'Portfolio', acronym: 'P25' },
        obj_cgiar_entity_type: { code: 101, name: 'Science Program' },
      },
      {
        id: 51,
        official_code: 'SP02',
        name: 'Sustainable Farming',
        short_name: 'Sustainable',
        portfolio_id: 3,
        obj_portfolio: { name: 'Portfolio', acronym: 'P25' },
        obj_cgiar_entity_type: { code: 102, name: 'Accelerator' },
      },
    ];
    mockClarisaInitiativesRepository.find.mockResolvedValueOnce(
      initiativesSeed,
    );
    mockRoleByUserRepository.find.mockResolvedValueOnce([
      { initiative_id: 50, role: 5 },
    ]);
    mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered.mockResolvedValueOnce(
      {
        results: [
          {
            submitter_id: 50,
            submitter: 'SP01',
            submitter_name: 'Breeding for Tomorrow',
            submitter_short_name: 'Breeding',
            portfolio_id: 3,
            portfolio_name: 'Portfolio',
            acronym: 'P25',
            role_id: 5,
            version_id: 34,
            phase_name: 'Reporting 2025 - P25',
            phase_year: 2025,
            status_id: 1,
            status_name: 'Editing',
          },
        ],
        total: 1,
      },
    );

    const result = await resultService.getScienceProgramProgress(userTest);

    expect(
      mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered,
    ).toHaveBeenCalledWith(userTest.id, { portfolioId: 3, versionId: 1 });

    const payload = result.response as ScienceProgramProgressResponseDto;

    expect(payload.mySciencePrograms).toHaveLength(1);
    expect(payload.otherSciencePrograms).toHaveLength(1);

    const mySp = payload.mySciencePrograms[0];
    expect(mySp.initiativeCode).toBe('SP01');
    expect(mySp.totalResults).toBe(1);
    expect(mySp.progress).toBe(0);
    expect(mySp.entityTypeCode).toBe(101);
    expect(mySp.entityTypeName).toBe('Science Program');
    expect(mySp.versions[0].totalResults).toBe(1);
    expect(mySp.versions[0].statuses[0]).toEqual(
      expect.objectContaining({ statusId: 1, count: 1 }),
    );

    const otherSp = payload.otherSciencePrograms[0];
    expect(otherSp.initiativeCode).toBe('SP02');
    expect(otherSp.totalResults).toBeNull();
    expect(otherSp.progress).toBe(0);
    expect(otherSp.entityTypeCode).toBe(102);
    expect(otherSp.entityTypeName).toBe('Accelerator');
    expect(otherSp.versions).toHaveLength(0);
  });

  it('should error when creating a new result with invalid result type', async () => {
    const newResult: CreateResultDto = {
      initiative_id: 1,
      result_type_id: -1,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: `Result test: fail result type`,
      handler: null,
    };
    mockResultTypesService.findOneResultType.mockResolvedValueOnce({
      status: 404,
      message: 'Result Type not found',
    });
    const response: returnFormatService = await resultService.createOwnerResult(
      newResult,
      userTest,
    );
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe('Result Type not found');
  });

  it('should return all institutions', async () => {
    const results = await resultService.getAllInstitutions();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].institutions_id).toBeDefined();
    }
  });

  it('should return all institutions type without children', async () => {
    const results = await resultService.getChildlessInstitutionTypes();
    expect(results.response).toBeDefined();
    if (results.response.length > 0) {
      expect(results.response[0].institutions_type_id).toBeDefined();
    }
  });

  it('should create a new result general information', async () => {
    const resultId = 2;
    const resultDescription: string = `Change description test 01: ${v4()}`;
    const resultTitle: string = `Policy Change Test: ${v4()}`;
    const newResult: CreateGeneralInformationResultDto = {
      result_id: resultId,
      initiative_id: 1,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
      result_name: resultTitle,
      result_description: resultDescription,
      gender_tag_id: 3,
      gender_impact_area_id: 201,
      climate_change_tag_id: 3,
      climate_impact_area_id: 202,
      nutrition_tag_level_id: 3,
      nutrition_impact_area_id: 203,
      environmental_biodiversity_tag_level_id: 3,
      environmental_biodiversity_impact_area_id: 204,
      poverty_tag_level_id: 3,
      poverty_impact_area_id: 205,
      institutions: [],
      institutions_type: [],
      krs_url: `https://ciat.org/${v4()}`,
      is_krs: true,
      lead_contact_person: 'John Doe',
      is_discontinued: false,
      discontinued_options: [],
    };
    const results: returnFormatService =
      await resultService.createResultGeneralInformation(newResult, userTest);
    expect(results.response).toBeDefined();
    const updated = (results.response as any).updateResult || results.response;
    expect(updated.id).toBeDefined();
    expect(updated.title).toBe(resultTitle);
    expect(updated.description).toBe(resultDescription);
  }, 20000);

  it('should delete a result', async () => {
    const results: returnFormatService = await resultService.deleteResult(
      currentResultId,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(currentResultId);
    expect(results.message).toBe('The result has been successfully deleted');
    expect(results.status).toBe(HttpStatus.OK);
  }, 20000);

  it('should error when deleting a result with invalid id', async () => {
    const results: returnFormatService = await resultService.deleteResult(
      -1,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBeUndefined();
    expect(results.message).toBe('The result does not exist');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should error when deleting a result with quality assessment', async () => {
    const resultQA: number = 3;
    const results: returnFormatService = await resultService.deleteResult(
      resultQA,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(resultQA.toString());
    expect(results.message).toBe('Is already Quality Assessed');
    expect(results.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('should delete a legacy result', async () => {
    const tempCurrentId: number = 4;
    const results: returnFormatService = await resultService.deleteResult(
      tempCurrentId,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.id).toBe(tempCurrentId.toString());
    expect(results.message).toBe('The result has been successfully deleted');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should return all results again', async () => {
    const results = await resultService.findAll();
    expect(results.response).toBeDefined();
    expect(results.response[0].id).toBeDefined();
  });

  it('should return a result by id', async () => {
    const resultId = 2;
    const results = await resultService.findResultById(resultId);
    expect(results.response).toBeDefined();
    const resData = <Result>results.response;
    expect(resData.id).toBe(resultId);
  });

  it('should error when send an invalid id', async () => {
    const resultId = -1;
    const results = await resultService.findResultById(resultId);
    expect(results.message).toBe('Results Not Found');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return all results legacy new', async () => {
    const title = 'Assessment of the pote';
    (mockResultRepository as any).AllResultsLegacyNewByTitle = jest
      .fn()
      .mockResolvedValue([{ id: '10' }]);
    const results = await resultService.findAllResultsLegacyNew(title);
    expect(results.response).toBeDefined();
    expect(results.response[0].id).toBeDefined();
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should error when not found legacy result', async () => {
    const title = 'Error title Test: -1';
    (mockResultRepository as any).AllResultsLegacyNewByTitle = jest
      .fn()
      .mockResolvedValue([]);
    const results = await resultService.findAllResultsLegacyNew(title);
    expect(results.message).toBe('Results Not Found');
    expect(results.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should return general information', async () => {
    const resultId = 2;
    const results = <ReturnResponseDto<GeneralInformationDto>>(
      await resultService.getGeneralInformation(resultId)
    );
    expect(results.response).toBeDefined();
    expect(results.response.result_id).toBe(resultId);
    expect(results.response.climate_change_tag_id).toBeDefined();
    expect(results.response.is_krs).toBeDefined();
    expect(typeof results.response.krs_url).toBe('string');
    expect(typeof results.response.result_name).toBe('string');
    expect(typeof results.response.result_description).toBe('string');
    expect(results.message).toBe('Successful response');
    expect((results as returnFormatService).status).toBe(HttpStatus.OK);
  });

  it('should error when not found general information', async () => {
    const resultId = -1;
    const results = await resultService.getGeneralInformation(resultId);
    expect(results.message).toBe('Results Not Found');
    expect((results as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
  });

  it('should save a new geo scope', async () => {
    const saveGeoScope: CreateResultGeoDto = {
      countries: [{ id: 4 }, { id: 8 }],
      has_countries: true,
      regions: [{ id: 5 }, { id: 2 }],
      has_regions: true,
      result_id: 2,
      geo_scope_id: 2,
    };
    const results: returnFormatService = await resultService.saveGeoScope(
      saveGeoScope,
      userTest,
    );
    expect(results.response).toBeDefined();
    expect(results.response.result_id).toBe(saveGeoScope.result_id);
    expect(results.response.geo_scope_id).toBe(saveGeoScope.geo_scope_id);
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should get a geo scope', async () => {
    const resultId = 2;
    const results: returnFormatService =
      await resultService.getGeoScope(resultId);
    expect(results.response).toBeDefined();
    expect(results.response.regions).toBeDefined();
    if (results.response.regions.length > 0) {
      expect(results.response.regions[0].result_region_id).toBeDefined();
    }
    expect(results.message).toBe('Successful response');
    expect(results.status).toBe(HttpStatus.OK);
  });

  it('should map geo_scope_id to 3 when result.geographic_scope_id is 3 or 4', async () => {
    (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
      id: 222,
      result_type_id: 1,
      status_id: 1,
      geographic_scope_id: 3,
      has_countries: false,
      has_regions: true,
    });
    let res = (await resultService.getGeoScope(222)) as returnFormatService;
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response.geo_scope_id).toBe(3);

    (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
      id: 223,
      result_type_id: 1,
      status_id: 1,
      geographic_scope_id: 4,
      has_countries: true,
      has_regions: true,
    });
    res = (await resultService.getGeoScope(223)) as returnFormatService;
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response.geo_scope_id).toBe(3);
  });

  it('should map geo_scope_id to 50 when result.geographic_scope_id is 50', async () => {
    (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
      id: 224,
      result_type_id: 1,
      status_id: 1,
      geographic_scope_id: 50,
      has_countries: true,
      has_regions: false,
    });
    const res = (await resultService.getGeoScope(224)) as returnFormatService;
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response.geo_scope_id).toBe(50);
  });

  it('should return 404 when geoscope result not found', async () => {
    (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
      null,
    );
    const res = await resultService.getGeoScope(-99);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.message).toBe('Results Not Found');
  });

  it('should get basic report data', async () => {
    (mockResultRepository as any).getResultDataForBasicReport = jest
      .fn()
      .mockResolvedValue([{ id: 1 }]);
    const res = await resultService.getResultDataForBasicReport(
      new Date('2023-01-01'),
      new Date('2023-12-31'),
    );
    expect(res.status).toBe(HttpStatus.OK);
    expect(Array.isArray(res.response)).toBe(true);
  });

  it('should transform result code (success)', async () => {
    (
      mockResultRepository.transformResultCode as jest.Mock
    ).mockResolvedValueOnce({
      id: 10,
      code: 1001,
    });
    const res = await resultService.transformResultCode(1001, 1);
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(res.response).toBeDefined();
  });

  it('should return not found when transforming unknown result code', async () => {
    (
      mockResultRepository.transformResultCode as jest.Mock
    ).mockResolvedValueOnce(null);
    const res = await resultService.transformResultCode(9999, 1);
    expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
  });

  it('should run versioningResultsById and log', async () => {
    (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
      id: 7,
      result_code: 7007,
    });
    await resultService.versioningResultsById(7, userTest);
  });

  it('should get centers by result id', async () => {
    (
      mockResultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
    ).mockResolvedValueOnce([{ id: 1, center: 'ABC' }]);
    const res = await resultService.getCenters(2);
    expect(res.statusCode).toBe(HttpStatus.OK);
    expect(Array.isArray(res.response)).toBe(true);
  });

  it('should handle error when getting centers', async () => {
    (
      mockResultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
    ).mockRejectedValueOnce(new Error('boom'));
    const res = await resultService.getCenters(2);
    expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('findAllByRoleFiltered returns paginated items and parses filters as arrays', async () => {
    const items = [
      {
        id: 1,
        title: 'Res 1',
        submitter_id: 100,
      },
    ];
    (
      mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered as jest.Mock
    ).mockResolvedValueOnce({ results: items, total: 15 });

    const query: Record<string, any> = {
      initiative: 'I1,I2',
      version_id: '1,2',
      submitter: '10',
      result_type: '3',
      portfolio: '5',
      status_id: '1,2',
      page: '2',
      limit: '10',
    };

    const res = await resultService.findAllByRoleFiltered(7, query);
    expect(res.status).toBe(HttpStatus.OK);
    const payload: any = res.response as any;
    expect(payload.items).toHaveLength(1);
    expect(payload.meta.total).toBe(15);
    expect(payload.meta.page).toBe(2);
    expect(payload.meta.limit).toBe(10);
    expect(payload.meta.totalPages).toBe(Math.ceil(15 / 10));

    const call = (
      mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered as jest.Mock
    ).mock.calls.pop();
    expect(call[0]).toBe(7);
    expect(call[1]).toEqual({
      initiativeCode: ['I1', 'I2'],
      versionId: [1, 2],
      submitterId: [10],
      resultTypeId: [3],
      portfolioId: [5],
      statusId: [1, 2],
    });
    expect(call[3]).toEqual({ limit: 10, offset: 10 });
  });

  it('findAllByRoleFiltered returns NOT_FOUND when no items', async () => {
    (
      mockResultRepository.AllResultsByRoleUserAndInitiativeFiltered as jest.Mock
    ).mockResolvedValueOnce({ results: [], total: 0 });

    const res = await resultService.findAllByRoleFiltered(1, {});
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    expect(res.message).toBe('Results Not Found');
  });

  it('getPendingReviewCount returns count successfully', async () => {
    (
      mockResultRepository.getPendingReviewCountByProgram as jest.Mock
    ).mockResolvedValueOnce([
      { level: 'TOTAL', pending_review: 5 },
      { level: 'CENTER', center_id: 'CT01', pending_review: 3 },
      { level: 'CENTER', center_id: 'CT02', pending_review: 2 },
    ]);

    const res = await resultService.getPendingReviewCount('SP01');
    expect(res.status).toBe(HttpStatus.OK);
    const response = res.response as any;
    expect(response.programId).toBe('SP01');
    expect(response.total_pending_review).toBe(5);
    expect(response.by_center).toHaveLength(2);
  });

  it('getPendingReviewCount returns error when programId is empty', async () => {
    const res = await resultService.getPendingReviewCount('');
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    expect(res.message).toBe('The programId parameter is required.');
  });

  it('getResultsByProgramAndCenters returns results grouped by project', async () => {
    const mockResults = [
      {
        id: 1,
        project_id: 10,
        project_name: 'Project 1',
        result_code: 1001,
        result_title: 'Result 1',
        indicator_category: 'Category 1',
        status_name: 'Submitted',
        acronym: 'P1',
        toc_title: 'TOC Title 1',
        indicator: 'Indicator 1',
        submission_date: new Date(),
      },
      {
        id: 2,
        project_id: 10,
        project_name: 'Project 1',
        result_code: 1002,
        result_title: 'Result 2',
        indicator_category: 'Category 2',
        status_name: 'Submitted',
        acronym: 'P1',
        toc_title: 'TOC Title 2',
        indicator: 'Indicator 2',
        submission_date: new Date(),
      },
    ];

    (
      mockResultRepository.getResultsByProgramAndCenters as jest.Mock
    ).mockResolvedValueOnce(mockResults);

    const res = await resultService.getResultsByProgramAndCenters('SP01');
    expect((res as returnFormatService).status).toBe(HttpStatus.OK);
    expect(Array.isArray(res.response)).toBe(true);
    if (Array.isArray(res.response)) {
      expect(res.response[0].project_id).toBe(10);
      expect(res.response[0].results).toHaveLength(2);
    }
  });

  it('getResultsByProgramAndCenters returns error when programId is empty', async () => {
    const res = await resultService.getResultsByProgramAndCenters('');
    expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('getBilateralResultById returns result successfully', async () => {
    const mockResult = {
      id: 100,
      result_type_id: 1,
      source: SourceEnum.Bilateral,
    };

    const mockCommonFields = {
      project_name: 'Test Project',
      center_name: 'Test Center',
      result_code: 1001,
    };

    const mockTocMetadata = [{ planned_result: 1, acronym: 'WP1' }];
    const mockCenters = [{ id: 1, center: 'CT01' }];
    const mockProjects = [{ project_id: 10 }];
    const mockEvidence = [{ link: 'https://example.com' }];
    const mockResultTypeResponse = [{ policy_type_id: 1 }];

    (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(
      mockResult,
    );
    (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
      id: 100,
      result_type_id: 1,
      status_id: 1,
    });
    (
      mockResultByInitiativesRepository.getOwnerInitiativeByResult as jest.Mock
    ).mockResolvedValueOnce({ id: 1 });
    (
      mockResultsTocResultRepository.getRTRPrimaryV2 as jest.Mock
    ).mockResolvedValueOnce([]);
    (
      mockResultRepository.getCommonFieldsBilateralResultById as jest.Mock
    ).mockResolvedValueOnce(mockCommonFields);
    (
      mockResultsTocResultsService.getTocByResultV2 as jest.Mock
    ).mockResolvedValueOnce({
      status: HttpStatus.OK,
      response: {
        result_toc_result: mockTocMetadata,
      },
    });
    (
      mockResultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
    ).mockResolvedValueOnce(mockCenters);
    (
      mockResultsByProjectsRepository.findResultsByProjectsByResultId as jest.Mock
    ).mockResolvedValueOnce(mockProjects);
    (
      mockResultRepository.getEvidenceBilateralResult as jest.Mock
    ).mockResolvedValueOnce(mockEvidence);
    (
      mockResultRepository.getPolicyChangeBilateralResultById as jest.Mock
    ).mockResolvedValueOnce(mockResultTypeResponse);
    (
      mockResultsKnowledgeProductRepository.findOne as jest.Mock
    ).mockResolvedValueOnce(null);
    (mockResultByIntitutionsRepository.find as jest.Mock).mockResolvedValueOnce(
      [],
    );
    (
      mockResultRepository.getContributingInitiativesBilateralResult as jest.Mock
    ).mockResolvedValueOnce([]);
    (
      mockGeographicLocationService.getGeoScopeV2 as jest.Mock
    ).mockResolvedValueOnce({
      status: HttpStatus.OK,
      response: { geo_scope_id: 2 },
    });
    (
      mockResultsByInstitutionsService.getInstitutionsPartnersByResultIdV2 as jest.Mock
    ).mockResolvedValueOnce({
      status: HttpStatus.OK,
      response: {
        institutions: [],
      },
    });
    (
      mockResultByInitiativesRepository.getContributorInitiativeByResult as jest.Mock
    ).mockResolvedValueOnce([]);
    // Mock getPendingInit - the mock is already configured in the mock object definition
    // No need to reconfigure it here since it's already set up with mockImplementation
    // The mock will intercept the call and return [] without executing the real method
    (
      mockResultByInitiativesRepository.getContributorInitiativeAndPrimaryByResult as jest.Mock
    ).mockResolvedValueOnce([]);

    const res = await resultService.getBilateralResultById(100);
    expect(res).toMatchObject({ status: HttpStatus.OK });
    expect(res.response.commonFields).toBeDefined();
    expect(res.response.tocMetadata).toBeDefined();
  });

  it('getBilateralResultById returns error when result not found', async () => {
    (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

    const res = await resultService.getBilateralResultById(999);
    expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
    expect((res as returnFormatService).message).toBe(
      'Bilateral result not found',
    );
  });

  it('getBilateralResultById returns error when resultId is invalid', async () => {
    const res = await resultService.getBilateralResultById(-1);
    expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('reviewBilateralResult approves result successfully', async () => {
    const mockResult = {
      id: 100,
      status_id: ResultStatusData.PendingReview.value,
      source: SourceEnum.Bilateral,
    };

    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.APPROVE,
    };

    mockDataSource.transaction.mockImplementationOnce(async (callback) => {
      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(mockResult),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockReturnValue({ id: 1 }),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      };
      return callback(manager);
    });

    // Mock ShareResultRequestRepository.find for approved case
    mockShareResultRequestRepository.find.mockResolvedValueOnce([]);

    const res = await resultService.reviewBilateralResult(
      100,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.OK);
    expect((res as returnFormatService).message).toContain('approved');
  });

  it('reviewBilateralResult rejects result successfully', async () => {
    const mockResult = {
      id: 100,
      status_id: ResultStatusData.PendingReview.value,
      source: SourceEnum.Bilateral,
    };

    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.REJECT,
      justification: 'Does not meet quality standards',
    };

    mockDataSource.transaction.mockImplementationOnce(async (callback) => {
      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(mockResult),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        create: jest.fn().mockReturnValue({ id: 1 }),
        save: jest.fn().mockResolvedValue({ id: 1 }),
      };
      return callback(manager);
    });

    // Mock ShareResultRequestRepository.update for rejected case
    mockShareResultRequestRepository.update.mockResolvedValueOnce({
      affected: 1,
    });

    const res = await resultService.reviewBilateralResult(
      100,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.OK);
    expect((res as returnFormatService).message).toContain('rejected');
  });

  it('reviewBilateralResult returns error when resultId is invalid', async () => {
    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.APPROVE,
    };

    const res = await resultService.reviewBilateralResult(
      -1,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('reviewBilateralResult returns error when justification is missing for REJECT', async () => {
    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.REJECT,
    };

    const res = await resultService.reviewBilateralResult(
      100,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
    expect((res as returnFormatService).message).toContain(
      'Justification is required',
    );
  });

  it('reviewBilateralResult returns error when result not found', async () => {
    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.APPROVE,
    };

    mockDataSource.transaction.mockImplementationOnce(async (callback) => {
      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      return callback(manager);
    });

    const res = await resultService.reviewBilateralResult(
      999,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
    expect((res as returnFormatService).message).toContain(
      'Bilateral result not found',
    );
  });

  it('reviewBilateralResult returns error when status is not PENDING_REVIEW', async () => {
    const mockResult = {
      id: 100,
      status_id: ResultStatusData.Submitted.value,
      source: SourceEnum.Bilateral,
    };

    const reviewDecision: ReviewDecisionDto = {
      decision: ReviewDecisionEnum.APPROVE,
    };

    mockDataSource.transaction.mockImplementationOnce(async (callback) => {
      const manager = {
        findOne: jest.fn().mockResolvedValueOnce(mockResult),
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };
      return callback(manager);
    });

    const res = await resultService.reviewBilateralResult(
      100,
      reviewDecision,
      userTest,
    );
    expect((res as returnFormatService).status).toBe(HttpStatus.CONFLICT);
    expect((res as returnFormatService).message).toContain(
      'Cannot review result',
    );
  });

  describe('getAllInstitutions', () => {
    it('should return all institutions successfully', async () => {
      const mockInstitutions = [
        { institutions_id: 1, name: 'Institution 1' },
        { institutions_id: 2, name: 'Institution 2' },
      ];
      (
        mockClarisaInstitutionsRepository.getAllInstitutions as jest.Mock
      ).mockResolvedValueOnce(mockInstitutions);

      const res = await resultService.getAllInstitutions();
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockInstitutions);
    });

    it('should return error when no institutions found', async () => {
      (
        mockClarisaInstitutionsRepository.getAllInstitutions as jest.Mock
      ).mockResolvedValueOnce([]);

      const res = await resultService.getAllInstitutions();
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('getChildlessInstitutionTypes', () => {
    it('should return childless institution types successfully', async () => {
      const mockTypes = [
        { institutions_type_id: 1, name: 'Type 1' },
        { institutions_type_id: 2, name: 'Type 2' },
      ];
      (
        mockClarisaInstitutionsTypeRepository.getChildlessInstitutionTypes as jest.Mock
      ).mockResolvedValueOnce(mockTypes);

      const res = await resultService.getChildlessInstitutionTypes();
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockTypes);
    });
  });

  describe('getAllInstitutionsType', () => {
    it('should return all institution types successfully', async () => {
      const mockTypes = [
        { institutions_type_id: 1, name: 'Type 1' },
        { institutions_type_id: 2, name: 'Type 2' },
      ];
      (
        mockClarisaInstitutionsTypeRepository.getInstitutionsType as jest.Mock
      ).mockResolvedValueOnce(mockTypes);

      const res = await resultService.getAllInstitutionsType();
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockTypes);
    });

    it('should return error when no institution types found', async () => {
      (
        mockClarisaInstitutionsTypeRepository.getInstitutionsType as jest.Mock
      ).mockResolvedValueOnce([]);

      const res = await resultService.getAllInstitutionsType();
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should call with legacy parameter', async () => {
      const mockTypes = [{ institutions_type_id: 1, name: 'Type 1' }];
      (
        mockClarisaInstitutionsTypeRepository.getInstitutionsType as jest.Mock
      ).mockResolvedValueOnce(mockTypes);

      const res = await resultService.getAllInstitutionsType(true);
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect(
        mockClarisaInstitutionsTypeRepository.getInstitutionsType,
      ).toHaveBeenCalledWith(true);
    });
  });

  describe('findForElasticSearch', () => {
    it('should call elastic service with correct parameters', async () => {
      const documentName = 'results';
      const id = '123';
      (
        mockElasticService.findForElasticSearch as jest.Mock
      ).mockResolvedValueOnce({ hits: [] });

      await resultService.findForElasticSearch(documentName, id);
      expect(mockElasticService.findForElasticSearch).toHaveBeenCalledWith(
        documentName,
        id,
      );
    });

    it('should call elastic service without id', async () => {
      const documentName = 'results';
      (
        mockElasticService.findForElasticSearch as jest.Mock
      ).mockResolvedValueOnce({ hits: [] });

      await resultService.findForElasticSearch(documentName);
      expect(mockElasticService.findForElasticSearch).toHaveBeenCalledWith(
        documentName,
        undefined,
      );
    });
  });

  describe('findAllSimplified', () => {
    it('should return simplified results successfully', async () => {
      const mockResults = [{ id: 1, title: 'Result 1' }];
      (mockResultRepository.resultsForElasticSearch as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(mockResults);

      const res = await resultService.findAllSimplified();
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockResults);
    });

    it('should call with id and allowDeleted parameters', async () => {
      const mockResults = [{ id: 1, title: 'Result 1' }];
      (mockResultRepository.resultsForElasticSearch as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(mockResults);

      await resultService.findAllSimplified('123', true);
      expect(mockResultRepository.resultsForElasticSearch).toHaveBeenCalledWith(
        '123',
        true,
      );
    });
  });

  describe('getGeoScope', () => {
    it('should return geo scope successfully', async () => {
      const mockResult = {
        id: 100,
        geographic_scope_id: 1,
        has_countries: true,
        has_regions: true,
      };
      const mockRegions = [{ region_id: 1 }];
      const mockCountries = [{ country_id: 1 }];

      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        mockResult,
      );
      (
        mockResultRegionRepository.getResultRegionByResultId as jest.Mock
      ).mockResolvedValueOnce(mockRegions);
      (
        mockResultCountryRepository.getResultCountriesByResultId as jest.Mock
      ).mockResolvedValueOnce(mockCountries);
      (
        mockResultsKnowledgeProductRepository.findOneBy as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.getGeoScope(100);
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response.geo_scope_id).toBe(1);
      expect((res as returnFormatService).response.regions).toEqual(
        mockRegions,
      );
      expect((res as returnFormatService).response.countries).toEqual(
        mockCountries,
      );
    });

    it('should return error when result not found', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const res = await resultService.getGeoScope(100);
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
      expect((res as returnFormatService).message).toBe('Results Not Found');
    });

    it('should handle geographic_scope_id 3 and 4 as scope 3', async () => {
      const mockResult = {
        id: 100,
        geographic_scope_id: 3,
        has_countries: true,
        has_regions: true,
      };
      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        mockResult,
      );
      (
        mockResultRegionRepository.getResultRegionByResultId as jest.Mock
      ).mockResolvedValueOnce([]);
      (
        mockResultCountryRepository.getResultCountriesByResultId as jest.Mock
      ).mockResolvedValueOnce([]);
      (
        mockResultsKnowledgeProductRepository.findOneBy as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.getGeoScope(100);
      expect((res as returnFormatService).response.geo_scope_id).toBe(3);
    });

    it('should handle geographic_scope_id 50', async () => {
      const mockResult = {
        id: 100,
        geographic_scope_id: 50,
        has_countries: true,
        has_regions: true,
      };
      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        mockResult,
      );
      (
        mockResultRegionRepository.getResultRegionByResultId as jest.Mock
      ).mockResolvedValueOnce([]);
      (
        mockResultCountryRepository.getResultCountriesByResultId as jest.Mock
      ).mockResolvedValueOnce([]);
      (
        mockResultsKnowledgeProductRepository.findOneBy as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.getGeoScope(100);
      expect((res as returnFormatService).response.geo_scope_id).toBe(50);
    });
  });

  describe('getCenters', () => {
    it('should return centers successfully', async () => {
      const mockCenters = [
        { id: 1, code: 'CT01', name: 'Center 1', acronym: 'C1' },
        { id: 2, code: 'CT02', name: 'Center 2', acronym: 'C2' },
      ];
      (
        mockResultsCenterRepository.getAllResultsCenterByResultId as jest.Mock
      ).mockResolvedValueOnce(mockCenters);

      const res = await resultService.getCenters(100);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual(mockCenters);
      expect(res.message).toBe('Successful response');
    });
  });

  describe('getPendingReviewCount', () => {
    it('should return pending review count successfully', async () => {
      const mockCount = [
        {
          center_id: 1,
          center_name: 'Center 1',
          pending_count: 5,
        },
      ];
      (
        mockResultRepository.getPendingReviewCountByProgram as jest.Mock
      ).mockResolvedValueOnce(mockCount);

      const res = await resultService.getPendingReviewCount('CRP1');
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toBeDefined();
    });

    it('should return error when programId is empty', async () => {
      const res = await resultService.getPendingReviewCount('');
      expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
      expect((res as returnFormatService).message).toContain('required');
    });

    it('should handle invalid result format', async () => {
      (
        mockResultRepository.getPendingReviewCountByProgram as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.getPendingReviewCount('CRP1');
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response.total_pending_review).toBe(
        0,
      );
    });

    it('should normalize programId to uppercase', async () => {
      const mockCount = [];
      (
        mockResultRepository.getPendingReviewCountByProgram as jest.Mock
      ).mockResolvedValueOnce(mockCount);

      await resultService.getPendingReviewCount('crp1');
      expect(
        mockResultRepository.getPendingReviewCountByProgram,
      ).toHaveBeenCalledWith('CRP1');
    });
  });

  describe('updateBilateralResultReview - additional edge cases', () => {
    const mockResult = {
      id: 100,
      status_id: ResultStatusData.PendingReview.value,
      source: SourceEnum.Bilateral,
      is_active: true,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
    };

    const mockCommonFields = {
      id: 100,
      result_description: 'Original description',
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
    };

    it('should successfully update contributingCenters', async () => {
      const reviewUpdateDto: ReviewUpdateDto = {
        commonFields: {
          id: 100,
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
        },
        contributingCenters: [{ code: '1' }] as any,
        updateExplanation: 'Updated centers',
      };

      mockDataSource.transaction.mockImplementationOnce(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValueOnce(mockResult),
          update: jest.fn(),
          create: jest.fn(),
          save: jest.fn().mockResolvedValueOnce({ id: 1 }),
        };
        return callback(manager);
      });

      (
        mockResultRepository.getCommonFieldsBilateralResultById as jest.Mock
      ).mockResolvedValueOnce(mockCommonFields);
      (
        mockContributorsPartnersService.updatePartnersV2 as jest.Mock
      ).mockResolvedValueOnce({
        status: HttpStatus.OK,
        response: {},
      });

      const res = await resultService.updateBilateralResultReview(
        100,
        reviewUpdateDto,
        userTest,
      );
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect(
        mockContributorsPartnersService.updatePartnersV2,
      ).toHaveBeenCalled();
    });

    it('should successfully update evidence', async () => {
      const reviewUpdateDto: ReviewUpdateDto = {
        commonFields: {
          id: 100,
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
        },
        evidence: [
          {
            id: '12',
            link: 'https://example.com',
            is_sharepoint: 0,
          },
        ],
        updateExplanation: 'Updated evidence',
      };

      mockDataSource.transaction.mockImplementationOnce(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValueOnce(mockResult),
          update: jest.fn(),
          create: jest.fn(),
          save: jest.fn().mockResolvedValueOnce({ id: 1 }),
        };
        return callback(manager);
      });

      (
        mockResultRepository.getCommonFieldsBilateralResultById as jest.Mock
      ).mockResolvedValueOnce(mockCommonFields);
      (
        mockEvidencesService.updateEvidencesPartial as jest.Mock
      ).mockResolvedValueOnce({
        status: HttpStatus.OK,
        response: {},
      });

      const res = await resultService.updateBilateralResultReview(
        100,
        reviewUpdateDto,
        userTest,
      );

      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect(mockEvidencesService.updateEvidencesPartial).toHaveBeenCalled();
      expect(mockEvidencesService.create).not.toHaveBeenCalled();
    });

    it('should successfully update contributingInitiatives', async () => {
      const reviewUpdateDto: ReviewUpdateDto = {
        commonFields: {
          id: 100,
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
        },
        contributingInitiatives: {
          accepted_contributing_initiatives: [{ id: 2 }],
          pending_contributing_initiatives: [],
        },
        updateExplanation: 'Updated initiatives',
      };

      mockDataSource.transaction.mockImplementationOnce(async (callback) => {
        const manager = {
          findOne: jest.fn().mockResolvedValueOnce(mockResult),
          update: jest.fn(),
          create: jest.fn(),
          save: jest.fn().mockResolvedValueOnce({ id: 1 }),
        };
        return callback(manager);
      });

      (
        mockResultRepository.getCommonFieldsBilateralResultById as jest.Mock
      ).mockResolvedValueOnce(mockCommonFields);

      // Mock ShareResultRequestRepository methods needed for _updateContributingInitiatives
      // Since pending_contributing_initiatives is empty, it will call update to deactivate all with request_status_id = 4
      mockShareResultRequestRepository.find.mockResolvedValueOnce([]);
      mockShareResultRequestRepository.update.mockResolvedValueOnce({
        affected: 0,
      });
      // Mock findOne for owner initiative (called in _updateContributingInitiatives)
      (
        mockResultByInitiativesRepository.findOne as jest.Mock
      )
        .mockResolvedValueOnce({ initiative_id: 1, is_active: true }); // Owner initiative

      const res = await resultService.updateBilateralResultReview(
        100,
        reviewUpdateDto,
        userTest,
      );
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      // _updateContributingInitiatives doesn't call updateResultByInitiative
      // It only manages share_result_request entries with request_status_id = 4
      // When pending_contributing_initiatives is empty, it calls update to deactivate all with request_status_id = 4
      // So we verify that _updateContributingInitiatives was called by checking share_result_request operations
      expect(mockShareResultRequestRepository.update).toHaveBeenCalled();
      expect(mockResultByInitiativesRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('findResultById', () => {
    it('should return result by id successfully', async () => {
      const mockResult = {
        id: 100,
        title: 'Test Result',
        result_type_id: 1,
        geographic_scope_id: 50,
        has_countries: true,
        has_regions: true,
      };
      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        mockResult,
      );

      const res = await resultService.findResultById(100);
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockResult);
    });

    it('should return error when result not found', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockReset();
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const res = await resultService.findResultById(999);
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
      expect((res as returnFormatService).message).toBe('Results Not Found');
    });
  });

  describe('transformResultCode', () => {
    it('should transform result code successfully', async () => {
      const mockTransformed = { transformed_code: 'R-2024-001' };
      (mockVersioningService.$_findPhase as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (
        mockResultRepository.transformResultCode as jest.Mock
      ).mockResolvedValueOnce(mockTransformed);

      const res = await resultService.transformResultCode(1001);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual(mockTransformed);
    });

    it('should transform result code with phase_id', async () => {
      const mockTransformed = { transformed_code: 'R-2024-001' };
      const mockPhase = { id: 5 };
      (mockVersioningService.$_findPhase as jest.Mock).mockResolvedValueOnce(
        mockPhase,
      );
      (
        mockResultRepository.transformResultCode as jest.Mock
      ).mockResolvedValueOnce(mockTransformed);

      const res = await resultService.transformResultCode(1001, 5);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockResultRepository.transformResultCode).toHaveBeenCalledWith(
        1001,
        5,
      );
    });

    it('should return error when result not found', async () => {
      (mockVersioningService.$_findPhase as jest.Mock).mockResolvedValueOnce(
        null,
      );
      (
        mockResultRepository.transformResultCode as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.transformResultCode(999);
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('getAllResultsForInnovUse', () => {
    it('should return all results for innovation use successfully', async () => {
      const mockResults = [
        { id: 1, result_type_id: ResultTypeEnum.INNOVATION_USE },
        { id: 2, result_type_id: ResultTypeEnum.INNOVATION_USE },
      ];
      (
        mockResultRepository.getResultsForInnovUse as jest.Mock
      ).mockResolvedValueOnce(mockResults);

      const res = await resultService.getAllResultsForInnovUse();
      expect((res as returnFormatService).status).toBe(200);
      expect((res as returnFormatService).response).toEqual(mockResults);
    });
  });

  describe('versioningResultsById', () => {
    it('should version result successfully', async () => {
      const mockResult = {
        id: 100,
        result_code: 1001,
        version_id: 1,
      };
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(
        mockResult,
      );

      await resultService.versioningResultsById(100, userTest);
      expect(mockResultRepository.findOne).toHaveBeenCalledWith({
        where: { id: 100 },
      });
    });
  });

  describe('findAllResultsLegacyNew', () => {
    it('should return legacy results successfully', async () => {
      const mockResults = [
        { id: 1, title: 'Legacy Result 1' },
        { id: 2, title: 'Legacy Result 2' },
      ];
      (mockResultRepository.AllResultsLegacyNewByTitle as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(mockResults);

      const res = await resultService.findAllResultsLegacyNew('test');
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockResults);
    });

    it('should return error when no results found', async () => {
      (mockResultRepository.AllResultsLegacyNewByTitle as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce([]);

      const res = await resultService.findAllResultsLegacyNew('nonexistent');
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('saveGeoScope', () => {
    it('should save geo scope successfully', async () => {
      const createResultGeo: CreateResultGeoDto = {
        result_id: 100,
        geo_scope_id: 1,
        has_countries: true,
        has_regions: true,
        regions: [{ id: 1 }, { id: 2 }],
        countries: [{ id: 3 }, { id: 4 }],
      };
      (mockResultRegionsService.create as jest.Mock).mockResolvedValueOnce({});
      (mockResultCountriesService.create as jest.Mock).mockResolvedValueOnce(
        {},
      );
      (mockResultRepository.resultsForElasticSearch as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce([{ id: 100 }]);
      (
        mockElasticService.getBulkElasticOperationResults as jest.Mock
      ).mockReturnValueOnce('{}');
      (
        mockElasticService.sendBulkOperationToElastic as jest.Mock
      ).mockResolvedValueOnce(undefined);

      const res = await resultService.saveGeoScope(createResultGeo, userTest);
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect(mockResultRegionsService.create).toHaveBeenCalled();
      expect(mockResultCountriesService.create).toHaveBeenCalled();
    });
  });

  describe('getResultDataForBasicReport', () => {
    it('should return result data for basic report successfully', async () => {
      const initDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockData = [
        { id: 1, title: 'Result 1', created_date: '2024-06-01' },
        { id: 2, title: 'Result 2', created_date: '2024-07-01' },
      ];
      (
        mockResultRepository.getResultDataForBasicReport as jest.Mock
      ).mockResolvedValueOnce(mockData);

      const res = await resultService.getResultDataForBasicReport(
        initDate,
        endDate,
      );
      expect((res as returnFormatService).status).toBe(HttpStatus.OK);
      expect((res as returnFormatService).response).toEqual(mockData);
    });
  });

  describe('createOwnerResult - additional edge cases', () => {
    it('should return error when result type is 3', async () => {
      const newResult: CreateResultDto = {
        initiative_id: 1,
        result_type_id: 3,
        result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
        result_name: 'Test Result',
        handler: null,
      };

      const res = await resultService.createOwnerResult(newResult, userTest);
      expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
      expect((res as returnFormatService).message).toContain('not allowed');
    });

    it('should return error when initiative not found', async () => {
      const newResult: CreateResultDto = {
        initiative_id: 999,
        result_type_id: ResultTypeEnum.POLICY_CHANGE,
        result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
        result_name: 'Test Result',
        handler: null,
      };
      (
        mockClarisaInitiativesRepository.findOne as jest.Mock
      ).mockImplementationOnce(async ({ where: { id } }) => {
        if (id === 999) return null;
        return id > 0 ? { id } : null;
      });

      const res = await resultService.createOwnerResult(newResult, userTest);
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
      expect((res as returnFormatService).message).toContain('Initiative');
    });

    it('should return error when result level not found', async () => {
      const newResult: CreateResultDto = {
        initiative_id: 1,
        result_type_id: ResultTypeEnum.POLICY_CHANGE,
        result_level_id: 999,
        result_name: 'Test Result',
        handler: null,
      };
      (
        mockClarisaInitiativesRepository.find as jest.Mock
      ).mockResolvedValueOnce([{ id: 1 }]);
      (mockResultLevelRepository.findOne as jest.Mock).mockResolvedValueOnce(
        null,
      );

      const res = await resultService.createOwnerResult(newResult, userTest);
      expect((res as returnFormatService).status).toBe(HttpStatus.NOT_FOUND);
      expect((res as returnFormatService).message).toContain('Level');
    });

    it('should return error when type and level are not compatible', async () => {
      const newResult: CreateResultDto = {
        initiative_id: 1,
        result_type_id: ResultTypeEnum.POLICY_CHANGE,
        result_level_id: ResultLevelEnum.INITIATIVE_OUTCOME,
        result_name: 'Test Result',
        handler: null,
      };
      (
        mockClarisaInitiativesRepository.find as jest.Mock
      ).mockResolvedValueOnce([{ id: 1 }]);
      (mockResultLevelRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 1,
      });
      (
        mockResultTypesService.findOneResultType as jest.Mock
      ).mockResolvedValueOnce({
        status: HttpStatus.OK,
        response: { id: 1 },
      });
      (
        mockResultByLevelRepository.getByTypeAndLevel as jest.Mock
      ).mockResolvedValueOnce(null);

      const res = await resultService.createOwnerResult(newResult, userTest);
      expect((res as returnFormatService).status).toBe(HttpStatus.BAD_REQUEST);
      expect((res as returnFormatService).message).toContain('compatible');
    });
  });
});
