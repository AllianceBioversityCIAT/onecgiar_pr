// @akili-spec quality-assurance/qa-field-catalog
import { createHash } from 'crypto';
import { CONTRACT_VERSION, stableStringify } from './definitions/content-hash';
import { QaCatalogService } from './qa-catalog.service';
import {
  FIXTURE_NESTED_SECRET_NAMES,
  FIXTURE_NESTED_SOURCE,
  FIXTURE_SECRET_NAMES,
  FIXTURE_SOURCE,
} from './qa-catalog.fixtures';

const FORBIDDEN_KEYS = [
  'storage',
  'table',
  'column',
  'required_confirmed',
  'id',
  'fk_to_result',
  'value_column',
  'control_list_table',
  'kind',
  'filter',
];

function collectKeys(node: unknown, acc: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectKeys(n, acc));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      acc.push(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}

describe('QA catalog response mapper (whitelist)', () => {
  const service = new QaCatalogService();

  it.each([2025, 2026])(
    'QAC-R-4: no storage / table / column / required_confirmed / id key in the %s response',
    (year) => {
      const json = JSON.parse(
        JSON.stringify(service.getCatalog(year, FIXTURE_SOURCE)),
      );
      const keys = collectKeys(json);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(keys).not.toContain(forbidden);
      }
    },
  );

  it.each([2025, 2026])(
    'QAC-R-4: no table or column name value appears anywhere in the %s JSON',
    (year) => {
      const text = JSON.stringify(service.getCatalog(year, FIXTURE_SOURCE));
      for (const secret of FIXTURE_SECRET_NAMES) {
        expect(text).not.toContain(secret);
      }
    },
  );

  it('QAC-R-12: field keys are exactly the whitelist, subfield keys likewise', () => {
    const res = service.getCatalog(2026, FIXTURE_SOURCE);
    const countries = res.fields.find((f) => f.key === 'general.countries');
    expect(Object.keys(countries).sort()).toEqual(
      [
        'control_list',
        'description',
        'key',
        'label',
        'order',
        'required',
        'result_types',
        'section',
        'type',
        'valid_from',
        'valid_to',
      ].sort(),
    );
    const readiness = res.fields.find((f) => f.key === 'innovation.readiness');
    expect(Object.keys(readiness).sort()).toEqual(
      [
        'control_list',
        'key',
        'label',
        'order',
        'required',
        'result_types',
        'section',
        'subfields',
        'type',
        'valid_from',
        'valid_to',
      ].sort(),
    );
    expect(Object.keys(readiness.subfields[0]).sort()).toEqual(
      ['key', 'label', 'required', 'type'].sort(),
    );
    expect(Object.keys(res.sections[0]).sort()).toEqual(
      ['key', 'label', 'order', 'result_types'].sort(),
    );
    expect(Object.keys(res.result_types[0]).sort()).toEqual(
      ['key', 'label', 'level'].sort(),
    );
  });
});

