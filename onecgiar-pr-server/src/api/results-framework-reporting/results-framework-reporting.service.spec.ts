import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { AoWBilateralRepository } from '../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultRepository } from '../results/result.repository';
import { ResultsService } from '../results/results.service';
import { ResultsKnowledgeProductsService } from '../results/results-knowledge-products/results-knowledge-products.service';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { ResultsByProjectsService } from '../results/results_by_projects/results_by_projects.service';
import { ContributionToIndicatorResultsRepository } from '../contribution-to-indicators/repositories/contribution-to-indicator-result.repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultsByInstitutionsService } from '../results/results_by_institutions/results_by_institutions.service';
import { ReportingTocContextService } from './reporting-toc-context/reporting-toc-context.service';
import { CreateResultFromFrameworkHandler } from './application/commands/create-result-from-framework/create-result-from-framework.handler';
import { CreateFrameworkResultEntityService } from './application/commands/create-result-from-framework/create-framework-result-entity.service';
import { LinkFrameworkResultTocService } from './application/commands/create-result-from-framework/link-framework-result-toc.service';
import { FrameworkResultTocIndicatorsService } from './application/commands/create-result-from-framework/framework-result-toc-indicators.service';
import { ApplyFrameworkResultAssociationsService } from './application/commands/create-result-from-framework/apply-framework-result-associations.service';
import { ResultTaggedNotificationService } from '../notification/services/result-tagged-notification.service';
import { GetExistingResultContributorsToIndicatorsHandler } from './application/queries/get-existing-result-contributors/get-existing-result-contributors.handler';
import { ExistingResultContributorsLoaderService } from './application/queries/get-existing-result-contributors/existing-result-contributors-loader.service';
import { ContributorsRoleResolverService } from './application/queries/get-existing-result-contributors/contributors-role-resolver.service';
import { TocResultsRepository } from '../../toc/toc-results/toc-results.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';

const mockClarisaInitiativesRepository = {
  findOne: jest.fn(),
};

const mockRoleByUserRepository = {
  findOne: jest.fn(),
  isUserAdmin: jest.fn(),
  find: jest.fn(),
};

const mockClarisaGlobalUnitRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockYearRepository = {
  findOne: jest.fn(),
};

const mockHandlersError = {
  returnErrorRes: jest.fn(({ error }) => ({
    response: error?.response ?? { error: true },
    message: error?.message ?? 'INTERNAL',
    status: error?.status ?? 500,
  })),
};

const mockTocResultsRepository = {
  findWorkPackagesByProgram: jest.fn(),
  findByCompositeCode: jest.fn(),
  find2030Outcomes: jest.fn(),
  findIntermediateOutcomes: jest.fn(),
  countProgramLevelOutcomes: jest.fn(),
  findResultById: jest.fn(),
  findIndicatorById: jest.fn(),
  findUnitAcronymsByProgram: jest.fn(),
  getIndicatorContributions: jest.fn(),
  findBilateralProjectById: jest.fn(),
  findBilateralProjectsByProgramOfficialCode: jest.fn(),
  findTargetsWithCentersByIndicatorId: jest.fn(),
};

const mockTocCatalogRepository = {
  getTocSynergyProgramsByResultIds: jest.fn(),
};

const defaultTocContext = {
  reportingYear: 2025,
  phaseUuid: 'PHASE-1',
};

const mockReportingTocContextService = {
  resolve: jest.fn(),
  resolveByVersionId: jest.fn(),
};

const buildTocContextError = (message: string, status: number) => {
  const error = new Error(message) as Error & {
    status: number;
    response: Record<string, unknown>;
  };
  error.status = status;
  error.response = {};
  return error;
};

const mockResultsService = {
  createOwnerResultV2: jest.fn(),
};

const mockResultsKnowledgeProductsService = {
  create: jest.fn(),
};

const mockResultsTocResultRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockResultsTocResultIndicatorsRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
};

const mockResultsIndicatorsTargetsRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockShareResultRequestService = {
  resultRequest: jest.fn(),
  findUnitAcronymsByProgram: jest.fn(),
};

const mockResultRepository = {
  getIndicatorContributionSummaryByProgram: jest.fn(),
  getActiveResultTypes: jest.fn(),
  getResultById: jest.fn(),
  findUnitAcronymsByProgram: jest.fn(),
  getUserRolesForResults: jest.fn(),
  query: jest.fn(),
};

const mockResultsByProjectsService = {
  linkBilateralProjectToResult: jest.fn(),
};

const mockContributionToIndicatorResultsRepository = {
  find: jest.fn(),
};

const mockResultTaggedNotificationService = {
  notifyTaggedCenters: jest.fn().mockResolvedValue(undefined),
  notifyTaggedBilateralProjects: jest.fn().mockResolvedValue(undefined),
};
const mockResultsByInstitutionsService = {
  handleContributingCenters: jest.fn(),
  savePartnersInstitutionsByResultV2: jest.fn(),
};

const mockDataSource = {
  query: jest.fn(),
};

// W12-R-2: default versionId resolution goes through VersioningService.$_findActivePhase
// (AppModuleIdEnum.REPORTING), never YearRepository/`year.active` — see resolveIndicatorSummaryVersionId.
const mockVersioningService = {
  $_findActivePhase: jest.fn(),
};

