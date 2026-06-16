import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AoWBilateralRepository } from '../../../../results/results-toc-results/repositories/aow-bilateral.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocTargetIndicatorRepository } from '../../../../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { FrameworkResultTocIndicatorsService } from './framework-result-toc-indicators.service';

describe('FrameworkResultTocIndicatorsService', () => {
  let service: FrameworkResultTocIndicatorsService;

  const mockTocResultsRepository = {
    findIndicatorById: jest.fn(),
  };
  const mockResultsTocResultIndicatorsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockResultsIndicatorsTargetsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrameworkResultTocIndicatorsService,
        {
          provide: AoWBilateralRepository,
          useValue: mockTocResultsRepository,
        },
        {
          provide: ResultsTocResultIndicatorsRepository,
          useValue: mockResultsTocResultIndicatorsRepository,
        },
        {
          provide: ResultsTocTargetIndicatorRepository,
          useValue: mockResultsIndicatorsTargetsRepository,
        },
      ],
    }).compile();

    service = module.get(FrameworkResultTocIndicatorsService);
  });

  it('should return early when indicators input is empty', async () => {
    await service.upsertTocIndicators(1, 10, null, null, 5);
    await service.upsertTocIndicators(1, 10, [], null, 5);

    expect(mockTocResultsRepository.findIndicatorById).not.toHaveBeenCalled();
  });

  it('should create indicator and target records for a valid indicator', async () => {
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
    mockResultsIndicatorsTargetsRepository.findOne.mockResolvedValueOnce(null);

    await service.upsertTocIndicators(
      707,
      444,
      {
        indicator_id: 81,
        number_target: '25',
        target_date: '2025',
        contributing_indicator: 3.5,
      },
      null,
      10,
    );

    expect(mockResultsTocResultIndicatorsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        results_toc_results_id: 707,
        toc_results_indicator_id: 'REL-81',
        created_by: 10,
      }),
    );
    expect(mockResultsIndicatorsTargetsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result_toc_result_indicator_id: 812,
        number_target: 25,
        contributing_indicator: 3.5,
        target_date: 2025,
      }),
    );
  });

  it('should update an existing target record', async () => {
    mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
      id: 90,
      toc_results_id: 500,
      related_node_id: 'REL-90',
    });
    mockResultsTocResultIndicatorsRepository.findOne.mockResolvedValueOnce({
      result_toc_result_indicator_id: 901,
    });
    mockResultsIndicatorsTargetsRepository.findOne.mockResolvedValueOnce({
      indicators_targets: 55,
    });

    await service.upsertTocIndicators(
      800,
      500,
      { indicator_id: 90, number_target: 10, contributing_indicator: 1 },
      null,
      11,
    );

    expect(mockResultsIndicatorsTargetsRepository.update).toHaveBeenCalledWith(
      55,
      expect.objectContaining({
        contributing_indicator: 1,
        last_updated_by: 11,
        is_active: true,
      }),
    );
    expect(mockResultsIndicatorsTargetsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject invalid indicator identifiers', async () => {
    await expect(
      service.upsertTocIndicators(1, 10, { indicator_id: 'bad' }, null, 5),
    ).rejects.toMatchObject({
      message: 'One of the provided ToC indicator identifiers is invalid.',
    });
  });

  it('should reject indicators not found in catalogue', async () => {
    mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce(null);

    await expect(
      service.upsertTocIndicators(1, 10, { indicator_id: 99 }, null, 5),
    ).rejects.toMatchObject({
      message: "No ToC indicator was found with id '99'.",
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should reject indicators that do not belong to the ToC result', async () => {
    mockTocResultsRepository.findIndicatorById.mockResolvedValueOnce({
      id: 77,
      toc_results_id: 999,
      related_node_id: 'REL-77',
    });

    await expect(
      service.upsertTocIndicators(1, 10, { indicator_id: 77 }, null, 5),
    ).rejects.toMatchObject({
      message:
        "The indicator '77' does not belong to the provided ToC result '10'.",
    });
  });
});
