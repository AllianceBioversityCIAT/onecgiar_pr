// @akili-spec quality-assurance/qa-results-feed
import { DataSource } from 'typeorm';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import {
  CATALOGUED_RESULT_TYPE_IDS,
  RESULT_TYPE_ID_BY_KEY,
  RESULT_TYPE_KEY_BY_ID,
} from './definitions/result-type-ids';
import { QaResultsRepository } from './qa-results.repository';

describe('result-type-ids map (QRF-DD-2)', () => {
  it('maps exactly the catalog keys, one id per key', () => {
    const mapped = Object.values(RESULT_TYPE_KEY_BY_ID).sort();
    const catalog = CATALOG_RESULT_TYPES.map((t) => t.key).sort();
    expect(mapped).toEqual(catalog);
    expect(Object.keys(RESULT_TYPE_KEY_BY_ID)).toHaveLength(9);
  });

  it.each([
    [ResultTypeEnum.POLICY_CHANGE, 'policy_change'],
    [ResultTypeEnum.INNOVATION_USE, 'innovation_use'],
    [ResultTypeEnum.OTHER_OUTCOME, 'other_outcome'],
    [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT, 'capacity_sharing'],
    [ResultTypeEnum.KNOWLEDGE_PRODUCT, 'knowledge_product'],
    [ResultTypeEnum.INNOVATION_DEVELOPMENT, 'innovation_development'],
    [ResultTypeEnum.OTHER_OUTPUT, 'other_output'],
    [ResultTypeEnum.IMPACT_CONTRIBUTION, 'impact_contribution'],
    [ResultTypeEnum.INNOVATION_USE_IPSR, 'innovation_package'],
  ])('ResultTypeEnum %s -> %s', (id, key) => {
    expect(RESULT_TYPE_KEY_BY_ID[id]).toBe(key);
    expect(RESULT_TYPE_ID_BY_KEY[key]).toBe(id);
  });

  it('leaves Capacity change (3) and Complementary innovation (11) uncatalogued', () => {
    expect(
      RESULT_TYPE_KEY_BY_ID[ResultTypeEnum.CAPACITY_CHANGE],
    ).toBeUndefined();
    expect(
      RESULT_TYPE_KEY_BY_ID[ResultTypeEnum.COMPLEMENTARY_INNOVATION],
    ).toBeUndefined();
    expect(CATALOGUED_RESULT_TYPE_IDS).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10]);
  });
});

function makeRepo(responses: unknown[][] = [[]]) {
  const query = jest.fn();
  responses.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue([]);
  const repo = new QaResultsRepository({ query } as unknown as DataSource);
  const sqlOf = (i = 0) => query.mock.calls[i][0] as string;
  const paramsOf = (i = 0) => query.mock.calls[i][1] as unknown[];
  return { repo, query, sqlOf, paramsOf };
}

const PAGE = { phaseYear: 2026, page: 1, pageSize: 100 };

describe('QaResultsRepository eligibility SQL (QRF-R-3)', () => {
  it('has no SQL comments (a predicate inside a comment must not satisfy the anchors below)', async () => {
    const { repo, sqlOf } = makeRepo();
    await repo.findPage(PAGE);
    expect(sqlOf()).not.toMatch(/--|\/\*/);
  });

  it('anchors every eligibility clause to its column', async () => {
    const { repo, sqlOf } = makeRepo();
    await repo.findPage(PAGE);
    const sql = sqlOf();
    expect(sql).toMatch(/^WHERE r\.is_active = 1$/m);
    expect(sql).toMatch(/^\s+AND r\.status_id = 3$/m);
    expect(sql).toMatch(/^\s+AND r\.source = 'Result'$/m);
    expect(sql).toMatch(/^\s+AND v\.phase_year = \?$/m);
    expect(sql).toMatch(/^\s+AND v\.app_module_id IN \(\?, \?\)$/m);
    expect(sql).toMatch(/^\s+AND r\.result_type_id IN \((\?, ){8}\?\)$/m);
    expect(sql).toMatch(
      /INNER JOIN results_by_inititiative rbi\s+ON rbi\.result_id = r\.id AND rbi\.is_active = 1 AND rbi\.initiative_role_id = 1/,
    );
    expect(sql).toMatch(
      /INNER JOIN clarisa_initiatives ci ON ci\.id = rbi\.inititiative_id/,
    );
  });

  it('computes submitted_at from active status=true submission rows (QRF-DD-5)', async () => {
    const { repo, sqlOf } = makeRepo();
    await repo.findPage(PAGE);
    expect(sqlOf()).toMatch(
      /SELECT UNIX_TIMESTAMP\(MAX\(s\.created_date\)\)\s+FROM submission s\s+WHERE s\.results_id = r\.id AND s\.is_active = 1 AND s\.status = 1\) AS submitted_epoch/,
    );
  });

  it('binds the year (and every other value) instead of interpolating it', async () => {
    const { repo, sqlOf, paramsOf } = makeRepo();
    await repo.findPage({ ...PAGE, phaseYear: 2026 });
    expect(sqlOf()).not.toContain('2026');
    expect(paramsOf()).toEqual([
      2026, // phase_year
      1, // app_module REPORTING
      2, // app_module IPSR
      1,
      2,
      4,
      5,
      6,
      7,
      8,
      9,
      10, // catalogued type ids
      100, // LIMIT
      0, // OFFSET
    ]);
  });
});

