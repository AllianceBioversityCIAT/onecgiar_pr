// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-9 / QRF-R-9: the projection is the whitelist. The walk goes BELOW the top level: a key that is not a catalog key
// is absent at depth 2, which a comparison of top-level keys would not see.
import { CatalogField } from '../definitions/types';
import { col } from './fixtures';
import { project } from './projection';

const sub = (key: string, type: CatalogField['type'], subfields = []) =>
  ({
    key,
    label: key,
    type,
    storage: { kind: 'column', table: 't', column: key },
    ...(subfields.length ? { subfields } : {}),
  }) as never;

const NESTED: CatalogField = {
  ...col('toc.entries', 'list', 't', 'c'),
  subfields: [
    sub('toc_id', 'single_select'),
    sub('indicators', 'list', [sub('indicator_id', 'single_select')] as never),
  ],
};

describe('project', () => {
  it('a list of lists keeps only catalog keys at depth 2, and fills a missing subfield with null / []', () => {
    const raw = [
      {
        toc_id: 7,
        secret_column: 'LEAK',
        indicators: [
          { indicator_id: 1, secret_column: 'LEAK-DEEP' },
          { secret_column: 'LEAK-DEEP' },
        ],
      },
      { toc_id: 8 },
    ];
    const out = project(NESTED, raw);
    expect(out).toEqual([
      {
        toc_id: 7,
        indicators: [{ indicator_id: 1 }, { indicator_id: null }],
      },
      { toc_id: 8, indicators: [] },
    ]);
    expect(JSON.stringify(out)).not.toContain('LEAK');
  });

  it('a scalar with subfields is { value, <subfield> } and never the bare scalar; unknown keys are dropped', () => {
    const field = {
      ...col('capacity_sharing.length_of_training', 'single_select', 't', 'c'),
      subfields: [sub('degree', 'single_select')],
    } as CatalogField;
    expect(project(field, { value: 4, degree: 2, secret: 'LEAK' })).toEqual({
      value: 4,
      degree: 2,
    });
    expect(project(field, null)).toEqual({ value: null, degree: null });
    expect(project(field, 4)).toEqual({ value: null, degree: null });
  });

  it('absent values: null for scalars and objects, [] for multi_select and list', () => {
    expect(project(col('a', 'text', 't', 'c'), undefined)).toBeNull();
    expect(project(col('a', 'multi_select', 't', 'c'), null)).toEqual([]);
    expect(project(col('a', 'list', 't', 'c'), null)).toEqual([]);
    expect(project(col('a', 'object', 't', 'c'), undefined)).toBeNull();
  });

  it('a scalar value that is an object is not passed through', () => {
    expect(project(col('a', 'text', 't', 'c'), { x: 1 })).toBeNull();
  });
});
