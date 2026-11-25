// @akili-spec bugfix/p2-3939-qa-catalog-level-numbers
import { CATALOG_FIELDS } from './definitions/sections';
import {
  CatalogField,
  Condition,
  ConditionLeaf,
  LookupBinding,
} from './definitions/types';
import { FixtureDb, fixtureRunner } from './values/fixtures';
import { resolveLookups } from './values/lookup.resolver';
import { DeferredBinding } from './values/read-plan';

/**
 * LVL-T-1 (P2-3939): the level rules compare the level NUMBER, never the stored row id of `clarisa_innovation_use_levels`.
 * DD-8: the catalog's OWN condition is applied to values produced by the REAL lookup resolver over a stubbed query runner.
 * Only the evaluator below is test code (the vocabulary has three operators, `eq` / `in` / `not_null`, `all` / `any`).
 * Expected outcomes come from the requirements scenarios (LVL-R-1, LVL-R-2), not from the catalog under test.
 */
const LEVEL = 'innovation_use.use_level.innovation_use_level';
const LEVEL_NUMBER = 'innovation_use.use_level.innovation_use_level_number';
const EXPLANATION = 'innovation_use.use_level.readiness_level_explanation';

// Fixture rows where the row id differs from the level (id = level + 1, then a repeated block) so the id and the number read apart.
const USE_LEVELS: FixtureDb = {
  clarisa_innovation_use_levels: [
    { id: 3, level: 7 },
    { id: 5, level: 4 },
    { id: 10, level: 9 },
    { id: 13, level: 2 },
  ],
};

const field = (key: string): CatalogField => {
  const f = CATALOG_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`missing field ${key}`);
  return f;
};

type Values = Record<string, unknown>;

const test = (leaf: ConditionLeaf, values: Values): boolean => {
  const v = values[leaf.field];
  if (leaf.operator === 'not_null') return v !== null && v !== undefined;
  if (leaf.operator === 'eq') return v === leaf.value;
  return Array.isArray(leaf.value) && leaf.value.some((x) => x === v);
};
const holds = (c: Condition, values: Values): boolean => {
  if ('all' in c) return c.all.every((x) => holds(x, values));
  if ('any' in c) return c.any.some((x) => holds(x, values));
  return test(c, values);
};

// the field a condition reads, taken from the real definition
const leafField = (c: Condition | undefined): string => {
  if (!c || 'all' in c || 'any' in c) throw new Error('expected a single leaf');
  return c.field;
};

/**
 * Values of results whose stored level is `rowIds[i]`, as the reader and the real resolver produce them: the level field holds
 * the stored row id, and every condition field that is a lookup is filled by `resolveLookups`.
 */
async function resolved(rowIds: Array<number | null>, wanted: string[]) {
  const values = new Map<number, Values>(
    rowIds.map((id, i) => [i + 1, { [LEVEL]: id }]),
  );
  const deferred: DeferredBinding[] = wanted
    .filter((k) => field(k).storage.kind === 'lookup')
    .map((k) => ({ fieldKey: k, subfieldPath: [], kind: 'lookup' }));
  const run = fixtureRunner(USE_LEVELS);
  await resolveLookups(
    CATALOG_FIELDS,
    { values, deferred },
    { run, phaseYear: 2026 },
  );
  return { values, run };
}

