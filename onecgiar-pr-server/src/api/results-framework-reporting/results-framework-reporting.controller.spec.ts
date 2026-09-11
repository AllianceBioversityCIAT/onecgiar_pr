import { Test, TestingModule } from '@nestjs/testing';
import { ResultsFrameworkReportingController } from './results-framework-reporting.controller';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsService } from '../results/results.service';
import { ReportingEntryHubService } from './services/reporting-entry-hub.service';

describe('ResultsFrameworkReportingController', () => {
  let controller: ResultsFrameworkReportingController;
  let reportingService: jest.Mocked<ResultsFrameworkReportingService>;
  let resultsService: jest.Mocked<ResultsService>;
  let reportingEntryHubService: jest.Mocked<ReportingEntryHubService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsFrameworkReportingController],
      providers: [
        {
          provide: ResultsFrameworkReportingService,
          useValue: {
            getGlobalUnitsByProgram: jest.fn(),
            getResultsScope: jest.fn(),
            getWorkPackagesByProgramAndArea: jest.fn(),
            getIntermediateOutcomes: jest.fn(),
            getToc2030Outcomes: jest.fn(),
            getProgramIndicatorContributionSummary: jest.fn(),
            createResultFromFramework: jest.fn(),
            getExistingResultContributorsToIndicators: jest.fn(),
            getDashboardStats: jest.fn(),
          },
        },
        {
          provide: ResultsService,
          useValue: {
            getScienceProgramProgress: jest.fn(),
          },
        },
        {
          provide: ReportingEntryHubService,
          useValue: {
            getMyCenterProjects: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ResultsFrameworkReportingController>(
      ResultsFrameworkReportingController,
    );
    reportingService = module.get(
      ResultsFrameworkReportingService,
    ) as jest.Mocked<ResultsFrameworkReportingService>;
    resultsService = module.get(ResultsService) as jest.Mocked<ResultsService>;
    reportingEntryHubService = module.get(
      ReportingEntryHubService,
    ) as jest.Mocked<ReportingEntryHubService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getScienceProgramProgress', () => {
    const user: any = { id: 1 };

    it('should call resultsService with undefined version when not provided', () => {
      resultsService.getScienceProgramProgress.mockResolvedValueOnce({} as any);

      controller.getScienceProgramProgress(user);

      expect(resultsService.getScienceProgramProgress).toHaveBeenCalledWith(
        user,
        undefined,
      );
    });

    it('should normalize version param to number', () => {
      resultsService.getScienceProgramProgress.mockResolvedValueOnce({} as any);

      controller.getScienceProgramProgress(user, '5');

      expect(resultsService.getScienceProgramProgress).toHaveBeenCalledWith(
        user,
        5,
      );
    });
  });

  describe('getClarisaGlobalUnits', () => {
    const user: any = { id: 1 };

    it('should delegate to reporting service with provided programId', () => {
      reportingService.getGlobalUnitsByProgram.mockResolvedValueOnce({} as any);

      controller.getClarisaGlobalUnits(user, 'PR-001');

      expect(reportingService.getGlobalUnitsByProgram).toHaveBeenCalledWith(
        user,
        'PR-001',
      );
    });
  });

  describe('getTocWorkPackages', () => {
    it('should delegate to reporting service with supplied filters and undefined versionId when not provided (OPF-R-3)', () => {
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        {} as any,
      );

      controller.getTocWorkPackages('SP01', 'AOW01', '2024');

      expect(
        reportingService.getWorkPackagesByProgramAndArea,
      ).toHaveBeenCalledWith('SP01', 'AOW01', '2024', undefined);
    });

    it('should normalize a numeric versionId query param to a number (OPF-R-6)', () => {
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        {} as any,
      );

      controller.getTocWorkPackages('SP01', 'AOW01', '2024', '34');

      expect(
        reportingService.getWorkPackagesByProgramAndArea,
      ).toHaveBeenCalledWith('SP01', 'AOW01', '2024', 34);
    });

    it('should pass NaN through for a non-numeric versionId so the service can reject it with a 4xx (OPF-R-6)', () => {
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        {} as any,
      );

      controller.getTocWorkPackages('SP01', 'AOW01', '2024', 'not-a-number');

      const call =
        reportingService.getWorkPackagesByProgramAndArea.mock.calls[0];
      expect(call[0]).toBe('SP01');
      expect(call[1]).toBe('AOW01');
      expect(call[2]).toBe('2024');
      expect(call[3]).toBeNaN();
    });
  });

  describe('getIntermediateOutcomes', () => {
    it('should delegate to reporting service with undefined versionId when not provided (OPF-R-3)', () => {
      reportingService.getIntermediateOutcomes.mockResolvedValueOnce({} as any);

      controller.getIntermediateOutcomes('SP01');

      expect(reportingService.getIntermediateOutcomes).toHaveBeenCalledWith(
        'SP01',
        undefined,
      );
    });

    it('should normalize a numeric versionId query param to a number (OPF-R-6)', () => {
      reportingService.getIntermediateOutcomes.mockResolvedValueOnce({} as any);

      controller.getIntermediateOutcomes('SP01', '34');

      expect(reportingService.getIntermediateOutcomes).toHaveBeenCalledWith(
        'SP01',
        34,
      );
    });

    it('should pass NaN through for a non-numeric versionId (OPF-R-6)', () => {
      reportingService.getIntermediateOutcomes.mockResolvedValueOnce({} as any);

      controller.getIntermediateOutcomes('SP01', 'not-a-number');

      const call = reportingService.getIntermediateOutcomes.mock.calls[0];
      expect(call[0]).toBe('SP01');
      expect(call[1]).toBeNaN();
    });
  });

  // @akili-spec changes/results-aow-column-filter (RAC-T-1)
  describe('getResultsScope', () => {
    it('should delegate to reporting service with undefined versionId when not provided', () => {
      reportingService.getResultsScope.mockResolvedValueOnce({} as any);

      controller.getResultsScope('SP01');

      expect(reportingService.getResultsScope).toHaveBeenCalledWith(
        'SP01',
        undefined,
      );
    });

    it('should forward programId and normalize a numeric versionId query param to a number', () => {
      reportingService.getResultsScope.mockResolvedValueOnce({} as any);

      controller.getResultsScope('SP01', '36');

      expect(reportingService.getResultsScope).toHaveBeenCalledWith('SP01', 36);
    });

    it('should pass NaN through for a non-numeric versionId (400 is the service’s call)', () => {
      reportingService.getResultsScope.mockResolvedValueOnce({} as any);

      controller.getResultsScope('SP01', 'abc');

      const call = reportingService.getResultsScope.mock.calls[0];
      expect(call[0]).toBe('SP01');
      expect(call[1]).toBeNaN();
    });
  });

  describe('getToc2030Outcomes', () => {
    it('should delegate to reporting service with undefined versionId when not provided (OPF-R-3)', () => {
      reportingService.getToc2030Outcomes.mockResolvedValueOnce({} as any);

      controller.getToc2030Outcomes('SP01');

      expect(reportingService.getToc2030Outcomes).toHaveBeenCalledWith(
        'SP01',
        undefined,
      );
    });

    it('should normalize a numeric versionId query param to a number (OPF-R-6)', () => {
      reportingService.getToc2030Outcomes.mockResolvedValueOnce({} as any);

      controller.getToc2030Outcomes('SP01', '34');

      expect(reportingService.getToc2030Outcomes).toHaveBeenCalledWith(
        'SP01',
        34,
      );
    });

    it('should pass NaN through for a non-numeric versionId (OPF-R-6)', () => {
      reportingService.getToc2030Outcomes.mockResolvedValueOnce({} as any);

      controller.getToc2030Outcomes('SP01', 'not-a-number');

      const call = reportingService.getToc2030Outcomes.mock.calls[0];
      expect(call[0]).toBe('SP01');
      expect(call[1]).toBeNaN();
    });
  });

  describe('getProgramIndicatorContributionSummary', () => {
    it('should delegate to reporting service with undefined versionId when not provided', () => {
      reportingService.getProgramIndicatorContributionSummary.mockResolvedValueOnce(
        {} as any,
      );

      controller.getProgramIndicatorContributionSummary('SP05');

      expect(
        reportingService.getProgramIndicatorContributionSummary,
      ).toHaveBeenCalledWith('SP05', undefined);
    });

    it('should normalize a numeric versionId query param to a number (W12-R-2)', () => {
      reportingService.getProgramIndicatorContributionSummary.mockResolvedValueOnce(
        {} as any,
      );

      controller.getProgramIndicatorContributionSummary('SP05', '12');

      expect(
        reportingService.getProgramIndicatorContributionSummary,
      ).toHaveBeenCalledWith('SP05', 12);
    });

    it('should pass undefined for a non-numeric versionId query param (W12-R-2)', () => {
      reportingService.getProgramIndicatorContributionSummary.mockResolvedValueOnce(
        {} as any,
      );

      controller.getProgramIndicatorContributionSummary('SP05', 'not-a-number');

      expect(
        reportingService.getProgramIndicatorContributionSummary,
      ).toHaveBeenCalledWith('SP05', undefined);
    });
  });

  describe('createResultFromFramework', () => {
    it('should delegate to reporting service', () => {
      reportingService.createResultFromFramework.mockResolvedValueOnce(
        {} as any,
      );

      controller.createResultFromFramework({} as any, { id: 1 } as any);

      expect(reportingService.createResultFromFramework).toHaveBeenCalled();
    });
  });

  describe('getExistingResultContributorsAndPartners', () => {
    it('should delegate to reporting service', () => {
      reportingService.getExistingResultContributorsToIndicators.mockResolvedValueOnce(
        {} as any,
      );

      controller.getExistingResultContributorsAndPartners(
        { id: 1 } as any,
        55,
        'IND-7',
      );

      expect(
        reportingService.getExistingResultContributorsToIndicators,
      ).toHaveBeenCalledWith({ id: 1 }, 55, 'IND-7', undefined);
    });

    // @akili-spec changes/indicator-reported-results (IRR-R-3)
    it('should forward the scope query param to the reporting service', () => {
      reportingService.getExistingResultContributorsToIndicators.mockResolvedValueOnce(
        {} as any,
      );

      controller.getExistingResultContributorsAndPartners(
        { id: 1 } as any,
        55,
        'IND-7',
        'all',
      );

      expect(
        reportingService.getExistingResultContributorsToIndicators,
      ).toHaveBeenCalledWith({ id: 1 }, 55, 'IND-7', 'all');
    });
  });

  describe('getDashboardStats', () => {
    it('should delegate to reporting service with programId', () => {
      reportingService.getDashboardStats.mockResolvedValueOnce({} as any);

      controller.getDashboardStats('SP01');

      expect(reportingService.getDashboardStats).toHaveBeenCalledWith('SP01');
    });
  });

  describe('getReportingEntryHubProjects', () => {
    it('should delegate to ReportingEntryHubService with the user id and programId, returning its envelope unchanged (REH-TEST-2)', async () => {
      const user: any = { id: 1 };
      const envelope = {
        response: {
          programCode: 'SP02',
          activeYear: 2026,
          truncated: false,
          centers: [],
        },
        message: 'Reporting entry hub projects retrieved successfully.',
        status: 200,
      };
      reportingEntryHubService.getMyCenterProjects.mockResolvedValueOnce(
        envelope as any,
      );

      const result = await controller.getReportingEntryHubProjects(
        user,
        'SP02',
      );

      expect(reportingEntryHubService.getMyCenterProjects).toHaveBeenCalledWith(
        user.id,
        'SP02',
      );
      expect(result).toBe(envelope);
    });
  });
});
