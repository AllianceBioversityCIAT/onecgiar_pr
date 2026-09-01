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
      'LEFT JOIN toc_test.toc_work_packages wp ON tr.wp_id = wp.toc_id',
    );
    expect(query).toContain("AND wp.wp_official_code LIKE CONCAT(?, '-%')");
    expect(query).toContain('AND UPPER(TRIM(wp.acronym)) = ?');
    expect(query).toContain('AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)');
    expect(query).not.toContain("LOWER(TRIM(wp.source)) = 'clarisa'");
    expect(query).toContain('JOIN toc_test.toc_result_indicator_target');
    expect(query).toContain('toc_result_indicator_target_center');
    expect(query).toContain('clarisa_institutions');
    // P2-3255: the scalar `ci.acronym AS center_acronym` was replaced by the aggregated
    // `centers_concat`. Selecting the acronym as a column was what forced it into the GROUP BY,
    // which is what fanned one shared target out into one row per centre.
    expect(query).toContain('AS centers_concat');
    expect(query).toContain('AND trit.target_date = ?');
    expect(query).toContain('WHERE');
    expect(query).toContain('AND tr.phase = ?');
  });

  it('should include ToC nodes without work package under every area of work', async () => {
    mockResolveContext();
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW02', defaultContext);

    const [query] = dataSourceQueryMock.mock.calls[0];
    expect(query).toContain(
      'LEFT JOIN toc_test.toc_work_packages wp ON tr.wp_id = wp.toc_id',
    );
    expect(query).toContain('AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)');
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
      expect.stringContaining('COALESCE(MAX(cw.toc_id), MAX(wp.toc_id))'),
      ['SP01', 'SP01', 'PHASE-1', 2025, 'SP01'],
    );
    expect(result).toEqual(new Set(['AOW01', 'AOW02']));
  });

  it('should list local work packages when no clarisa row exists for the program', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([
      {
        id: '5fb995f8-006a-44fc-a42f-650195fef0ed',
        code: 'AOW01',
        name: 'Accelerating AI-Enabled Farm Advisory at Scale.',
        composeCode: 'SP02-AOW01-2026',
        year: 2026,
      },
      {
        id: '92853ac5-2a2d-4dc0-8e3a-e00c3e568524',
        code: 'AOW02',
        name: 'Enabling Preparedness and Rapid Response to Emerging Shocks',
        composeCode: 'SP02-AOW02-2026',
        year: 2026,
      },
    ]);

    const result = await repository.findWorkPackagesByProgram('SP02', {
      phaseUuid: 'PHASE-2026',
      reportingYear: 2026,
    });

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN'),
      ['SP02', 'SP02', 'PHASE-2026', 2026, 'SP02'],
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      code: 'AOW01',
      name: 'Accelerating AI-Enabled Farm Advisory at Scale.',
      composeCode: 'SP02-AOW01-2026',
      year: 2026,
    });
    expect(result[1]).toMatchObject({
      code: 'AOW02',
      composeCode: 'SP02-AOW02-2026',
      year: 2026,
    });
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
    // P2-3296 widened the row: the QA pair is unchanged, the preliminary pair is new and
    // reads 0 / '0%' when the fixture carries no preliminary column.
    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '75%',
      preliminary_achieved_value_sum: 0,
      preliminary_progress_percentage: '0%',
      target_value_sum: 20,
      work_package_acronym: null,
    });
    expect(result.get(2)).toEqual({
      actual_achieved_value_sum: 10,
      progress_percentage: '40%',
      preliminary_achieved_value_sum: 0,
      preliminary_progress_percentage: '0%',
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

    // ⚠️ target 0 does NOT produce a ratio: calculateProgressPercentage falls back to
    // `achieved * 100`, so 15 reads as 1500%. Pinned as current behaviour, not endorsed —
    // 53 indicators sit at target 0 today, and once these figures feed an average a single
    // mistyped value can move a whole HLO. Awaiting the PO's call before touching it.
    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '1500%',
      preliminary_achieved_value_sum: 0,
      preliminary_progress_percentage: '0%',
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

  it('should find bilateral projects by science program official code', async () => {
    const mockProjects = [
      {
        toc_result_id: 1,
        official_code: 'SP01',
        project_id: 100,
        project_name: 'Project A',
      },
      {
        toc_result_id: 2,
        official_code: 'SP01',
        project_id: 100,
        project_name: 'Project A duplicate',
      },
    ];
    dataSourceQueryMock.mockResolvedValueOnce(mockProjects);

    const result = await repository.findBilateralProjectsByProgramOfficialCode(
      'SP01',
      'PHASE-1',
    );

    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPPER(TRIM(tr.official_code))'),
      ['SP01', 'PHASE-1'],
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

  describe('findTargetsWithCentersByIndicatorId', () => {
    it('should filter targets from the reporting year onward', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          toc_indicator_target_id: 10,
          year: 2026,
          target_value: 5,
          number_target: '1',
          center_id: 3,
          center_acronym: 'CIP',
          center_name: 'International Potato Center',
        },
      ]);

      const result = await repository.findTargetsWithCentersByIndicatorId(
        99,
        2026,
      );

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('AND trit.target_date >= ?'),
        [99, 2026],
      );
      expect(result).toEqual([
        {
          toc_indicator_target_id: 10,
          year: 2026,
          target_value: 5,
          number_target: '1',
          centers: [
            {
              center_id: 3,
              center_acronym: 'CIP',
              center_name: 'International Potato Center',
            },
          ],
        },
      ]);
    });
  });

  /**
   * P2-3255. A target shared by N centres was emitted as N rows, because `tritc.center_id` and
   * `ci.acronym` sat in the GROUP BY. Every consumer that sums rows then multiplied by N: the ToC
   * map inflated `target`, `achieved`, `done` and the indicator count all at once
   * (`dashboard-lab.toc-map.ts:129-132`), and the achieved value was the same figure stamped onto
   * each row by `fetchAndGroupTocResults`, not N real contributions.
   */
  describe('shared targets are one row, not one per centre (P2-3255)', () => {
    const buildQuery = (options: any = {}) =>
      (repository as any).buildTocQuery('SP13', {
        context: defaultContext,
        ...options,
      });

    it('does not group by centre, so one target stays one row', () => {
      const { query } = buildQuery();
      const groupBy = query.slice(query.indexOf('GROUP BY'));

      expect(groupBy).not.toContain('tritc.center_id');
      expect(groupBy).not.toContain('ci.acronym');
    });

    it('groups by the target identity instead', () => {
      const { query } = buildQuery();
      const groupBy = query.slice(query.indexOf('GROUP BY'));

      // Without this, two distinct targets that happen to share a value and date collapse together.
      expect(groupBy).toContain('trit.toc_indicator_target_id');
    });

    it('still exposes the centres, aggregated rather than fanned out', () => {
      const { query } = buildQuery();
      const select = query.slice(0, query.indexOf('FROM'));

      expect(select).toContain('GROUP_CONCAT');
      expect(select).toContain('centers_concat');
    });

    it('does not order by a column it no longer groups by', () => {
      const { query } = buildQuery();

      // lastIndexOf, not indexOf: the FIRST `ORDER BY` in this query is the one inside
      // GROUP_CONCAT, which is legitimate — it is what makes the concatenation deterministic.
      // `ORDER BY ci.acronym` as the row ordering was only valid while the acronym was grouped.
      expect(query.slice(query.lastIndexOf('ORDER BY'))).not.toContain(
        'ci.acronym',
      );
    });
  });

  describe('groupTocRows centre exposure (P2-3255)', () => {
    const rowWith = (centersConcat: string | null) => ({
      toc_result_id: 1,
      category: 'OUTCOME',
      result_title: 'R',
      related_node_id: 'N1',
      is_aow: 1,
      indicator_id: 'IND-1',
      indicator_description: 'd',
      toc_result_indicator_id: 'TRI-1',
      indicator_related_node_id: 'N1',
      unit_messurament: null,
      type_value: null,
      type_name: null,
      location: null,
      target_value_sum: 1,
      actual_achieved_value_sum: 1,
      number_target: 1,
      target_date: '2026',
      target_value: '1',
      progress_percentage: '100%',
      centers_concat: centersConcat,
    });

    const group = (rows: any[]) => (repository as any).groupTocRows(rows);

    it('turns one shared-target row into one indicator carrying every centre', () => {
      const [result] = group([rowWith('2::BIOVERSITY||3::CIAT||15::IWMI')]);

      expect(result.indicators).toHaveLength(1);
      expect(result.indicators[0].centers).toEqual([
        { center_id: 2, center_acronym: 'BIOVERSITY' },
        { center_id: 3, center_acronym: 'CIAT' },
        { center_id: 15, center_acronym: 'IWMI' },
      ]);
    });

    it('leaves the scalar centre null when the target is shared', () => {
      const [result] = group([rowWith('2::BIOVERSITY||3::CIAT')]);

      // Reporting one of several centres as "the" centre is the lie this ticket is about. Both
      // client consumers already treat null as "no centre filter", which is the right semantics.
      expect(result.indicators[0].center_id).toBeNull();
      expect(result.indicators[0].center_acronym).toBeNull();
    });

    it('keeps the scalar centre when exactly one centre holds the target', () => {
      const [result] = group([rowWith('3::CIAT')]);

      expect(result.indicators[0].center_id).toBe(3);
      expect(result.indicators[0].center_acronym).toBe('CIAT');
    });

    it('exposes the target id, which is what tells shared from individual (P2-3257)', () => {
      const [result] = group([
        { ...rowWith('3::CIAT'), toc_indicator_target_id: 987 },
      ]);

      expect(result.indicators[0].toc_indicator_target_id).toBe(987);
    });

    it('survives a target with no centre association at all', () => {
      const [result] = group([rowWith(null)]);

      expect(result.indicators[0].centers).toEqual([]);
      expect(result.indicators[0].center_id).toBeNull();
    });
  });

  /**
   * P2-3296. The status sets were settled by Nicoleta Trifa (1-Sep-2026) and confirmed by the
   * PO: Preliminary is Submitted + Approved — Editing is a draft and does not count until it is
   * submitted — and Final stays QualityAssessed + Approved, the pair P2-2841 fixed. Approved
   * deliberately counts in BOTH, because W3/Bilateral results are tagged to P/A AoW HLO targets.
   */
  describe('P2-3296 — preliminary and QA progress', () => {
    it('splits the achieved sum by status inside a single pass', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.getIndicatorContributions('SP01', defaultContext);

      const [query] = dataSourceQueryMock.mock.calls[0];

      // QA / Final keeps the production pair.
      expect(query).toContain(
        'SUM(CASE WHEN r.status_id IN (2, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END)',
      );
      // Preliminary: Submitted + Approved, no Editing.
      expect(query).toContain(
        'SUM(CASE WHEN r.status_id IN (3, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END)',
      );
      // One subquery, not two — the filter lets the union through and CASE does the split.
      expect(query).toContain('AND r.status_id IN (2, 3, 6)');
      expect(
        query.match(/COALESCE\(SUM\(CASE WHEN r\.status_id/g),
      ).toHaveLength(2);
    });

    it('never lets Editing, PendingReview, Rejected or Draft into either bar', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.getIndicatorContributions('SP01', defaultContext);

      const [query] = dataSourceQueryMock.mock.calls[0];
      const statusSets = query.match(/status_id IN \(([^)]*)\)/g) ?? [];

      expect(statusSets.length).toBeGreaterThan(0);
      for (const set of statusSets) {
        const ids = set
          .replace(/.*\(/, '')
          .replace(/\)/, '')
          .split(',')
          .map((n: string) => Number(n.trim()));
        // 1 Editing · 5 PendingReview · 7 Rejected · 8 Draft
        expect(ids).not.toContain(1);
        expect(ids).not.toContain(5);
        expect(ids).not.toContain(7);
        expect(ids).not.toContain(8);
      }
    });

    it('returns both figures and both percentages per indicator', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 11,
          toc_result_indicator_id: 'node-11',
          target_value_sum: 100,
          actual_achieved_value_sum: 40,
          preliminary_achieved_value_sum: 75,
          work_package_acronym: 'AOW01',
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      expect(map.get(11)).toEqual({
        target_value_sum: 100,
        actual_achieved_value_sum: 40,
        preliminary_achieved_value_sum: 75,
        work_package_acronym: 'AOW01',
        progress_percentage: '40%',
        preliminary_progress_percentage: '75%',
      });
    });

    // Nicoleta: "for exceeding the target, pls show what's above 100%" — target 10, reported 50
    // is 500%, not a capped 100%.
    it('does not cap either bar at 100%', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 12,
          toc_result_indicator_id: 'node-12',
          target_value_sum: 10,
          actual_achieved_value_sum: 50,
          preliminary_achieved_value_sum: 30,
          work_package_acronym: null,
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      expect(map.get(12)?.progress_percentage).toBe('500%');
      expect(map.get(12)?.preliminary_progress_percentage).toBe('300%');
    });

    // The QA pair is what production already shows. A row that predates this change — no
    // preliminary column — must still read exactly as before rather than blowing up.
    it('keeps the QA figures unchanged when the preliminary column is absent', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 13,
          toc_result_indicator_id: 'node-13',
          target_value_sum: 200,
          actual_achieved_value_sum: 50,
          work_package_acronym: 'AOW02',
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      expect(map.get(13)?.actual_achieved_value_sum).toBe(50);
      expect(map.get(13)?.progress_percentage).toBe('25%');
      expect(map.get(13)?.preliminary_achieved_value_sum).toBe(0);
      expect(map.get(13)?.preliminary_progress_percentage).toBe('0%');
    });
  });
});