describe('P2-3939 Innovation Use level number (LVL-R-1, LVL-R-2)', () => {
  describe('the explanation follows the level NUMBER, not the stored row id (LVL-R-2)', () => {
    const rule = field(EXPLANATION);
    // [stored row id, level number of that row, explanation visible and required]
    it.each([
      ['level 4 stored as row id 5 (the failing case)', 5, false],
      ['level 9 stored as row id 10', 10, true],
      ['level 2 stored as repeated row id 13', 13, false],
      ['level 7 stored as row id 3 (id outside 5..9, level inside)', 3, true],
      ['no level stored (NULL)', null, false],
    ])('%s', async (_name, rowId, expected) => {
      const { values } = await resolved(
        [rowId],
        [leafField(rule.required_when), leafField(rule.visible_when)],
      );
      const own = values.get(1) as Values;
      expect(holds(rule.required_when as Condition, own)).toBe(expected);
      expect(holds(rule.visible_when as Condition, own)).toBe(expected);
    });

    it('is visible and required on exactly the same condition (DD-3)', () => {
      expect(rule.visible_when).toEqual(rule.required_when);
      expect(rule.required).toBe(false);
      expect(rule.required_confirmed).toBe(false);
    });
  });

  describe('the level-number entry (LVL-R-1)', () => {
    it('is a read-only number looked up from the level row, beside the unchanged level field', () => {
      const number = field(LEVEL_NUMBER);
      const level = field(LEVEL);
      expect(number).toMatchObject({
        type: 'number',
        required: false,
        required_confirmed: false,
        section: level.section,
        result_types: level.result_types,
        valid_from: level.valid_from,
        valid_to: level.valid_to,
        storage: {
          kind: 'lookup',
          source: 'prms.clarisa_innovation_use_levels',
          keys: [{ from: LEVEL, to: 'id' }],
          value_column: 'level',
        },
      });
      expect(number.control_list).toBeUndefined();
      expect(number.required_when).toBeUndefined();
      expect(number.visible_when).toBeUndefined();
      // BUT the existing level field keeps its stored value contract
      expect(level.type).toBe('single_select');
      expect(level.control_list).toBe('innovation_use_levels');
      expect(level.storage).toMatchObject({
        kind: 'column',
        column: 'innovation_use_level_id',
      });
    });

    it('resolves each row to its own level, a repeated row included, and NULL to empty', async () => {
      const { values } = await resolved([5, 10, 13, null], [LEVEL_NUMBER]);
      expect([1, 2, 3, 4].map((id) => values.get(id)?.[LEVEL_NUMBER])).toEqual([
        4,
        9,
        2,
        null,
      ]);
      // BUT the stored value of the level field is untouched
      expect([1, 2, 3, 4].map((id) => values.get(id)?.[LEVEL])).toEqual([
        5,
        10,
        13,
        null,
      ]);
    });

    it('reads one batched SELECT for the whole batch (LVL-NFR-3)', async () => {
      const { run } = await resolved([5, 10, 13, 5], [LEVEL_NUMBER]);
      expect(run.calls).toHaveLength(1);
      expect(run.calls[0].table).toBe('clarisa_innovation_use_levels');
      expect(run.calls[0].select).toEqual(
        expect.arrayContaining(['id', 'level']),
      );
    });

    it('is bound to a registered source (the binding the explanation rule depends on)', () => {
      const binding = field(LEVEL_NUMBER).storage as LookupBinding;
      expect(binding.source).toBe('prms.clarisa_innovation_use_levels');
    });
  });
});

/**
 * LVL-T-2 (P2-3939): IPSR Step 3. The evidence lists are required, and the current use of the core innovation is visible, on the
 * level NUMBER (1..9), never on the stored row id (readiness ids 11..20 = levels 0..9; use ids 1..10 = levels 0..9 and 13..20 = 2..9).
 * Expected outcomes come from LVL-R-3 / LVL-R-4; the catalog's OWN conditions are applied to values the REAL resolver produced.
 */
const S3_READINESS = 'ipsr_step_3.core.readiness_level';
const S3_USE = 'ipsr_step_3.core.use_level';
const S3_CURRENT_USE_LEVEL = 'ipsr_step_3.core.current_use_level';
const S3_COMPLEMENTARY = 'ipsr_step_3.complementary_components';
const ONE_TO_NINE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const S3_DB: FixtureDb = {
  clarisa_innovation_use_levels: [
    { id: 1, level: 0 },
    { id: 5, level: 4 },
    { id: 10, level: 9 },
    { id: 13, level: 2 },
  ],
  clarisa_innovation_readiness_level: [
    { id: 11, level: 0 },
    { id: 12, level: 1 },
    { id: 15, level: 4 },
    { id: 20, level: 9 },
  ],
};

/** A rule that is not stated does not hold (a missing gate reads as "not required" / "not visible"). */
const holdsRule = (c: Condition | undefined, values: Values): boolean =>
  c !== undefined && holds(c, values);

const subOf = (parent: string, key: string) => {
  const s = field(parent).subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`missing subfield ${parent}/${key}`);
  return s;
};

/** Values the real resolver produces for ONE result: core level ids, and one complementary element with its two level ids. */
async function resolvedS3(input: {
  core: { readiness?: number | null; use?: number | null; currentUse?: number };
  element?: { readiness: number | null; use: number | null };
}) {
  const own: Values = {
    [S3_READINESS]: input.core.readiness ?? null,
    [S3_USE]: input.core.use ?? null,
    [S3_CURRENT_USE_LEVEL]: input.core.currentUse ?? null,
    [S3_COMPLEMENTARY]: input.element
      ? [
          {
            readiness_level: input.element.readiness,
            use_level: input.element.use,
          },
        ]
      : [],
  };
  const values = new Map<number, Values>([[1, own]]);
  // only the bindings the catalog declares: a missing entry leaves its value unset, so the RULE outcome (not a resolver error) is asserted
  const deferred: DeferredBinding[] = [
    { fieldKey: `${S3_READINESS}_number`, subfieldPath: [] },
    { fieldKey: `${S3_USE}_number`, subfieldPath: [] },
    { fieldKey: S3_COMPLEMENTARY, subfieldPath: ['readiness_level_number'] },
    { fieldKey: S3_COMPLEMENTARY, subfieldPath: ['use_level_number'] },
  ]
    .filter((d) =>
      d.subfieldPath.length
        ? field(d.fieldKey).subfields?.some((s) => s.key === d.subfieldPath[0])
        : CATALOG_FIELDS.some((f) => f.key === d.fieldKey),
    )
    .map((d) => ({ ...d, kind: 'lookup' as const }));
  await resolveLookups(
    CATALOG_FIELDS,
    { values, deferred },
    { run: fixtureRunner(S3_DB), phaseYear: 2026 },
  );
  return own;
}

