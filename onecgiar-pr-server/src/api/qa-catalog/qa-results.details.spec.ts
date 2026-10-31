// @akili-spec quality-assurance/qa-results-feed
// QRF-R-7 / R-8 / R-9 and NFR Query shape for `QaResultsService.details`, over an in-memory database: the runner evaluates the
// plan predicates, so a read that is not narrowed to the requested fields shows in `run.calls`. SQL semantics are QRF-T-8.
import 'reflect-metadata';
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogField } from './definitions/types';
import { QaCatalogService, QaCatalogSource } from './qa-catalog.service';
import {
  ClassifiedResult,
  IneligibleReason,
  QaResultsRepository,
} from './qa-results.repository';
import { QaResultsService } from './qa-results.service';
import {
  FIXTURE_DB,
  FIXTURE_KEYS,
  FX_PARTNERS,
  FX_TITLE,
  FixtureDb,
  col,
  failingOn,
  fixtureRunner,
} from './values/fixtures';
import { PlanQuery } from './values/read-plan';

const CAPDEV = {
  ...col(
    'capacity_sharing.length_of_training',
    'single_select',
    'fx_type',
    'term',
  ),
  result_types: ['policy_change'],
  subfields: [
    {
      key: 'degree',
      label: 'degree',
      type: 'single_select' as const,
      storage: { kind: 'column' as const, table: 'fx_type', column: 'term' },
    },
  ],
};
const SCORE_POLICY_ONLY = {
  ...col('fx.score', 'number', 'fx_type', 'score'),
  result_types: ['policy_change'],
};
const FROM_2027 = {
  ...col('fx.future', 'text', 'fx_result', 'title'),
  valid_from: 2027,
};
// the lookup subfield of FX_PARTNERS needs the registry and its own table: this spec is about the pipeline, not lookups
const PARTNERS = {
  ...FX_PARTNERS,
  subfields: FX_PARTNERS.subfields.filter((s) => s.storage.kind === 'column'),
};

// a scalar RELATION field whose subfields are a column and a lookup keyed by the field's own value (like `innovation_dev.gesi_stage`)
const STAGE = {
  ...col('fx.stage', 'single_select', 'fx_tag', 'primary_id'),
  storage: {
    kind: 'relation' as const,
    table: 'fx_tag',
    fk_to_result: 'result_id',
    value_column: 'primary_id',
    filter: { is_active: 1 },
  },
  subfields: [
    {
      key: 'note',
      label: 'note',
      type: 'text' as const,
      storage: { kind: 'column' as const, table: 'fx_tag', column: 'note' },
    },
    {
      key: 'option_label',
      label: 'option label',
      type: 'text' as const,
      storage: {
        kind: 'lookup' as const,
        source: 'prms.result_questions',
        keys: [{ from: 'fx.stage', to: 'result_question_id' }],
        value_column: 'question_text',
      },
    },
  ],
};

const SOURCE: QaCatalogSource = {
  versions: {
    2026: { portfolio: 'P25', revision: 7 },
    2027: { portfolio: 'P26', revision: 1 },
  },
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    { key: 'knowledge_product', label: 'Knowledge product', level: 'output' },
  ],
  sections: [
    {
      key: 'fx',
      label: 'fx',
      order: 1,
      valid_from: 2026,
      valid_to: null,
      result_types: ['*'],
    },
  ],
  fields: [
    FX_TITLE,
    SCORE_POLICY_ONLY,
    CAPDEV,
    PARTNERS,
    STAGE,
    FROM_2027,
  ] as CatalogField[],
};