describe('QaResultsRepository.findPage', () => {
  it('orders by submitted_at then result_id, then pages', async () => {
    const { repo, sqlOf, paramsOf } = makeRepo();
    await repo.findPage({ phaseYear: 2026, page: 3, pageSize: 100 });
    expect(sqlOf()).toMatch(
      /^ORDER BY submitted_epoch ASC, r\.id ASC\nLIMIT \? OFFSET \?$/m,
    );
    expect(paramsOf().slice(-2)).toEqual([100, 200]);
  });

  it('maps rows to the QRF-R-5 item shape with UTC ISO submitted_at', async () => {
    const { repo } = makeRepo([
      [
        {
          result_id: 41231,
          result_code: 9001,
          result_type_id: 6,
          program_clarisa_id: 5,
          program_code: 'SP05',
          submitted_epoch: 1700000000,
        },
        {
          result_id: 41232,
          result_code: 9002,
          result_type_id: 10,
          program_clarisa_id: 7,
          program_code: 'SP07',
          submitted_epoch: null,
        },
      ],
    ]);
    await expect(repo.findPage(PAGE)).resolves.toEqual([
      {
        result_id: 41231,
        result_code: 9001,
        program: { clarisa_id: 5, code: 'SP05' },
        result_type_key: 'knowledge_product',
        submitted_at: '2023-11-14T22:13:20.000Z',
      },
      {
        result_id: 41232,
        result_code: 9002,
        program: { clarisa_id: 7, code: 'SP07' },
        result_type_key: 'innovation_package',
        submitted_at: null,
      },
    ]);
  });
});

describe('QaResultsRepository filters (QRF-R-4)', () => {
  it('matches program ids against the lead program only, ANDed with the type filter', async () => {
    const { repo, sqlOf, paramsOf } = makeRepo();
    await repo.findPage({
      ...PAGE,
      programIds: [5],
      resultTypeKeys: ['policy_change'],
    });
    const sql = sqlOf();
    // the program column is the one joined with initiative_role_id = 1
    expect(sql).toMatch(/^\s+AND rbi\.inititiative_id IN \(\?\)$/m);
    expect(sql).toMatch(/^\s+AND r\.result_type_id IN \(\?\)$/m);
    expect(paramsOf()).toEqual([2026, 1, 2, 1, 5, 100, 0]);
  });

  it('treats absent and empty filters as no filter', async () => {
    const a = makeRepo();
    await a.repo.findPage(PAGE);
    const b = makeRepo();
    await b.repo.findPage({ ...PAGE, programIds: [], resultTypeKeys: [] });
    expect(b.sqlOf()).toBe(a.sqlOf());
    expect(b.sqlOf()).not.toContain('rbi.inititiative_id IN');
    expect(b.paramsOf()).toEqual(a.paramsOf());
  });

  it('answers empty without querying when no requested type key has an id', async () => {
    const { repo, query } = makeRepo();
    await expect(
      repo.findPage({ ...PAGE, resultTypeKeys: ['not_a_type'] }),
    ).resolves.toEqual([]);
    await expect(
      repo.count({ phaseYear: 2026, resultTypeKeys: ['not_a_type'] }),
    ).resolves.toBe(0);
    await expect(
      repo.breakdown({ phaseYear: 2026, resultTypeKeys: ['not_a_type'] }),
    ).resolves.toEqual({ by_program: [], by_result_type: [] });
    expect(query).not.toHaveBeenCalled();
  });
});

