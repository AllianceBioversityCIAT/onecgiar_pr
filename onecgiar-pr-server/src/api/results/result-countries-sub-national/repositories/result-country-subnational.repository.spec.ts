import { ResultCountrySubnationalRepository } from './result-country-subnational.repository';
import { ResultCountriesSubNationalRepository } from './result-countries-sub-national.repository';

/**
 * Night sweep 2026-09-23 — the sub-national codes (and the ids of the bulk inactivate helpers)
 * must travel as bound parameters, never be interpolated into the SQL text. Control negative:
 * with the old string interpolation these tests fail (the value shows up inside the SQL).
 */
const QUOTED = 'CO-"ANT';

const build = (Ctor: any) => {
  const repo: any = Object.create(Ctor.prototype);
  repo.query = jest.fn().mockResolvedValue([]);
  repo._handlersError = {
    returnErrorRepository: jest.fn((e) => e),
  };
  return repo;
};

describe('ResultCountrySubnationalRepository.bulkUpdateSubnational — bound parameters', () => {
  it('passes every code as a parameter and never writes it into the SQL', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    await repo.bulkUpdateSubnational(10, [QUOTED, 'CO-DC'], 7, 2);

    // inactivate-the-rest, then the read of the ids to reactivate (the id update only runs
    // when that read returns rows; here the mock returns none).
    expect(repo.query).toHaveBeenCalledTimes(2);
    const [inactiveSql, inactiveParams] = repo.query.mock.calls[0];
    const [selectSql, selectParams] = repo.query.mock.calls[1];

    for (const sql of [inactiveSql, selectSql]) {
      expect(sql).not.toContain(QUOTED);
      expect(sql).not.toContain('CO-DC');
    }
    expect(inactiveSql).toMatch(/not in \(\?, \?\)/);
    expect(selectSql).toMatch(/\bin \(\?, \?\)/);
    expect(inactiveParams).toEqual([7, 10, 2, QUOTED, 'CO-DC']);
    expect(selectParams).toEqual([10, 2, QUOTED, 'CO-DC']);
  });

  it('placeholder count matches the parameter count', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    await repo.bulkUpdateSubnational(10, ['A', 'B', 'C'], 7);
    for (const [sql, params] of repo.query.mock.calls) {
      expect((sql.match(/\?/g) ?? []).length).toBe(params.length);
    }
  });

  it.each([[[]], [null], [undefined]])(
    'empty list (%p) keeps the old behaviour: one "inactivate all" update, no in () clause',
    async (codes) => {
      const repo = build(ResultCountrySubnationalRepository);
      await repo.bulkUpdateSubnational(10, codes as any, 7, 2);
      expect(repo.query).toHaveBeenCalledTimes(1);
      const [sql, params] = repo.query.mock.calls[0];
      expect(sql).not.toMatch(/\bin \(/i);
      expect(sql).toMatch(/set is_active = 0/);
      expect(params).toEqual([7, 10, 2]);
    },
  );
});

/**
 * RSF-T-5 / RSF-R-4 — a re-sent code reactivates ONE row (the newest id), never every historic
 * duplicate. Two steps (read ids, then update by id) so MySQL never sees a self-referencing UPDATE
 * (error 1093). MySQL's own evaluation is NOT proven here; RSF-T-7 (live resubmission) is.
 */
describe('ResultCountrySubnationalRepository.bulkUpdateSubnational — one row per code (RSF-R-4)', () => {
  it('reads one id per code, scoped to the country, role and codes, bound once', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    await repo.bulkUpdateSubnational(10, ['CO-ANT', 'CO-DC'], 7, 2);

    const [selectSql, selectParams] = repo.query.mock.calls[1];
    expect(selectSql).toMatch(/max\(id\)/i);
    expect(selectSql).toMatch(/group by\s+clarisa_subnational_scope_code/i);
    expect(selectSql).toMatch(/result_country_id\s*=\s*\?/);
    expect(selectSql).toMatch(/geo_scope_role_id\s*=\s*\?/);
    // country, role and each code appear exactly once, in this order
    expect(selectParams).toEqual([10, 2, 'CO-ANT', 'CO-DC']);
    expect((selectSql.match(/\?/g) ?? []).length).toBe(selectParams.length);
  });

  it('reactivates only the ids it read, by id, never by code', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    repo.query
      .mockResolvedValueOnce([]) // inactivate the rest
      .mockResolvedValueOnce([{ id: 31 }, { id: '45' }]) // one id per code
      .mockResolvedValueOnce('UPDATED');

    const result = await repo.bulkUpdateSubnational(
      10,
      ['CO-ANT', 'CO-DC'],
      7,
      2,
    );

    expect(repo.query).toHaveBeenCalledTimes(3);
    const [updateSql, updateParams] = repo.query.mock.calls[2];
    expect(updateSql).toMatch(/set is_active = 1/);
    expect(updateSql).toMatch(/where id in \(\?, \?\)/);
    expect(updateSql).not.toMatch(/clarisa_subnational_scope_code/);
    expect(updateParams).toEqual([7, 31, '45']);
    expect(result).toBe('UPDATED');
  });

  it('does not issue the update when every requested code is already active', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    repo.query.mockResolvedValue([]);
    await repo.bulkUpdateSubnational(10, ['CO-ANT'], 7, 2);
    expect(repo.query).toHaveBeenCalledTimes(2);
  });

  it('skips a code that already has an active row (at most one active per code)', async () => {
    const repo = build(ResultCountrySubnationalRepository);
    await repo.bulkUpdateSubnational(10, ['CO-ANT'], 7, 2);
    const [selectSql] = repo.query.mock.calls[1];
    expect(selectSql).toMatch(/having\s+sum\(is_active\s*>\s*0\)\s*=\s*0/i);
  });
});

describe.each([
  ['ResultCountrySubnationalRepository', ResultCountrySubnationalRepository],
  [
    'ResultCountriesSubNationalRepository',
    ResultCountriesSubNationalRepository,
  ],
])('%s.inactiveAllIds — bound parameters', (_name, Ctor) => {
  it('passes the ids as parameters', async () => {
    const repo = build(Ctor);
    await repo.inactiveAllIds([123456, 654321]);
    const [sql, params] = repo.query.mock.calls[0];
    expect(sql).not.toContain('123456');
    expect(sql).toMatch(/in \(\?, \?\)/);
    expect(params).toEqual([123456, 654321]);
  });

  it('empty list keeps the old "in (null)" query that matches nothing', async () => {
    const repo = build(Ctor);
    await repo.inactiveAllIds([]);
    const [sql, params] = repo.query.mock.calls[0];
    expect(sql).toMatch(/in \(null\)/);
    expect(params).toEqual([]);
  });
});
