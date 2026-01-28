import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorResultsRepository } from './contribution-to-indicator-result.repository';
import { IndicatorSupportingResult } from '../dto/contribution-to-wp-outcome.dto';

describe('ContributionToIndicatorResultsRepository', () => {
  let repo: ContributionToIndicatorResultsRepository;
  let mockQuery: jest.Mock;
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (mockDataSource as any).query = mockQuery;
    repo = new ContributionToIndicatorResultsRepository(
      mockDataSource,
      mockHandlersError,
    );
  });

  it('should be defined and construct with DataSource and HandlersError', () => {
    expect(repo).toBeDefined();
    expect(mockDataSource.createEntityManager).toHaveBeenCalled();
  });

  describe('findBasicContributionIndicatorDataByTocId', () => {
    it('should return first row when query returns data', async () => {
      const tocId = 'indicator-uuid-1';
      const row = { contribution_id: 1, achieved_in_2024: 100 };
      mockQuery.mockResolvedValueOnce([row]);

      const result = await repo.findBasicContributionIndicatorDataByTocId(
        tocId,
      );

      expect(result).toEqual(row);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('contribution_to_indicators'),
        [tocId],
      );
    });

    it('should throw when query returns empty array', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(
        repo.findBasicContributionIndicatorDataByTocId('unknown-toc-id'),
      ).rejects.toThrow(
        'Basic data for Contribution to Indicator with tocId unknown-toc-id could not be found',
      );
    });

    it('should throw via HandlersError when query rejects', async () => {
      const dbError = new Error('Connection refused');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repo.findBasicContributionIndicatorDataByTocId('toc-id'),
      ).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: 'ContributionToIndicatorResultsRepository',
        debug: true,
      });
    });
  });

  describe('findResultContributionsByTocId', () => {
    it('should return removeInactives result when query succeeds', async () => {
      const tocId = 'toc-uuid';
      const rows: IndicatorSupportingResult[] = [
        {
          contribution_id: 1,
          is_active: true,
          result_id: 10,
          title: 'Result A',
        } as IndicatorSupportingResult,
      ];
      mockQuery.mockResolvedValueOnce(rows);

      const result = await repo.findResultContributionsByTocId(tocId);

      expect(result).toEqual(rows);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [tocId, tocId],
      );
    });

    it('should filter out inactives via removeInactives', async () => {
      const tocId = 'toc-uuid';
      const rows: IndicatorSupportingResult[] = [
        { contribution_id: 1, is_active: true } as IndicatorSupportingResult,
        { contribution_id: 2, is_active: false } as IndicatorSupportingResult,
        { contribution_id: null, is_active: false } as any,
      ];
      mockQuery.mockResolvedValueOnce(rows);

      const result = await repo.findResultContributionsByTocId(tocId);

      expect(result).toHaveLength(2);
      expect(result[0].is_active).toBe(true);
      expect(result[1].contribution_id).toBeNull();
    });

    it('should throw via HandlersError when query rejects', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        repo.findResultContributionsByTocId('toc-id'),
      ).rejects.toThrow();
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalled();
    });
  });

  describe('removeInactives', () => {
    it('should keep items with contribution_id and is_active true', () => {
      const list: IndicatorSupportingResult[] = [
        { contribution_id: 1, is_active: true } as IndicatorSupportingResult,
      ];
      expect(repo.removeInactives(list)).toEqual(list);
    });

    it('should filter out items with contribution_id and is_active false', () => {
      const list: IndicatorSupportingResult[] = [
        { contribution_id: 1, is_active: true } as IndicatorSupportingResult,
        { contribution_id: 2, is_active: false } as IndicatorSupportingResult,
      ];
      const result = repo.removeInactives(list);
      expect(result).toHaveLength(1);
      expect(result[0].contribution_id).toBe(1);
    });

    it('should keep items without contribution_id regardless of is_active', () => {
      const list: IndicatorSupportingResult[] = [
        { contribution_id: null, is_active: false } as any,
        { contribution_id: undefined, is_active: false } as any,
      ];
      const result = repo.removeInactives(list);
      expect(result).toHaveLength(2);
    });
  });

  describe('getContributingResultsQuery', () => {
    it('should return SQL string containing expected fragments', () => {
      const sql = repo.getContributingResultsQuery();

      expect(typeof sql).toBe('string');
      expect(sql).toContain('main_ctir');
      expect(sql).toContain('toc_results_indicators');
      expect(sql).toContain('contribution_to_indicator_results');
      expect(sql).toContain('tri.related_node_id = ?');
      expect(sql).toContain('cti.toc_result_id = ?');
    });
  });
});
