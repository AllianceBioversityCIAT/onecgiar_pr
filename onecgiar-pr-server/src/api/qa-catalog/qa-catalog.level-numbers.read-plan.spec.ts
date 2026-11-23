// @akili-spec bugfix/p2-3939-qa-catalog-level-numbers
import { CATALOG_FIELDS } from './definitions/sections';
import { FixtureDb, fixtureRunner } from './values/fixtures';
import { resolveLookups } from './values/lookup.resolver';
import { buildReadPlans } from './values/read-plan';
import { entityTableKeys } from './values/table-metadata';

/**
 * /akili-test (P2-3939, LVL-R-1 "WHEN GET /api/qa/results returns its values"): the level-number entries are wired by the
 * REAL read plan — the same `buildReadPlans` call `value-reader.ts` makes — not by bindings written in the test. The
 * resolver then fills them from the plan's own deferred list. Expected values come from the LVL-R-1 scenarios.
 */
const IU_LEVEL = 'innovation_use.use_level.innovation_use_level';
const IU_NUMBER = 'innovation_use.use_level.innovation_use_level_number';
const S3_READINESS = 'ipsr_step_3.core.readiness_level';
const S3_USE = 'ipsr_step_3.core.use_level';
const S3_COMPLEMENTARY = 'ipsr_step_3.complementary_components';

const NUMBER_KEYS = [IU_NUMBER, `${S3_READINESS}_number`, `${S3_USE}_number`];

const DB: FixtureDb = {
  clarisa_innovation_use_levels: [
    { id: 1, level: 0 },
    { id: 5, level: 4 },
    { id: 10, level: 9 },
    { id: 13, level: 2 },
  ],
  clarisa_innovation_readiness_level: [
    { id: 11, level: 0 },
    { id: 20, level: 9 },
  ],
};

describe('P2-3939 level numbers through the real read plan (LVL-R-1)', () => {
  const { deferred } = buildReadPlans(CATALOG_FIELDS, entityTableKeys());
  const levelDeferred = deferred.filter(
    (d) =>
      d.kind === 'lookup' &&
      (NUMBER_KEYS.includes(d.fieldKey) ||
        (d.fieldKey === S3_COMPLEMENTARY &&
          ['readiness_level_number', 'use_level_number'].includes(
            d.subfieldPath[0],
          ))),
  );

  it('defers exactly the five level-number entries as lookups (3 top-level, 2 complementary subfields)', () => {
    expect(
      levelDeferred
        .map((d) => [d.fieldKey, ...d.subfieldPath].join('/'))
        .sort(),
    ).toEqual(
      [
        ...NUMBER_KEYS,
        `${S3_COMPLEMENTARY}/readiness_level_number`,
        `${S3_COMPLEMENTARY}/use_level_number`,
      ].sort(),
    );
  });

  it('resolves stored row ids to their level numbers from the plan bindings, leaving the row ids untouched', async () => {
    const element = { readiness_level: 20, use_level: 13 };
    const values = new Map<number, Record<string, unknown>>([
      // Innovation Use: row id 5 holds level 4 (the P2-3939 case)
      [1, { [IU_LEVEL]: 5 }],
      // IPSR step 3: core readiness id 11 (level 0), core use id 13 (repeated row, level 2), one complementary element
      [
        2,
        {
          [S3_READINESS]: 11,
          [S3_USE]: 13,
          [S3_COMPLEMENTARY]: [element],
        },
      ],
      // unset levels (LVL-R-1 "Unset level")
      [3, { [IU_LEVEL]: null, [S3_READINESS]: null, [S3_USE]: null }],
    ]);

    await resolveLookups(
      CATALOG_FIELDS,
      { values, deferred: levelDeferred },
      { run: fixtureRunner(DB), phaseYear: 2026 },
    );

    expect(values.get(1)[IU_NUMBER]).toBe(4);
    expect(values.get(1)[IU_LEVEL]).toBe(5); // BUT the level field keeps the row id
    expect(values.get(2)[`${S3_READINESS}_number`]).toBe(0);
    expect(values.get(2)[`${S3_USE}_number`]).toBe(2); // AND IT MUST: repeated row id 13 → its own level 2
    expect(values.get(2)[S3_USE]).toBe(13);
    expect(element).toMatchObject({
      readiness_level: 20,
      readiness_level_number: 9,
      use_level: 13,
      use_level_number: 2,
    });
    for (const k of NUMBER_KEYS) expect(values.get(3)[k] ?? null).toBeNull();
  });
});
