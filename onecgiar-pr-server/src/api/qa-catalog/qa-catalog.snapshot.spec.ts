// @akili-spec quality-assurance/qa-field-catalog
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_VERSIONS } from './definitions/versions';
import { computeCatalogContentHash } from './definitions/content-hash';
import {
  buildSnapshot,
  checkSnapshot,
  guardedSnapshotWrite,
  serializeSnapshot,
} from './definitions/snapshot-check';
import { CatalogField, CatalogSection } from './definitions/types';

/**
 * QAC-T-5 — QAC-R-2 (keys never disappear) and QAC-R-8 (version integrity).
 * Fixture tests and the real-catalog test share checkSnapshot (same code path).
 */
const resultTypes = CATALOG_RESULT_TYPES.slice(0, 2);
const section = (over: Partial<CatalogSection> = {}): CatalogSection => ({
  key: 'geo',
  label: 'Geography',
  order: 1,
  result_types: ['*'],
  valid_from: 2026,
  valid_to: null,
  ...over,
});
const field = (over: Partial<CatalogField> = {}): CatalogField => ({
  key: 'geo.countries',
  label: 'Countries',
  type: 'multi_select',
  control_list: 'clarisa_countries',
  section: 'geo',
  order: 1,
  result_types: ['*'],
  required: false,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
  storage: {
    kind: 'relation',
    table: 'results_by_countries',
    fk_to_result: 'result_id',
    value_column: 'country_id',
  },
  ...over,
});
const baseFields = (): CatalogField[] => [
  field(),
  field({
    key: 'geo.scope',
    label: 'Scope',
    type: 'single_select',
    control_list: 'scopes',
    order: 2,
    storage: { kind: 'column', table: 'result', column: 'scope_id' },
  }),
];
const catalogOf = (fields: CatalogField[]) => ({
  resultTypes,
  sections: [section()],
  fields,
});
const v = (revision: number) => ({ 2026: { portfolio: 'P25', revision } });
const snap = (fields: CatalogField[], revision: number) =>
  buildSnapshot(catalogOf(fields), v(revision));

describe('qa-catalog snapshot integrity (fixtures)', () => {
  const frozen = snap(baseFields(), 1);

  it('is green when nothing changed', () => {
    expect(checkSnapshot(frozen, snap(baseFields(), 1))).toEqual([]);
  });

  it('QAC-R-2: a removed key fails naming it', () => {
    const without = baseFields().filter((f) => f.key !== 'geo.countries');
    const violations = checkSnapshot(frozen, snap(without, 2));
    expect(violations).toContain(
      'key removed from catalog: field:geo.countries',
    );
  });

  it('QAC-R-2: a removed subfield key fails naming parent/sub', () => {
    const withSub = baseFields();
    withSub[0] = field({
      type: 'list',
      subfields: [
        {
          key: 'code',
          label: 'Code',
          type: 'text',
          storage: { kind: 'column', table: 'x', column: 'code' },
        },
      ],
    });
    const frozenSub = snap(withSub, 1);
    const violations = checkSnapshot(frozenSub, snap(baseFields(), 2));
    expect(violations).toContain(
      'key removed from catalog: subfield:geo.countries/code',
    );
  });

  it('QAC-R-2: gaining valid_to (with bump) does NOT fail, even when it leaves the effective year', () => {
    // valid_to 2025 < 2026: the field is absent from year 2026's effective set, yet its key
    // is still declared, so the key check must stay quiet.
    const retired = baseFields();
    retired[0] = field({ valid_to: 2025 });
    expect(checkSnapshot(frozen, snap(retired, 2))).toEqual([]);
  });

  it('QAC-R-2: a removed section key fails naming it', () => {
    const noSection = buildSnapshot(
      { resultTypes, sections: [], fields: baseFields() },
      v(2),
    );
    expect(checkSnapshot(frozen, noSection)).toContain(
      'key removed from catalog: section:geo',
    );
  });

  it('QAC-R-2: a removed result_type key fails naming it', () => {
    const fewer = buildSnapshot(
      {
        resultTypes: resultTypes.slice(1),
        sections: [section()],
        fields: baseFields(),
      },
      v(2),
    );
    expect(checkSnapshot(frozen, fewer)).toContain(
      `key removed from catalog: result_type:${resultTypes[0].key}`,
    );
  });

  it('subfield keys do not collide with a top-level key containing dots', () => {
    const withSub = baseFields();
    withSub[0] = field({
      subfields: [
        {
          key: 'code',
          label: 'Code',
          type: 'text',
          storage: { kind: 'column', table: 'x', column: 'code' },
        },
      ],
    });
    const keys = snap(withSub, 1).keys;
    expect(keys).toContain('subfield:geo.countries/code');
    expect(keys).not.toContain('field:geo.countries.code');
  });

  it('QAC-R-8: a revision decrease fails', () => {
    const relabelled = baseFields();
    relabelled[0] = field({ label: 'Countries (renamed)' });
    const frozenAt3 = snap(baseFields(), 3);
    expect(checkSnapshot(frozenAt3, snap(relabelled, 2))).toEqual([
      'year 2026: revision decreased 3 -> 2',
    ]);
  });

  it('QAC-R-8: content change without a bump fails', () => {
    const relabelled = baseFields();
    relabelled[0] = field({ label: 'Countries (renamed)' });
    expect(checkSnapshot(frozen, snap(relabelled, 1))).toEqual([
      'year 2026: content changed without a revision bump (revision 1)',
    ]);
  });

  it('QAC-R-8: bump without content change fails', () => {
    expect(checkSnapshot(frozen, snap(baseFields(), 2))).toEqual([
      'year 2026: revision bumped 1 -> 2 without a content change',
    ]);
  });

  it('QAC-R-8: change with a bump is green', () => {
    const relabelled = baseFields();
    relabelled[0] = field({ label: 'Countries (renamed)' });
    expect(checkSnapshot(frozen, snap(relabelled, 2))).toEqual([]);
  });

  it('hash is stable across array and object key ordering', () => {
    const fields = baseFields();
    const reordered = [...fields].reverse().map((f) => {
      const shuffled: Record<string, unknown> = {};
      Object.keys(f)
        .reverse()
        .forEach(
          (k) => (shuffled[k] = (f as unknown as Record<string, unknown>)[k]),
        );
      return shuffled as unknown as CatalogField;
    });
    expect(computeCatalogContentHash(catalogOf(reordered), 2026)).toBe(
      computeCatalogContentHash(catalogOf(fields), 2026),
    );
  });
});

