import { ImpactLevelSearchRepository } from './impact-level-search.repository';

/**
 * IRS-T-6 / IRS-R-10 — the query builder is faked, so these tests pin the SHAPE of the query
 * (filters, ordering keys, paging window). SQL ordering and p95 are proven on PRTest in IRS-T-9.
 */
const buildFakeQb = (total: number, rows: Array<Record<string, unknown>>) => {
  const calls: Record<string, any[][]> = {};
  const qb: any = {};
  const record = (name: string, ret?: () => any) => {
    qb[name] = jest.fn((...args: any[]) => {
      (calls[name] ??= []).push(args);
      return ret ? ret() : qb;
    });
  };
  [
    'leftJoin',
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'offset',
    'limit',
    'setParameter',
  ].forEach((n) => record(n));
  record('clone', () => qb);
  record('getCount', () => Promise.resolve(total));
  record('getRawMany', () => Promise.resolve(rows));
  return { qb, calls };
};

const build = (total = 0, rows: Array<Record<string, unknown>> = []) => {
  const fake = buildFakeQb(total, rows);
  const dataSource = { createQueryBuilder: jest.fn(() => fake.qb) };
  const repo = new ImpactLevelSearchRepository(dataSource as any);
  return { repo, ...fake, dataSource };
};

const base = { page: 1, limit: 20, activeVersionId: 7 };
const whereCalls = (calls: Record<string, any[][]>) => [
  ...(calls.where ?? []),
  ...(calls.andWhere ?? []),
];
const wheres = (calls: Record<string, any[][]>) =>
  whereCalls(calls).map((c) => c[0]);
const whereParams = (calls: Record<string, any[][]>) =>
  whereCalls(calls).map((c) => c[1]);

describe('ImpactLevelSearchRepository.search (IRS-R-10 / E5)', () => {
  it('always restricts to active results (deleted results are never returned)', async () => {
    const { repo, calls } = build();
    await repo.search(base);
    expect(wheres(calls)).toContain('r.is_active = :isActive');
    expect(whereParams(calls)).toContainEqual({ isActive: true });
  });

  it('orders active phase first, then phase year desc, then result code (2023 never before 2026)', async () => {
    const { repo, calls } = build();
    await repo.search(base);
    expect(calls.addSelect.map((c) => c[1])).toContain('is_active_phase');
    expect(calls.orderBy[0]).toEqual(['is_active_phase', 'DESC']);
    expect(calls.addOrderBy.map((c) => c.slice(0, 2))).toEqual([
      ['version.phase_year', 'DESC'],
      ['r.result_code', 'ASC'],
      ['r.id', 'ASC'],
    ]);
    const activeParam = calls.setParameter.find(
      (c) => c[0] === 'activeVersionId',
    );
    expect(activeParam[1]).toBe(7);
  });

  it('does not match any row as the active phase when none is open', async () => {
    const { repo, calls } = build();
    await repo.search({ ...base, activeVersionId: null });
    expect(calls.setParameter.find((c) => c[0] === 'activeVersionId')[1]).toBe(
      0,
    );
  });

  it('applies page and limit as an offset window (page 3, limit 10 -> offset 20)', async () => {
    const { repo, calls } = build();
    await repo.search({ ...base, page: 3, limit: 10 });
    expect(calls.offset[0]).toEqual([20]);
    expect(calls.limit[0]).toEqual([10]);
  });

  it('excludes the impact result being edited (AND with the other filters)', async () => {
    const { repo, calls } = build();
    await repo.search({ ...base, excludeResultId: 55, versionId: 3 });
    const w = wheres(calls);
    expect(w).toContain('r.id <> :excludeResultId');
    expect(w).toContain('r.version_id = :versionId');
    expect(whereParams(calls)).toContainEqual({ excludeResultId: 55 });
  });

  it('filters by portfolio and by result type ids', async () => {
    const { repo, calls } = build();
    await repo.search({ ...base, portfolioId: 4, typeIds: [1, 7] });
    const w = wheres(calls);
    expect(w).toContain('version.portfolio_id = :portfolioId');
    expect(w).toContain('r.result_type_id IN (:...typeIds)');
    expect(whereParams(calls)).toContainEqual({ typeIds: [1, 7] });
  });

  it('matches free text on title and, for digits, exactly on result code; wildcards are escaped', async () => {
    const { repo, calls } = build();
    await repo.search({ ...base, q: '9821' });
    expect(wheres(calls)).toContain(
      '(r.result_code = :qCode OR r.title LIKE :qLike)',
    );
    expect(whereParams(calls)).toContainEqual({
      qCode: 9821,
      qLike: '%9821%',
    });

    const second = build();
    await second.repo.search({ ...base, q: '100%_maize' });
    expect(wheres(second.calls)).toContain('r.title LIKE :qLike');
    expect(whereParams(second.calls)).toContainEqual({
      qLike: '%100\\%\\_maize%',
    });
  });

  it('maps raw rows to the E3 item shape and returns the total', async () => {
    const { repo } = build(2, [
      {
        result_id: '9821',
        result_code: '9821',
        title: 'Maize hybrid',
        result_type_name: 'Innovation development',
        phase_name: 'Reporting 2026',
        portfolio_acronym: 'P25',
        status_name: 'Editing',
      },
      {
        result_id: 4410,
        result_code: 4410,
        title: 'Maize policy',
        result_type_name: null,
        phase_name: null,
        portfolio_acronym: null,
        status_name: null,
      },
    ]);
    const out = await repo.search(base);
    expect(out.total).toBe(2);
    expect(out.items).toEqual([
      {
        result_id: 9821,
        result_code: 9821,
        title: 'Maize hybrid',
        result_type_name: 'Innovation development',
        phase_name: 'Reporting 2026',
        portfolio_acronym: 'P25',
        status_name: 'Editing',
      },
      {
        result_id: 4410,
        result_code: 4410,
        title: 'Maize policy',
        result_type_name: null,
        phase_name: null,
        portfolio_acronym: null,
        status_name: null,
      },
    ]);
  });
});
