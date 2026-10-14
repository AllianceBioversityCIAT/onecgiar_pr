import { DataSource } from 'typeorm';
import { IpsrRepository } from './ipsr.repository';

describe('IpsrRepository (unit)', () => {
  let repo: IpsrRepository;
  let dsQuery: jest.Mock;
  let repoQuery: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  beforeEach(() => {
    // fresh mocks
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new IpsrRepository(mockDataSource, mockHandlersError);
    dsQuery = mockDataSource.query as any as jest.Mock;
    repoQuery = jest.fn();
    // Override BaseRepository.query method
    (repo as any).query = repoQuery;
  });

  it('constructs repository', () => {
    expect(repo).toBeDefined();
    expect((mockDataSource.createEntityManager as any).mock.calls.length).toBe(
      1,
    );
  });

  it('fisicalDelete issues delete query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.fisicalDelete(123);
    expect(repoQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('delete rbip');
    expect(params).toEqual([123]);
    expect(res).toEqual({ ok: true });
  });

  it('logicalDelete issues update query', async () => {
    repoQuery.mockResolvedValueOnce({ ok: true });
    const res = await repo.logicalDelete(456);
    const [sql, params] = repoQuery.mock.calls[0];
    expect(sql.toLowerCase()).toContain('update result_by_innovation_package');
    expect(params).toEqual([456]);
    expect(res).toEqual({ ok: true });
  });

  it('getResultsInnovation returns array and uses IN (?) parameter', async () => {
    const rows = [{ id: 1 }];
    // 1) initiative_entity_map lookup
    dsQuery.mockResolvedValueOnce([]);
    // 2) main results query
    dsQuery.mockResolvedValueOnce(rows);
    const res = await repo.getResultsInnovation([1, 2, 3]);
    expect(dsQuery).toHaveBeenCalledTimes(2);
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('IN (?)');
    expect(params).toEqual([[1, 2, 3]]);
    expect(res).toEqual(rows);
  });

  it('getResultsInnovation propagates handler error on failure', async () => {
    dsQuery.mockRejectedValueOnce(new Error('boom'));
    await expect(repo.getResultsInnovation([5])).rejects.toBeDefined();
  });

  it('getResultInnovationDetail returns first row', async () => {
    const row = { result_id: 9 };
    dsQuery.mockResolvedValueOnce([row]);
    const res = await repo.getResultInnovationDetail(9);
    expect(dsQuery).toHaveBeenCalled();
    expect(res).toEqual(row);
  });

  it('getResultInnovationById maps regions, countries and subnational', async () => {
    // 1) main innovation row (no lead_contact_person_id to avoid extra query)
    dsQuery.mockResolvedValueOnce([
      { result_id: 10, lead_contact_person_id: null },
    ]);
    // 2) regions
    dsQuery.mockResolvedValueOnce([
      { result_region_id: 1, result_id: 10, id: 100, name: 'R1' },
    ]);
    // 3) countries
    dsQuery.mockResolvedValueOnce([
      {
        result_country_id: 20,
        result_id: 10,
        id: 200,
        name: 'C1',
        iso_alpha_2: 'AA',
      },
    ]);
    // 4) sub national for country id 20
    dsQuery.mockResolvedValueOnce([
      { id: 300, result_countries_id: 20, name: 'SN1' },
    ]);

    const res = await repo.getResultInnovationById(10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(1);
    const item: any = res[0];
    expect(Array.isArray(item.hasRegions)).toBe(true);
    expect(item.hasRegions[0].result_region_id).toBe(1);
    expect(Array.isArray(item.hasCountries)).toBe(true);
    expect(item.hasCountries[0].result_countries_sub_national[0].name).toBe(
      'SN1',
    );
  });

  it('P2-3824: the five Impact Area evidence subqueries exclude only Step 3 rows (type 7), keeping NULL and the Apr-2023 type-1 backfill', async () => {
    dsQuery.mockResolvedValueOnce([
      { result_id: 10, lead_contact_person_id: null },
    ]);
    dsQuery.mockResolvedValue([]);

    await repo.getResultInnovationById(10);

    const [sql] = dsQuery.mock.calls[0];
    for (const [alias, tag] of [
      ['e1', 'evidence_gender_tag'],
      ['e2', 'evidence_climate_tag'],
      ['e3', 'evidence_nutrition_tag'],
      ['e4', 'evidence_environment_tag'],
      ['e5', 'evidence_poverty_tag'],
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `${alias}\\.is_active = 1\\s+AND \\(${alias}\\.evidence_type_id IS NULL OR ${alias}\\.evidence_type_id <> 7\\)\\s+LIMIT 1\\s+\\) AS ${tag}`,
        ),
      );
    }
  });

  it('getIpsrList builds query with two placeholders and returns list', async () => {
    const rows = [{ id: 1 }];
    dsQuery.mockResolvedValueOnce(rows);
    const excelDto = {
      inits: [{ id: 1 }],
      phases: [{ id: 2 }],
      searchText: 'abc',
    } as any;
    const res = await repo.getIpsrList(excelDto);
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('ORDER BY');
    expect(params).toEqual(['?', '?']);
    expect(res).toEqual(rows);
  });

  it('getAllInnovationPackages includes r.is_replicated in query projection', async () => {
    const rows = [{ id: 1, is_replicated: 1 }];
    dsQuery.mockResolvedValueOnce(rows);

    const user = { id: 42 } as any;
    const res = await repo.getAllInnovationPackages(user);

    expect(dsQuery).toHaveBeenCalledTimes(1);
    const [sql] = dsQuery.mock.calls[0];
    expect(sql).toContain('r.is_replicated');
    expect(res).toEqual(rows);
  });

  it('getAllInnovationPackagesFiltered includes r.is_replicated in query projection', async () => {
    const rows = [{ id: 1, is_replicated: 1 }];
    repoQuery.mockResolvedValueOnce(rows);

    const res = await repo.getAllInnovationPackagesFiltered({ versionId: [1] });

    expect(repoQuery).toHaveBeenCalledTimes(1);
    const [sql] = repoQuery.mock.calls[0];
    expect(sql).toContain('r.is_replicated');
    expect(res).toEqual({ results: rows, total: 1 });
  });

  describe('createQueries (replication)', () => {
    const config = {
      phase: 5,
      user: { id: 77 } as any,
      old_result_id: 1000,
      new_result_id: 2000,
    } as any;

    const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    it('resolves the core innovation to its latest QAed version', () => {
      const { insertQuery } = repo.createQueries(config);
      const sql = normalize(insertQuery);

      expect(sql).toContain('IF( rbip.ipsr_role_id = 1,');
      expect(sql).toContain('r_lv.status_id = 2');
      expect(sql).toContain('order by v_lv.phase_year desc, r_lv.id desc');
      // complementary innovations keep their original reference
      expect(sql).toContain('rbip.result_id ) AS result_id');
    });

    it('keeps remapping the innovation package id to the new result', () => {
      const { insertQuery } = repo.createQueries(config);
      const sql = normalize(insertQuery);

      expect(sql).toContain('2000 AS result_innovation_package_id');
      expect(sql).toContain('FROM result_by_innovation_package rbip');
      expect(sql).toContain('result_innovation_package_id = 1000');
    });

    it('applies the same core innovation resolution in findQuery', () => {
      const { findQuery, insertQuery } = repo.createQueries(config);

      expect(normalize(findQuery)).toContain('IF( rbip.ipsr_role_id = 1,');
      expect(normalize(findQuery)).toContain(
        'FROM result_by_innovation_package rbip',
      );
      // both queries must resolve result_id the exact same way
      const extract = (sql: string) =>
        normalize(sql).match(
          /IF\( rbip\.ipsr_role_id = 1,.*?\) AS result_id/,
        )?.[0];
      expect(extract(findQuery)).toBe(extract(insertQuery));
    });

    it('returns the core innovation row of the new package', () => {
      const { returnQuery } = repo.createQueries(config);
      const sql = normalize(returnQuery);

      expect(sql).toContain('r1.result_innovation_package_id = 2000');
      expect(sql).toContain('r1.ipsr_role_id = 1');
    });
  });
  describe('PF2-R-1: program name next to the code (additive)', () => {
    const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    it('getAllInnovationPackages projects submitter_name and submitter_short_name keeping submitter_id', async () => {
      const rows = [
        {
          id: 1,
          submitter_id: 5,
          submitter_name: 'Program Full Name',
          submitter_short_name: 'PFN',
        },
      ];
      dsQuery.mockResolvedValueOnce(rows);

      const res = await repo.getAllInnovationPackages({ id: 42 } as any);

      const sql = normalize(dsQuery.mock.calls[0][0]);
      expect(sql).toContain('ci.id AS submitter_id');
      expect(sql).toContain('ci.name AS submitter_name');
      expect(sql).toContain('ci.short_name AS submitter_short_name');
      expect(res[0].submitter_name).toBe('Program Full Name');
      expect(res[0].submitter_short_name).toBe('PFN');
    });

    it('getResultsInnovation picks initiative_name from the same IF(role=2) branch as official_code', async () => {
      const rows = [{ id: 1, official_code: 'SP01', initiative_name: 'Name' }];
      dsQuery.mockResolvedValueOnce([]);
      dsQuery.mockResolvedValueOnce(rows);

      const res = await repo.getResultsInnovation([1]);

      const sql = normalize(dsQuery.mock.calls[1][0]);
      expect(sql).toContain(') AS official_code');
      expect(sql).toContain(') AS initiative_name');
      // both IF blocks: lead-branch (ci2) and own-branch (ci) read the same tables, only the field differs
      expect(sql).toContain(
        'SELECT ci2.official_code FROM clarisa_initiatives ci2',
      );
      expect(sql).toContain('SELECT ci2.name FROM clarisa_initiatives ci2');
      expect(sql).toContain(
        'SELECT ci.official_code FROM clarisa_initiatives ci WHERE ci.id = rbi.inititiative_id',
      );
      expect(sql).toContain(
        'SELECT ci.name FROM clarisa_initiatives ci WHERE ci.id = rbi.inititiative_id',
      );
      expect(sql.match(/IF\( \(rbi\.initiative_role_id = 2\),/g)).toHaveLength(
        2,
      );
      expect(res[0].initiative_name).toBe('Name');
    });

    it('getResultInnovationById projects initiative_name next to official_code', async () => {
      dsQuery.mockResolvedValueOnce([
        { result_id: 10, lead_contact_person_id: null, initiative_name: 'N' },
      ]);
      dsQuery.mockResolvedValue([]);

      const res = await repo.getResultInnovationById(10);

      const sql = normalize(dsQuery.mock.calls[0][0]);
      expect(sql).toContain(') AS official_code');
      expect(sql).toContain(
        'SELECT ci.name FROM clarisa_initiatives ci WHERE ci.id = rbi.inititiative_id ) AS initiative_name',
      );
      expect((res[0] as any).initiative_name).toBe('N');
    });

    it('getInnovationCoreStepOne projects initiative_name next to official_code', async () => {
      dsQuery.mockResolvedValueOnce([{ result_id: 3 }]);
      dsQuery.mockResolvedValueOnce([
        { result_code: 1, official_code: 'SP01', initiative_name: 'N' },
      ]);

      const res = await repo.getInnovationCoreStepOne(1);

      const sql = normalize(dsQuery.mock.calls[1][0]);
      expect(sql).toContain(') AS official_code');
      expect(sql).toContain(
        'SELECT ci.name FROM clarisa_initiatives ci WHERE ci.id = rbi.inititiative_id ) AS initiative_name',
      );
      expect(res.initiative_name).toBe('N');
    });

    it('getStepTwoOne projects initiative_name next to initiative_official_code', async () => {
      repoQuery.mockResolvedValueOnce([
        { initiative_official_code: 'SP01', initiative_name: 'N' },
      ]);

      const res: any[] = await repo.getStepTwoOne(1);

      const sql = normalize(repoQuery.mock.calls[0][0]);
      expect(sql).toContain('ci.official_code as initiative_official_code');
      expect(sql).toContain('ci.name as initiative_name');
      expect(res[0].initiative_name).toBe('N');
    });
  });
});
