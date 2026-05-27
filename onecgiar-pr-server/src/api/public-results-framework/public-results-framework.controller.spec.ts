import { Test, TestingModule } from '@nestjs/testing';
import { PublicResultsFrameworkController } from './public-results-framework.controller';
import { ResultsFrameworkReportingService } from '../results-framework-reporting/results-framework-reporting.service';

describe('PublicResultsFrameworkController', () => {
  let controller: PublicResultsFrameworkController;
  let reportingService: jest.Mocked<ResultsFrameworkReportingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicResultsFrameworkController],
      providers: [
        {
          provide: ResultsFrameworkReportingService,
          useValue: {
            getWorkPackagesByProgramAndArea: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicResultsFrameworkController>(
      PublicResultsFrameworkController,
    );
    reportingService = module.get(
      ResultsFrameworkReportingService,
    ) as jest.Mocked<ResultsFrameworkReportingService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should pass undefined year when not provided', () => {
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        {} as any,
      );

      controller.getTocWorkPackages('SP01', 'AOW01');

      expect(
        reportingService.getWorkPackagesByProgramAndArea,
      ).toHaveBeenCalledWith('SP01', 'AOW01', undefined);
    });

    it('should return the same payload contract produced by the service (pass-through)', async () => {
      const servicePayload = {
        response: {
          compositeCode: 'SP01-AOW01',
          year: 2024,
          tocResultsOutcomes: [],
          tocResultsOutputs: [],
          metadata: { total: 0, outcomes: 0, outputs: 0 },
        },
        message: 'Work packages retrieved successfully.',
        status: 200,
      };
      reportingService.getWorkPackagesByProgramAndArea.mockResolvedValueOnce(
        servicePayload as any,
      );

      const result = await controller.getTocWorkPackages('SP01', 'AOW01');

      // The public controller is a thin delegate: it returns the service result
      // unchanged, so the contract is identical to the private endpoint.
      expect(result).toBe(servicePayload);
    });
  });
});
