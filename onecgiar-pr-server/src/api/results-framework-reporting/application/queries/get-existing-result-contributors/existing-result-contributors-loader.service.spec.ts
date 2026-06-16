import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResultsTocResultRepository } from '../../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ExistingResultContributorsLoaderService } from './existing-result-contributors-loader.service';

describe('ExistingResultContributorsLoaderService', () => {
  let service: ExistingResultContributorsLoaderService;

  const mockResultsTocResultRepository = {
    find: jest.fn(),
  };
  const mockResultsTocResultIndicatorsRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExistingResultContributorsLoaderService,
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        {
          provide: ResultsTocResultIndicatorsRepository,
          useValue: mockResultsTocResultIndicatorsRepository,
        },
      ],
    }).compile();

    service = module.get(ExistingResultContributorsLoaderService);
  });

  describe('parseResultTocResultId', () => {
    it('should parse valid numeric ids', () => {
      expect(service.parseResultTocResultId(5)).toBe(5);
      expect(service.parseResultTocResultId('12')).toBe(12);
    });

    it('should reject invalid ids', () => {
      expect(() => service.parseResultTocResultId('abc')).toThrow(
        'Invalid resultTocResultId provided.',
      );
      expect(() => service.parseResultTocResultId(0)).toThrow(
        'Invalid resultTocResultId provided.',
      );
    });
  });

  describe('validateTocResultIndicatorId', () => {
    it('should return trimmed indicator id', () => {
      expect(service.validateTocResultIndicatorId('IND-55')).toBe('IND-55');
    });

    it('should reject empty indicator ids', () => {
      expect(() => service.validateTocResultIndicatorId('')).toThrow(
        'Invalid tocResultIndicatorId provided.',
      );
      expect(() => service.validateTocResultIndicatorId('   ')).toThrow(
        'Invalid tocResultIndicatorId provided.',
      );
    });
  });

  describe('loadContributions', () => {
    it('should query contributions with expected filters', async () => {
      const records = [{ result_toc_result_id: 11, result_id: 101 }];
      mockResultsTocResultRepository.find.mockResolvedValueOnce(records);

      const result = await service.loadContributions(5, 'IND-55');

      expect(mockResultsTocResultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_result_id: 5,
            is_active: true,
            obj_results_toc_result_indicators: expect.objectContaining({
              toc_results_indicator_id: 'IND-55',
              is_active: true,
              is_not_aplicable: false,
            }),
          }),
        }),
      );
      expect(result).toEqual(records);
    });

    it('should throw not found when repository returns no rows', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([]);

      await expect(
        service.loadContributions(10, 'IND-1'),
      ).rejects.toMatchObject({
        message:
          'No result contribution record was found with the provided resultTocResultId.',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('filterContributorsWithIndicator', () => {
    const contributions = [
      { result_toc_result_id: 11, result_id: 101 },
      { result_toc_result_id: 12, result_id: 102 },
    ];

    it('should return null when no indicator links exist', async () => {
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([]);

      const result = await service.filterContributorsWithIndicator(
        contributions as any,
        'IND-55',
      );

      expect(result).toBeNull();
    });

    it('should return only contributors linked to the indicator', async () => {
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([
        { results_toc_results_id: 11 },
      ]);

      const result = await service.filterContributorsWithIndicator(
        contributions as any,
        'IND-55',
      );

      expect(
        mockResultsTocResultIndicatorsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            results_toc_results_id: expect.anything(),
            toc_results_indicator_id: 'IND-55',
            is_active: true,
            is_not_aplicable: false,
          }),
        }),
      );
      expect(result).toEqual([contributions[0]]);
    });
  });
});
