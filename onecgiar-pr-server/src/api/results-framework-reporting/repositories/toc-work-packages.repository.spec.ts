import { DataSource } from 'typeorm';
import { env } from 'process';
import { TocResultsRepository } from './toc-work-packages.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

describe('TocResultsRepository', () => {
  const mockDataSource = {
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn(({ error }) => error),
  } as unknown as HandlersError;

  let repository: TocResultsRepository;

  beforeAll(() => {
    env.DB_TOC = 'toc_test';
  });

  beforeEach(() => {
    (mockDataSource.query as jest.Mock).mockReset();
    (mockHandlersError.returnErrorRepository as jest.Mock).mockClear();
    repository = new TocResultsRepository(mockDataSource, mockHandlersError);
  });

  it('should execute the aggregate query for composite code with expected clauses', async () => {
    (mockDataSource.query as jest.Mock).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', 2025);

    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    const [query, params] = (mockDataSource.query as jest.Mock).mock.calls[0];

    expect(params).toEqual(['SP01-AOW01', 2025, 'SP01', 'OUTPUT', 'OUTCOME']);
    expect(query).toContain(
      'COALESCE(SUM(CAST(trit.target_value AS SIGNED)), 0) AS target_value_sum',
    );
    expect(query).toContain('GROUP BY');
    expect(query).toContain('ORDER BY tr.id ASC, tri.id ASC');
    expect(query).toContain('FROM toc_test.toc_results tr');
    expect(query).toContain(
      'JOIN toc_test.toc_work_packages wp ON tr.wp_id = wp.toc_id',
    );
    expect(query).toContain('JOIN toc_test.toc_result_indicator_target');
    expect(query).toContain('AND trit.target_date = ?');
    expect(query).toContain('WHERE');
  });

  it('should omit work package join when composite code is not provided', async () => {
    (mockDataSource.query as jest.Mock).mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', 2025);

    expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    const [query, params] = (mockDataSource.query as jest.Mock).mock.calls[0];

    expect(params).toEqual([2025, 'SP01', 'EOI']);
    expect(query).toContain('FROM toc_test.toc_results tr');
    expect(query).not.toContain('JOIN toc_test.toc_work_packages');
    expect(query).toContain(
      'JOIN toc_test.toc_results_indicators tri ON tri.toc_results_id = tr.id',
    );
    expect(query).toContain('JOIN toc_test.toc_result_indicator_target');
    expect(query).toContain('AND trit.target_date = ?');
  });

  it('should delegate query failures to the handlers error utility', async () => {
    const dbError = new Error('db failure');
    (mockDataSource.query as jest.Mock).mockRejectedValueOnce(dbError);
    (
      mockHandlersError.returnErrorRepository as jest.Mock
    ).mockImplementationOnce(({ error }) => error);

    await expect(
      repository.findByCompositeCode('SP02', 'SP02-AOW02', 2026),
    ).rejects.toBe(dbError);

    expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
      error: dbError,
      className: TocResultsRepository.name,
      debug: true,
    });
  });

  it('should fetch a single ToC result by id', async () => {
    (mockDataSource.query as jest.Mock).mockResolvedValueOnce([
      { id: 10, result_title: 'Sample' },
    ]);

    const result = await repository.findResultById(10);

    expect(mockDataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results'),
      [10],
    );
    expect(result).toEqual({ id: 10, result_title: 'Sample' });
  });

  it('should fetch a single ToC indicator by id', async () => {
    (mockDataSource.query as jest.Mock).mockResolvedValueOnce([
      { id: 50, toc_results_id: 10, toc_result_indicator_id: 'KP-01' },
    ]);

    const indicator = await repository.findIndicatorById(50);

    expect(mockDataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results_indicators'),
      [50],
    );
    expect(indicator).toEqual({
      id: 50,
      toc_results_id: 10,
      toc_result_indicator_id: 'KP-01',
    });
  });
});
