// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { PtPorbRepository } from './pt-porb.repository';

/**
 * `PTM-T-5` — `PtPorbRepository` is a thin, read-only wrapper around
 * `dataSource.query()`. `db-toc-write-guard.spec.ts` already proves (repo-wide) that
 * no `.ts` file issues a write statement against `env.DB_TOC`; this spec proves the
 * two behaviors specific to this repository: it issues exactly one `SELECT`, and it
 * maps the raw row shape into {@link PtPorbRow}, dropping rows with no usable join key.
 */
describe('PtPorbRepository', () => {
  function makeRepository(rows: any[]) {
    const dataSource = { query: jest.fn().mockResolvedValue(rows) };
    const repository = new PtPorbRepository(dataSource as any);
    return { repository, dataSource };
  }

  it('issues a single read-only query (no INSERT/UPDATE/DELETE/CREATE/ALTER keyword) against the ToC schema', async () => {
    const { repository, dataSource } = makeRepository([]);

    await repository.findPorbRowsForPhase('phase-uuid', 2026);

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    const [sql] = dataSource.query.mock.calls[0];
    expect(sql).toMatch(/SELECT/i);
    expect(sql).not.toMatch(
      /INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE/i,
    );
  });

  it('maps raw rows into PtPorbRow, defaulting null texts to empty strings and integration id to null', async () => {
    const { repository } = makeRepository([
      {
        toc_results_indicator_id: '8006329bfd49',
        toc_indicator_integration_id: '900123',
        program: 'Food Frontiers and Security',
        aow: 'AOW02: Fragile and Conflict-affected Food Systems',
        center: 'CIAT (Alliance)',
        hlo_title: '2.1.1 Prevent',
        description: 'AW2P3: Fragility and Conflict Sensitivity Hub',
      },
      {
        toc_results_indicator_id: 'no-aow-row',
        toc_indicator_integration_id: null,
        program: null,
        aow: null,
        center: null,
        hlo_title: null,
        description: null,
      },
    ]);

    const rows = await repository.findPorbRowsForPhase('phase-uuid', 2026);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      tocResultsIndicatorId: '8006329bfd49',
      tocIndicatorIntegrationId: 900123,
      program: 'Food Frontiers and Security',
      aow: 'AOW02: Fragile and Conflict-affected Food Systems',
      center: 'CIAT (Alliance)',
      hloTitle: '2.1.1 Prevent',
      description: 'AW2P3: Fragility and Conflict Sensitivity Hub',
    });
    expect(rows[1]).toEqual({
      tocResultsIndicatorId: 'no-aow-row',
      tocIndicatorIntegrationId: null,
      program: '',
      aow: '',
      center: '',
      hloTitle: '',
      description: '',
    });
  });

  it('drops rows with no usable toc_results_indicator_id (nothing to join the mapping table on)', async () => {
    const { repository } = makeRepository([
      { toc_results_indicator_id: null, program: 'x' },
      { toc_results_indicator_id: '', program: 'y' },
      { toc_results_indicator_id: 'ok-id', program: 'z' },
    ]);

    const rows = await repository.findPorbRowsForPhase('phase-uuid', 2026);

    expect(rows).toHaveLength(1);
    expect(rows[0].tocResultsIndicatorId).toBe('ok-id');
  });

  it('adds a program filter clause and its two bound params only when programId is provided', async () => {
    const { repository, dataSource } = makeRepository([]);

    await repository.findPorbRowsForPhase('phase-uuid', 2026);
    expect(dataSource.query.mock.calls[0][1]).toEqual([2026, 'phase-uuid']);

    await repository.findPorbRowsForPhase(
      'phase-uuid',
      2026,
      'Food Frontiers and Security',
    );
    const [sqlWithProgram, paramsWithProgram] = dataSource.query.mock.calls[1];
    expect(sqlWithProgram).toMatch(/ci_prog\.name = \?|tr\.official_code = \?/);
    expect(paramsWithProgram).toEqual([
      2026,
      'phase-uuid',
      'Food Frontiers and Security',
      'Food Frontiers and Security',
    ]);
  });

  it('binds wp.year = ? against reportingYear, ahead of tr.phase = ? in bound-param order', async () => {
    const { repository, dataSource } = makeRepository([]);

    await repository.findPorbRowsForPhase('phase-uuid', 2026);

    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toMatch(/wp\.year\s*=\s*\?/);
    expect(params).toEqual([2026, 'phase-uuid']);
  });

  it('aggregates aow with MIN(...) and excludes it — and every wp.* column — from GROUP BY, so one indicator toc_id yields exactly one output row even when toc_work_packages holds multiple year rows for it (PTM-T-5 rework finding 2, ADOPTED remediation)', async () => {
    const { repository, dataSource } = makeRepository([]);

    await repository.findPorbRowsForPhase('phase-uuid', 2026);

    const [sql] = dataSource.query.mock.calls[0];
    expect(sql).toMatch(/MIN\(\s*CASE[\s\S]*?END\s*\)\s*AS aow/i);

    const groupByClause = sql.match(/GROUP BY([\s\S]*?)ORDER BY/i)?.[1];
    expect(groupByClause).toBeDefined();
    expect(groupByClause).not.toMatch(/wp\./);
    expect(groupByClause).not.toMatch(/\baow\b/);
  });
});
