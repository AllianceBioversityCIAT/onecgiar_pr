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
    dataSourceQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(3);
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
      'COALESCE(MAX(CAST(trit.target_value AS SIGNED)), 0) AS target_value_sum',
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
    dataSourceQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW02', defaultContext);

    const [query] = dataSourceQueryMock.mock.calls[0];
    expect(query).toContain(
      'LEFT JOIN toc_test.toc_work_packages wp ON tr.wp_id = wp.toc_id',
    );
    expect(query).toContain('AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)');
  });

  it('should omit work package join when composite code is not provided', async () => {
    mockResolveContext();
    dataSourceQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(3);
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
    // indicator-achieved-value-per-center: achieved_value_sum is likewise additive and
    // reads 0 when the fixture carries no achieved_value_sum column.
    expect(result.get(1)).toEqual({
      actual_achieved_value_sum: 15,
      progress_percentage: '75%',
      preliminary_achieved_value_sum: 0,
      preliminary_progress_percentage: '0%',
      achieved_value_sum: 0,
      target_value_sum: 20,
      work_package_acronym: null,
    });
    expect(result.get(2)).toEqual({
      actual_achieved_value_sum: 10,
      progress_percentage: '40%',
      preliminary_achieved_value_sum: 0,
      preliminary_progress_percentage: '0%',
      achieved_value_sum: 0,
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
      achieved_value_sum: 0,
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
      .mockResolvedValueOnce([])
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
    dataSourceQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await repository.findByCompositeCode('SP01', 'SP01-AOW01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(3);
  });

  it('should handle parallel execution in find2030Outcomes', async () => {
    mockResolveContext();
    dataSourceQueryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await repository.find2030Outcomes('SP01', defaultContext);

    expect(dataSourceQueryMock).toHaveBeenCalledTimes(3);
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

    /**
     * The half P2-3255 left behind. Collapsing the ROWS was only one side of it: the centre joins
     * stay in the FROM, so the group still holds one row per centre, and `SUM(trit.target_value)`
     * went on counting the same target once per centre. SP-13 KPI 1.3.3 (target 1, ten centres)
     * kept reading 10 in production after the ticket shipped — same figure, new cause.
     */
    it('takes the target value with MAX, so the centre rows inside the group cannot inflate it', () => {
      const { query } = buildQuery();
      const select = query.slice(0, query.indexOf('FROM'));

      expect(select).toContain(
        'COALESCE(MAX(CAST(trit.target_value AS SIGNED)), 0) AS target_value_sum',
      );
      expect(select).not.toContain('SUM(CAST(trit.target_value');
    });

    it('still joins the centres it no longer groups by — which is WHY the aggregate cannot be SUM', () => {
      const { query } = buildQuery();
      const groupBy = query.slice(query.indexOf('GROUP BY'));

      // These two facts together are the whole bug. If a later change drops the centre join, MAX
      // and SUM become equivalent again and this test is what says the choice was never arbitrary.
      expect(query).toContain(
        'LEFT JOIN toc_test.toc_result_indicator_target_center tritc',
      );
      expect(groupBy).not.toContain('tritc.center_id');
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
  /**
   * The AC1 tests asserted the SQL and the contributions Map, and passed while the two
   * preliminary fields were being dropped in `groupTocRows` — which builds the indicator from
   * an explicit field list, so anything not named there never leaves the repository.
   *
   * These go through the public method and assert the payload that actually ships, which is the
   * only place that class of bug is visible.
   */
  describe('P2-3296 — what actually leaves the repository', () => {
    const rowFor = (overrides: Record<string, unknown> = {}) => ({
      toc_result_id: 1,
      category: 'OUTCOME',
      result_title: 'Outcome 1',
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
      number_target: '100',
      target_date: 2025,
      result_type_id: 1,
      result_level_id: 3,
      ...overrides,
    });

    const contributionFor = (overrides: Record<string, unknown> = {}) => ({
      indicator_id: 10,
      toc_result_indicator_id: 'node-10',
      target_value_sum: 100,
      actual_achieved_value_sum: 40,
      preliminary_achieved_value_sum: 75,
      work_package_acronym: 'AOW01',
      ...overrides,
    });

    it('carries BOTH preliminary fields all the way into the indicator payload', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([rowFor()])
        .mockResolvedValueOnce([contributionFor()])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      const indicator = result[0].indicators[0];
      expect(indicator.progress_percentage).toBe('40%');
      expect(indicator.actual_achieved_value_sum).toBe(40);
      // The two that were silently dropped.
      expect(indicator.preliminary_progress_percentage).toBe('75%');
      expect(indicator.preliminary_achieved_value_sum).toBe(75);
    });

    it('defaults the preliminary pair rather than omitting it when there are no contributions', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([rowFor()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      const indicator = result[0].indicators[0];
      expect(indicator.preliminary_achieved_value_sum).toBe(0);
      expect(indicator.preliminary_progress_percentage).toBe('0%');
    });

    /**
     * The wrong fix for the 1.3.3 inflation, pinned so nobody ships it: overwriting the row's
     * target with `getIndicatorContributions`' figure. That query sums ALL of an indicator's
     * targets for the year (SP-13 KPI 1.3.1 = 2480 over 9 per-centre targets), while a row here is
     * ONE target — the payload emits nine of them. Stamping the total on each would trade a 10x
     * error on one KPI for a 9-row error on every multi-target one.
     */
    it('keeps each row on its own target value, never the indicator-wide total', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([
          rowFor({ target_value_sum: 140, toc_indicator_target_id: 563493 }),
          rowFor({ target_value_sum: 10, toc_indicator_target_id: 563504 }),
          rowFor({ target_value_sum: 800, toc_indicator_target_id: 563526 }),
        ])
        .mockResolvedValueOnce([contributionFor({ target_value_sum: 2480 })])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      expect(result[0].indicators.map((i: any) => i.target_value_sum)).toEqual([
        140, 10, 800,
      ]);
    });

    it('attaches the AC2 roll-up to every node', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([rowFor()])
        .mockResolvedValueOnce([contributionFor()])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      expect(result[0].progress).toEqual(
        expect.objectContaining({
          progress_percentage: '40%',
          preliminary_progress_percentage: '75%',
          indicators_counted: 1,
          indicators_total: 1,
        }),
      );
    });

    it('keeps a zero-target indicator out of the node roll-up but still returns the row', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([
          rowFor(),
          rowFor({ indicator_id: 11, target_value_sum: 0 }),
        ])
        .mockResolvedValueOnce([
          contributionFor({ actual_achieved_value_sum: 100 }),
          contributionFor({
            indicator_id: 11,
            target_value_sum: 0,
            actual_achieved_value_sum: 500000,
          }),
        ])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      // Both rows still ship — the user has to see the one missing a target.
      expect(result[0].indicators).toHaveLength(2);
      // ...but the node reads 100%, not 25,000,050%.
      expect(result[0].progress?.progress_percentage).toBe('100%');
      expect(result[0].progress?.indicators_counted).toBe(1);
      expect(result[0].progress?.indicators_total).toBe(2);
    });

    it('reports a null percentage, not 0%, when no indicator of the node has a target', async () => {
      mockResolveContext();
      dataSourceQueryMock
        .mockResolvedValueOnce([rowFor({ target_value_sum: 0 })])
        .mockResolvedValueOnce([
          contributionFor({
            target_value_sum: 0,
            actual_achieved_value_sum: 5,
          }),
        ])
        .mockResolvedValueOnce([]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      expect(result[0].progress?.progress_percentage).toBeNull();
      expect(result[0].progress?.indicators_counted).toBe(0);
    });
  });

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
      // One subquery, not three — the filter lets the union through and CASE does the split.
      // indicator-achieved-value-per-center added a third conditional aggregate
      // (achieved_value_sum, RFR-DD-2) inside this same pass, so the count is now 3.
      expect(query).toContain('AND r.status_id IN (2, 3, 6)');
      expect(
        query.match(/COALESCE\(SUM\(CASE WHEN r\.status_id/g),
      ).toHaveLength(3);
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
        achieved_value_sum: 0,
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

    describe('getPlannedKpisCountMap', () => {
      it('returns mapped counts of total active indicators per program in the phase', async () => {
        mockResolveContext();
        dataSourceQueryMock.mockResolvedValueOnce([
          { official_code: 'SP01', total_indicators: 415 },
          { official_code: 'SP02', total_indicators: 197 },
        ]);

        const map = await repository.getPlannedKpisCountMap(defaultContext);

        expect(map.get('SP01')).toBe(415);
        expect(map.get('SP02')).toBe(197);
        expect(dataSourceQueryMock).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(DISTINCT tri.id) AS total_indicators'),
          [defaultContext.phaseUuid],
        );
      });
    });
  });

  // ─── RFR-T-1 (bugfix/indicator-achieved-value-per-center) ─────────────────
  // Bug Mode regression tests — MUST fail against today's code (requirements.md
  // §8 RFR-AC-1..4, design.md §10 Testing Plan, proposal.md §3 confirmed root
  // cause). `dataSource.query` is mocked in this suite (no real SQL engine), so
  // per the Leader's decision:
  //   - the join/group defect (RFR-AC-1) is gated by asserting the emitted SQL
  //     text, complemented by a row-mapping case that guards the map never
  //     collapses sibling nodes;
  //   - the new `achieved_value_sum` aggregate (RFR-AC-2 / RFR-AC-3) is gated by
  //     asserting the SQL carries a third union-of-statuses aggregate and that
  //     the mapper surfaces the field without double-counting across a status
  //     move from Submitted(3) to QualityAssessed(2);
  //   - RFR-AC-4 pins today's single-node (non-shared) behaviour unchanged.
  describe('RFR-AC — per-node scoping and achieved_value_sum (indicator-achieved-value-per-center)', () => {
    it('scopes achieved/preliminary sums per ToC node, not per shared catalog indicator id', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.getIndicatorContributions('SP01', defaultContext);

      const [query] = dataSourceQueryMock.mock.calls[0];

      // The outer join must attach `act` by the node-level id, never the shared
      // catalog id — RFR-DD-1. Fails today: the join key is still the catalog id.
      expect(query).toContain('act.indicator_id = tgt.indicator_id');
      expect(query).not.toContain(
        'act.toc_result_indicator_id = tgt.toc_result_indicator_id',
      );

      // The act subquery's own GROUP BY must key on tri.id (node-level), not
      // tri.toc_result_indicator_id (catalog-level) — that catalog key is
      // exactly what pools sibling nodes' contributions together today.
      // The non-greedy capture must stop at the subquery's real closing
      // paren (`) AS act ON ...`), not at the `) AS act` substring that
      // `actual_achieved_value_sum`'s own alias happens to contain.
      const actSubqueryMatch = query.match(
        /LEFT JOIN \(([\s\S]*?)\) AS act\s+ON\b/,
      );
      expect(actSubqueryMatch).not.toBeNull();
      const actSubquery = actSubqueryMatch[1];
      expect(actSubquery).toMatch(/GROUP BY\s+tri\.id\b/);
      expect(actSubquery).not.toMatch(
        /GROUP BY\s+tri\.toc_result_indicator_id\b/,
      );
    });

    it('keeps each sibling node on its own row in the contributions map, never collapsed onto a shared catalog id', async () => {
      mockResolveContext();
      // Two ToC nodes (tri.id 21 and 22) sharing one catalog toc_result_indicator_id,
      // each with a distinct target — id 21 is the Target-5 node carrying the one
      // submitted result (contributing_indicator = 1), id 22 is the Target-1 sibling
      // node with nothing reported against it.
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 21,
          toc_result_indicator_id: 'shared-catalog-id',
          target_value_sum: 5,
          actual_achieved_value_sum: 0,
          preliminary_achieved_value_sum: 1,
          work_package_acronym: 'AOW05',
        },
        {
          indicator_id: 22,
          toc_result_indicator_id: 'shared-catalog-id',
          target_value_sum: 1,
          actual_achieved_value_sum: 0,
          preliminary_achieved_value_sum: 0,
          work_package_acronym: 'AOW05',
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      // RFR-AC-1: the Target-5 node keeps its own 1/5 = 20% preliminary progress.
      expect(map.get(21)).toMatchObject({
        preliminary_achieved_value_sum: 1,
        preliminary_progress_percentage: '20%',
      });
      // RFR-AC-1: the Target-1 sibling stays at 0/0%, unaffected by node 21.
      expect(map.get(22)).toMatchObject({
        preliminary_achieved_value_sum: 0,
        preliminary_progress_percentage: '0%',
      });
    });

    it('adds a third achieved_value_sum aggregate over the union status set (2, 3, 6)', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.getIndicatorContributions('SP01', defaultContext);

      const [query] = dataSourceQueryMock.mock.calls[0];

      // RFR-DD-2 / design.md §5: a third conditional-aggregation column, over the
      // same union status set already used to gate the outer WHERE (line ~908).
      // Fails today: only the QA'd-basis and submitted-basis aggregates exist
      // (2 occurrences, not 3).
      expect(query).toContain(
        'SUM(CASE WHEN r.status_id IN (2, 3, 6) THEN CAST(rit.contributing_indicator AS DECIMAL(15,2)) ELSE 0 END)',
      );
      expect(
        query.match(/COALESCE\(SUM\(CASE WHEN r\.status_id/g),
      ).toHaveLength(3);
    });

    it("surfaces achieved_value_sum on the mapped row at status=3 (submitted, not yet QA'd)", async () => {
      mockResolveContext();
      // A result submitted (status 3) against this node: not yet QA'd, so
      // actual_achieved_value_sum (QA'd-basis) is 0, but the new union-based
      // achieved_value_sum must already read 1 — RFR-AC-2 / Nicoleta's rule.
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 31,
          toc_result_indicator_id: 'node-31',
          target_value_sum: 5,
          actual_achieved_value_sum: 0,
          preliminary_achieved_value_sum: 1,
          achieved_value_sum: 1,
          work_package_acronym: 'AOW05',
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      // Fails today: mapIndicatorContributionRow does not carry achieved_value_sum.
      expect(map.get(31)?.achieved_value_sum).toBe(1);
    });

    it('keeps achieved_value_sum single-counted (=1, never 0 or 2) once the same contribution moves to status=2 (QualityAssessed)', async () => {
      mockResolveContext();
      // First call: the result is Submitted (status 3) — preliminary-basis counts
      // it, QA'd-basis does not yet.
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 41,
          toc_result_indicator_id: 'node-41',
          target_value_sum: 5,
          actual_achieved_value_sum: 0,
          preliminary_achieved_value_sum: 1,
          achieved_value_sum: 1,
          work_package_acronym: 'AOW05',
        },
      ]);

      const beforeQa = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );
      expect(beforeQa.get(41)?.achieved_value_sum).toBe(1);
      expect(beforeQa.get(41)?.actual_achieved_value_sum).toBe(0);

      // Second call: the same single result has moved to QualityAssessed (status
      // 2) — QA'd-basis now counts it, submitted-basis no longer does (its
      // current status is not in (3, 6)), and the union-based achieved_value_sum
      // stays at exactly 1 — no double count, RFR-AC-3.
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 41,
          toc_result_indicator_id: 'node-41',
          target_value_sum: 5,
          actual_achieved_value_sum: 1,
          preliminary_achieved_value_sum: 0,
          achieved_value_sum: 1,
          work_package_acronym: 'AOW05',
        },
      ]);

      const afterQa = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );
      expect(afterQa.get(41)?.achieved_value_sum).toBe(1);
      expect(afterQa.get(41)?.actual_achieved_value_sum).toBe(1);
    });

    it('leaves a single-node (non-shared catalog id) indicator unchanged — RFR-AC-4 regression guard', async () => {
      mockResolveContext();
      // No sibling node shares this catalog id; an existing reported result at
      // its pre-fix values — these MUST be unchanged before and after the fix.
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 51,
          toc_result_indicator_id: 'unique-catalog-id-51',
          target_value_sum: 4,
          actual_achieved_value_sum: 2,
          preliminary_achieved_value_sum: 3,
          work_package_acronym: 'AOW09',
        },
      ]);

      const map = await repository.getIndicatorContributions(
        'SP01',
        defaultContext,
      );

      expect(map.get(51)).toMatchObject({
        actual_achieved_value_sum: 2,
        progress_percentage: '50%',
        preliminary_achieved_value_sum: 3,
        preliminary_progress_percentage: '75%',
      });
    });
  });

  describe('RRC — exact toc_indicator_target_id match replaces centre-set intersection (reported-results-center-scoping)', () => {
    const IITA = 501;
    const CIMMYT = 502;
    const IITA_ALONE_TARGET = 9001;
    const CIMMYT_IITA_TARGET = 9002;

    const sum = (
      map: Map<number, any[]>,
      indicatorId: number,
      centerIds: number[],
      rowTocIndicatorTargetId?: number | string | null,
    ) =>
      (repository as any).sumContributionsForCenters(
        map,
        indicatorId,
        centerIds,
        rowTocIndicatorTargetId,
      );

    it('carries the anchor through the base subquery and the outer query (RRC-DD-3)', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.getIndicatorContributionsByCenter(
        'SP01',
        defaultContext,
      );

      const [query] = dataSourceQueryMock.mock.calls[0];
      const baseMatch = query.match(/FROM \(([\s\S]*?)\) AS base/);
      expect(baseMatch).not.toBeNull();
      const baseSubquery = baseMatch[1];
      expect(baseSubquery).toContain(
        'rit.toc_indicator_target_id AS toc_indicator_target_id',
      );
      expect(baseSubquery).toMatch(
        /GROUP BY[\s\S]*rit\.toc_indicator_target_id/,
      );
      const outer = query.slice(query.indexOf(') AS base'));
      expect(query).toMatch(
        /base\.contributing_indicator,\s*base\.toc_indicator_target_id,/,
      );
      expect(outer).toMatch(/GROUP BY[\s\S]*base\.toc_indicator_target_id/);
    });

    it('maps the anchor onto each entry, null when the column is null (RRC-DD-3)', async () => {
      mockResolveContext();
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          indicator_id: 7,
          result_id: 1,
          status_id: 3,
          contributing_indicator: '1.00',
          toc_indicator_target_id: '9001',
          center_ids: `${IITA}`,
        },
        {
          indicator_id: 7,
          result_id: 2,
          status_id: 3,
          contributing_indicator: '1.00',
          toc_indicator_target_id: null,
          center_ids: `${IITA}`,
        },
      ]);

      const map = await repository.getIndicatorContributionsByCenter(
        'SP01',
        defaultContext,
      );

      expect(map.get(7)?.map((e: any) => e.tocIndicatorTargetId)).toEqual([
        9001,
        null,
      ]);
    });

    it('isolates a solo-centre contribution from a multi-centre sibling row when the anchor is present (RRC-AC-2/AC-3)', () => {
      const map = new Map<number, any[]>([
        [
          7,
          [
            {
              status_id: 3,
              contributing_indicator: 1,
              centerIds: new Set([IITA]),
              tocIndicatorTargetId: IITA_ALONE_TARGET,
            },
          ],
        ],
      ]);

      // CIMMYT, IITA sibling: centres intersect (IITA) but the anchor differs -> 0.
      const sibling = sum(map, 7, [CIMMYT, IITA], CIMMYT_IITA_TARGET);
      expect(sibling.achieved_value_sum).toBe(0);
      expect(sibling.preliminary_achieved_value_sum).toBe(0);
      expect(sibling.actual_achieved_value_sum).toBe(0);

      // IITA-alone row: exact anchor match -> counted once.
      const own = sum(map, 7, [IITA], IITA_ALONE_TARGET);
      expect(own.achieved_value_sum).toBe(1);
      expect(own.preliminary_achieved_value_sum).toBe(1);
    });

    it('compares anchors by value, not driver representation: a string row anchor matches a numeric entry anchor', () => {
      const map = new Map<number, any[]>([
        [
          7,
          [
            {
              status_id: 3,
              contributing_indicator: 1,
              centerIds: new Set([IITA]),
              tocIndicatorTargetId: CIMMYT_IITA_TARGET,
            },
          ],
        ],
      ]);

      // mysql2 returns BIGINT as a string: '9002' must equal 9002.
      expect(
        sum(map, 7, [CIMMYT, IITA], String(CIMMYT_IITA_TARGET))
          .achieved_value_sum,
      ).toBe(1);
      // Mirror: a different id as a string stays isolated even though the centres overlap.
      expect(
        sum(map, 7, [CIMMYT, IITA], String(IITA_ALONE_TARGET))
          .achieved_value_sum,
      ).toBe(0);
      // Blank / non-numeric strings never match an anchored entry.
      expect(sum(map, 7, [IITA], '').achieved_value_sum).toBe(0);
      expect(sum(map, 7, [IITA], 'abc').achieved_value_sum).toBe(0);
    });

    describe('cumulative window (2030 Outcomes) keeps centre-intersection semantics (RRC-T-6)', () => {
      it('ignores the entry anchor when useAnchor is false: a differently-anchored entry with overlapping centres still counts', () => {
        const map = new Map<number, any[]>([
          [
            7,
            [
              {
                status_id: 3,
                contributing_indicator: 1,
                centerIds: new Set([IITA]),
                tocIndicatorTargetId: IITA_ALONE_TARGET,
              },
            ],
          ],
        ]);

        const cumulative = (
          centerIds: number[],
          rowAnchor: number | string | null,
        ) =>
          (repository as any).sumContributionsForCenters(
            map,
            7,
            centerIds,
            rowAnchor,
            false,
          );

        // Anchor 9001 vs row anchor 9002, centres overlap -> counted (pre-RRC-T-5 behaviour).
        expect(
          cumulative([CIMMYT, IITA], CIMMYT_IITA_TARGET)
            .preliminary_achieved_value_sum,
        ).toBe(1);
        // Same for a string row anchor and for a row with no anchor at all.
        expect(
          cumulative([IITA], String(CIMMYT_IITA_TARGET))
            .preliminary_achieved_value_sum,
        ).toBe(1);
        expect(cumulative([IITA], null).preliminary_achieved_value_sum).toBe(1);
        // Pure intersection: no centre overlap -> NOT counted, whatever the anchors say.
        expect(cumulative([CIMMYT], IITA_ALONE_TARGET).achieved_value_sum).toBe(
          0,
        );
      });

      it('still matches by anchor by default (useAnchor omitted = true)', () => {
        const map = new Map<number, any[]>([
          [
            7,
            [
              {
                status_id: 3,
                contributing_indicator: 1,
                centerIds: new Set([IITA]),
                tocIndicatorTargetId: IITA_ALONE_TARGET,
              },
            ],
          ],
        ]);

        expect(
          sum(map, 7, [CIMMYT, IITA], CIMMYT_IITA_TARGET).achieved_value_sum,
        ).toBe(0);
      });

      const tocRow = {
        toc_result_id: 1,
        category: 'EOI',
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
        target_value_sum: 1,
        actual_achieved_value_sum: 0,
        progress_percentage: '0%',
        centers_concat: `${CIMMYT}::CIMMYT||${IITA}::IITA`,
        toc_indicator_target_id: CIMMYT_IITA_TARGET,
      };
      // A contribution anchored to ANOTHER group's target (as a different year's id would be),
      // with the centre overlap that pre-RRC-T-5 code matched on.
      const otherAnchoredContribution = {
        indicator_id: 10,
        result_id: 1,
        status_id: 3,
        contributing_indicator: '1.00',
        toc_indicator_target_id: IITA_ALONE_TARGET,
        center_ids: `${IITA}`,
      };

      it('find2030Outcomes counts the anchored entry by centre intersection, while findByCompositeCode keeps exact matching (call-site flag)', async () => {
        mockResolveContext();
        const spy = jest.spyOn(repository as any, 'sumContributionsForCenters');

        dataSourceQueryMock
          .mockResolvedValueOnce([tocRow])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([otherAnchoredContribution]);
        const cumulative = await repository.find2030Outcomes(
          'SP01',
          defaultContext,
        );
        expect(spy).toHaveBeenLastCalledWith(
          expect.any(Map),
          10,
          [CIMMYT, IITA],
          CIMMYT_IITA_TARGET,
          false,
        );
        expect(cumulative[0].indicators[0].preliminary_achieved_value_sum).toBe(
          1,
        );
        expect(cumulative[0].indicators[0].achieved_value_sum).toBe(1);

        dataSourceQueryMock
          .mockResolvedValueOnce([tocRow])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([otherAnchoredContribution]);
        const yearly = await repository.findByCompositeCode(
          'SP01',
          'SP01-AOW01',
          defaultContext,
        );
        expect(spy).toHaveBeenLastCalledWith(
          expect.any(Map),
          10,
          [CIMMYT, IITA],
          CIMMYT_IITA_TARGET,
          true,
        );
        expect(yearly[0].indicators[0].preliminary_achieved_value_sum).toBe(0);
        expect(yearly[0].indicators[0].achieved_value_sum).toBe(0);
      });
    });

    it('ignores centre overlap entirely for an anchored entry, even when the row has no anchor', () => {
      const map = new Map<number, any[]>([
        [
          7,
          [
            {
              status_id: 3,
              contributing_indicator: 1,
              centerIds: new Set([IITA]),
              tocIndicatorTargetId: IITA_ALONE_TARGET,
            },
          ],
        ],
      ]);

      expect(sum(map, 7, [IITA], null).achieved_value_sum).toBe(0);
      expect(sum(map, 7, [IITA]).achieved_value_sum).toBe(0);
    });

    it('falls back to the existing centre-set intersection when the entry has no anchor (RRC-R-8, RRC-AC-6)', () => {
      const map = new Map<number, any[]>([
        [
          8,
          [
            {
              status_id: 3,
              contributing_indicator: 1,
              centerIds: new Set([IITA]),
              tocIndicatorTargetId: null,
            },
          ],
        ],
      ]);

      // Historical, un-anchored data keeps today's (imperfect) behaviour unchanged.
      expect(
        sum(map, 8, [CIMMYT, IITA], CIMMYT_IITA_TARGET)
          .preliminary_achieved_value_sum,
      ).toBe(1);
      expect(
        sum(map, 8, [IITA], IITA_ALONE_TARGET).preliminary_achieved_value_sum,
      ).toBe(1);
      // No centre overlap -> still not counted.
      expect(
        sum(map, 8, [CIMMYT], CIMMYT_IITA_TARGET)
          .preliminary_achieved_value_sum,
      ).toBe(0);
    });

    it('leaves a single-node / single-centre indicator unchanged (RRC-AC-5)', () => {
      const SOLE = 601;
      const map = new Map<number, any[]>([
        [
          9,
          [
            {
              status_id: 2,
              contributing_indicator: 4,
              centerIds: new Set([SOLE]),
              tocIndicatorTargetId: null,
            },
            {
              status_id: 6,
              contributing_indicator: 2,
              centerIds: new Set([SOLE]),
              tocIndicatorTargetId: null,
            },
          ],
        ],
      ]);

      expect(sum(map, 9, [SOLE], null)).toEqual({
        actual_achieved_value_sum: 6,
        preliminary_achieved_value_sum: 2,
        achieved_value_sum: 6,
      });
    });

    it("passes the row's toc_indicator_target_id from fetchAndGroupTocResults (call site)", async () => {
      mockResolveContext();
      const spy = jest.spyOn(repository as any, 'sumContributionsForCenters');
      dataSourceQueryMock
        .mockResolvedValueOnce([
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
            target_value_sum: 1,
            actual_achieved_value_sum: 0,
            progress_percentage: '0%',
            centers_concat: `${CIMMYT}::CIMMYT||${IITA}::IITA`,
            toc_indicator_target_id: CIMMYT_IITA_TARGET,
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            indicator_id: 10,
            result_id: 1,
            status_id: 3,
            contributing_indicator: '1.00',
            toc_indicator_target_id: IITA_ALONE_TARGET,
            center_ids: `${IITA}`,
          },
        ]);

      const result = await repository.findByCompositeCode(
        'SP01',
        'SP01-AOW01',
        defaultContext,
      );

      expect(spy).toHaveBeenCalledWith(
        expect.any(Map),
        10,
        [CIMMYT, IITA],
        CIMMYT_IITA_TARGET,
        true,
      );
      // End to end: the sibling row reads 0 for a result reported against the other group.
      expect(result[0].indicators[0].achieved_value_sum).toBe(0);
      expect(result[0].indicators[0].preliminary_achieved_value_sum).toBe(0);
    });
  });

  // ─── BIL-TOC-T-2 ─────────────────────────────────────────────────────────────

  describe('findLeadProjectId', () => {
    it('returns project_id from the lead row (ORDER BY is_lead DESC)', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([
        { project_id: 101, is_lead: 1 },
      ]);

      const result = await repository.findLeadProjectId(12345);

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM main_test.results_by_projects rbp'),
        [12345],
      );
      const [query] = dataSourceQueryMock.mock.calls[0];
      expect(query).toContain('WHERE rbp.result_id = ? AND rbp.is_active = 1');
      expect(query).toContain('ORDER BY rbp.is_lead DESC, rbp.id DESC');
      expect(query).toContain('LIMIT 1');
      expect(result).toBe(101);
    });

    it('returns null when no active rows exist', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);

      const result = await repository.findLeadProjectId(99999);

      expect(dataSourceQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('FROM main_test.results_by_projects rbp'),
        [99999],
      );
      expect(result).toBeNull();
    });

    it('returns null (and does not throw) when dataSource.query rejects', async () => {
      dataSourceQueryMock.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await repository.findLeadProjectId(12345);

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: expect.stringContaining(
          'findLeadProjectId error for result_id=12345',
        ),
        className: AoWBilateralRepository.name,
        debug: true,
      });
      expect(result).toBeNull();
    });
  });

  describe('findProjectTocLinkage', () => {
    const sampleLinkageRows = [
      {
        toc_result_id: 10,
        category: 'OUTPUT',
        result_title: 'Output 1',
        related_node_id: 'NODE-10',
        indicator_id: 101,
        indicator_description: 'Indicator 101 description',
        indicator_type: 'Number of Policy',
        target_value: 5,
      },
    ];

    it('name-collision project: query binds project_id, never project name', async () => {
      dataSourceQueryMock.mockResolvedValueOnce(sampleLinkageRows);

      const result = await repository.findProjectTocLinkage(
        501,
        'SP01',
        'PHASE-1',
        2025,
      );

      expect(dataSourceQueryMock).toHaveBeenCalledTimes(1);
      const [query, params] = dataSourceQueryMock.mock.calls[0];

      // A clarisa_projects.id, resolved to the ToC row by code; never a name
      expect(params).toContain(501);
      expect(params).not.toContain(502);
      expect(params).not.toContain('502');
      expect(query).toContain('cp.short_name = trp.code');
      expect(query).toContain('cp.id = ?');
      expect(query).not.toContain('trp.project_id = ?');
      expect(query).toContain(
        'trit.project_id = CAST(trp.project_id AS SIGNED)',
      );
      expect(query).not.toContain('trp.name');
      expect(query).not.toContain('cp.name');

      expect(result).toEqual([
        {
          toc_result_id: 10,
          category: 'OUTPUT',
          result_title: 'Output 1',
          related_node_id: 'NODE-10',
          indicator_id: 101,
          indicator_description: 'Indicator 101 description',
          indicator_type: 'Number of Policy',
          toc_indicator_target_id: null,
          target_value: 5,
          center_id: null,
        },
      ]);
    });

    it('two-Program node filter: only nodes matching programOfficialCode are returned', async () => {
      const sp01Rows = [
        {
          toc_result_id: 1,
          category: 'OUTCOME',
          result_title: 'SP01 Outcome',
          related_node_id: 'SP01-NODE-1',
          indicator_id: 201,
          indicator_description: 'SP01 Indicator',
          indicator_type: 'Innovation Use',
          target_value: 12,
        },
      ];
      dataSourceQueryMock.mockResolvedValueOnce(sp01Rows);

      const result = await repository.findProjectTocLinkage(
        501,
        'SP01',
        'PHASE-1',
        2025,
      );

      const [query, params] = dataSourceQueryMock.mock.calls[0];
      expect(query).toContain('UPPER(TRIM(tr.official_code)) = UPPER(TRIM(?))');
      expect(params).toContain('SP01');
      expect(result).toHaveLength(1);
      expect(result?.[0].toc_result_id).toBe(1);
      expect(result?.[0].result_title).toBe('SP01 Outcome');
    });

    it('returns empty array [] when no linkage rows found', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);

      const result = await repository.findProjectTocLinkage(
        999,
        'SP01',
        'PHASE-1',
        2025,
      );

      expect(result).toEqual([]);
    });

    it('handles null indicator and target gracefully (node with no indicator rows)', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([
        {
          toc_result_id: 20,
          category: 'EOI',
          result_title: 'End of Initiative Outcome',
          related_node_id: 'EOI-20',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          target_value: null,
        },
      ]);

      const result = await repository.findProjectTocLinkage(
        501,
        'SP01',
        'PHASE-1',
        2025,
      );

      expect(result).toEqual([
        {
          toc_result_id: 20,
          category: 'EOI',
          result_title: 'End of Initiative Outcome',
          related_node_id: 'EOI-20',
          indicator_id: null,
          indicator_description: null,
          indicator_type: null,
          toc_indicator_target_id: null,
          target_value: null,
          center_id: null,
        },
      ]);
    });

    it('returns null (and does not throw) when dataSource.query rejects', async () => {
      dataSourceQueryMock.mockRejectedValueOnce(
        new Error('Connection timeout'),
      );

      const result = await repository.findProjectTocLinkage(
        501,
        'SP01',
        'PHASE-1',
        2025,
      );

      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: expect.stringContaining(
          'findProjectTocLinkage error for project_id=501',
        ),
        className: AoWBilateralRepository.name,
        debug: true,
      });
      expect(result).toBeNull();
    });

    it('parameters include programOfficialCode, phaseUuid, projectId, and reportingYear', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.findProjectTocLinkage(42, 'SP02', 'PHASE-2', 2026);

      const [, params] = dataSourceQueryMock.mock.calls[0];
      expect(params).toContain(42);
      expect(params).toContain('SP02');
      expect(params).toContain('PHASE-2');
      expect(params).toContain(2026);
    });

    it('binds projectId as the CLARISA id, not against the ToC trp.project_id (the two id spaces differ)', async () => {
      dataSourceQueryMock.mockResolvedValueOnce([]);

      await repository.findProjectTocLinkage(1676, 'SP03', 'PHASE-2026', 2026);

      const [query, params] = dataSourceQueryMock.mock.calls[0];
      expect(params).toContain(1676);
      expect(query).toContain('cp.short_name = trp.code');
      expect(query).toContain('cp.id = ?');
    });

    it('bilateral project lookups return the CLARISA id matched by code, not the ToC project_id', async () => {
      dataSourceQueryMock.mockResolvedValue([]);

      await repository.findBilateralProjectById(1, 'PHASE-2026');
      await repository.findBilateralProjectsByProgramOfficialCode(
        'SP03',
        'PHASE-2026',
      );

      for (const [query] of dataSourceQueryMock.mock.calls) {
        expect(query).toContain('cp.id AS project_id');
        expect(query).toContain('cp.short_name = trp.code');
        expect(query).not.toContain('trp.project_id AS project_id');
        expect(query).not.toContain('cp.id = trp.project_id');
      }
    });
  });
});
