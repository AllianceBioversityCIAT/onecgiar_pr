import { Test, TestingModule } from '@nestjs/testing';
import { ResultsFrameworkReportingController } from './results-framework-reporting.controller';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsService } from '../results/results.service';

describe('ResultsFrameworkReportingController', () => {
  let controller: ResultsFrameworkReportingController;
  let reportingService: jest.Mocked<ResultsFrameworkReportingService>;
  let resultsService: jest.Mocked<ResultsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsFrameworkReportingController],
      providers: [
        {
          provide: ResultsFrameworkReportingService,
          useValue: {
            getGlobalUnitsByProgram: jest.fn(),
            getWorkPackagesByProgramAndArea: jest.fn(),
          },
        },
        {
          provide: ResultsService,
          useValue: {
            getScienceProgramProgress: jest.fn(),
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
    it('should delegate to reporting service with supplied filters', () => {
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        {} as any,
      );

      controller.getTocWorkPackages('SP01', 'AOW01', '2024');

      expect(
        reportingService.getWorkPackagesByProgramAndArea,
      ).toHaveBeenCalledWith('SP01', 'AOW01', '2024');
    });
  });
});