const DB: FixtureDb = {
  ...FIXTURE_DB,
  fx_result: [
    { id: 1, title: 'One', secret_column: 'LEAK' },
    { id: 2, title: 'Two', secret_column: 'LEAK' },
    { id: 3, title: 'Three', secret_column: 'LEAK' },
  ],
  fx_type: [
    { fx_type_id: 1, result_id: 1, score: 5, term: 2 },
    { fx_type_id: 2, result_id: 2, score: 6, term: 3 },
  ],
  fx_tag: [
    { tag_row_id: 1, result_id: 1, is_active: 1, primary_id: 70, note: 'n' },
  ],
  result_questions: [
    { result_question_id: 70, question_text: 'Not applicable' },
    { result_question_id: 71, question_text: 'other' },
  ],
  fx_partner: FIXTURE_DB.fx_partner.map((r) => ({
    ...r,
    secret_column: 'LEAK',
  })),
};

interface Known {
  type: string | null;
  reason: IneligibleReason | null;
}
const KNOWN: Record<number, Known> = {
  1: { type: 'policy_change', reason: null },
  2: { type: 'policy_change', reason: null },
  3: { type: 'knowledge_product', reason: null },
  4: { type: 'policy_change', reason: 'not_submitted' },
};

/** The repository seam: `classify` dedupes and keeps request order, as the real one does. */
const fakeRepository = () => {
  const classify = jest.fn(
    async (ids: readonly number[]): Promise<ClassifiedResult[]> =>
      [...new Set(ids)].map((id) => {
        const known = KNOWN[id];
        return {
          result_id: id,
          result_code: known ? 9000 + id : null,
          reason: known ? known.reason : 'not_found',
          result_type_key: known?.type ?? null,
        };
      }),
  );
  return { classify } as unknown as QaResultsRepository & {
    classify: jest.Mock;
  };
};

const build = (db: FixtureDb = DB) => {
  const repo = fakeRepository();
  const run = fixtureRunner(db);
  const service = new QaResultsService(
    new QaCatalogService(),
    repo,
    {} as DataSource,
  );
  const details = (body: Record<string, unknown>) =>
    service.details({ phase_year: 2026, result_ids: [1], ...body } as never, {
      source: SOURCE,
      run,
      keys: FIXTURE_KEYS,
    });
  return { repo, run, details };
};

const tablesRead = (calls: PlanQuery[]) => [
  ...new Set(calls.map((c) => c.table)),
];

