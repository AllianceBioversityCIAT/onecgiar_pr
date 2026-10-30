import { ImpactLevelCountsRepository } from './impact-level-counts.repository';

/**
 * IRS-T-6 / IRS-R-11 — faked query builder: pins the aggregate's shape and the mapping of its
 * raw row. The arithmetic itself runs in MySQL and is proven on PRTest in IRS-T-9.
 */
const build = (raw: Record<string, unknown> | undefined) => {
  const calls: Record<string, any[][]> = {};
  const qb: any = {};
  ['innerJoin', 'select', 'addSelect', 'where', 'andWhere'].forEach((n) => {
    qb[n] = jest.fn((...a: any[]) => {
      (calls[n] ??= []).push(a);
      return qb;
    });
  });
  qb.getRawOne = jest.fn(() => Promise.resolve(raw));
  const dataSource = { createQueryBuilder: jest.fn(() => qb) };
  return {
    repo: new ImpactLevelCountsRepository(dataSource as any),
    calls,
  };
};

const COLUMNS = [
  'nutrition_tag_level_id',
  'poverty_tag_level_id',
  'gender_tag_level_id',
  'climate_change_tag_level_id',
  'environmental_biodiversity_tag_level_id',
];

describe('ImpactLevelCountsRepository.countByArea (IRS-R-11 / E6)', () => {
  it('Scenario 11.1: Climate = 2, Nutrition = 1, the others 0, total = 2', async () => {
    const { repo } = build({
      area_1: '1',
      area_2: '0',
      area_3: '0',
      area_4: '2',
      area_5: '0',
      total: '2',
    });
    const out = await repo.countByArea(11, 3);
    expect(out).toEqual({
      areas: [
        { impact_area_id: 1, count: 1 },
        { impact_area_id: 2, count: 0 },
        { impact_area_id: 3, count: 0 },
        { impact_area_id: 4, count: 2 },
        { impact_area_id: 5, count: 0 },
      ],
      total: 2,
    });
  });

  it('keeps all 5 areas with zeros when nothing matches (null aggregates, missing row)', async () => {
    const nulls = {
      area_1: null,
      area_2: null,
      area_3: null,
      area_4: null,
      area_5: null,
      total: null,
    };
    for (const raw of [nulls, undefined]) {
      const { repo } = build(raw);
      const out = await repo.countByArea(11, 3);
      expect(out.areas.map((a) => a.impact_area_id)).toEqual([1, 2, 3, 4, 5]);
      expect(out.areas.every((a) => a.count === 0)).toBe(true);
      expect(out.total).toBe(0);
    }
  });

  it('counts only Principal (tag level 3) per area, distinct per result, from the real columns', async () => {
    const { repo, calls } = build({});
    await repo.countByArea(11, 3);
    const selects = [...calls.select, ...calls.addSelect];
    COLUMNS.forEach((col, i) => {
      const hit = selects.find((c) => c[1] === `area_${i + 1}`);
      expect(hit?.[0]).toBe(
        `COUNT(DISTINCT CASE WHEN r.${col} = 3 THEN r.id END)`,
      );
    });
    const total = selects.find((c) => c[1] === 'total')?.[0] as string;
    expect(total).toContain('COUNT(DISTINCT CASE WHEN');
    COLUMNS.forEach((col) => expect(total).toContain(`r.${col} = 3`));
    expect(total.split(' OR ')).toHaveLength(5);
  });

  it('scopes to active level 1 / type 9 results of the version owned (role 1) by the initiative', async () => {
    const { repo, calls } = build({});
    await repo.countByArea(11, 3);
    const join = calls.innerJoin[0];
    expect(join[0]).toBe('r.obj_result_by_initiatives');
    expect(join[2]).toContain('rbi.is_active = 1');
    expect(join[2]).toContain('rbi.initiative_role_id = 1');
    expect(join[2]).toContain('rbi.initiative_id = :initiativeId');
    expect(join[3]).toEqual({ initiativeId: 11 });
    const w = [...calls.where, ...(calls.andWhere ?? [])].map((c) => c[0]);
    expect(w).toEqual(
      expect.arrayContaining([
        'r.is_active = 1',
        'r.version_id = :versionId',
        'r.result_level_id = 1',
        'r.result_type_id = 9',
      ]),
    );
    const params = [...calls.where, ...calls.andWhere].map((c) => c[1]);
    expect(params).toContainEqual({ versionId: 3 });
  });
});
