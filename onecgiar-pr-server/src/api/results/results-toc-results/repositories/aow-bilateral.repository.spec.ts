import { DataSource } from 'typeorm';
import { env } from 'process';
import { AoWBilateralRepository } from './aow-bilateral.repository';
import { HandlersError } from '../../../../shared/handlers/error.utils';

describe('AoWBilateralRepository', () => {
  let dataSourceQueryMock: jest.Mock;
  let mockDataSource: DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn(({ error }) => error),
  } as unknown as HandlersError;

  let repository: AoWBilateralRepository;

  beforeAll(() => {
    env.DB_TOC = 'toc_test';
    env.DB_NAME = 'main_test';
  });

  beforeEach(() => {
    dataSourceQueryMock = jest.fn();
    mockDataSource = {
      query: dataSourceQueryMock,
    } as unknown as DataSource;
    (mockHandlersError.returnErrorRepository as jest.Mock).mockClear();
    repository = new AoWBilateralRepository(mockDataSource, mockHandlersError);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockPhaseId = (value: string | null = 'PHASE-1') =>
    jest
      .spyOn(repository as any, 'getCurrentTocPhaseId')
      .mockResolvedValue(value);

  it('should execute the aggregate query for composite code with expected clauses', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', 2025);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
    const [query, params] = dataSourceQueryMock.mock.calls[0];

    expect(params).toEqual([
      'SP01-AOW01',
      2025,
      'SP01',
      'OUTPUT',
      'OUTCOME',
      'PHASE-1',
    ]);
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
    expect(query).toContain('AND tr.phase = ?');
  });

  it('should omit work package join when composite code is not provided', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', 2025);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
    const [query, params] = dataSourceQueryMock.mock.calls[0];

    expect(params).toEqual([2025, 'SP01', 'EOI', 'PHASE-1']);
    expect(query).toContain('FROM toc_test.toc_results tr');
    expect(query).not.toContain('JOIN toc_test.toc_work_packages');
    expect(query).toContain(
      'JOIN toc_test.toc_results_indicators tri ON tri.toc_results_id = tr.id',
    );
    expect(query).toContain('JOIN toc_test.toc_result_indicator_target');
    expect(query).toContain('AND trit.target_date = ?');
    expect(query).toContain('AND tr.phase = ?');
  });

  it('excludes toc phase filter when no active phase exists', async () => {
    mockPhaseId(null);
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', 2025);

    const [, paramsFirstQuery] = dataSourceQueryMock.mock.calls[0];
    const [, paramsSecondQuery] = dataSourceQueryMock.mock.calls[1];
    expect(paramsFirstQuery).toEqual([
      'SP01-AOW01',
      2025,
      'SP01',
      'OUTPUT',
      'OUTCOME',
    ]);
    expect(paramsSecondQuery).toEqual([2025, 'SP01', 2025, 'SP01']);
  });

  it('should delegate query failures to the handlers error utility', async () => {
    mockPhaseId();
    const dbError = new Error('db failure');
    dataSourceQueryMock.mockRejectedValueOnce(dbError);
    (
      mockHandlersError.returnErrorRepository as jest.Mock
    ).mockImplementationOnce(({ error }) => error);

    await expect(
      repository.findByCompositeCode('SP02', 'SP02-AOW02', 2026),
    ).rejects.toBe(dbError);

    expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
      error: dbError,
      className: AoWBilateralRepository.name,
      debug: true,
    });
  });

  it('should fetch a single ToC result by id', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([
      { id: 10, result_title: 'Sample', category: 'OUTPUT' },
    ]);

    const result = await repository.findResultById(10);

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results'),
      [10, 'PHASE-1'],
    );
    expect(result).toEqual({
      id: 10,
      result_title: 'Sample',
      category: 'OUTPUT',
    });
  });

  it('should fetch a single ToC indicator by id', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([
      { id: 50, toc_results_id: 10, toc_result_indicator_id: 'KP-01' },
    ]);

    const indicator = await repository.findIndicatorById(50);

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results_indicators'),
      [50],
    );
    expect(indicator).toEqual({
      id: 50,
      toc_results_id: 10,
      toc_result_indicator_id: 'KP-01',
    });
  });

  it('should find unit acronyms by program', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([
      { acronym: 'AOW01' },
      { acronym: 'AOW02' },
    ]);

    const result = await repository.findUnitAcronymsByProgram('SP01');

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_work_packages'),
      ['SP01', 'PHASE-1'],
    );
    expect(result).toEqual(new Set(['AOW01', 'AOW02']));
  });

  it('finds unit acronyms without phase constraint when inactive', async () => {
    mockPhaseId(null);
    dataSourceQueryMock.mockResolvedValueOnce([]);

    await repository.findUnitAcronymsByProgram('SP02');

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_work_packages'),
      ['SP02'],
    );
  });

  it('should get indicator contributions with calculations', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([
      {
        indicator_id: 1,
        actual_achieved_value_sum: 15,
        target_value_sum: 20,
      },
      {
        indicator_id: 2,
        actual_achieved_value_sum: 10,
        target_value_sum: 25,
      },
    ]);

    const result = await repository.getIndicatorContributions('SP01', 2025);

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      [2025, 'SP01', 'PHASE-1', 2025, 'SP01', 'PHASE-1'],
    );
    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '75%',
      target_value_sum: 20,
      work_package_acronym: null,
    });
    expect(result.get(2)).toEqual({
      actual_achieved_value_sum: 10,
      progress_percentage: '40%',
      target_value_sum: 25,
      work_package_acronym: null,
    });
  });

  it('should handle zero target value in progress calculation', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([
      {
        indicator_id: 1,
        actual_achieved_value_sum: 15,
        target_value_sum: 0,
      },
    ]);

    const result = await repository.getIndicatorContributions('SP01');

    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '1500%',
      target_value_sum: 0,
      work_package_acronym: null,
    });
  });

  it('should find bilateral projects by toc result id', async () => {
    mockPhaseId();
    const mockProjects = [
      {
        toc_result_id: 1,
        official_code: 'SP01',
        project_id: 100,
        project_name: 'Test Project',
        project_summary: 'Test Summary',
      },
    ];
    dataSourceQueryMock.mockResolvedValueOnce(mockProjects);

    const result = await repository.findBilateralProjectById(1);

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results'),
      [1, 'PHASE-1'],
    );
    expect(result).toEqual(mockProjects);
  });

  it('should group toc rows correctly', async () => {
    mockPhaseId();
    const mockRows = [
      {
        toc_result_id: 1,
        category: 'OUTPUT',
        result_title: 'Result 1',
        related_node_id: 'node1',
        indicator_id: 10,
        indicator_description: 'Indicator 1',
        toc_result_indicator_id: 'IND1',
        indicator_related_node_id: 'ind_node1',
        unit_messurament: 'Number',
        type_value: 'Count',
        type_name: 'Counter',
        location: 'Global',
        target_value_sum: 100,
        actual_achieved_value_sum: 75,
        progress_percentage: '75%',
        number_target: '100',
        target_date: 2025,
        result_type_id: 1,
        result_level_id: 4,
      },
    ];

    dataSourceQueryMock
      .mockResolvedValueOnce(mockRows)
      .mockResolvedValueOnce([]);

    const result = await repository.findByCompositeCode('SP01', 'SP01-AOW01');

    expect(result).toHaveLength(1);
    expect(result[0].toc_result_id).toBe(1);
    expect(result[0].indicators).toHaveLength(1);
    expect(result[0].indicators[0].indicator_id).toBe(10);
  });

  it('should handle parallel execution in findByCompositeCode', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', 2025);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
  });

  it('should handle parallel execution in find2030Outcomes', async () => {
    mockPhaseId();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', 2025);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
  });

  describe('getCurrentTocPhaseId', () => {
    it('returns the active phase id when available', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([{ toc_pahse_id: 'phase-99' }]);

      const phaseId = await (repository as any).getCurrentTocPhaseId();

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('SELECT toc_pahse_id'),
      );
      expect(phaseId).toBe('phase-99');
    });

    it('logs via handlers error and returns null on failure', async () => {
      const dbError = new Error('version fail');
      dataSourceQueryMock.mockRejectedValueOnce(dbError);
      (
        mockHandlersError.returnErrorRepository as jest.Mock
      ).mockReturnValueOnce(null);

      const phaseId = await (repository as any).getCurrentTocPhaseId();

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: dbError,
        className: AoWBilateralRepository.name,
        debug: true,
      });
      expect(phaseId).toBeNull();
    });
  });
});
