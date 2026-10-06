// @akili-spec quality-assurance/qa-field-catalog
import { QaCatalogService } from './qa-catalog.service';
import { FIXTURE_SECRET_NAMES, FIXTURE_SOURCE } from './qa-catalog.fixtures';

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
