// @akili-spec quality-assurance/qa-results-feed
// P-13: every `source` the catalog names resolves through the registry; the ToC database comes from configuration at call time.
import { CATALOG_FIELDS } from '../definitions/sections';
import { CatalogField, CatalogSubField } from '../definitions/types';
import { LOOKUP_SOURCES, resolveLookupSource } from './lookup-sources';

function sourcesOf(fields: Array<CatalogField | CatalogSubField>): string[] {
  return fields.flatMap((f) => [
    ...(f.storage.kind === 'lookup' ? [f.storage.source] : []),
    ...sourcesOf(f.subfields ?? []),
  ]);
}
const unregistered = (fields: CatalogField[]) =>
  [...new Set(sourcesOf(fields))].filter((s) => !(s in LOOKUP_SOURCES));

describe('lookup source registry (P-13)', () => {
  it('every source of the real catalog is registered (7 distinct)', () => {
    expect(new Set(sourcesOf(CATALOG_FIELDS)).size).toBe(7);
    expect(unregistered(CATALOG_FIELDS)).toEqual([]);
  });

  it('a fake source on a field is reported as unregistered', () => {
    const fake = {
      key: 'fx.fake',
      storage: { kind: 'lookup', source: 'prms.no_such_source' },
      subfields: [],
    } as unknown as CatalogField;
    expect(unregistered([...CATALOG_FIELDS, fake])).toEqual([
      'prms.no_such_source',
    ]);
  });

  it('maps logical names to physical ones; the ToC database is read from the environment each call', () => {
    expect(resolveLookupSource('clarisa.institutions', {})).toEqual({
      table: 'clarisa_institutions',
      primaryKey: 'id',
    });
    const toc = 'toc.integration_information.toc_results';
    expect(resolveLookupSource(toc, { DB_TOC: 'toc_a' })?.schema).toBe('toc_a');
    expect(resolveLookupSource(toc, { DB_TOC: 'toc_b' })?.schema).toBe('toc_b');
  });

  it('an unknown source, or a ToC source without its database configured, is unavailable', () => {
    expect(resolveLookupSource('prms.no_such_source', {})).toBeUndefined();
    expect(
      resolveLookupSource('toc.integration_information.toc_results', {}),
    ).toBeUndefined();
  });
});