describe('guardedSnapshotWrite (the regeneration path)', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qa-snap-'));
    file = join(dir, 'snapshot.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const frozenSnap = () => snap(baseFields(), 1);

  it('writes when no snapshot exists yet', () => {
    const res = guardedSnapshotWrite(file, frozenSnap());
    expect(res).toEqual({ written: true, violations: [] });
    expect(readFileSync(file, 'utf8')).toBe(serializeSnapshot(frozenSnap()));
  });

  it('refuses to write when a key was removed, leaving the file untouched', () => {
    writeFileSync(file, serializeSnapshot(frozenSnap()));
    const without = baseFields().filter((f) => f.key !== 'geo.countries');
    const res = guardedSnapshotWrite(file, snap(without, 1));
    expect(res.written).toBe(false);
    expect(res.violations).toContain(
      'key removed from catalog: field:geo.countries',
    );
    expect(readFileSync(file, 'utf8')).toBe(serializeSnapshot(frozenSnap()));
  });

  it('refuses to write a content change without a bump (file untouched)', () => {
    writeFileSync(file, serializeSnapshot(frozenSnap()));
    const relabelled = baseFields();
    relabelled[0] = field({ label: 'Countries (renamed)' });
    const res = guardedSnapshotWrite(file, snap(relabelled, 1));
    expect(res.written).toBe(false);
    expect(res.violations).toEqual([
      'year 2026: content changed without a revision bump (revision 1)',
    ]);
    expect(readFileSync(file, 'utf8')).toBe(serializeSnapshot(frozenSnap()));
  });

  it('writes a valid change (content change + bump)', () => {
    writeFileSync(file, serializeSnapshot(frozenSnap()));
    const relabelled = baseFields();
    relabelled[0] = field({ label: 'Countries (renamed)' });
    const next = snap(relabelled, 2);
    expect(guardedSnapshotWrite(file, next)).toEqual({
      written: true,
      violations: [],
    });
    expect(readFileSync(file, 'utf8')).toBe(serializeSnapshot(next));
  });

  it('writes a retirement via valid_to with a bump and keeps the key', () => {
    writeFileSync(file, serializeSnapshot(frozenSnap()));
    const retired = baseFields();
    retired[0] = field({ valid_to: 2025 });
    const res = guardedSnapshotWrite(file, snap(retired, 2));
    expect(res.written).toBe(true);
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, 'utf8')).keys).toContain(
      'field:geo.countries',
    );
  });
});

describe('qa-catalog snapshot integrity (real catalog)', () => {
  const file = join(__dirname, '__snapshots__', 'qa-catalog.snapshot.json');
  const frozenText = readFileSync(file, 'utf8');
  const current = buildSnapshot(
    {
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
    },
    CATALOG_VERSIONS,
  );

  it('respects key immutability and version integrity vs the committed snapshot', () => {
    expect(checkSnapshot(JSON.parse(frozenText), current)).toEqual([]);
  });

  it('committed snapshot is current (fix integrity violations first; after a VALID bump run `npm run qa-catalog:snapshot`, which refuses to write while violations exist)', () => {
    expect(frozenText).toBe(serializeSnapshot(current));
  });
});