describe('P2-3939 IPSR Step 3 level rules (LVL-R-1, LVL-R-3, LVL-R-4)', () => {
  describe('the level-number entries (LVL-R-1)', () => {
    it.each([
      [S3_READINESS, 'prms.clarisa_innovation_readiness_level'],
      [S3_USE, 'prms.clarisa_innovation_use_levels'],
    ])(
      '%s has a read-only number entry looked up from its own level row',
      (levelKey, source) => {
        const level = field(levelKey);
        const number = field(`${levelKey}_number`);
        expect(number).toMatchObject({
          type: 'number',
          required: false,
          required_confirmed: false,
          section: level.section,
          result_types: level.result_types,
          valid_from: level.valid_from,
          valid_to: level.valid_to,
          storage: {
            kind: 'lookup',
            source,
            keys: [{ from: levelKey, to: 'id' }],
            value_column: 'level',
          },
        });
        expect(number.control_list).toBeUndefined();
        expect(number.required_when).toBeUndefined();
        expect(number.visible_when).toBeUndefined();
        // BUT the existing level field keeps its stored value contract
        expect(level.type).toBe('single_select');
        expect(level.storage.kind).toBe('relation');
        expect(level.control_list).toBe(
          levelKey === S3_USE ? 'use_levels' : 'readiness_levels',
        );
      },
    );

    it.each([
      ['readiness_level', 'prms.clarisa_innovation_readiness_level'],
      ['use_level', 'prms.clarisa_innovation_use_levels'],
    ])(
      'complementary subfield %s has a sibling read-only number subfield',
      (levelKey, source) => {
        const number = subOf(S3_COMPLEMENTARY, `${levelKey}_number`);
        expect(number).toMatchObject({
          type: 'number',
          required: false,
          storage: {
            kind: 'lookup',
            source,
            keys: [{ from: levelKey, to: 'id' }],
            value_column: 'level',
          },
        });
        expect(number.control_list).toBeUndefined();
        expect(number.required_when).toBeUndefined();
        expect(number.visible_when).toBeUndefined();
        expect(subOf(S3_COMPLEMENTARY, levelKey).control_list).toBe(
          levelKey === 'use_level' ? 'use_levels' : 'readiness_levels',
        );
      },
    );

    it('resolves a core row id to its level, a repeated row included, and NULL to empty', async () => {
      const a = await resolvedS3({ core: { readiness: 12, use: 13 } });
      expect(a[`${S3_READINESS}_number`]).toBe(1);
      expect(a[`${S3_USE}_number`]).toBe(2);
      const b = await resolvedS3({ core: { readiness: null, use: null } });
      expect(b[`${S3_READINESS}_number`]).toBeNull();
      expect(b[`${S3_USE}_number`]).toBeNull();
      // BUT the stored values of the level fields are untouched
      expect([a[S3_READINESS], a[S3_USE]]).toEqual([12, 13]);
    });

    it('resolves the complementary element levels inside the relation list', async () => {
      const own = await resolvedS3({
        core: {},
        element: { readiness: 12, use: 13 },
      });
      const [el] = own[S3_COMPLEMENTARY] as Values[];
      expect(el.readiness_level_number).toBe(1);
      expect(el.use_level_number).toBe(2);
      expect([el.readiness_level, el.use_level]).toEqual([12, 13]);
    });
  });

  describe('the four evidence lists are required on the level number (LVL-R-3)', () => {
    // [name, stored row id, level number of that row is in 1..9 -> required]
    const READINESS_CASES: Array<[string, number | null, boolean]> = [
      ['level 0 stored as row id 11', 11, false],
      ['level 1 stored as row id 12 (id outside 1..9, level inside)', 12, true],
      ['level 9 stored as row id 20', 20, true],
      ['no level stored (NULL)', null, false],
    ];
    const USE_CASES: Array<[string, number | null, boolean]> = [
      ['level 0 stored as row id 1 (id inside 1..9, level 0)', 1, false],
      ['level 2 stored as repeated row id 13', 13, true],
      ['level 9 stored as row id 10', 10, true],
      ['no level stored (NULL)', null, false],
    ];

    describe.each([
      ['ipsr_step_3.core.readiness_evidences', S3_READINESS, 'readiness'],
      ['ipsr_step_3.core.use_evidences', S3_USE, 'use'],
    ] as const)('core list %s', (listKey, levelKey, kind) => {
      const list = field(listKey);

      it('is gated on its own level number, with no visibility gate and the flags unchanged', () => {
        expect(list.required_when).toEqual({
          field: `${levelKey}_number`,
          operator: 'in',
          value: ONE_TO_NINE,
        });
        // BUT the list stays visible (the form always renders it) and the flags are unchanged
        expect(list.visible_when).toBeUndefined();
        expect(list.required).toBe(false);
        expect(list.required_confirmed).toBe(true);
      });

      it.each(kind === 'readiness' ? READINESS_CASES : USE_CASES)(
        '%s',
        async (_name, rowId, expected) => {
          const own = await resolvedS3({ core: { [kind]: rowId } });
          expect(holdsRule(list.required_when, own)).toBe(expected);
        },
      );
    });

    describe.each([
      ['readiness_evidences', 'readiness_level', 'readiness'],
      ['use_evidences', 'use_level', 'use'],
    ] as const)('complementary subfield %s', (listKey, levelKey, kind) => {
      const list = subOf(S3_COMPLEMENTARY, listKey);

      it('is gated on its sibling level number; no visibility gate, no required_confirmed property', () => {
        expect(list.required_when).toEqual({
          field: `${levelKey}_number`,
          operator: 'in',
          value: ONE_TO_NINE,
        });
        expect(list.visible_when).toBeUndefined();
        expect(list.required).toBe(false);
        expect('required_confirmed' in list).toBe(false);
      });

      it.each(kind === 'readiness' ? READINESS_CASES : USE_CASES)(
        '%s',
        async (_name, rowId, expected) => {
          const own = await resolvedS3({
            core: {},
            element: {
              readiness: kind === 'readiness' ? rowId : null,
              use: kind === 'use' ? rowId : null,
            },
          });
          const [el] = own[S3_COMPLEMENTARY] as Values[];
          expect(holdsRule(list.required_when, el)).toBe(expected);
        },
      );
    });

    it('does not mix the two levels of an element: a readiness level 0 does not lift the use evidence', async () => {
      const own = await resolvedS3({
        core: {},
        element: { readiness: 11, use: 13 },
      });
      const [el] = own[S3_COMPLEMENTARY] as Values[];
      const readiness = subOf(S3_COMPLEMENTARY, 'readiness_evidences');
      const use = subOf(S3_COMPLEMENTARY, 'use_evidences');
      expect(holdsRule(readiness.required_when, el)).toBe(false);
      expect(holdsRule(use.required_when, el)).toBe(true);
    });
  });

  describe('the current use of the core innovation follows the evidence-based use level number (LVL-R-4)', () => {
    const USE_LISTS = [
      'ipsr_step_3.core.current_use.actors',
      'ipsr_step_3.core.current_use.organizations',
      'ipsr_step_3.core.current_use.measures',
    ];

    it.each(USE_LISTS)('%s is keyed on core.use_level_number', (key) => {
      expect(field(key).visible_when).toEqual({
        field: `${S3_USE}_number`,
        operator: 'in',
        value: ONE_TO_NINE,
      });
    });

    describe.each(USE_LISTS)('%s', (key) => {
      // `currentUse` is a stored row id chosen to read the OPPOSITE way as `use_level`: the rule must not follow `current_use_level`.
      it.each([
        ['use level 0 stored as row id 1', 1, 5, false],
        ['use level 2 stored as repeated row id 13', 13, 10, true],
        ['use level 4 stored as row id 5', 5, 20, true],
        ['no use level stored (NULL)', null, 5, false],
      ])('%s', async (_name, useRowId, currentUse, expected) => {
        const own = await resolvedS3({ core: { use: useRowId, currentUse } });
        expect(holdsRule(field(key).visible_when, own)).toBe(expected);
      });

      it('BUT keeps its required flags and gives no required_when (the any-of rule stays unexpressed)', () => {
        const list = field(key);
        expect(list.required).toBe(false);
        expect(list.required_confirmed).toBe(true);
        expect(list.required_when).toBeUndefined();
      });
    });

    it('leaves the row-level rules of the lists as they were', () => {
      const rules = (key: string) =>
        field(key).subfields?.map((s) => [
          s.key,
          s.required ?? false,
          s.required_when ?? null,
          s.visible_when ?? null,
        ]);
      expect(rules(USE_LISTS[2])).toEqual([
        ['unit_of_measure', true, null, null],
        ['quantity', true, null, null],
        ['new_users', false, null, null],
        ['evidence_link', true, null, null],
      ]);
    });
  });
});