describe('QA catalog response mapper — display rules and nested data (QAC-R-13, QAC-R-14)', () => {
  const service = new QaCatalogService();
  const res = () => service.getCatalog(2026, FIXTURE_NESTED_SOURCE);
  const programs = () => res().fields.find((f) => f.key === 'general.programs');

  it('QAC-R-13: exposes visible_when and required_when on a field, as the catalog states them', () => {
    expect(programs().visible_when).toEqual({
      field: 'general.gate',
      operator: 'not_null',
    });
    expect(programs().required_when).toEqual({
      all: [
        { field: 'general.gate', operator: 'eq', value: true },
        { field: 'result_type', operator: 'in', value: ['policy_change'] },
      ],
    });
  });

  it('QAC-R-13: exposes both rules on a subfield, and omits them when absent', () => {
    const [program, mappings] = programs().subfields;
    expect(program.required_when).toEqual({
      field: 'general.gate',
      operator: 'eq',
      value: true,
    });
    expect(program.visible_when).toEqual({
      any: [{ field: 'general.gate', operator: 'eq', value: true }],
    });
    expect(Object.keys(mappings)).not.toContain('required_when');
    expect(Object.keys(mappings)).not.toContain('visible_when');
    const gate = res().fields.find((f) => f.key === 'general.gate');
    expect(Object.keys(gate)).not.toContain('required_when');
    expect(Object.keys(gate)).not.toContain('visible_when');
  });

  it('QAC-R-14: exposes nested subfields (depth 2) with their own whitelisted keys', () => {
    const mappings = programs().subfields[1];
    expect(mappings.subfields).toHaveLength(1);
    expect(Object.keys(mappings.subfields[0]).sort()).toEqual([
      'key',
      'label',
      'type',
    ]);
    expect(Object.keys(mappings).sort()).toEqual([
      'key',
      'label',
      'subfields',
      'type',
    ]);
  });

  it('QAC-R-4: with path and lookup bindings, no storage key and no table / column / source name reaches the JSON', () => {
    const json = JSON.parse(JSON.stringify(res()));
    const keys = collectKeys(json);
    for (const forbidden of [
      ...FORBIDDEN_KEYS,
      'steps',
      'join_from',
      'join_to',
      'source',
      'key_from',
      'columns',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    const text = JSON.stringify(json);
    for (const secret of FIXTURE_NESTED_SECRET_NAMES) {
      expect(text).not.toContain(secret);
    }
    // control: the fixture really carries those names in its bindings
    expect(JSON.stringify(FIXTURE_NESTED_SOURCE)).toContain(
      'secret_lookup_source',
    );
    expect(JSON.stringify(FIXTURE_NESTED_SOURCE)).toContain(
      'secret_path_table_b',
    );
  });

  it('does not alias the catalog condition objects (a caller mutating the response cannot change the catalog)', () => {
    const response = programs();
    (response.required_when as { all: unknown[] }).all.length = 0;
    expect(
      (
        FIXTURE_NESTED_SOURCE.fields[1].required_when as {
          all: unknown[];
        }
      ).all,
    ).toHaveLength(2);
  });
});

/** Every key path the response emits, arrays collapsed to `[]` (values never contribute a path). */
function collectKeyPaths(node: unknown, prefix = '', acc = new Set<string>()) {
  if (Array.isArray(node)) {
    node.forEach((n) => collectKeyPaths(n, `${prefix}[]`, acc));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k;
      acc.add(path);
      collectKeyPaths(v, path, acc);
    }
  }
  return acc;
}

/** The pinned vocabulary of the response: every key, at every level, in FIXTURE_NESTED_SOURCE's output. */
const PINNED_KEY_PATHS = [
  'catalog_version',
  'fields',
  'fields[].control_list',
  'fields[].description',
  'fields[].key',
  'fields[].label',
  'fields[].order',
  'fields[].required',
  'fields[].required_when',
  'fields[].required_when.all',
  'fields[].required_when.all[].field',
  'fields[].required_when.all[].operator',
  'fields[].required_when.all[].value',
  'fields[].required_when.field',
  'fields[].required_when.operator',
  'fields[].required_when.value',
  'fields[].result_types',
  'fields[].section',
  'fields[].subfields',
  'fields[].subfields[].control_list',
  'fields[].subfields[].key',
  'fields[].subfields[].label',
  'fields[].subfields[].required',
  'fields[].subfields[].required_when',
  'fields[].subfields[].required_when.field',
  'fields[].subfields[].required_when.operator',
  'fields[].subfields[].required_when.value',
  'fields[].subfields[].subfields',
  'fields[].subfields[].subfields[].control_list',
  'fields[].subfields[].subfields[].key',
  'fields[].subfields[].subfields[].label',
  'fields[].subfields[].subfields[].required',
  'fields[].subfields[].subfields[].required_when',
  'fields[].subfields[].subfields[].required_when.field',
  'fields[].subfields[].subfields[].required_when.operator',
  'fields[].subfields[].subfields[].required_when.value',
  'fields[].subfields[].subfields[].type',
  'fields[].subfields[].subfields[].visible_when',
  'fields[].subfields[].subfields[].visible_when.all',
  'fields[].subfields[].subfields[].visible_when.all[].field',
  'fields[].subfields[].subfields[].visible_when.all[].operator',
  'fields[].subfields[].subfields[].visible_when.all[].value',
  'fields[].subfields[].type',
  'fields[].subfields[].visible_when',
  'fields[].subfields[].visible_when.any',
  'fields[].subfields[].visible_when.any[].field',
  'fields[].subfields[].visible_when.any[].operator',
  'fields[].subfields[].visible_when.any[].value',
  'fields[].subfields[].visible_when.field',
  'fields[].subfields[].visible_when.operator',
  'fields[].subfields[].visible_when.value',
  'fields[].type',
  'fields[].valid_from',
  'fields[].valid_to',
  'fields[].visible_when',
  'fields[].visible_when.any',
  'fields[].visible_when.any[].field',
  'fields[].visible_when.any[].operator',
  'fields[].visible_when.any[].value',
  'fields[].visible_when.field',
  'fields[].visible_when.operator',
  'generated_at',
  'phase',
  'portfolio',
  'result_types',
  'result_types[].key',
  'result_types[].label',
  'result_types[].level',
  'sections',
  'sections[].key',
  'sections[].label',
  'sections[].order',
  'sections[].result_types',
];

/**
 * Fingerprint of the projection of FIXTURE_NESTED_SOURCE, one entry per CONTRACT_VERSION. Entries
 * are append-only: a projection change adds a NEW version entry, it never rewrites an old one.
 */
const PROJECTION_FINGERPRINTS: Record<number, string> = {
  1: '27c7de817cdbbf136da2cb2b0417d6b9d082be9deb4beb9e128f71392a8a4780',
};

describe('response projection pin (DD-12: a projection change forces a catalog_version bump)', () => {
  const body = (): Record<string, unknown> => ({
    ...new QaCatalogService().getCatalog(2026, FIXTURE_NESTED_SOURCE),
  });

  it('the pinned fixture exercises every key the mapper emits: the emitted key paths equal the pinned vocabulary (a key the fixture misses, or a new / renamed one, fails here)', () => {
    const emitted = [
      ...collectKeyPaths(JSON.parse(JSON.stringify(body()))),
    ].sort();
    expect(emitted).toEqual([...PINNED_KEY_PATHS].sort());
  });

  it('the projection fingerprint is pinned per CONTRACT_VERSION; if this fails after a mapper / DTO change, bump CONTRACT_VERSION (content-hash.ts), ADD a new entry to PROJECTION_FINGERPRINTS, bump the year revision (versions.ts) and run `npm run qa-catalog:snapshot`', () => {
    const response = body();
    delete response.generated_at; // the only per-call value
    const fingerprint = createHash('sha256')
      .update(stableStringify(response))
      .digest('hex');
    expect(PROJECTION_FINGERPRINTS[CONTRACT_VERSION]).toBeDefined();
    expect(fingerprint).toBe(PROJECTION_FINGERPRINTS[CONTRACT_VERSION]);
  });

  it('every CONTRACT_VERSION up to the current one has an entry, and no two versions share a fingerprint (a new fingerprint needs a new version)', () => {
    const versions = Object.keys(PROJECTION_FINGERPRINTS).map(Number);
    expect(versions.sort((a, b) => a - b)).toEqual(
      Array.from({ length: CONTRACT_VERSION }, (_, i) => i + 1),
    );
    const prints = Object.values(PROJECTION_FINGERPRINTS);
    expect(new Set(prints).size).toBe(prints.length);
  });
});
