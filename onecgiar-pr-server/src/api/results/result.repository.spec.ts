import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  QA_LINKABLE_INNOVATION_STATUS_IDS,
  ResultRepository,
} from './result.repository';

describe('ResultRepository (unit)', () => {
  let repo: ResultRepository;
  let queryMock: jest.Mock;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn(
      ({ error, className }: { error: Error; className: string }) => ({
        response: (error as any)?.response
          ? (error as any).response
          : { error: true },
        message: `[${className}] => error: ${error}`,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    ),
  } as any;

  beforeEach(() => {
    repo = new ResultRepository(mockDataSource, mockHandlersError);
    queryMock = jest.fn();

    (repo as any).query = queryMock;
  });

  it('builds IN clauses for array filters and paginates', async () => {
    const items = [{ id: 1, title: 'A' }];
    queryMock
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ total: 1 }]);

    const res = await repo.AllResultsByRoleUserAndInitiativeFiltered(
      7,
      {
        initiativeCode: ['I1', 'I2'],
        versionId: [1, 2],
        submitterId: [10],
        resultTypeId: [3],
        portfolioId: [5],
        statusId: [1, 2],
      },
      [10, 11],
      { limit: 10, offset: 0 },
    );

    expect(res.results).toEqual(items);
    expect(res.total).toBe(1);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('ci.official_code IN (?,?)');
    expect(sql).toContain('r.version_id IN (?,?)');
    expect(sql).toContain('ci.id IN (?)');
    expect(sql).toContain('rt.id IN (?)');
    expect(sql).toContain('ci.portfolio_id IN (?)');
    expect(sql).toContain('r.status_id IN (?,?)');
    expect(sql).toContain('LIMIT 10');
    expect(sql).toContain('OFFSET 0');

    expect(params).toEqual([7, 'I1', 'I2', 1, 2, 10, 3, 5, 1, 2]);

    const [countSql, countParams] = queryMock.mock.calls[1];
    expect(countSql).toContain('SELECT COUNT(1) as total FROM (');
    expect(countParams).toEqual(params);
  });

  it('supports single filter values without pagination', async () => {
    const items = [{ id: 2 }];
    queryMock.mockResolvedValueOnce(items);

    const res = await repo.AllResultsByRoleUserAndInitiativeFiltered(9, {
      initiativeCode: 'ABC',
      versionId: 1,
      submitterId: 22,
      resultTypeId: 4,
      portfolioId: 6,
      statusId: 1,
    });

    expect(res.results).toEqual(items);
    expect(res.total).toBe(1);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('ci.official_code IN (?)');
    expect(params).toEqual([9, 'ABC', 1, 22, 4, 6, 1]);
  });

  it('adds OR clause for my activity (created and submitted)', async () => {
    const items = [{ id: 3 }];
    queryMock
      .mockResolvedValueOnce(items)
      .mockResolvedValueOnce([{ total: 1 }]);

    await repo.AllResultsByRoleUserAndInitiativeFiltered(
      7,
      {
        myActivityUserId: 42,
        filterMyCreated: true,
        filterMySubmitted: true,
      },
      [10, 11],
      { limit: 5, offset: 0 },
    );

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('r.created_by = ?');
    expect(sql).toContain('FROM submission s');
    expect(sql).toContain('OR');
    expect(params).toEqual([7, 42, 42]);
  });

  it('throws INTERNAL_SERVER_ERROR on query failure', async () => {
    queryMock.mockRejectedValueOnce(new Error('db error'));

    await expect(
      repo.AllResultsByRoleUserAndInitiativeFiltered(1, {
        initiativeCode: ['X'],
      }),
    ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
  });

  it('includes source, result type, and reporting year in the bilateral common-fields query', async () => {
    queryMock.mockResolvedValueOnce([{ id: 8731 }]);

    await repo.getCommonFieldsBilateralResultById(8731);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('r.source');
    expect(sql).toContain('v.phase_year AS reporting_year');
    expect(sql).toContain('LEFT JOIN version v');
    expect(sql).toContain('rt.name AS result_category');
    expect(params).toEqual([8731]);
  });

  it('includes AI provenance fields in bilateral center results ordered newest first', async () => {
    queryMock.mockResolvedValueOnce([]);

    await repo.getResultsByBilateralCenter('BIO', 36);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('r.creation_method');
    expect(sql).toContain(
      "CASE WHEN r.creation_method = 'AI' THEN 1 ELSE 0 END AS is_ai_generated",
    );
    expect(sql).toContain('ORDER BY r.created_date DESC, r.id DESC');
    expect(params).toEqual(['BIO', 'BIO', 36]);
  });

  // P2-3152 AC6 — the centre dashboard must list Project name and Description. Neither was
  // selected, so the client had nothing to render. The project is resolved with a correlated
  // subquery on purpose: a LEFT JOIN on results_by_projects would duplicate the result row
  // once per project link and silently inflate the dashboard list.
  it('returns the result description and the project name for the bilateral centre dashboard, without multiplying rows', async () => {
    queryMock.mockResolvedValueOnce([]);

    await repo.getResultsByBilateralCenter('BIO', 36);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('r.description');
    expect(sql).toContain(
      "COALESCE(NULLIF(TRIM(cp.full_name), ''), cp.short_name)",
    );
    expect(sql).toContain(') AS project_name');
    expect(sql).not.toContain('LEFT JOIN results_by_projects');
    // The subquery adds no bound parameter — a stray ? here would shift mysql2's placeholders.
    expect(params).toEqual(['BIO', 'BIO', 36]);
  });

  // W12-R-2: matrix must count only W1/W2-origin (source='Result'), primary-submitter
  // (initiative_role_id=1) results in the requested version, with the meter's status/type
  // universe (status != 4, type NOT IN (10, 11)) — not the pre-fix bilateral/contributor/
  // year-scoped/narrower-universe query.
  describe('getIndicatorContributionSummaryByProgram (W12-R-2)', () => {
    it('binds exactly as many parameters as the SQL has ? placeholders (hotfix: a ? inside a SQL comment was consumed by mysql2 as a 3rd placeholder → QueryFailedError 500)', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql, params] = queryMock.mock.calls[0];
      // mysql2 substitutes positionally and does NOT skip SQL comments — every `?` counts.
      expect((sql.match(/\?/g) ?? []).length).toBe(params.length);
      expect(params).toEqual([15, 42]);
    });

    it('scopes by origin (r.source = Result) to exclude bilateral (source=API) rows', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain("r.source = 'Result'");
    });

    it('scopes by ownership (rbi.initiative_role_id = 1) to exclude contributor-role rows', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain('rbi.initiative_role_id = 1');
    });

    it('scopes by r.version_id (not the year-COALESCE) to exclude other-version rows', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toContain('AND r.version_id = ?');
      expect(sql).not.toContain('reported_year_id');
      expect(sql).not.toContain('COALESCE');
      expect(params).toEqual([15, 42]);
    });

    it('reconciles the status universe to the meter (status != 4, not IN (1,2,3))', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain('r.status_id != 4');
      expect(sql).not.toContain('r.status_id IN (1, 2, 3)');
    });

    it('reconciles the result-type universe to the meter (NOT IN (10, 11))', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain('r.result_type_id NOT IN (10, 11)');
      expect(sql).not.toContain(
        'r.result_type_id IN (1, 2, 4, 5, 6, 7, 8, 10)',
      );
    });

    it('drops the result_level_id filter absent from the meter base query (W12-DD-2)', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getIndicatorContributionSummaryByProgram(15, 42);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).not.toContain('result_level_id');
    });
  });
  /**
   * P2-3420 / P2-3421 — the catalogue behind the "link to a QA'd Innovation Development result"
   * dropdown. These pin the three things the story is explicit about and the one that is still
   * pending business confirmation.
   */
  describe('getQaEdInnovationDevelopmentResults (P2-3420 / P2-3421)', () => {
    it('asks only for Innovation Development results (result_type_id = 7)', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2026);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).toContain('r.result_type_id = 7');
    });

    /**
     * 🛑 THE PHASE RULE, and it is singular. Ángel Jarrín closed the scope on 31-Aug-2026 after
     * Nicoleta confirmed it: "QA-ed in the previous reporting phase". He had written "previous
     * phases" (plural) that same morning and retracted it 39 minutes later, so a `<` here is the
     * WRONG rule, not a looser one — it would offer innovations from 2022-2024 that the business
     * excluded.
     */
    it('asks for the PREVIOUS phase only, exactly the year the caller resolved', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2025);

      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toContain('v.phase_year = ?');
      expect(sql).not.toContain('v.phase_year < ?');
      expect(params[0]).toBe(2025);
      // 🛑 never a hardcoded year: "the rule should remain generic" (Ángel, 31-Aug-2026).
      expect(sql).not.toContain('Reporting 2025');
      expect(sql).not.toMatch(/phase_year\s*=\s*20\d\d/);
    });

    it('filters by the states listed in QA_LINKABLE_INNOVATION_STATUS_IDS and nothing else', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2026);

      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toContain('r.status_id IN (');
      // The status list is bound twice: once for the catalogue, once for the de-duplication
      // sub-query that picks the most recent QA'd phase of the same innovation.
      expect(params).toEqual([
        2026,
        ...QA_LINKABLE_INNOVATION_STATUS_IDS,
        2026,
        ...QA_LINKABLE_INNOVATION_STATUS_IDS,
      ]);
      // Both bindings carry the SAME year: the catalogue and its de-duplication look at one phase.
      expect(params[0]).toBe(
        params[1 + QA_LINKABLE_INNOVATION_STATUS_IDS.length],
      );
    });

    it('is portfolio-wide: no Science Program / Accelerator restriction, by design', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2026);

      const [sql] = queryMock.mock.calls[0];
      expect(sql).not.toContain('initiative');
      // The only portfolio reference is the join that reads its acronym for display; nothing filters on it.
      expect(sql).not.toMatch(/WHERE[\s\S]*cp\.id\s*=/);
    });

    /**
     * ⚠️ THE DUPLICATE-INNOVATION GUARD, still needed after narrowing to one phase. A phase year
     * holds ONE VERSION PER PORTFOLIO, so the same `result_code` can appear more than once inside
     * the same year. Without this clause the reporter sees the same innovation twice with an
     * identical, indistinguishable label and cannot tell which to pick.
     */
    it('collapses rows sharing a result_code inside the previous phase to a single one', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2025);

      const [sql] = queryMock.mock.calls[0];
      const normalized = sql.replace(/\s+/g, ' ');

      // Correlated on the innovation identity, not on the row id.
      expect(normalized).toContain('NOT EXISTS');
      expect(normalized).toContain('newer.result_code = r.result_code');
      // Scoped to the SAME phase now — a cross-phase comparison would resurrect the old rule.
      expect(normalized).toContain('newer_v.phase_year = ?');
      expect(normalized).not.toContain('newer_v.phase_year > v.phase_year');
      expect(normalized).not.toContain('newer_v.phase_year < ?');
      // The surviving candidate must itself be an eligible catalogue row.
      expect(normalized).toContain('newer.is_active = TRUE');
      expect(normalized).toContain('newer_v.is_active = TRUE');
      expect(normalized).toContain('newer.result_type_id = 7');
      expect(normalized).toContain('newer.status_id IN (');
    });

    it('breaks a tie deterministically, so one code can never yield two rows', async () => {
      queryMock.mockResolvedValueOnce([]);

      await repo.getQaEdInnovationDevelopmentResults(2025);

      const [sql] = queryMock.mock.calls[0];
      const normalized = sql.replace(/\s+/g, ' ');
      // Inside a single phase the row id is the only tie-breaker left, and it is total.
      expect(normalized).toContain('newer.id > r.id');
    });

    it('returns the id, code, title and status the dropdown needs', async () => {
      const rows = [
        {
          id: 501,
          result_code: 5501,
          title: 'Bean variety',
          status_id: 2,
          phase_year: 2025,
        },
      ];
      queryMock.mockResolvedValueOnce(rows);

      await expect(
        repo.getQaEdInnovationDevelopmentResults(2026),
      ).resolves.toEqual(rows);
    });
  });
});