describe('QaResultsService.details', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('(a) scenario Unsubmitted after listing: [eligible, unsubmitted] -> 200 with one in each list, the batch is not failed', async () => {
    const { details } = build();
    const res = await details({ result_ids: [4, 1] });
    expect(res.results.map((r) => r.result_id)).toEqual([1]);
    expect(res.not_eligible).toEqual([
      { result_id: 4, reason: 'not_submitted' },
    ]);
  });

  it('answers an unknown id as not_found and a duplicate once, with the item keys of the contract', async () => {
    const { details } = build();
    const res = await details({ result_ids: [1, 1, 99] });
    expect(res.results).toHaveLength(1);
    expect(Object.keys(res.results[0]).sort()).toEqual(
      ['result_code', 'result_id', 'result_type_key', 'values'].sort(),
    );
    expect(res.results[0]).toMatchObject({ result_id: 1, result_code: 9001 });
    expect(res.not_eligible).toEqual([{ result_id: 99, reason: 'not_found' }]);
  });

  it('(f) phase and catalog_version equal what the catalog route returns for the same year and source', async () => {
    const { details } = build();
    const res = await details({});
    const catalog = new QaCatalogService().getCatalog(2026, SOURCE);
    expect(res.phase).toBe(2026);
    expect(res.catalog_version).toBe(catalog.catalog_version);
    expect(res.catalog_version).toBe('2026.7');
  });

  it('(c) a field valid only from 2027 is absent for 2026 and present for 2027', async () => {
    const { details } = build();
    expect(Object.keys((await details({})).results[0].values)).not.toContain(
      'fx.future',
    );
    const y2027 = await details({ phase_year: 2027 });
    expect(Object.keys(y2027.results[0].values)).toContain('fx.future');
  });

  it('keeps the fields that apply to the result type: a knowledge product has no policy-only field', async () => {
    const { details } = build();
    const res = await details({ result_ids: [1, 3] });
    const byId = Object.fromEntries(
      res.results.map((r) => [r.result_id, r.values]),
    );
    expect(Object.keys(byId[1])).toEqual(
      expect.arrayContaining([
        'fx.score',
        'capacity_sharing.length_of_training',
      ]),
    );
    expect(Object.keys(byId[3]).sort()).toEqual([
      'fx.partners',
      'fx.stage',
      'fx.title',
    ]);
    expect(Object.keys(byId[3])).not.toContain('fx.score');
  });

  it('(d) scenario Scalar field with subfields: stored 2 -> { value: 4, degree: 2 }; stored 3 -> { value: 3, degree: null }', async () => {
    const { details } = build();
    const res = await details({
      result_ids: [1, 2],
      field_keys: ['capacity_sharing.length_of_training'],
    });
    const key = 'capacity_sharing.length_of_training';
    expect(res.results.map((r) => r.values[key])).toEqual([
      { value: 4, degree: 2 },
      { value: 3, degree: null },
    ]);
  });

  it('a scalar relation with subfields resolves its lookup subfield from the field own value (the relation fix reaches the lookup resolver)', async () => {
    const { details } = build();
    const res = await details({ field_keys: ['fx.stage'] });
    expect(res.results[0].values['fx.stage']).toEqual({
      value: 70,
      note: 'n',
      option_label: 'Not applicable',
    });
  });

  it('(b) whitelist walk: a column the catalog does not name never appears, at any depth', async () => {
    // a runner that returns EVERY column of the row, ignoring `select`
    const leaky = async (q: PlanQuery) =>
      (DB[q.table] ?? []).filter((r) =>
        q.where.every(
          (p) => p.op !== 'in' || p.values.includes(Number(r[p.column])),
        ),
      );
    const repo = fakeRepository();
    const service = new QaResultsService(
      new QaCatalogService(),
      repo,
      {} as DataSource,
    );
    const res = await service.details(
      { phase_year: 2026, result_ids: [1] } as never,
      { source: SOURCE, run: leaky, keys: FIXTURE_KEYS },
    );
    expect(JSON.stringify(res)).not.toContain('LEAK');
    const partners = res.results[0].values['fx.partners'] as Array<
      Record<string, unknown>
    >;
    expect(partners.length).toBeGreaterThan(0);
    for (const p of partners) {
      expect(Object.keys(p).sort()).toEqual(['is_lead', 'note', 'partner']);
    }
  });

  it('(h) field_keys narrows the READ, not only the output: one plan for one field, and no other key, not even null', async () => {
    const { details, run } = build();
    const res = await details({ result_ids: [1, 2], field_keys: ['fx.title'] });
    expect(res.results.map((r) => Object.keys(r.values))).toEqual([
      ['fx.title'],
      ['fx.title'],
    ]);
    expect(run.calls).toHaveLength(1);
    expect(tablesRead(run.calls)).toEqual(['fx_result']);
  });

  it('without field_keys every plan of the applicable fields runs, once, for 1 result and for 3', async () => {
    const one = build();
    await one.details({ result_ids: [1] });
    const many = build();
    await many.details({ result_ids: [1, 2, 3] });
    expect(many.run.calls).toHaveLength(one.run.calls.length);
    expect(tablesRead(one.run.calls).sort()).toEqual([
      'fx_partner',
      'fx_result',
      'fx_tag',
      'fx_type',
      'result_questions',
    ]);
  });

  it('(i) a subfield key or an unknown key in field_keys -> 400 naming it, and nothing is read', async () => {
    const { details, run, repo } = build();
    for (const bad of ['degree', 'nope.key']) {
      const call = details({ field_keys: ['fx.title', bad] });
      await expect(call).rejects.toBeInstanceOf(BadRequestException);
      await expect(call).rejects.toThrow(bad);
      await expect(call).rejects.not.toThrow(/fx\.title/);
    }
    expect(repo.classify).not.toHaveBeenCalled();
    expect(run.calls).toHaveLength(0);
  });

  it('a year with no catalog -> 404 before anything is read', async () => {
    const { details, repo } = build();
    await expect(details({ phase_year: 2023 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repo.classify).not.toHaveBeenCalled();
  });

  it('an all-ineligible batch is a 200 with no read', async () => {
    const { details, run } = build();
    const res = await details({ result_ids: [4, 99] });
    expect(res.results).toEqual([]);
    expect(res.not_eligible).toHaveLength(2);
    expect(run.calls).toHaveLength(0);
  });

  describe('(g) a failing read is a generic 500 (design section 7, QRF-R-9)', () => {
    const LEAKY_MESSAGE =
      "Table 'prdb_secret.fx_result' doesn't exist; Unknown database 'toc_secret_db'";
    const failing = jest.fn().mockRejectedValue(new Error(LEAKY_MESSAGE));

    it.each(['reader', 'classify'])(
      'a failing %s carries no table, database or driver text, in the body or in the log',
      async (where) => {
        const logError = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation();
        const { repo, run } = build();
        if (where === 'classify') repo.classify.mockImplementation(failing);
        const service = new QaResultsService(
          new QaCatalogService(),
          repo,
          {} as DataSource,
        );
        const call = service.details(
          { phase_year: 2026, result_ids: [1] } as never,
          {
            source: SOURCE,
            run: where === 'reader' ? failing : run,
            keys: FIXTURE_KEYS,
          },
        );
        await expect(call).rejects.toBeInstanceOf(InternalServerErrorException);
        const error = (await call.catch((e) => e)) as HttpException;
        expect(
          JSON.stringify([error.message, error.getResponse()]),
        ).not.toMatch(
          /fx_result|prdb_secret|toc_secret_db|Table|database|exist/i,
        );
        const logged = logError.mock.calls
          .map((c) => c.map(String).join(' '))
          .join('\n');
        expect(logged).toContain('/api/qa/results/details');
        expect(logged).not.toMatch(
          /fx_result|prdb_secret|toc_secret_db|doesn't exist/i,
        );
      },
    );
  });

  describe('(g) the log names the failing plan, the body does not', () => {
    it('the fx_result plan fails: the log carries its field keys and no driver text, the 500 body none of them', async () => {
      const logError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const service = new QaResultsService(
        new QaCatalogService(),
        fakeRepository(),
        {} as DataSource,
      );
      const call = service.details(
        { phase_year: 2026, result_ids: [1] } as never,
        { source: SOURCE, run: failingOn('fx_result', DB), keys: FIXTURE_KEYS },
      );
      const error = (await call.catch((e) => e)) as HttpException;
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(JSON.stringify([error.message, error.getResponse()])).not.toMatch(
        /fx\.|fields|title/i,
      );
      const logged = logError.mock.calls.map((c) => String(c[0])).join('\n');
      expect(logged).toMatch(/route=\/api\/qa\/results\/details year=2026 /);
      expect(logged).toMatch(/ fields=fx\.title$/);
      expect(logged).not.toMatch(/fx\.score|capacity_sharing|fx\.stage/);
      expect(logged).not.toMatch(
        /fx_result|prdb_secret|toc_secret_db|doesn't exist|Table|database/i,
      );
    });
  });

  it('logs route, year, counts and statements - never ids, field keys or values', async () => {
    const { details } = build();
    await details({ result_ids: [1, 4], field_keys: ['fx.title'] });
    const lines = (Logger.prototype.log as jest.Mock).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('/api/qa/results/details');
    expect(lines[0]).toMatch(
      /year=2026 eligible=1 not_eligible=1 statements=2 duration_ms=\d+/,
    );
    expect(lines[0]).not.toMatch(/fx\.title|One|9001|\b4\b/);
  });
});
