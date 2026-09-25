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

    expect(repo.query).toHaveBeenCalledTimes(2);
    const [inactiveSql, inactiveParams] = repo.query.mock.calls[0];
    const [activeSql, activeParams] = repo.query.mock.calls[1];

    for (const sql of [inactiveSql, activeSql]) {
      expect(sql).not.toContain(QUOTED);
      expect(sql).not.toContain('CO-DC');
    }
    expect(inactiveSql).toMatch(/not in \(\?, \?\)/);
    expect(activeSql).toMatch(/\bin \(\?, \?\)/);
    expect(inactiveParams).toEqual([7, 10, 2, QUOTED, 'CO-DC']);
    expect(activeParams).toEqual([7, 10, 2, QUOTED, 'CO-DC']);
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
