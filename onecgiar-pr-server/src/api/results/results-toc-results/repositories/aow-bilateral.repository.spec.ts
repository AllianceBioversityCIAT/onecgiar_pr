import { DataSource } from 'typeorm';
import { env } from 'node:process';
import { AoWBilateralRepository } from './aow-bilateral.repository';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import type { ReportingTocContext } from '../../../results-framework-reporting/reporting-toc-context/reporting-toc-context.interface';

describe('AoWBilateralRepository', () => {
  let dataSourceQueryMock: jest.Mock;
  let mockDataSource: DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn(({ error }) => error),
  } as unknown as HandlersError;

  let repository: AoWBilateralRepository;

  const defaultContext: ReportingTocContext = {
    phaseUuid: 'PHASE-1',
    reportingYear: 2025,
  };

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

  const mockResolveContext = (context: ReportingTocContext = defaultContext) =>
    jest.spyOn(repository as any, 'resolveContext').mockResolvedValue(context);

  it('should execute the aggregate query for composite code with expected clauses', async () => {
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
    const [query, params] = dataSourceQueryMock.mock.calls[0];

    expect(params).toEqual([
      2025,
      'AOW01',
      'SP01',
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
    expect(query).toContain('AND wp.wp_official_code LIKE CONCAT(?, \'-%\')');
    expect(query).toContain('AND UPPER(TRIM(wp.acronym)) = ?');
    expect(query).not.toContain("LOWER(TRIM(wp.source)) = 'clarisa'");
    expect(query).toContain('JOIN toc_test.toc_result_indicator_target');
    expect(query).toContain('AND trit.target_date = ?');
    expect(query).toContain('WHERE');
    expect(query).toContain('AND tr.phase = ?');
  });

  it('should omit work package join when composite code is not provided', async () => {
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', defaultContext);

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

  it('should reject queries when TOC phase context cannot be resolved', async () => {
    (
      mockHandlersError.returnErrorRepository as jest.Mock
    ).mockImplementationOnce(({ error }) => error);

    dataSourceQueryMock.mockResolvedValueOnce([]);

    await expect(
      repository.findByCompositeCode('SP01', 'SP01-AOW01', 2025),
    ).rejects.toBe('Missing TOC phase context for reporting queries');

    expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
      error: 'Missing TOC phase context for reporting queries',
      className: AoWBilateralRepository.name,
      debug: true,
    });
  });

  it('should delegate query failures to the handlers error utility', async () => {
    mockResolveContext();
    const dbError = new Error('db failure');
    dataSourceQueryMock.mockRejectedValueOnce(dbError);
    (
      mockHandlersError.returnErrorRepository as jest.Mock
    ).mockImplementationOnce(({ error }) => error);

    await expect(
      repository.findByCompositeCode('SP02', 'SP02-AOW02', defaultContext),
    ).rejects.toBe(dbError);

    expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
      error: dbError,
      className: AoWBilateralRepository.name,
      debug: true,
    });
  });

  it('should fetch a single ToC result by id', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([
      { id: 10, result_title: 'Sample', category: 'OUTPUT' },
    ]);

    const result = await repository.findResultById(10, 'PHASE-1');

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
      {
        id: 50,
        toc_results_id: 10,
        toc_result_indicator_id: 'KP-01',
        related_node_id: 'REL-01',
      },
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
      related_node_id: 'REL-01',
    });
  });

  it('should find unit acronyms by program from work packages', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([
      {
        id: 1,
        code: 'AOW01',
        name: 'Area of Work 01',
        composeCode: 'SP01-AOW01',
        year: 2025,
      },
      {
        id: 2,
        code: 'AOW02',
        name: 'Area of Work 02',
        composeCode: 'SP01-AOW02',
        year: 2025,
      },
    ]);

    const result = await repository.findUnitAcronymsByProgram(
      'SP01',
      defaultContext,
    );

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining("LOWER(TRIM(cw.source)) = 'clarisa'"),
      ['SP01', 'PHASE-1', 2025, 'SP01'],
    );
    expect(result).toEqual(new Set(['AOW01', 'AOW02']));
  });

  it('should get indicator contributions with calculations', async () => {
    mockResolveContext();
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

    const result = await repository.getIndicatorContributions(
      'SP01',
      defaultContext,
    );

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT'),
      [2025, 2025, 'SP01', 'PHASE-1', 2025, 2025, 'SP01', 'PHASE-1'],
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
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([
      {
        indicator_id: 1,
        actual_achieved_value_sum: 15,
        target_value_sum: 0,
      },
    ]);

    const result = await repository.getIndicatorContributions(
      'SP01',
      defaultContext,
    );

    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '1500%',
      target_value_sum: 0,
      work_package_acronym: null,
    });
  });

  it('should find bilateral projects by toc result id', async () => {
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

    const result = await repository.findBilateralProjectById(1, 'PHASE-1');

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM toc_test.toc_results'),
      [1, 'PHASE-1'],
    );
    expect(result).toEqual(mockProjects);
  });

  it('should group toc rows correctly', async () => {
    mockResolveContext();
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

    const result = await repository.findByCompositeCode(
      'SP01',
      'SP01-AOW01',
      defaultContext,
    );

    expect(result).toHaveLength(1);
    expect(result[0].toc_result_id).toBe(1);
    expect(result[0].indicators).toHaveLength(1);
    expect(result[0].indicators[0].indicator_id).toBe(10);
  });

  it('should handle parallel execution in findByCompositeCode', async () => {
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
  });

  it('should handle parallel execution in find2030Outcomes', async () => {
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(2);
  });

  describe('resolveContext', () => {
    it('returns the provided ReportingTocContext without querying', async () => {
      const context = await (repository as any).resolveContext(defaultContext);

      expect(dataSourceQueryMock).not.toHaveBeenCalled();
      expect(context).toEqual(defaultContext);
    });

    it('resolves context from active version when a reporting year is provided', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([
        { phase_year: 2031, toc_pahse_id: 'phase-99' },
      ]);

      const context = await (repository as any).resolveContext(2031);

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM main_test.version v'),
        [2031],
      );
      expect(context).toEqual({
        reportingYear: 2031,
        phaseUuid: 'phase-99',
      });
    });

    it('throws via handlers error when version row is missing', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);
      (
        mockHandlersError.returnErrorRepository as jest.Mock
      ).mockImplementationOnce(({ error }) => error);

      await expect((repository as any).resolveContext()).rejects.toBe(
        'Missing TOC phase context for reporting queries',
      );
    });
  });

  describe('getCurrentTocPhaseId', () => {
    it('returns the active phase id when available', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([
        { phase_year: 2025, toc_pahse_id: 'phase-99' },
      ]);

      const phaseId = await (repository as any).getCurrentTocPhaseId();

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('toc_pahse_id'),
        [],
      );
      expect(phaseId).toBe('phase-99');
    });

    it('returns null when phase resolution fails', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);
      (
        mockHandlersError.returnErrorRepository as jest.Mock
      ).mockImplementationOnce(({ error }) => error);

      const phaseId = await (repository as any).getCurrentTocPhaseId();

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalled();
      expect(phaseId).toBeNull();
    });
  });
});
