import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultRepository } from './result.repository';

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
});