describe('QaResultsRepository.count and breakdown (QRF-R-6)', () => {
  it('counts over the same predicate and parameters as the page, without paging', async () => {
    const page = makeRepo();
    await page.repo.findPage({ ...PAGE, programIds: [5, 7] });
    const count = makeRepo([[{ total: '42' }]]);
    await expect(
      count.repo.count({ phaseYear: 2026, programIds: [5, 7] }),
    ).resolves.toBe(42);
    expect(count.sqlOf()).toMatch(
      /^SELECT COUNT\(\*\) AS total\nFROM result r/,
    );
    expect(count.sqlOf()).not.toMatch(/LIMIT/);
    expect(count.paramsOf()).toEqual(page.paramsOf().slice(0, -2));
    expect(count.sqlOf().split('\nFROM result r')[1]).toBe(
      page.sqlOf().split('\nFROM result r')[1].split('\nORDER BY')[0],
    );
  });

  it('groups by lead program and by type key, mapping ids to keys', async () => {
    const { repo, sqlOf, paramsOf, query } = makeRepo([
      [
        { clarisa_id: 5, code: 'SP05', total: 3 },
        { clarisa_id: 7, code: 'SP07', total: '1' },
      ],
      [
        { result_type_id: 1, total: 2 },
        { result_type_id: 6, total: 2 },
      ],
    ]);
    const result = await repo.breakdown({
      phaseYear: 2026,
      programIds: [5, 7],
    });
    expect(result).toEqual({
      by_program: [
        { clarisa_id: 5, code: 'SP05', count: 3 },
        { clarisa_id: 7, code: 'SP07', count: 1 },
      ],
      by_result_type: [
        { key: 'policy_change', count: 2 },
        { key: 'knowledge_product', count: 2 },
      ],
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(sqlOf(0)).toMatch(/^GROUP BY ci\.id, ci\.official_code$/m);
    expect(sqlOf(1)).toMatch(/^GROUP BY r\.result_type_id$/m);
    expect(sqlOf(0)).toMatch(/^\s+AND r\.source = 'Result'$/m);
    expect(sqlOf(1)).toMatch(/^\s+AND r\.source = 'Result'$/m);
    expect(paramsOf(0)).toEqual(paramsOf(1));
  });
});

describe('QaResultsRepository.classify (QRF-R-8)', () => {
  const base = {
    result_code: 7777,
    is_active: 1,
    status_id: 3,
    source: 'Result',
    result_type_id: 6,
    phase_year: 2026,
    app_module_id: 1,
    has_lead_program: 1,
  };
  // ids 100..109, one per outcome; 107 is Editing AND bilateral, 105 is 2025 AND bilateral
  const rows = [
    { result_id: 101, ...base, status_id: 1 }, // not_submitted
    { result_id: 102, ...base, phase_year: 2025 }, // other_phase
    { result_id: 103, ...base, source: 'API' }, // not_w1w2
    { result_id: 104, ...base, result_type_id: 3 }, // type_not_catalogued
    { result_id: 105, ...base, has_lead_program: 0 }, // no_lead_program
    { result_id: 106, ...base }, // eligible
    { result_id: 107, ...base, status_id: 1, source: 'API' }, // Editing + bilateral => not_submitted
    { result_id: 108, ...base, phase_year: 2025, source: 'API' }, // other year + bilateral => other_phase
    { result_id: 109, ...base, result_type_id: 11, has_lead_program: 0 }, // type before lead
    { result_id: 110, ...base, is_active: 0 }, // deleted => not_found
    { result_id: 111, ...base, app_module_id: 2, result_type_id: 10 }, // IPSR package, eligible
    { result_id: 112, ...base, phase_year: null, app_module_id: null }, // no version => other_phase
  ];

  it('returns every id, in request order, with the first failing reason', async () => {
    const { repo } = makeRepo([rows]);
    const ids = [
      100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112,
    ];
    const out = await repo.classify(ids, 2026);
    expect(out.map((o) => [o.result_id, o.reason])).toEqual([
      [100, 'not_found'], // absent from the table
      [101, 'not_submitted'],
      [102, 'other_phase'],
      [103, 'not_w1w2'],
      [104, 'type_not_catalogued'],
      [105, 'no_lead_program'],
      [106, null],
      [107, 'not_submitted'],
      [108, 'other_phase'],
      [109, 'type_not_catalogued'],
      [110, 'not_found'],
      [111, null],
      [112, 'other_phase'],
    ]);
  });

  it('carries the result_code of an existing result (details item) and null for an absent id', async () => {
    const { repo } = makeRepo([rows]);
    const out = await repo.classify([106, 100], 2026);
    expect(out.map((o) => o.result_code)).toEqual([7777, null]);
  });

  it('carries the catalog key of a catalogued type and null otherwise', async () => {
    const { repo } = makeRepo([rows]);
    const out = await repo.classify([106, 111, 104, 100], 2026);
    expect(out.map((o) => o.result_type_key)).toEqual([
      'knowledge_product',
      'innovation_package',
      null,
      null,
    ]);
  });

  it('deduplicates ids, binds them, and does not apply the eligibility predicate', async () => {
    const { repo, sqlOf, paramsOf } = makeRepo([rows]);
    const out = await repo.classify([106, 106, 101], 2026);
    expect(out.map((o) => o.result_id)).toEqual([106, 101]);
    expect(paramsOf()).toEqual([106, 101]);
    expect(sqlOf()).toMatch(/^WHERE r\.id IN \(\?, \?\)$/m);
    expect(sqlOf()).not.toMatch(/r\.status_id = 3|r\.source = 'Result'/);
  });

  it('does not query for an empty id list', async () => {
    const { repo, query } = makeRepo();
    await expect(repo.classify([], 2026)).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