describe('ResultsFrameworkReportingService', () => {
  let service: ResultsFrameworkReportingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTocResultsRepository.getIndicatorContributions.mockResolvedValue(
      new Map(),
    );
    mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValue(
      [],
    );
    mockReportingTocContextService.resolve.mockImplementation(
      (yearOverride?: number) =>
        Promise.resolve({
          ...defaultTocContext,
          reportingYear: yearOverride ?? defaultTocContext.reportingYear,
        }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsFrameworkReportingService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: mockClarisaInitiativesRepository,
        },
        { provide: RoleByUserRepository, useValue: mockRoleByUserRepository },
        {
          provide: ClarisaGlobalUnitRepository,
          useValue: mockClarisaGlobalUnitRepository,
        },
        { provide: YearRepository, useValue: mockYearRepository },
        { provide: HandlersError, useValue: mockHandlersError },
        {
          provide: ReportingTocContextService,
          useValue: mockReportingTocContextService,
        },
        {
          provide: AoWBilateralRepository,
          useValue: mockTocResultsRepository,
        },
        {
          provide: TocResultsRepository,
          useValue: mockTocCatalogRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        {
          provide: VersioningService,
          useValue: mockVersioningService,
        },
        { provide: ResultsService, useValue: mockResultsService },
        {
          provide: ResultsKnowledgeProductsService,
          useValue: mockResultsKnowledgeProductsService,
        },
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        {
          provide: ResultsTocResultIndicatorsRepository,
          useValue: mockResultsTocResultIndicatorsRepository,
        },
        {
          provide: ResultsTocTargetIndicatorRepository,
          useValue: mockResultsIndicatorsTargetsRepository,
        },
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
        {
          provide: ResultsByProjectsService,
          useValue: mockResultsByProjectsService,
        },
        {
          provide: ContributionToIndicatorResultsRepository,
          useValue: mockContributionToIndicatorResultsRepository,
        },
        {
          provide: ResultTaggedNotificationService,
          useValue: mockResultTaggedNotificationService,
        },
        {
          provide: ResultsByInstitutionsService,
          useValue: mockResultsByInstitutionsService,
        },
        CreateResultFromFrameworkHandler,
        CreateFrameworkResultEntityService,
        LinkFrameworkResultTocService,
        FrameworkResultTocIndicatorsService,
        ApplyFrameworkResultAssociationsService,
        GetExistingResultContributorsToIndicatorsHandler,
        ExistingResultContributorsLoaderService,
        ContributorsRoleResolverService,
      ],
    }).compile();

    service = module.get<ResultsFrameworkReportingService>(
      ResultsFrameworkReportingService,
    );
  });

  const user = {
    id: 10,
    email: 'user@example.com',
    first_name: 'User',
    last_name: 'Example',
  } as any;

  describe('getGlobalUnitsByProgram', () => {
    beforeEach(() => {
      mockDataSource.query.mockResolvedValue([]);
      mockTocResultsRepository.countProgramLevelOutcomes.mockResolvedValue({
        intermediateCount: 0,
        eoi2030Count: 0,
      });
    });

    it('should return formatted units when all checks pass', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 5,
        official_code: 'PR-001',
        name: 'Program 1',
        short_name: 'P1',
        portfolio_id: 3,
      });
      mockTocResultsRepository.findWorkPackagesByProgram.mockResolvedValue([
        {
          id: 101,
          code: 'PR-001-A',
          name: 'Child A',
          composeCode: 'PR-001-A',
          year: 2025,
        },
      ]);
      mockTocResultsRepository.getIndicatorContributions.mockResolvedValue(
        new Map([
          [
            1,
            {
              target_value_sum: 10,
              actual_achieved_value_sum: 5,
              progress_percentage: '50%',
              work_package_acronym: 'PR-001-A',
            },
          ],
          [
            2,
            {
              target_value_sum: 0,
              actual_achieved_value_sum: 2,
              progress_percentage: '200%',
              work_package_acronym: 'PR-001-A',
            },
          ],
        ]),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-001');

      expect(mockClarisaInitiativesRepository.findOne).toHaveBeenCalledWith({
        where: { official_code: 'PR-001', active: true },
        select: ['id', 'official_code', 'name', 'short_name', 'portfolio_id'],
      });
      expect(
        mockTocResultsRepository.findWorkPackagesByProgram,
      ).toHaveBeenCalledWith('PR-001', defaultTocContext);
      expect(
        mockTocResultsRepository.getIndicatorContributions,
      ).toHaveBeenCalledWith('PR-001', defaultTocContext);

      expect(result).toMatchObject({
        status: 200,
        response: {
          initiative: {
            id: 5,
            officialCode: 'PR-001',
            name: 'Program 1',
            shortName: 'P1',
          },
          parentUnit: {
            id: 5,
            code: 'PR-001',
            level: 1,
            year: 2025,
          },
          units: [
            expect.objectContaining({
              id: 101,
              code: 'PR-001-A',
              level: 2,
              progress: 125,
              progressDetails: {
                targetValueSum: 10,
                actualAchievedValueSum: 7,
              },
            }),
          ],
          metadata: {
            activeYear: 2025,
            phaseUuid: 'PHASE-1',
            portfolio: 3,
          },
          globalProgress: {
            targetValueSum: 10,
            actualAchievedValueSum: 7,
            progressPercentage: 125,
          },
        },
      });
    });

    it('should allow admins when no membership but user is admin', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 5,
        official_code: 'PR-002',
        short_name: 'P2',
        portfolio_id: 3,
      });
      mockTocResultsRepository.findWorkPackagesByProgram.mockResolvedValue([
        {
          id: 201,
          code: 'PR-002-A',
          name: 'Child A',
          composeCode: 'PR-002-A',
          year: 2025,
        },
      ]);
      mockTocResultsRepository.getIndicatorContributions.mockResolvedValue(
        new Map(),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-002');

      expect(result.status).toBe(200);
    });

    it('should return only work packages available in the ToC catalogue', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 7,
        official_code: 'PR-010',
        name: 'Program 10',
        short_name: 'P10',
        portfolio_id: 3,
      });
      mockTocResultsRepository.findWorkPackagesByProgram.mockResolvedValue([
        {
          id: 301,
          code: 'PR-010-A',
          name: 'Child A',
          composeCode: 'PR-010-A',
          year: 2025,
        },
      ]);
      mockTocResultsRepository.getIndicatorContributions.mockResolvedValue(
        new Map(),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-010');

      expect(result.status).toBe(200);
      const respAny: any = result.response;
      expect(respAny.units).toHaveLength(1);
      expect(respAny.units[0]).toMatchObject({ code: 'PR-010-A' });
    });

    it('should return handler error when programId missing', async () => {
      const result = await service.getGlobalUnitsByProgram(user, '');
      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should map repository errors through handlers error', async () => {
      const thrown = { status: 500, message: 'unexpected' };
      mockClarisaInitiativesRepository.findOne.mockRejectedValueOnce(thrown);

      const result = await service.getGlobalUnitsByProgram(user, 'PR-003');
      expect(result.status).toBe(500);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: thrown,
        debug: true,
      });
    });
  });

  describe('getDashboardStats', () => {
    beforeEach(() => {
      mockYearRepository.findOne.mockResolvedValue({ year: 2025 });
    });

    it('should aggregate dashboard stats by status, level, and type', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 7,
        official_code: 'SP01',
        name: 'Sample Program',
      });

      mockResultRepository.query.mockResolvedValue([
        {
          status_id: 1,
          result_level_id: 4,
          result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          total_results: 4,
        },
        {
          status_id: 1,
          result_level_id: 3,
          result_type_id: ResultTypeEnum.POLICY_CHANGE,
          total_results: 1,
        },
        {
          status_id: 3,
          result_level_id: 4,
          result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
          total_results: 2,
        },
        {
          status_id: 2,
          result_level_id: 4,
          result_type_id: ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
          total_results: 3,
        },
        {
          status_id: 2,
          result_level_id: 3,
          result_type_id: ResultTypeEnum.INNOVATION_USE,
          total_results: 5,
        },
        {
          status_id: 2,
          result_level_id: 4,
          result_type_id: 999,
          total_results: 10,
        },
      ]);

      const result = await service.getDashboardStats('sp01');

      expect(mockClarisaInitiativesRepository.findOne).toHaveBeenCalledWith({
        where: { official_code: 'SP01', active: true },
        select: ['id', 'official_code', 'name'],
      });
      expect(mockYearRepository.findOne).toHaveBeenCalledWith({
        where: { active: true },
        select: ['year'],
      });
      expect(mockResultRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        [7, 2025],
      );

      expect(result).toEqual({
        response: {
          editing: {
            total: 5,
            label: 'Editing results',
            data: {
              outputs: {
                knowledgeProduct: 4,
                innovationDevelopment: 0,
                capacitySharingForDevelopment: 0,
                otherOutput: 0,
              },
              outcomes: {
                policyChange: 1,
                innovationUse: 0,
                otherOutcome: 0,
                innovationUseIpsr: 0,
              },
            },
          },
          submitted: {
            total: 2,
            label: 'Submitted results',
            data: {
              outputs: {
                knowledgeProduct: 0,
                innovationDevelopment: 2,
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
          },
          qualityAssessed: {
            total: 8,
            label: 'Quality assessed results',
            data: {
              outputs: {
                knowledgeProduct: 0,
                innovationDevelopment: 0,
                capacitySharingForDevelopment: 3,
                otherOutput: 0,
              },
              outcomes: {
                policyChange: 0,
                innovationUse: 5,
                otherOutcome: 0,
                innovationUseIpsr: 0,
              },
            },
          },
        },
        message: 'Dashboard stats retrieved successfully.',
        status: 200,
      });
    });

    it('should return bad request error when programId is missing', async () => {
      const result = await service.getDashboardStats('   ');

      expect(result.status).toBe(400);
      expect(result.message).toBe(
        'The program identifier is required in the query params.',
      );
    });

    it('should return not found error when program does not exist', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.getDashboardStats('SP-404');

      expect(result.status).toBe(404);
      expect(result.message).toBe(
        'No initiative was found with the provided program identifier.',
      );
    });
  });

  describe('getWorkPackagesByProgramAndArea', () => {
    beforeEach(() => {
      mockTocResultsRepository.findByCompositeCode.mockReset();
      mockTocResultsRepository.findTargetsWithCentersByIndicatorId.mockReset();
      mockTocResultsRepository.findTargetsWithCentersByIndicatorId.mockResolvedValue(
        [],
      );
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockReset();
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValue(
        [],
      );
    });

    it('should attach contributing_synergy_program_initiative_ids (P2-3114)', async () => {
      const tocContext = { reportingYear: 2024, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          toc_result_id: 42,
          category: 'OUTPUT',
          result_title: 'Result with SP',
          related_node_id: 'NODE-SP',
          indicators: [],
        },
      ]);
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValueOnce(
        [
          { toc_result_id: 42, initiative_id: 101 },
          { toc_result_id: 42, initiative_id: 102 },
        ],
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP01',
        'AOW01',
        '2024',
      );

      expect(
        mockTocCatalogRepository.getTocSynergyProgramsByResultIds,
      ).toHaveBeenCalledWith([42], 'PHASE-1');
      expect(
        result.response.tocResultsOutputs[0]
          .contributing_synergy_program_initiative_ids,
      ).toEqual([101, 102]);
    });

    it('should keep center_acronym from disaggregated indicator rows', async () => {
      const tocContext = { reportingYear: 2024, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          toc_result_id: 10,
          category: 'OUTPUT',
          result_title: 'Result with centers',
          related_node_id: 'NODE-1',
          indicators: [
            {
              indicator_id: 100,
              indicator_description: 'Number of farmers trained',
              center_id: 1,
              center_acronym: 'CIP',
            },
            {
              indicator_id: 100,
              indicator_description: 'Number of farmers trained',
              center_id: 2,
              center_acronym: 'IRRI',
            },
          ],
        },
      ]);
      mockTocResultsRepository.findTargetsWithCentersByIndicatorId.mockResolvedValue(
        [
          {
            toc_indicator_target_id: 1,
            year: 2025,
            target_value: 10,
            number_target: '10',
            centers: [
              {
                center_id: 1,
                center_acronym: 'CIP',
                center_name: 'International Potato Center',
              },
              {
                center_id: 2,
                center_acronym: 'IRRI',
                center_name: 'International Rice Research Institute',
              },
            ],
          },
        ],
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP01',
        'AOW01',
        '2024',
      );

      expect(result.response.tocResultsOutputs[0].indicators).toEqual([
        expect.objectContaining({
          indicator_id: 100,
          center_id: 1,
          center_acronym: 'CIP',
        }),
        expect.objectContaining({
          indicator_id: 100,
          center_id: 2,
          center_acronym: 'IRRI',
        }),
      ]);
      expect(
        result.response.tocResultsOutputs[0].indicators[0].center_acronyms,
      ).toBeUndefined();
    });

    it('should return work packages when repository returns data', async () => {
      const tocContext = { reportingYear: 2024, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          id: 1,
          category: 'OUTPUT',
          result_title: 'Result 1',
          related_node_id: 'NODE-1',
          indicators: [
            {
              id: 100,
              indicator_description: 'Indicator 1',
              toc_result_indicator_id: 'TRI-1',
              related_node_id: 'NODE-1-IND',
              unit_meassurament: 'km',
              type_value: null,
              type_name: null,
              location: null,
              target_value_sum: 5,
            },
          ],
        },
      ]);

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP01',
        'AOW01',
        '2024',
      );

      expect(mockReportingTocContextService.resolve).toHaveBeenCalledWith(2024);
      expect(mockTocResultsRepository.findByCompositeCode).toHaveBeenCalledWith(
        'SP01',
        'SP01-AOW01',
        tocContext,
      );
      expect(result).toMatchObject({
        status: 200,
        response: {
          compositeCode: 'SP01-AOW01',
          year: 2024,
          tocResultsOutcomes: [],
          tocResultsOutputs: [
            {
              id: 1,
              category: 'OUTPUT',
              result_title: 'Result 1',
              related_node_id: 'NODE-1',
            },
          ],
          metadata: {
            total: 1,
            outcomes: 0,
            outputs: 1,
          },
        },
      });
    });

    it('should handle optional year when not provided', async () => {
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          id: 2,
          category: 'OUTPUT',
          result_title: 'Result 2',
          related_node_id: null,
          indicators: [],
        },
      ]);

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'sp02',
        'aow03',
      );

      expect(mockReportingTocContextService.resolve).toHaveBeenCalledWith(
        undefined,
      );
      expect(mockTocResultsRepository.findByCompositeCode).toHaveBeenCalledWith(
        'SP02',
        'SP02-AOW03',
        defaultTocContext,
      );
      expect(result.response.year).toBe(2025);
    });

    it('should return handler error when parameters are missing', async () => {
      const result: any = await service.getWorkPackagesByProgramAndArea('', '');
      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(mockReportingTocContextService.resolve).not.toHaveBeenCalled();
    });

    it('should return handler error when repository yields empty result', async () => {
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([]);

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP03',
        'AOW05',
      );

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should return handler error when active year is not configured', async () => {
      mockReportingTocContextService.resolve.mockRejectedValueOnce(
        buildTocContextError('No active reporting year was found.', 404),
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP03',
        'AOW06',
      );

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 404,
          message: 'No active reporting year was found.',
        }),
        debug: true,
      });
      expect(
        mockTocResultsRepository.findByCompositeCode,
      ).not.toHaveBeenCalled();
    });

    it('should return handler error when active year is invalid', async () => {
      mockReportingTocContextService.resolve.mockRejectedValueOnce(
        buildTocContextError(
          'The active reporting year configured is invalid.',
          500,
        ),
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP03',
        'AOW07',
      );

      expect(result.status).toBe(500);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 500,
          message: 'The active reporting year configured is invalid.',
        }),
        debug: true,
      });
      expect(
        mockTocResultsRepository.findByCompositeCode,
      ).not.toHaveBeenCalled();
    });

    it('should enrich indicator targets using the resolved reporting year', async () => {
      const tocContext = { reportingYear: 2026, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          id: 1,
          category: 'OUTPUT',
          result_title: 'Result 1',
          related_node_id: 'NODE-1',
          indicators: [
            {
              indicator_id: 55,
              indicator_description: 'Indicator 1',
              target_date: 2026,
              target_value: 95,
            },
          ],
        },
      ]);
      mockTocResultsRepository.findTargetsWithCentersByIndicatorId.mockResolvedValueOnce(
        [
          {
            toc_indicator_target_id: 10,
            year: 2026,
            target_value: 95,
            number_target: '1',
            centers: [
              {
                center_id: 1,
                center_acronym: 'ABC',
                center_name: 'Alliance of Bioversity and CIAT - Headquarter',
              },
            ],
          },
          {
            toc_indicator_target_id: 11,
            year: 2026,
            target_value: 79,
            number_target: '1',
            centers: [
              {
                center_id: 3,
                center_acronym: 'CIP',
                center_name: 'International Potato Center',
              },
            ],
          },
        ],
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP01',
        'AOW01',
        '2026',
      );

      expect(
        mockTocResultsRepository.findTargetsWithCentersByIndicatorId,
      ).toHaveBeenCalledWith(55, 2026);
      expect(
        result.response.tocResultsOutputs[0].indicators[0].targets_by_center,
      ).toEqual({
        centers: [
          {
            center_id: 1,
            center_acronym: 'ABC',
            center_name: 'Alliance of Bioversity and CIAT - Headquarter',
            targets: [
              {
                toc_indicator_target_id: 10,
                year: 2026,
                target_value: 95,
                number_target: '1',
              },
            ],
          },
          {
            center_id: 3,
            center_acronym: 'CIP',
            center_name: 'International Potato Center',
            targets: [
              {
                toc_indicator_target_id: 11,
                year: 2026,
                target_value: 79,
                number_target: '1',
              },
            ],
          },
        ],
      });
      expect(
        result.response.tocResultsOutputs[0].indicators[0].center_acronym,
      ).toBe('ABC');
      expect(result.response.tocResultsOutputs[0].indicators[0].center_id).toBe(
        1,
      );
    });

    it('should preserve SQL center_acronym when multiple centers share the same target value', async () => {
      const tocContext = { reportingYear: 2026, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
        {
          toc_result_id: 10,
          category: 'OUTCOME',
          result_title: 'Outcome with same targets',
          related_node_id: 'NODE-OUT',
          indicators: [
            {
              indicator_id: 100,
              indicator_description: 'Shared KPI',
              target_date: 2026,
              target_value: 2,
              center_id: 1,
              center_acronym: 'ABC',
            },
            {
              indicator_id: 100,
              indicator_description: 'Shared KPI',
              target_date: 2026,
              target_value: 2,
              center_id: 3,
              center_acronym: 'CIP',
            },
          ],
        },
      ]);
      mockTocResultsRepository.findTargetsWithCentersByIndicatorId.mockResolvedValue(
        [
          {
            toc_indicator_target_id: 10,
            year: 2026,
            target_value: 2,
            number_target: '1',
            centers: [
              {
                center_id: 1,
                center_acronym: 'ABC',
                center_name: 'Alliance of Bioversity and CIAT - Headquarter',
              },
            ],
          },
          {
            toc_indicator_target_id: 11,
            year: 2026,
            target_value: 2,
            number_target: '1',
            centers: [
              {
                center_id: 3,
                center_acronym: 'CIP',
                center_name: 'International Potato Center',
              },
            ],
          },
        ],
      );

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP01',
        'AOW01',
        '2026',
      );

      expect(result.response.tocResultsOutcomes[0].indicators).toEqual([
        expect.objectContaining({
          indicator_id: 100,
          center_id: 1,
          center_acronym: 'ABC',
        }),
        expect.objectContaining({
          indicator_id: 100,
          center_id: 3,
          center_acronym: 'CIP',
        }),
      ]);
    });
  });

  describe('getToc2030Outcomes', () => {
    beforeEach(() => {
      mockTocResultsRepository.find2030Outcomes.mockReset();
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockReset();
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValue(
        [],
      );
    });

    it('should attach contributing_synergy_program_initiative_ids (P2-3114)', async () => {
      const tocContext = { reportingYear: 2030, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.find2030Outcomes.mockResolvedValueOnce([
        {
          toc_result_id: 7,
          category: 'EOI',
          result_title: 'EOI with SP',
          related_node_id: 'NODE-EOI-7',
          indicators: [],
        },
      ]);
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValueOnce(
        [{ toc_result_id: 7, initiative_id: 55 }],
      );

      const result: any = await service.getToc2030Outcomes('sp01');

      expect(
        mockTocCatalogRepository.getTocSynergyProgramsByResultIds,
      ).toHaveBeenCalledWith([7], 'PHASE-1');
      expect(
        result.response.tocResults[0]
          .contributing_synergy_program_initiative_ids,
      ).toEqual([55]);
    });

    it('should return ToC 2030 outcomes when repository returns data', async () => {
      const tocContext = { reportingYear: 2030, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.find2030Outcomes.mockResolvedValueOnce([
        {
          toc_result_id: 1,
          category: 'EOI',
          result_title: 'Outcome 1',
          related_node_id: 'NODE-EOI-1',
          indicators: [],
        },
      ]);

      const result: any = await service.getToc2030Outcomes('sp01');

      expect(mockReportingTocContextService.resolve).toHaveBeenCalled();
      expect(mockTocResultsRepository.find2030Outcomes).toHaveBeenCalledWith(
        'SP01',
        tocContext,
      );
      expect(result.status).toBe(200);
      expect(result.response).toMatchObject({
        program: 'SP01',
        year: 2030,
        metadata: { total: 1, phaseUuid: 'PHASE-1' },
      });
    });

    it('should return handler error when program identifier is missing', async () => {
      const result: any = await service.getToc2030Outcomes('');

      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(mockTocResultsRepository.find2030Outcomes).not.toHaveBeenCalled();
    });

    it('should return handler error when active year is not configured', async () => {
      mockReportingTocContextService.resolve.mockRejectedValueOnce(
        buildTocContextError('No active reporting year was found.', 404),
      );

      const result: any = await service.getToc2030Outcomes('SP02');

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 404,
          message: 'No active reporting year was found.',
        }),
        debug: true,
      });
      expect(mockTocResultsRepository.find2030Outcomes).not.toHaveBeenCalled();
    });

    it('should return handler error when active year value is invalid', async () => {
      mockReportingTocContextService.resolve.mockRejectedValueOnce(
        buildTocContextError(
          'The active reporting year configured is invalid.',
          500,
        ),
      );

      const result: any = await service.getToc2030Outcomes('sp03');

      expect(result.status).toBe(500);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 500,
          message: 'The active reporting year configured is invalid.',
        }),
        debug: true,
      });
      expect(mockTocResultsRepository.find2030Outcomes).not.toHaveBeenCalled();
    });

    it('should return handler error when no outcomes are found', async () => {
      const tocContext = { reportingYear: 2031, phaseUuid: 'PHASE-1' };
      mockReportingTocContextService.resolve.mockResolvedValueOnce(tocContext);
      mockTocResultsRepository.find2030Outcomes.mockResolvedValueOnce([]);

      const result: any = await service.getToc2030Outcomes('sp04');

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(mockTocResultsRepository.find2030Outcomes).toHaveBeenCalledWith(
        'SP04',
        tocContext,
      );
    });
  });

  describe('OPF-R-6: versionId override on the ToC family (toc-results, 2030-outcomes, intermediate-outcomes)', () => {
    beforeEach(() => {
      mockReportingTocContextService.resolveByVersionId.mockReset();
      mockTocResultsRepository.findByCompositeCode.mockReset();
      mockTocResultsRepository.find2030Outcomes.mockReset();
      mockTocResultsRepository.findIntermediateOutcomes.mockReset();
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockReset();
      mockTocCatalogRepository.getTocSynergyProgramsByResultIds.mockResolvedValue(
        [],
      );
    });

    describe('getWorkPackagesByProgramAndArea', () => {
      it('resolves the ToC context from the version row when versionId is given, ignoring the legacy year param', async () => {
        mockReportingTocContextService.resolveByVersionId.mockResolvedValueOnce(
          {
            reportingYear: 2025,
            phaseUuid: 'PHASE-34-UUID',
            versionId: 34,
            phaseName: 'Reporting 2025',
          },
        );
        mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
          {
            toc_result_id: 1,
            category: 'OUTPUT',
            result_title: 'Result 1',
            related_node_id: 'NODE-1',
            indicators: [],
          },
        ]);

        const result: any = await service.getWorkPackagesByProgramAndArea(
          'SP01',
          'AOW01',
          '2099', // legacy year — must be ignored once versionId wins
          34,
        );

        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).toHaveBeenCalledWith(34);
        expect(mockReportingTocContextService.resolve).not.toHaveBeenCalled();
        expect(result.response.year).toBe(2025);
        expect(result.response.metadata.phaseUuid).toBe('PHASE-34-UUID');
      });

      it('falls back to resolve(year) when versionId is absent (OPF-R-3 regression guard)', async () => {
        mockReportingTocContextService.resolve.mockResolvedValueOnce({
          reportingYear: 2024,
          phaseUuid: 'PHASE-1',
        });
        mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([
          {
            toc_result_id: 1,
            category: 'OUTPUT',
            result_title: 'Result 1',
            related_node_id: 'NODE-1',
            indicators: [],
          },
        ]);

        await service.getWorkPackagesByProgramAndArea('SP01', 'AOW01', '2024');

        expect(mockReportingTocContextService.resolve).toHaveBeenCalledWith(
          2024,
        );
        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).not.toHaveBeenCalled();
      });

      it('rejects a non-numeric versionId with a 4xx instead of silently falling back', async () => {
        const result: any = await service.getWorkPackagesByProgramAndArea(
          'SP01',
          'AOW01',
          undefined,
          NaN,
        );

        expect(result.status).toBe(HttpStatus.BAD_REQUEST);
        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).not.toHaveBeenCalled();
        expect(mockReportingTocContextService.resolve).not.toHaveBeenCalled();
      });

      it('surfaces an unknown versionId as a 4xx (not an empty 200)', async () => {
        mockReportingTocContextService.resolveByVersionId.mockRejectedValueOnce(
          buildTocContextError('No version was found for versionId 9999.', 404),
        );

        const result: any = await service.getWorkPackagesByProgramAndArea(
          'SP01',
          'AOW01',
          undefined,
          9999,
        );

        expect(result.status).toBe(404);
        expect(
          mockTocResultsRepository.findByCompositeCode,
        ).not.toHaveBeenCalled();
      });
    });

    describe('getToc2030Outcomes', () => {
      it('resolves the ToC context from the version row when versionId is given', async () => {
        mockReportingTocContextService.resolveByVersionId.mockResolvedValueOnce(
          {
            reportingYear: 2025,
            phaseUuid: 'PHASE-34-UUID',
            versionId: 34,
            phaseName: 'Reporting 2025',
          },
        );
        mockTocResultsRepository.find2030Outcomes.mockResolvedValueOnce([
          { toc_result_id: 1, category: 'EOI', indicators: [] },
        ]);

        const result: any = await service.getToc2030Outcomes('sp01', 34);

        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).toHaveBeenCalledWith(34);
        expect(mockReportingTocContextService.resolve).not.toHaveBeenCalled();
        expect(result.response.year).toBe(2025);
      });

      it('falls back to resolve() when versionId is absent (OPF-R-3 regression guard)', async () => {
        mockReportingTocContextService.resolve.mockResolvedValueOnce({
          reportingYear: 2030,
          phaseUuid: 'PHASE-1',
        });
        mockTocResultsRepository.find2030Outcomes.mockResolvedValueOnce([
          { toc_result_id: 1, category: 'EOI', indicators: [] },
        ]);

        await service.getToc2030Outcomes('sp01');

        expect(mockReportingTocContextService.resolve).toHaveBeenCalled();
        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).not.toHaveBeenCalled();
      });

      it('rejects a non-numeric versionId with a 4xx', async () => {
        const result: any = await service.getToc2030Outcomes('sp01', NaN);

        expect(result.status).toBe(HttpStatus.BAD_REQUEST);
        expect(
          mockTocResultsRepository.find2030Outcomes,
        ).not.toHaveBeenCalled();
      });

      it('surfaces an unknown versionId as a 4xx (not an empty 200)', async () => {
        mockReportingTocContextService.resolveByVersionId.mockRejectedValueOnce(
          buildTocContextError('No version was found for versionId 9999.', 404),
        );

        const result: any = await service.getToc2030Outcomes('sp01', 9999);

        expect(result.status).toBe(404);
        expect(
          mockTocResultsRepository.find2030Outcomes,
        ).not.toHaveBeenCalled();
      });
    });

    describe('getIntermediateOutcomes', () => {
      it('resolves the ToC context from the version row when versionId is given', async () => {
        mockReportingTocContextService.resolveByVersionId.mockResolvedValueOnce(
          {
            reportingYear: 2025,
            phaseUuid: 'PHASE-34-UUID',
            versionId: 34,
            phaseName: 'Reporting 2025',
          },
        );
        mockTocResultsRepository.findIntermediateOutcomes.mockResolvedValueOnce(
          [],
        );

        const result: any = await service.getIntermediateOutcomes('sp01', 34);

        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).toHaveBeenCalledWith(34);
        expect(mockReportingTocContextService.resolve).not.toHaveBeenCalled();
        expect(result.response.year).toBe(2025);
      });

      it('falls back to resolve() when versionId is absent (OPF-R-3 regression guard)', async () => {
        mockReportingTocContextService.resolve.mockResolvedValueOnce({
          reportingYear: 2026,
          phaseUuid: 'PHASE-1',
        });
        mockTocResultsRepository.findIntermediateOutcomes.mockResolvedValueOnce(
          [],
        );

        await service.getIntermediateOutcomes('sp01');

        expect(mockReportingTocContextService.resolve).toHaveBeenCalled();
        expect(
          mockReportingTocContextService.resolveByVersionId,
        ).not.toHaveBeenCalled();
      });

      it('rejects a non-numeric versionId with a 4xx', async () => {
        const result: any = await service.getIntermediateOutcomes('sp01', NaN);

        expect(result.status).toBe(HttpStatus.BAD_REQUEST);
        expect(
          mockTocResultsRepository.findIntermediateOutcomes,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('getProgramIndicatorContributionSummary', () => {
    beforeEach(() => {
      // W12-R-2: default resolution goes through VersioningService.$_findActivePhase, not
      // YearRepository — no default stub here on purpose, so a spec that forgets to mock
      // $_findActivePhase fails loudly instead of silently reusing a stale year fixture.
      mockVersioningService.$_findActivePhase.mockReset();
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockReset();
      mockResultRepository.getActiveResultTypes.mockReset();
    });

    it('should aggregate indicator contribution summaries for the program, scoped by the active reporting phase', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce({
        id: 2025,
      } as any);

      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([
        { id: 1, name: 'Outcome' },
        { id: 2, name: 'Output' },
        { id: 5, name: 'Innovation' },
      ]);

      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [
          {
            result_type_id: 1,
            result_type_name: 'Outcome',
            status_id: 1,
            total_results: '2',
          },
          {
            result_type_id: 1,
            result_type_name: 'Outcome',
            status_id: 2,
            total_results: '1',
          },
          {
            result_type_id: 2,
            result_type_name: 'Output',
            status_id: 3,
            total_results: '4',
          },
        ],
      );

      const result: any =
        await service.getProgramIndicatorContributionSummary('sp05');

      expect(mockVersioningService.$_findActivePhase).toHaveBeenCalledWith(
        AppModuleIdEnum.REPORTING,
      );
      expect(mockYearRepository.findOne).not.toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).toHaveBeenCalledWith(15, 2025);
      expect(mockResultRepository.getActiveResultTypes).toHaveBeenCalled();
      expect(result.status).toBe(200);
      expect(result.response.program).toEqual({
        id: 15,
        officialCode: 'SP05',
        name: 'Sample Program',
      });
      expect(result.response.totalsByType).toEqual([
        {
          resultTypeId: 5,
          resultTypeName: 'Innovation',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 1,
          resultTypeName: 'Outcome',
          totalResults: 3,
          editing: 2,
          qualityAssessed: 1,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 2,
          resultTypeName: 'Output',
          totalResults: 4,
          editing: 0,
          qualityAssessed: 0,
          submitted: 4,
          others: 0,
        },
      ]);
      expect(result.response.statusTotals).toEqual({
        editing: 2,
        qualityAssessed: 1,
        submitted: 4,
        others: 0,
        total: 7,
      });
    });

    // Reviewer remediation (W12-T-2 rework attempt 2): the repo predicate widened from
    // `status_id IN (1,2,3)` to `!= 4` (proven at the repo layer, red-before/green-after —
    // see result.repository.spec.ts), which means rows with status_id outside {1,2,3} (e.g.
    // 5 Pending Review, 7 Rejected) can now legitimately reach this mapper for the first time.
    // This case observes the CONSEQUENCE of that widening: the mapper's pre-existing `default:`
    // branch (results-framework-reporting.service.ts:~658-661), previously structurally dead
    // for this endpoint, now routes such rows into `others` (design §12 reversion challenge (a)).
    // Green-only by construction: the mapper's switch/default was already there and is UNCHANGED
    // by this fix, so there is no pre-fix/post-fix behavior difference to redden here — the
    // red-before evidence for the underlying predicate change lives in result.repository.spec.ts.
    it('routes a status_id outside {1,2,3} (5, 7) into the others bucket (W12-DD-2 reversion challenge (a))', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce({
        id: 2025,
      } as any);

      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([
        { id: 1, name: 'Outcome' },
      ]);

      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [
          {
            result_type_id: 1,
            result_type_name: 'Outcome',
            status_id: 1,
            total_results: '1',
          },
          {
            result_type_id: 1,
            result_type_name: 'Outcome',
            status_id: 5,
            total_results: '2',
          },
          {
            result_type_id: 1,
            result_type_name: 'Outcome',
            status_id: 7,
            total_results: '3',
          },
        ],
      );

      const result: any =
        await service.getProgramIndicatorContributionSummary('sp05');

      expect(result.status).toBe(200);
      expect(result.response.totalsByType).toEqual([
        {
          resultTypeId: 1,
          resultTypeName: 'Outcome',
          totalResults: 6,
          editing: 1,
          qualityAssessed: 0,
          submitted: 0,
          others: 5,
        },
      ]);
      expect(result.response.statusTotals).toEqual({
        editing: 1,
        qualityAssessed: 0,
        submitted: 0,
        others: 5,
        total: 6,
      });
    });

    it('should return zeroed totals when no indicator-linked results are found', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 99,
        official_code: 'SP99',
        name: 'Program 99',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce({
        id: 2025,
      } as any);

      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([
        { id: 1, name: 'Outcome' },
        { id: 2, name: 'Output' },
        { id: 5, name: 'Innovation' },
        { id: 6, name: 'Policy' },
        { id: 7, name: 'Scaling' },
      ]);

      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [],
      );

      const result: any =
        await service.getProgramIndicatorContributionSummary('sp99');

      expect(result.status).toBe(200);
      expect(result.response.totalsByType).toEqual([
        {
          resultTypeId: 5,
          resultTypeName: 'Innovation',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 1,
          resultTypeName: 'Outcome',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 2,
          resultTypeName: 'Output',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 6,
          resultTypeName: 'Policy',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
        {
          resultTypeId: 7,
          resultTypeName: 'Scaling',
          totalResults: 0,
          editing: 0,
          qualityAssessed: 0,
          submitted: 0,
          others: 0,
        },
      ]);
      expect(result.response.statusTotals).toEqual({
        editing: 0,
        qualityAssessed: 0,
        submitted: 0,
        others: 0,
        total: 0,
      });
    });

    it('should return handler error when program identifier is missing', async () => {
      const result: any =
        await service.getProgramIndicatorContributionSummary('   ');

      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).not.toHaveBeenCalled();
      expect(mockResultRepository.getActiveResultTypes).not.toHaveBeenCalled();
    });

    it('should return handler error when program does not exist', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce(null);

      const result: any =
        await service.getProgramIndicatorContributionSummary('SP00');

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).not.toHaveBeenCalled();
      expect(mockResultRepository.getActiveResultTypes).not.toHaveBeenCalled();
    });

    // W12-R-2 / W12-DD-3: default resolution must go through $_findActivePhase, never
    // resolveInitiativeAndYear's `year.active` fallback.
    it('should honor an explicit, finite versionId without consulting the active phase', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([]);
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [],
      );

      const result: any = await service.getProgramIndicatorContributionSummary(
        'sp05',
        12,
      );

      expect(mockVersioningService.$_findActivePhase).not.toHaveBeenCalled();
      expect(mockYearRepository.findOne).not.toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).toHaveBeenCalledWith(15, 12);
      expect(result.status).toBe(200);
    });

    it('should default to the active REPORTING phase when versionId is absent (FAIL input for a year.active fallback)', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce({
        id: 77,
      } as any);
      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([]);
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [],
      );

      const result: any =
        await service.getProgramIndicatorContributionSummary('sp05');

      expect(mockVersioningService.$_findActivePhase).toHaveBeenCalledWith(
        AppModuleIdEnum.REPORTING,
      );
      expect(mockYearRepository.findOne).not.toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).toHaveBeenCalledWith(15, 77);
      expect(result.status).toBe(200);
    });

    it('should default to the active REPORTING phase when versionId is non-numeric', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce({
        id: 77,
      } as any);
      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([]);
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        [],
      );

      const result: any = await service.getProgramIndicatorContributionSummary(
        'sp05',
        Number('not-a-number'),
      );

      expect(mockVersioningService.$_findActivePhase).toHaveBeenCalledWith(
        AppModuleIdEnum.REPORTING,
      );
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).toHaveBeenCalledWith(15, 77);
      expect(result.status).toBe(200);
    });

    it('should return a handler error when no active reporting phase is found and versionId is absent', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

      mockVersioningService.$_findActivePhase.mockResolvedValueOnce(null);

      const result: any =
        await service.getProgramIndicatorContributionSummary('sp05');

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).not.toHaveBeenCalled();
    });
  });

  /**
   * W12-R-3 parity: meter total === Σ matrix `totalResults` over ONE shared mixed fixture.
   * `RAW_UNIVERSE` below mixes every excluded class (source='API', role=2, other-version,
   * status 4, type 10/11) plus the classes that must now be INCLUDED (status 5/7, a
   * null/orphan `result_level_id` row). `SHARED_UNIVERSE_PREDICATE` is the ONE filter both
   * sides apply — it stands in for the two repo SQL predicates, which are independently
   * pinned per-class in `result.repository.spec.ts` (this spec does not re-verify SQL; it
   * asserts the two MAPPERS agree given an identical, already-filtered row set).
   *
   * `result_level_id`: this is NOT a proof of agreement — it is a second documented residual
   * gap, in the same honest register as the Discontinued one below, and in the OPPOSITE
   * direction. The meter's base query DOES constrain this column: it `INNER JOIN`s
   * `result_level` on `r.result_level_id` (`result.repository.ts:692`), which silently drops
   * any row whose `result_level_id` is null or an orphan id — an inner join with no match
   * removes the row entirely. The matrix query (`getIndicatorContributionSummaryByProgram`)
   * has no such join and no `result_level_id` predicate at all (W12-DD-2 dropped the old
   * `IN (3,4)` filter without adding a join). So a null/orphan-level row is counted by the
   * MATRIX and NOT by the METER — meter < matrix on that row, the mirror image of the
   * Discontinued case below (meter possibly > matrix). Both mappers in THIS spec trivially
   * "agree" on the null-level survivor only because neither mapper function reads
   * `result_level_id` at all — that is a fact about the mapper layer, not evidence that the
   * underlying SQL populations match. This spec assumes such rows do not occur in practice;
   * if that assumption is wrong, this spec would not catch the divergence.
   *
   * `status_id = 4` (Discontinued): the matrix explicitly excludes it (`status_id != 4`).
   * The meter's own base WHERE has NO status predicate at all — nothing stops a real,
   * `is_active` Discontinued row from reaching it. This spec assumes (does not prove) that
   * such rows don't occur in the "current phase, active, primary-submitter" population in
   * practice; if that assumption is ever wrong, meter/matrix totals would diverge on a
   * Discontinued row and this spec would not catch it (accepted residual gap, parallel to
   * the `result_level_id` note above — flagged, not silently assumed away).
   */
  describe('W12-R-3: meter total === Σ matrix totalResults (parity)', () => {
    const TARGET_VERSION = 42;
    const OTHER_VERSION = 99;

    // One raw candidate universe; `count` rows of that shape. Mixes every excluded class
    // with the classes that must now be included.
    const RAW_UNIVERSE = [
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 1,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 10,
      }, // included: Editing
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 3,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 1,
      }, // included: Submitted
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 5,
        resultTypeId: 1,
        resultLevelId: 4,
        count: 2,
      }, // included: Pending Review (was structurally dead pre-fix)
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 7,
        resultTypeId: 2,
        resultLevelId: null,
        count: 1,
      }, // included: Rejected + orphan result_level_id
      {
        source: 'API',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 1,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 13,
      }, // excluded: bilateral origin
      {
        source: 'Result',
        roleId: 2,
        versionId: TARGET_VERSION,
        statusId: 1,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 3,
      }, // excluded: contributor role
      {
        source: 'Result',
        roleId: 1,
        versionId: OTHER_VERSION,
        statusId: 1,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 4,
      }, // excluded: other phase
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 4,
        resultTypeId: 1,
        resultLevelId: 3,
        count: 6,
      }, // excluded: Discontinued
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 1,
        resultTypeId: 10,
        resultLevelId: 3,
        count: 2,
      }, // excluded: type 10
      {
        source: 'Result',
        roleId: 1,
        versionId: TARGET_VERSION,
        statusId: 2,
        resultTypeId: 11,
        resultLevelId: 3,
        count: 1,
      }, // excluded: type 11
    ];

    const SHARED_UNIVERSE_PREDICATE = (row: (typeof RAW_UNIVERSE)[number]) =>
      row.source === 'Result' &&
      row.roleId === 1 &&
      row.versionId === TARGET_VERSION &&
      row.statusId !== 4 &&
      ![10, 11].includes(row.resultTypeId);

    const survivors = RAW_UNIVERSE.filter(SHARED_UNIVERSE_PREDICATE);
    const EXPECTED_TOTAL = survivors.reduce((sum, r) => sum + r.count, 0); // 14

    function computeMeterTotal(rows: typeof survivors): number {
      const meterRows = rows.flatMap((group) =>
        Array.from({ length: group.count }, () => ({
          submitter_id: 15,
          submitter: 'SP04',
          submitter_name: 'Science Program 04',
          // NOTE: in the real query this `role_id` is `r2.id as role_id` from `role_by_user`
          // (the CALLING USER's role on the initiative, used only for `container.editable` /
          // my-vs-other bucketing) — NOT `rbi.initiative_role_id` (the origin/ownership axis
          // the SHARED_UNIVERSE_PREDICATE's `roleId` field represents, already applied above
          // to build `survivors`). Reused here as a stand-in value only because
          // `buildScienceProgramBuckets` needs some non-GUEST role_id per row; it plays no
          // part in the SP04/type/status counts this spec asserts on.
          role_id: group.roleId,
          version_id: group.versionId,
          phase_name: 'Reporting 2026',
          phase_year: 2026,
          status_id: group.statusId,
          status_name: `Status ${group.statusId}`,
        })),
      );

      const { mySciencePrograms, otherSciencePrograms } = (
        ResultsService.prototype as any
      ).buildScienceProgramBuckets(
        meterRows,
        [{ id: 15, official_code: 'SP04', name: 'Science Program 04' }] as any,
        new Map(),
        new Map(),
      );

      const program = [...mySciencePrograms, ...otherSciencePrograms].find(
        (p: any) => p.initiativeId === 15,
      );
      return (
        program?.versions?.find((v: any) => v.versionId === TARGET_VERSION)
          ?.totalResults ?? 0
      );
    }

    async function computeMatrixTotal(rows: typeof survivors): Promise<number> {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP04',
        name: 'Science Program 04',
      });
      mockVersioningService.$_findActivePhase.mockReset();

      const grouped = new Map<
        string,
        {
          result_type_id: number;
          result_type_name: string;
          status_id: number;
          total_results: number;
        }
      >();
      for (const group of rows) {
        const key = `${group.resultTypeId}:${group.statusId}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.total_results += group.count;
        } else {
          grouped.set(key, {
            result_type_id: group.resultTypeId,
            result_type_name: group.resultTypeId === 1 ? 'Outcome' : 'Output',
            status_id: group.statusId,
            total_results: group.count,
          });
        }
      }

      mockResultRepository.getActiveResultTypes.mockResolvedValueOnce([
        { id: 1, name: 'Outcome' },
        { id: 2, name: 'Output' },
      ]);
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockResolvedValueOnce(
        Array.from(grouped.values()),
      );

      const result: any = await service.getProgramIndicatorContributionSummary(
        'SP04',
        TARGET_VERSION,
      );

      return result.response.totalsByType.reduce(
        (sum: number, t: any) => sum + t.totalResults,
        0,
      );
    }

    it('meter total equals Σ matrix totalResults over the shared, correctly-filtered universe', async () => {
      const meterTotal = computeMeterTotal(survivors);
      const matrixTotal = await computeMatrixTotal(survivors);

      expect(meterTotal).toBe(EXPECTED_TOTAL);
      expect(matrixTotal).toBe(EXPECTED_TOTAL);
      expect(meterTotal).toBe(matrixTotal);
    });

    // FAIL input (named per DoD): re-widening either universe breaks parity. Simulated here
    // by narrowing the MATRIX side back to the pre-fix `status_id IN (1,2,3)` universe (drops
    // the status 5/7 survivors) while the meter keeps the full, correct survivor set —
    // reproducing exactly what re-adding that predicate (or dropping `fundingSource` from the
    // meter's filters, the other named FAIL input) would do to this assertion: red.
    it('is sensitive to a re-widened universe (FAIL input: matrix status_id IN (1,2,3) again)', async () => {
      const meterTotal = computeMeterTotal(survivors);
      const preFixMatrixSurvivors = survivors.filter((r) => r.statusId <= 3);

      const matrixTotal = await computeMatrixTotal(preFixMatrixSurvivors);

      // Concrete values, not just inequality: meter keeps the full, correct survivor set
      // (10 Editing + 1 Submitted + 2 status-5 + 1 status-7 = 14); the narrowed matrix drops
      // the status 5/7 survivors (10 + 1 = 11) — the exact numbers a re-widened-status
      // regression would produce, not an arbitrary mismatch.
      expect(meterTotal).toBe(14);
      expect(matrixTotal).toBe(11);
      expect(meterTotal).not.toBe(matrixTotal);
    });
  });

  describe('createResultFromFramework', () => {
    const baseResult = {
      initiative_id: 15,
      result_type_id: ResultTypeEnum.POLICY_CHANGE,
      result_level_id: 2,
      result_name: 'Test Result',
      handler: 'handler',
    } as any;

    beforeEach(() => {
      mockResultsService.createOwnerResultV2.mockReset();
      mockResultsKnowledgeProductsService.create.mockReset();
      mockResultRepository.getResultById.mockReset();
      mockTocResultsRepository.findResultById.mockReset();
      mockTocResultsRepository.findIndicatorById.mockReset();
      mockResultsTocResultRepository.findOne.mockReset();
      mockResultsTocResultRepository.find.mockReset();
      mockResultsTocResultRepository.save.mockReset();
      mockResultsTocResultRepository.update.mockReset();
      mockResultsTocResultIndicatorsRepository.findOne.mockReset();
      mockResultsTocResultIndicatorsRepository.find.mockReset();
      mockResultsTocResultIndicatorsRepository.save.mockReset();
      mockResultsIndicatorsTargetsRepository.findOne.mockReset();
      mockResultsIndicatorsTargetsRepository.save.mockReset();
      mockResultsIndicatorsTargetsRepository.update.mockReset();
      mockShareResultRequestService.resultRequest.mockReset();
      mockResultsByProjectsService.linkBilateralProjectToResult.mockReset();
      mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2.mockReset();
    });

    it('should create a non-knowledge product result and link ToC data', async () => {
      mockResultsService.createOwnerResultV2.mockResolvedValueOnce({
        status: 201,
        response: { id: 101 },
      });
      mockResultRepository.getResultById.mockResolvedValueOnce({
        id: 101,
        result_level_id: 2,
      });
      mockTocResultsRepository.findResultById.mockResolvedValueOnce({
        id: 555,
        category: 'OUTPUT',
      });
      mockResultsTocResultRepository.findOne.mockResolvedValueOnce(null);
      mockResultsTocResultRepository.save.mockResolvedValueOnce({
        result_toc_result_id: 900,
      });
      mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
        id: 777,
        toc_results_id: 555,
        related_node_id: 'IND-1',
      });
      mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce(
        null,
      );

      const response: any = await service.createResultFromFramework(
        {
          result: baseResult,
          toc_result_id: 555,
          indicators: { indicator_id: 777 },
        },
        user,
      );

      expect(mockResultsService.createOwnerResultV2).toHaveBeenCalledWith(
        baseResult,
        user,
      );
      expect(mockResultsKnowledgeProductsService.create).not.toHaveBeenCalled();
      expect(mockResultsTocResultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          toc_result_id: 555,
          toc_level_id: 1,
        }),
      );
      expect(mockResultsTocResultIndicatorsRepository.save).toHaveBeenCalled();
      expect(
        mockShareResultRequestService.resultRequest,
      ).not.toHaveBeenCalled();
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).not.toHaveBeenCalled();
      expect(response.response.tocResultLinkId).toBe(900);
    });

    it('should persist indicator target information when payload provides it', async () => {
      mockResultsService.createOwnerResultV2.mockResolvedValueOnce({
        status: 201,
        response: { id: 303 },
      });
      mockResultRepository.getResultById.mockResolvedValueOnce({
        id: 303,
        result_level_id: 2,
      });
      mockTocResultsRepository.findResultById.mockResolvedValueOnce({
        id: 444,
        category: 'OUTPUT',
      });
      mockResultsTocResultRepository.findOne.mockResolvedValueOnce(null);
      mockResultsTocResultRepository.save.mockResolvedValueOnce({
        result_toc_result_id: 707,
      });
      mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
        id: 81,
        toc_results_id: 444,
        related_node_id: 'REL-81',
      });
      mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce(
        null,
      );
      mockResultsTocResultIndicatorsRepository.save.mockResolvedValueOnce({
        result_toc_result_indicator_id: 812,
      });
      mockResultsIndicatorsTargetsRepository.findOne.mockResolvedValueOnce(
        null,
      );

      await service.createResultFromFramework(
        {
          result: baseResult,
          toc_result_id: 444,
          indicators: {
            indicator_id: 81,
            number_target: '25',
            target_date: '2025',
            contributing_indicator: 3.5,
          },
          contributing_indicator: 3.5,
        },
        user,
      );

      expect(mockResultsTocResultIndicatorsRepository.save).toHaveBeenCalled();
      expect(mockResultsTocResultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          toc_level_id: 1,
        }),
      );
      expect(mockResultsIndicatorsTargetsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_toc_result_indicator_id: 812,
          number_target: 25,
          contributing_indicator: 3.5,
          target_date: 2025,
          created_by: user.id,
          last_updated_by: user.id,
          is_active: true,
        }),
      );
    });

    it('should create a knowledge product result and reuse existing ToC record (single bilateral)', async () => {
      const kpPayload: any = {
        id: 202,
        result_data: baseResult,
      };

      mockResultsKnowledgeProductsService.create.mockResolvedValueOnce({
        status: 201,
        response: kpPayload,
      });
      mockResultRepository.getResultById.mockResolvedValueOnce({
        id: 202,
        result_level_id: 3,
      });
      mockTocResultsRepository.findResultById.mockResolvedValueOnce({
        id: 888,
        category: 'OUTCOME',
      });
      mockResultsTocResultRepository.findOne.mockResolvedValueOnce({
        result_toc_result_id: 333,
      });
      mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
        id: 999,
        toc_results_id: 888,
        related_node_id: 'KP-99',
      });
      mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce(
        null,
      );

      const response: any = await service.createResultFromFramework(
        {
          result: {
            ...baseResult,
            result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
          },
          knowledge_product: kpPayload,
          toc_result_id: 888,
          indicators: { indicator_id: 999 },
          contributors_result_toc_result: [
            {
              initiative_id: 20,
              planned_result: true,
              result_toc_results: [],
            },
          ],
          bilateral_project: [
            {
              project_id: '260',
              project_name: 'Test Project',
            },
          ],
        },
        user,
      );

      expect(mockResultsKnowledgeProductsService.create).toHaveBeenCalled();
      expect(mockResultsService.createOwnerResultV2).not.toHaveBeenCalled();
      expect(mockResultsTocResultRepository.update).toHaveBeenCalledWith(
        333,
        expect.objectContaining({
          toc_result_id: 888,
          toc_level_id: 2,
          toc_progressive_narrative: null,
          last_updated_by: user.id,
          is_active: true,
          planned_result: true,
        }),
      );
      expect(mockShareResultRequestService.resultRequest).toHaveBeenCalledWith(
        {
          initiativeShareId: [20],
          isToc: false,
          contributors_result_toc_result: [
            {
              initiative_id: 20,
              planned_result: true,
              result_toc_results: [],
            },
          ],
        },
        202,
        user,
      );
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).toHaveBeenCalledWith(202, 260, user.id);
      expect(response.status).toBe(201);
      expect(response.response.knowledgeProduct).toEqual(kpPayload);
    });

    it('should link multiple bilateral projects when bilateral_project array is provided', async () => {
      mockResultsService.createOwnerResultV2.mockResolvedValueOnce({
        status: 201,
        response: { id: 303 },
      });
      mockResultRepository.getResultById.mockResolvedValueOnce({ id: 303 });
      mockTocResultsRepository.findResultById.mockResolvedValueOnce({
        id: 777,
        category: 'EOI',
      });
      mockResultsTocResultRepository.findOne.mockResolvedValueOnce(null);
      mockResultsTocResultRepository.save.mockResolvedValueOnce({
        result_toc_result_id: 444,
      });
      mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
        id: 5555,
        toc_results_id: 777,
        related_node_id: 'IND-Multi',
      });
      mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce(
        null,
      );

      const response: any = await service.createResultFromFramework(
        {
          result: baseResult,
          toc_result_id: 777,
          indicators: { indicator_id: 5555 },
          bilateral_project: [
            { project_id: 9001, project_name: 'Proj A' },
            { project_id: '9002', project_name: 'Proj B' },
            { project_id: 'invalid' }, // ignored
          ],
        } as any,
        user,
      );

      expect(response.status).toBe(201);
      expect(mockResultsTocResultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          toc_level_id: 3,
        }),
      );
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).toHaveBeenNthCalledWith(1, 303, 9001, user.id);
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).toHaveBeenNthCalledWith(2, 303, 9002, user.id);
    });

    it('should persist contributing centers when payload includes them', async () => {
      mockResultsService.createOwnerResultV2.mockResolvedValueOnce({
        status: 201,
        response: { id: 606 },
      });
      mockResultRepository.getResultById.mockResolvedValueOnce({
        id: 606,
        result_level_id: 2,
      });
      mockTocResultsRepository.findResultById.mockResolvedValueOnce({
        id: 909,
        category: 'OUTPUT',
      });
      mockResultsTocResultRepository.findOne.mockResolvedValueOnce(null);
      mockResultsTocResultRepository.save.mockResolvedValueOnce({
        result_toc_result_id: 1212,
      });
      mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
        id: 3030,
        toc_results_id: 909,
        related_node_id: 'NODE-909',
      });
      mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce(
        null,
      );

      const centers: any = [
        { code: 'CIM', is_leading_result: true },
        { code: 'IITA', is_leading_result: false },
      ];

      await service.createResultFromFramework(
        {
          result: baseResult,
          toc_result_id: 909,
          indicators: { indicator_id: 3030 },
          contributing_center: centers,
        } as any,
        user,
      );

      expect(
        mockResultsByInstitutionsService.savePartnersInstitutionsByResultV2,
      ).toHaveBeenCalledWith(
        {
          result_id: 606,
          contributing_center: centers,
          institutions: undefined,
          mqap_institutions: [],
        },
        user,
      );
    });
  });

  describe('getExistingResultContributorsToIndicators', () => {
    beforeEach(() => {
      mockResultsTocResultRepository.find.mockReset();
      mockResultsTocResultIndicatorsRepository.find.mockReset();
      mockResultRepository.getUserRolesForResults.mockReset();
      mockRoleByUserRepository.find.mockReset();
      mockHandlersError.returnErrorRes.mockClear();
    });

    it('should return contributors when matches are found', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 11,
          result_id: 101,
          toc_result_id: 5,
          obj_results: {
            title: 'Result Alpha',
            result_code: 'RES-101',
            result_type_id: 2,
            version_id: 30,
            status_id: 2,
            obj_status: { status_name: 'Submitted' },
          },
          obj_results_toc_result_indicators: [
            {
              toc_results_indicator_id: 'IND-55',
              obj_result_indicator_targets: [
                { contributing_indicator: 2.5, is_active: true },
                { contributing_indicator: 1, is_active: true },
              ],
            },
          ],
        },
        {
          result_toc_result_id: 12,
          result_id: 102,
          toc_result_id: 5,
          obj_results: {
            title: 'Result Beta',
            result_code: 'RES-102',
            result_type_id: 3,
            version_id: 31,
            status_id: 1,
            obj_status: { status_name: 'Editing' },
          },
        },
      ]);
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([
        { results_toc_results_id: 11 },
      ]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([]);
      mockResultRepository.getUserRolesForResults.mockResolvedValueOnce([
        { result_id: '101', role_id: 4, role_name: 'Lead' },
      ]);

      const result: any =
        await service.getExistingResultContributorsToIndicators(
          user,
          5,
          'IND-55',
        );

      expect(mockResultsTocResultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_result_id: 5,
            is_active: true,
            obj_results: expect.objectContaining({
              is_active: true,
            }),
            obj_results_toc_result_indicators: expect.objectContaining({
              toc_results_indicator_id: 'IND-55',
              is_active: true,
              is_not_aplicable: false,
              obj_result_indicator_targets: expect.objectContaining({
                is_active: true,
              }),
            }),
          }),
        }),
      );
      const statusWhere =
        mockResultsTocResultRepository.find.mock.calls[0][0].where.obj_results
          .status_id;
      expect(statusWhere._type).toBe('in');
      expect([...statusWhere._value].sort((a, b) => a - b)).toEqual([2, 6]);
      expect(
        mockResultsTocResultIndicatorsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_results_indicator_id: 'IND-55',
            is_active: true,
            is_not_aplicable: false,
          }),
        }),
      );
      expect(mockResultRepository.getUserRolesForResults).toHaveBeenCalledWith(
        user.id,
        [101],
      );
      expect(result.status).toBe(200);
      expect(result.response.contributors).toEqual([
        {
          result_id: 101,
          title: 'Result Alpha',
          result_code: 'RES-101',
          status_name: 'Submitted',
          version_id: 30,
          status_id: 2,
          role_id: 4,
          contributing_indicator: 3.5,
        },
      ]);
      expect(mockHandlersError.returnErrorRes).not.toHaveBeenCalled();
    });

    it('should use general application roles as fallback when no specific role mapping found', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 31,
          result_id: 501,
          toc_result_id: 7,
          obj_results: {
            title: 'Result Delta',
            result_code: 'RES-501',
            result_type_id: 1,
            version_id: 10,
            status_id: 6,
            obj_status: { status_name: 'Approved' },
          },
        },
      ]);
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([
        { results_toc_results_id: 31 },
      ]);
      mockResultRepository.getUserRolesForResults.mockResolvedValueOnce([]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([{ role: 1 }]);

      const result: any =
        await service.getExistingResultContributorsToIndicators(
          user,
          7,
          'IND-12',
        );

      expect(mockResultRepository.getUserRolesForResults).toHaveBeenCalledWith(
        user.id,
        [501],
      );
      expect(mockRoleByUserRepository.find).toHaveBeenCalledWith({
        where: {
          user: user.id,
          active: true,
          initiative_id: expect.any(Object), // IsNull()
          action_area_id: expect.any(Object), // IsNull()
        },
        select: ['role'],
      });
      expect(result.status).toBe(200);
      expect(result.response.contributors).toEqual([
        expect.objectContaining({
          result_id: 501,
          role_id: 1,
          status_id: 6,
          status_name: 'Approved',
          title: 'Result Delta',
          result_code: 'RES-501',
          version_id: 10,
          contributing_indicator: null,
        }),
      ]);
      expect(mockHandlersError.returnErrorRes).not.toHaveBeenCalled();
    });

    it('should return empty contributors when no indicators linked', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 21,
          result_id: 303,
          toc_result_id: 8,
          obj_results: {
            title: 'Result Gamma',
            result_code: 'RES-303',
            status_id: 2,
          },
        },
      ]);
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([]);
      mockRoleByUserRepository.find.mockResolvedValueOnce([]);

      const result: any =
        await service.getExistingResultContributorsToIndicators(
          user,
          8,
          'IND-99',
        );

      expect(result.status).toBe(200);
      expect(result.response.contributors).toEqual([]);
      expect(
        mockResultRepository.getUserRolesForResults,
      ).not.toHaveBeenCalled();
    });

    it('should propagate errors through handlers when invalid id provided', async () => {
      const result = await service.getExistingResultContributorsToIndicators(
        user,
        'abc',
        'IND-3',
      );

      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 400,
        }),
        debug: true,
      });
    });

    it('should handle missing indicator identifier', async () => {
      const result = await service.getExistingResultContributorsToIndicators(
        user,
        9,
        '',
      );

      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should return not found when no contribution exists', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([]);

      const result = await service.getExistingResultContributorsToIndicators(
        user,
        10,
        'IND-1',
      );

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.objectContaining({
          status: 404,
        }),
        debug: true,
      });
    });
  });

  describe('getBilateralProjectsByScienceProgram (P2-3001)', () => {
    it('should return deduplicated bilateral projects for a science program', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 10,
        official_code: 'SP01',
      });
      mockTocResultsRepository.findBilateralProjectsByProgramOfficialCode.mockResolvedValueOnce(
        [
          {
            toc_result_id: 1,
            official_code: 'SP01',
            project_id: 100,
            project_name: 'Project A',
          },
          {
            toc_result_id: 2,
            official_code: 'SP01',
            project_id: 100,
            project_name: 'Project A',
          },
          {
            toc_result_id: 3,
            official_code: 'SP01',
            project_id: 200,
            project_name: 'Project B',
          },
        ],
      );

      const result = await service.getBilateralProjectsByScienceProgram('sp01');

      expect(
        mockTocResultsRepository.findBilateralProjectsByProgramOfficialCode,
      ).toHaveBeenCalledWith('SP01', 'PHASE-1');
      expect(result.response).toHaveLength(2);
      expect(result.response.map((row) => row.project_id)).toEqual([100, 200]);
      expect(result.status).toBe(200);
    });

    it('should return empty array when program has no bilateral projects', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 10,
        official_code: 'SP02',
      });
      mockTocResultsRepository.findBilateralProjectsByProgramOfficialCode.mockResolvedValueOnce(
        [],
      );

      const result = await service.getBilateralProjectsByScienceProgram('SP02');

      expect(result.response).toEqual([]);
      expect(result.status).toBe(200);
    });

    it('should return bad request when programId is missing', async () => {
      const result = await service.getBilateralProjectsByScienceProgram('  ');

      expect(result.status).toBe(400);
    });
  });

  /**
   * P2-3255. `assignIndicatorCenterContext` exists to fill the scalar centre when SQL left it
   * unset, by matching a centre's target on year + value. That was safe while SQL emitted one row
   * per target×centre. It is not safe now: a target shared by N centres arrives as one row with
   * the scalars deliberately null, and the year+value match cannot tell those N apart — it would
   * pick whichever comes first and put back exactly the misreport the ticket removed.
   */
  describe('assignIndicatorCenterContext with shared targets (P2-3255)', () => {
    const sharedIndicator = () => ({
      center_id: null,
      center_acronym: null,
      target_date: '2026',
      target_value: '1',
      centers: [
        { center_id: 2, center_acronym: 'BIOVERSITY' },
        { center_id: 3, center_acronym: 'CIAT' },
      ],
      targets_by_center: {
        centers: [
          {
            center_id: 2,
            center_acronym: 'BIOVERSITY',
            targets: [{ year: '2026', target_value: '1' }],
          },
          {
            center_id: 3,
            center_acronym: 'CIAT',
            targets: [{ year: '2026', target_value: '1' }],
          },
        ],
      },
    });

    it('leaves the scalar centre unset when several centres hold the target', () => {
      const indicator = sharedIndicator();

      (service as any).assignIndicatorCenterContext(indicator, 2026);

      expect(indicator.center_id).toBeNull();
      expect(indicator.center_acronym).toBeNull();
    });

    it('still resolves the centre when only one holds the target', () => {
      const indicator = sharedIndicator();
      indicator.centers = [{ center_id: 3, center_acronym: 'CIAT' }];
      indicator.targets_by_center.centers = [
        {
          center_id: 3,
          center_acronym: 'CIAT',
          targets: [{ year: '2026', target_value: '1' }],
        },
      ];

      (service as any).assignIndicatorCenterContext(indicator, 2026);

      expect(indicator.center_id).toBe(3);
    });
  });
});
