import { Test, TestingModule } from '@nestjs/testing';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './repositories/toc-work-packages.repository';
import { ResultRepository } from '../results/result.repository';
import { ResultsService } from '../results/results.service';
import { ResultsKnowledgeProductsService } from '../results/results-knowledge-products/results-knowledge-products.service';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ShareResultRequestService } from '../results/share-result-request/share-result-request.service';
import { ResultsByProjectsService } from '../results/results_by_projects/results_by_projects.service';
import { ContributionToIndicatorResultsRepository } from '../contribution-to-indicators/repositories/contribution-to-indicator-result.repository';

const mockClarisaInitiativesRepository = {
  findOne: jest.fn(),
};

const mockRoleByUserRepository = {
  findOne: jest.fn(),
  isUserAdmin: jest.fn(),
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
  findByCompositeCode: jest.fn(),
  findResultById: jest.fn(),
  findIndicatorById: jest.fn(),
  findUnitAcronymsByProgram: jest.fn(),
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

const mockShareResultRequestService = {
  resultRequest: jest.fn(),
  findUnitAcronymsByProgram: jest.fn(),
};

const mockResultRepository = {
  getIndicatorContributionSummaryByProgram: jest.fn(),
  getActiveResultTypes: jest.fn(),
  getResultById: jest.fn(),
};

const mockResultsByProjectsService = {
  linkBilateralProjectToResult: jest.fn(),
};

const mockContributionToIndicatorResultsRepository = {
  find: jest.fn(),
};

describe('ResultsFrameworkReportingService', () => {
  let service: ResultsFrameworkReportingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsFrameworkReportingService,
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
          provide: TocResultsRepository,
          useValue: mockTocResultsRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
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
    it('should return formatted units when all checks pass', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 5,
        official_code: 'PR-001',
        name: 'Program 1',
        short_name: 'P1',
      });
      mockRoleByUserRepository.findOne.mockResolvedValue({ id: 1 });
      mockYearRepository.findOne.mockResolvedValue({ year: 2025 });
      mockClarisaGlobalUnitRepository.findOne.mockResolvedValue({
        id: 100,
        code: 'PR-001',
        name: 'Program Node',
        composeCode: 'PR-001-ROOT',
        year: 2025,
        level: 1,
        portfolioId: 3,
      });
      mockClarisaGlobalUnitRepository.find.mockResolvedValue([
        {
          id: 101,
          code: 'PR-001-A',
          name: 'Child A',
          composeCode: 'PR-001-ROOT-A',
          year: 2025,
          level: 2,
          parentId: 100,
        },
      ]);
      mockTocResultsRepository.findUnitAcronymsByProgram.mockResolvedValue(
        new Set(['PR-001-A']),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-001');

      expect(mockClarisaInitiativesRepository.findOne).toHaveBeenCalledWith({
        where: { official_code: 'PR-001', active: true },
        select: ['id', 'official_code', 'name', 'short_name', 'portfolio_id'],
      });
      expect(mockClarisaGlobalUnitRepository.find).toHaveBeenCalledWith({
        where: {
          parentId: 100,
          level: 2,
          portfolioId: 3,
          year: 2025,
          isActive: true,
        },
        order: { code: 'ASC' },
      });

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
            id: 100,
            code: 'PR-001',
            level: 1,
          },
          units: [
            expect.objectContaining({
              id: 101,
              code: 'PR-001-A',
              level: 2,
            }),
          ],
          metadata: { activeYear: 2025, portfolio: 3 },
        },
      });
    });

    it('should allow admins when no membership but user is admin', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 5,
        official_code: 'PR-002',
      });
      mockRoleByUserRepository.findOne.mockResolvedValue(null);
      mockRoleByUserRepository.isUserAdmin.mockResolvedValue(true);
      mockYearRepository.findOne.mockResolvedValue({ year: 2025 });
      mockClarisaGlobalUnitRepository.findOne.mockResolvedValue({
        id: 200,
        code: 'PR-002',
        composeCode: 'PR-002-ROOT',
        level: 1,
        year: 2025,
        portfolioId: 3,
      });
      mockClarisaGlobalUnitRepository.find.mockResolvedValue([]);
      mockTocResultsRepository.findUnitAcronymsByProgram.mockResolvedValue(
        new Set([]),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-002');

      expect(result.status).toBe(200);
    });

    it('should filter out units whose code does not exist in ToC work packages', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValue({
        id: 7,
        official_code: 'PR-010',
        name: 'Program 10',
        short_name: 'P10',
      });
      mockRoleByUserRepository.findOne.mockResolvedValue({ id: 1 });
      mockYearRepository.findOne.mockResolvedValue({ year: 2025 });
      mockClarisaGlobalUnitRepository.findOne.mockResolvedValue({
        id: 300,
        code: 'PR-010',
        name: 'Program Node 10',
        composeCode: 'PR-010-ROOT',
        year: 2025,
        level: 1,
        portfolioId: 3,
      });
      mockClarisaGlobalUnitRepository.find.mockResolvedValue([
        {
          id: 301,
          code: 'PR-010-A',
          name: 'Child A',
          composeCode: 'PR-010-ROOT-A',
          year: 2025,
          level: 2,
          parentId: 300,
        },
        {
          id: 302,
          code: 'PR-010-B',
          name: 'Child B',
          composeCode: 'PR-010-ROOT-B',
          year: 2025,
          level: 2,
          parentId: 300,
        },
      ]);
      // Only A exists in ToC
      mockTocResultsRepository.findUnitAcronymsByProgram.mockResolvedValue(
        new Set(['PR-010-A']),
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
      mockTocResultsRepository.findUnitAcronymsByProgram.mockResolvedValue(
        new Set([]),
      );

      const result = await service.getGlobalUnitsByProgram(user, 'PR-003');
      expect(result.status).toBe(500);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: thrown,
        debug: true,
      });
    });
  });

  describe('getWorkPackagesByProgramAndArea', () => {
    beforeEach(() => {
      mockTocResultsRepository.findByCompositeCode.mockReset();
      mockYearRepository.findOne.mockReset();
    });

    it('should return work packages when repository returns data', async () => {
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

      expect(mockTocResultsRepository.findByCompositeCode).toHaveBeenCalledWith(
        'SP01',
        'SP01-AOW01',
        2024,
      );
      expect(mockYearRepository.findOne).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 200,
        response: {
          compositeCode: 'SP01-AOW01',
          year: 2024,
          tocResults: [
            {
              id: 1,
              category: 'OUTPUT',
              result_title: 'Result 1',
              related_node_id: 'NODE-1',
            },
          ],
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
      mockYearRepository.findOne.mockResolvedValueOnce({ year: '2026' });

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'sp02',
        'aow03',
      );

      expect(mockTocResultsRepository.findByCompositeCode).toHaveBeenCalledWith(
        'SP02',
        'SP02-AOW03',
        2026,
      );
      expect(mockYearRepository.findOne).toHaveBeenCalledWith({
        where: { active: true },
        select: ['year'],
      });
      expect(result.response.year).toBe(2026);
    });

    it('should return handler error when parameters are missing', async () => {
      const result: any = await service.getWorkPackagesByProgramAndArea('', '');
      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(mockYearRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return handler error when repository yields empty result', async () => {
      mockTocResultsRepository.findByCompositeCode.mockResolvedValueOnce([]);
      mockYearRepository.findOne.mockResolvedValueOnce({ year: 2025 });

      const result: any = await service.getWorkPackagesByProgramAndArea(
        'SP03',
        'AOW05',
      );

      expect(result.status).toBe(404);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should return handler error when active year is not configured', async () => {
      mockYearRepository.findOne.mockResolvedValueOnce(null);

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
      mockYearRepository.findOne.mockResolvedValueOnce({ year: 'NaN' });

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
  });

  describe('getProgramIndicatorContributionSummary', () => {
    beforeEach(() => {
      mockResultRepository.getIndicatorContributionSummaryByProgram.mockReset();
      mockResultRepository.getActiveResultTypes.mockReset();
    });

    it('should aggregate indicator contribution summaries for the program', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 15,
        official_code: 'SP05',
        name: 'Sample Program',
      });

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

      expect(
        mockResultRepository.getIndicatorContributionSummaryByProgram,
      ).toHaveBeenCalledWith(15);
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

    it('should return zeroed totals when no indicator-linked results are found', async () => {
      mockClarisaInitiativesRepository.findOne.mockResolvedValueOnce({
        id: 99,
        official_code: 'SP99',
        name: 'Program 99',
      });

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
      mockShareResultRequestService.resultRequest.mockReset();
      mockResultsByProjectsService.linkBilateralProjectToResult.mockReset();
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
          indicators: [{ indicator_id: 777 }],
        },
        user,
      );

      expect(mockResultsService.createOwnerResultV2).toHaveBeenCalledWith(
        baseResult,
        user,
      );
      expect(mockResultsKnowledgeProductsService.create).not.toHaveBeenCalled();
      expect(mockResultsTocResultRepository.save).toHaveBeenCalled();
      expect(mockResultsTocResultIndicatorsRepository.save).toHaveBeenCalled();
      expect(
        mockShareResultRequestService.resultRequest,
      ).not.toHaveBeenCalled();
      // No bilateral project data provided -> should not call link service
      expect(
        mockResultsByProjectsService.linkBilateralProjectToResult,
      ).not.toHaveBeenCalled();
      expect(response.response.tocResultLinkId).toBe(900);
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
          indicators: [{ indicator_id: 999 }],
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
      expect(mockResultsTocResultRepository.update).toHaveBeenCalledWith(333, {
        toc_result_id: 888,
        toc_progressive_narrative: null,
        last_updated_by: user.id,
        is_active: true,
      });
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
          indicators: [{ indicator_id: 5555 }],
          bilateral_project: [
            { project_id: 9001, project_name: 'Proj A' },
            { project_id: '9002', project_name: 'Proj B' },
            { project_id: 'invalid' }, // ignored
          ],
        } as any,
        user,
      );

      expect(response.status).toBe(201);
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
  });

  describe('getExistingResultContributorsToIndicators', () => {
    beforeEach(() => {
      mockResultsTocResultRepository.find.mockReset();
      mockResultsTocResultIndicatorsRepository.find.mockReset();
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
          },
        },
        {
          result_toc_result_id: 12,
          result_id: 102,
          toc_result_id: 5,
          obj_results: {
            title: 'Result Beta',
            result_code: 'RES-102',
            result_type_id: 3,
          },
        },
      ]);
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([
        { results_toc_results_id: 11 },
      ]);

      const result: any =
        await service.getExistingResultContributorsToIndicators(5, 'IND-55');

      expect(mockResultsTocResultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_result_id: 5,
            is_active: true,
          }),
        }),
      );
      expect(
        mockResultsTocResultIndicatorsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_results_indicator_id: 'IND-55',
            is_active: true,
          }),
        }),
      );
      expect(result.status).toBe(200);
      expect(result.response.contributors).toEqual([
        {
          result_id: 101,
          title: 'Result Alpha',
          result_code: 'RES-101',
        },
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
          },
        },
      ]);
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([]);

      const result: any =
        await service.getExistingResultContributorsToIndicators(8, 'IND-99');

      expect(result.status).toBe(200);
      expect(result.response.contributors).toEqual([]);
    });

    it('should propagate errors through handlers when invalid id provided', async () => {
      const result = await service.getExistingResultContributorsToIndicators(
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
        9,
        '',
      );

      expect(result.status).toBe(400);
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });

    it('should return not found when no contribution exists', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([]);

      const result = await service.getExistingResultContributorsToIndicators(
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
});
