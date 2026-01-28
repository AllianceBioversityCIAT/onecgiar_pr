import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorsRepository } from './contribution-to-indicators.repository';
import { ContributionToIndicatorResultsRepository } from './contribution-to-indicator-result.repository';

describe('ContributionToIndicatorsRepository', () => {
  let repo: ContributionToIndicatorsRepository;
  let mockQuery: jest.Mock;
  let mockRemoveInactives: jest.Mock;
  let mockGetContributingResultsQuery: jest.Mock;
  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;
  const mockHandlersError = {
    returnErrorRepository: jest.fn((config: any) => {
      throw Object.assign(new Error(config?.error?.message ?? 'repo error'), {
        ...config,
      });
    }),
  } as unknown as HandlersError;
  const mockContributionToIndicatorResultsRepository = {
    removeInactives: jest.fn((x: any[]) => x ?? []),
    getContributingResultsQuery: jest.fn(() => 'SELECT 1'),
  } as unknown as ContributionToIndicatorResultsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    mockRemoveInactives = jest.fn((x: any[]) => x ?? []);
    mockGetContributingResultsQuery = jest.fn(() => 'SELECT 1');
    (mockDataSource as any).query = mockQuery;
    (mockContributionToIndicatorResultsRepository as any).removeInactives =
      mockRemoveInactives;
    (mockContributionToIndicatorResultsRepository as any).getContributingResultsQuery =
      mockGetContributingResultsQuery;

    repo = new ContributionToIndicatorsRepository(
      mockDataSource,
      mockHandlersError,
      mockContributionToIndicatorResultsRepository,
    );
  });

  it('should be defined and construct with deps', () => {
    expect(repo).toBeDefined();
    expect(mockDataSource.createEntityManager).toHaveBeenCalled();
  });

  describe('findAllOutcomes', () => {
    it('should return workpackages and enrich indicator_supporting_results', async () => {
      const wpRow = {
        workpackage: {
          toc_results: [
            {
              indicators: [{ indicator_uuid: 'ind-uuid-1' }],
            },
          ],
        },
      };
      mockQuery
        .mockResolvedValueOnce([wpRow])
        .mockResolvedValueOnce([{ results: [{ contribution_id: 1 }] }]);

      const result = await repo.findAllOutcomes();

      expect(result).toHaveLength(1);
      expect(result[0].toc_results).toHaveLength(1);
      expect(result[0].toc_results[0].indicators).toHaveLength(1);
      expect(result[0].toc_results[0].indicators[0].indicator_supporting_results).toEqual([
        { contribution_id: 1 },
      ]);
      expect(mockRemoveInactives).toHaveBeenCalledWith([{ contribution_id: 1 }]);
    });

    it('should return empty when first query returns empty', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.findAllOutcomes();

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw via HandlersError when first query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB down'));

      await expect(repo.findAllOutcomes()).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: expect.any(Error),
        className: 'ContributionToIndicatorsRepository',
        debug: true,
      });
    });

    it('should handle toc_results null/undefined', async () => {
      mockQuery.mockResolvedValueOnce([
        { workpackage: { toc_results: null } },
        { workpackage: {} },
      ]);

      const result = await repo.findAllOutcomes();

      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllEoIs', () => {
    it('should return flat eois and enrich indicator_supporting_results', async () => {
      const eoiRow = {
        eois: {
          indicators: [{ indicator_uuid: 'eoi-ind-1' }],
        },
      };
      mockQuery
        .mockResolvedValueOnce([eoiRow])
        .mockResolvedValueOnce([{ results: [{ contribution_id: 2 }] }]);

      const result = await repo.findAllEoIs();

      expect(result).toHaveLength(1);
      expect(result[0].indicators).toHaveLength(1);
      expect(result[0].indicators[0].indicator_supporting_results).toEqual([
        { contribution_id: 2 },
      ]);
    });

    it('should throw when first query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await expect(repo.findAllEoIs()).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalled();
    });
  });

  describe('findAllOutcomesByInitiativeCode', () => {
    it('should query by initiative code and enrich indicators', async () => {
      const wpRow = {
        workpackage: {
          toc_results: [{ indicators: [{ indicator_uuid: 'by-code-1' }] }],
        },
      };
      mockQuery
        .mockResolvedValueOnce([wpRow])
        .mockResolvedValueOnce([{ results: [] }]);

      const result = await repo.findAllOutcomesByInitiativeCode('I01');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('official_code'),
        ['I01'],
      );
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw when _query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(
        repo.findAllOutcomesByInitiativeCode('I99'),
      ).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalled();
    });
  });

  describe('findAllEoisByInitiativeCode', () => {
    it('should query by initiative code and enrich indicators', async () => {
      const eoiRow = { eois: { indicators: [{ indicator_uuid: 'eoi-code-1' }] } };
      mockQuery
        .mockResolvedValueOnce([eoiRow])
        .mockResolvedValueOnce([{ results: [] }]);

      const result = await repo.findAllEoisByInitiativeCode('I02');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('official_code'),
        ['I02'],
      );
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw when _query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));

      await expect(
        repo.findAllEoisByInitiativeCode('I02'),
      ).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalled();
    });
  });
});
