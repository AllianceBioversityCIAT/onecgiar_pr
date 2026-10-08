// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { validateCatalogShape } from './definitions/shape-validator';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import {
  CatalogField,
  CatalogSubField,
  Condition,
  PathBinding,
} from './definitions/types';

/**
 * QAC-T-16: Geographic location (Results) fully parametrized. Expected values come from the client form
 * (rd-geographic-location / geoscope-management / sub-geoscope) and the live function validation_geo_location_P25 plus its
 * owner-approved fix, not from the catalog under test.
 */
const get = (key: string): CatalogField => {
  const f = CATALOG_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`catalog has no field ${key}`);
  return f;
};
const sub = (f: CatalogField, key: string): CatalogSubField => {
  const s = f.subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`no subfield ${key} in ${f.key}`);
  return s;
};
const eq = (field: string, value: string | number | boolean): Condition => ({
  field,
  operator: 'eq',
  value,
});
const inn = (field: string, value: number[]): Condition => ({
  field,
  operator: 'in',
  value,
});

const EXTRA_BLOCK: Condition = {
  all: [inn('geo.scope', [2, 3, 4, 5]), eq('geo.has_extra_scope', true)],
};

describe('QAC-T-16 geographic location (Results)', () => {
  it('section keys and contiguous order', () => {
    const section = CATALOG_FIELDS.filter(
      (f) => f.section === 'geographic_location',
    ).sort((a, b) => a.order - b.order);
    expect(section.map((f) => f.key)).toEqual([
      'geo.scope',
      'geo.regions_specified',
      'geo.regions',
      'geo.countries_specified',
      'geo.countries',
      'geo.has_extra_scope',
      'geo.extra_scope',
      'geo.extra_regions_specified',
      'geo.extra_regions',
      'geo.extra_countries_specified',
      'geo.extra_countries',
    ]);
    expect(section.map((f) => f.order)).toEqual(section.map((_, i) => i + 1));
    // IPSR geography is not touched: the package has its own keys
    for (const f of section)
      expect(f.result_types).not.toContain('innovation_package');
  });

  it('a geographic condition naming a scope id outside the closed list is rejected (id 6)', () => {
    const fields = CATALOG_FIELDS.map((f) =>
      f.key === 'geo.countries'
        ? { ...f, visible_when: inn('geo.scope', [3, 6]) }
        : f,
    );
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields,
      notForQa: NOT_FOR_QA,
    });
    expect(errors.map((e) => e.rule)).toContain('CONDITION_VALUE_NOT_IN_LIST');
  });

  describe('closed list geographic_scopes', () => {
    it('lists 1, 2, 3, 5, 50 (client enum / seed) and the stored legacy 4', () => {
      expect(
        [...CLOSED_CONTROL_LISTS.geographic_scopes].sort((a, b) => a - b),
      ).toEqual([1, 2, 3, 4, 5, 50]);
    });
  });

  describe('closed list extra_geographic_scopes (QAC-T-24)', () => {
    it('is the main list minus 50, which the extra block hides ([hideTobeDetermined]="true")', () => {
      expect(CLOSED_CONTROL_LISTS.extra_geographic_scopes).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(CLOSED_CONTROL_LISTS.extra_geographic_scopes).not.toContain(50);
    });

    it('geo.extra_scope uses it; the main scope keeps geographic_scopes', () => {
      expect(get('geo.extra_scope').control_list).toBe(
        'extra_geographic_scopes',
      );
      expect(get('geo.scope').control_list).toBe('geographic_scopes');
    });

    it('a condition geo.extra_scope eq 50 is rejected (CONDITION_VALUE_NOT_IN_LIST)', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === 'geo.extra_regions'
          ? { ...f, visible_when: eq('geo.extra_scope', 50) }
          : f,
      );
      const errors = validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields,
        notForQa: NOT_FOR_QA,
      });
      expect(errors.map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });
  });

  describe('main block', () => {
    it('geo.scope: always shown, unconditionally required (live function: NULL fails)', () => {
      const f = get('geo.scope');
      expect(f.required).toBe(true);
      expect(f.required_confirmed).toBe(true);
      expect(f.visible_when).toBeUndefined();
      expect(f.required_when).toBeUndefined();
      expect(f.control_list).toBe('geographic_scopes');
    });

    it('geo.regions_specified: only scope 1 (scope 2 forces Yes, the function checks it first)', () => {
      const f = get('geo.regions_specified');
      expect(f.visible_when).toEqual(eq('geo.scope', 1));
      expect(f.required_when).toEqual(eq('geo.scope', 1));
    });

    it('geo.regions: scope 2, or scope 1 with Yes', () => {
      const want: Condition = {
        any: [
          eq('geo.scope', 2),
          { all: [eq('geo.scope', 1), eq('geo.regions_specified', true)] },
        ],
      };
      expect(get('geo.regions').visible_when).toEqual(want);
      expect(get('geo.regions').required_when).toEqual(want);
    });

    it('geo.countries_specified: scope 1 and 2', () => {
      const f = get('geo.countries_specified');
      expect(f.visible_when).toEqual(inn('geo.scope', [1, 2]));
      expect(f.required_when).toEqual(inn('geo.scope', [1, 2]));
    });

    it('geo.countries: shown for 3/4/5 or Yes on 1/2; required whenever shown (QAC-T-19: the form requires it for scope 5 too; the function does not, D25)', () => {
      const f = get('geo.countries');
      expect(f.visible_when).toEqual({
        any: [
          inn('geo.scope', [3, 4, 5]),
          {
            all: [
              inn('geo.scope', [1, 2]),
              eq('geo.countries_specified', true),
            ],
          },
        ],
      });
      expect(f.required_when).toEqual(f.visible_when);
      // scope 5 is form-only: the live function does not require a country there (D25)
      expect(f.required_confirmed).toBe(false);
    });
  });

  describe('country lists (geo.countries, geo.extra_countries)', () => {
    it.each([
      ['geo.countries', 1],
      ['geo.extra_countries', 2],
    ])('%s is a list of country + sub-national, role %i', (key, role) => {
      const f = get(key);
      expect(f.type).toBe('list');
      expect(f.control_list).toBeUndefined();
      expect(f.storage).toMatchObject({
        kind: 'relation',
        table: 'result_country',
        value_column: 'country_id',
        filter: { geo_scope_role_id: role, is_active: 1 },
      });
      expect(f.subfields?.map((s) => s.key)).toEqual([
        'country',
        'subnational',
      ]);

      const country = sub(f, 'country');
      expect(country.type).toBe('single_select');
      expect(country.control_list).toBe('countries');
      expect(country.required).toBe(true); // element identity
      expect(country.storage).toEqual({
        kind: 'column',
        table: 'result_country',
        column: 'country_id',
      });

      const sn = sub(f, 'subnational');
      expect(sn.type).toBe('multi_select');
      expect(sn.control_list).toBe('subnational_areas');
      // path: parent result_country row -> its result_country_subnational rows of the SAME role
      expect(sn.storage).toEqual({
        kind: 'path',
        steps: [
          {
            table: 'result_country_subnational',
            join: [{ from: 'result_country_id', to: 'result_country_id' }],
            filter: { geo_scope_role_id: role, is_active: 1 },
          },
        ],
        value_column: 'clarisa_subnational_scope_code',
      });
    });

    it('main subnational: shown and required when scope = 5', () => {
      const sn = sub(get('geo.countries'), 'subnational');
      expect(sn.visible_when).toEqual(eq('geo.scope', 5));
      expect(sn.required_when).toEqual(eq('geo.scope', 5));
    });

    it('extra subnational: shown and required in the extra block when extra scope = 5', () => {
      const sn = sub(get('geo.extra_countries'), 'subnational');
      const want: Condition = { all: [EXTRA_BLOCK, eq('geo.extra_scope', 5)] };
      expect(sn.visible_when).toEqual(want);
      expect(sn.required_when).toEqual(want);
    });

    it('the pending subnational keys were never catalogued as top-level keys', () => {
      expect(CATALOG_FIELDS.map((f) => f.key)).not.toContain('geo.subnational');
      expect(CATALOG_FIELDS.map((f) => f.key)).not.toContain(
        'geo.extra_subnational',
      );
    });

    it('PENDING_CATALOG keeps the result_country_subnational columns only for the IPSR key', () => {
      const entries = PENDING_CATALOG.filter(
        (e) => e.table === 'result_country_subnational',
      );
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(e.reason).toContain('ipsr_step_1.countries.sub_national');
        expect(e.reason).not.toContain('geo.');
      }
    });

    it('the subnational path binding is a PathBinding (validator-checked)', () => {
      const b = sub(get('geo.countries'), 'subnational').storage as PathBinding;
      expect(b.kind).toBe('path');
    });
  });

  describe('extra block (innovations)', () => {
    it('geo.has_extra_scope: main scope 2, 3, 4, 5 (not Global / TBD); confirmed by the live function', () => {
      const f = get('geo.has_extra_scope');
      expect(f.visible_when).toEqual(inn('geo.scope', [2, 3, 4, 5]));
      expect(f.required_when).toEqual(inn('geo.scope', [2, 3, 4, 5]));
      expect(f.required_confirmed).toBe(true);
      expect(f.result_types).toEqual([
        'innovation_development',
        'innovation_use',
      ]);
    });

    it('geo.extra_scope: inside the extra block; not confirmed live (the fix reads extra_geo_scope_id)', () => {
      const f = get('geo.extra_scope');
      expect(f.visible_when).toEqual(EXTRA_BLOCK);
      expect(f.required_when).toEqual(EXTRA_BLOCK);
      expect(f.required_confirmed).toBe(false);
      expect(f.storage).toEqual({
        kind: 'column',
        table: 'result',
        column: 'extra_geo_scope_id',
      });
    });

    it('geo.extra_regions_specified: extra scope 1 only', () => {
      const want: Condition = { all: [EXTRA_BLOCK, eq('geo.extra_scope', 1)] };
      expect(get('geo.extra_regions_specified').visible_when).toEqual(want);
      expect(get('geo.extra_regions_specified').required_when).toEqual(want);
    });

    it('geo.extra_regions: extra scope 2, or 1 with Yes; active role 2 rows', () => {
      const f = get('geo.extra_regions');
      const want: Condition = {
        all: [
          EXTRA_BLOCK,
          {
            any: [
              eq('geo.extra_scope', 2),
              {
                all: [
                  eq('geo.extra_scope', 1),
                  eq('geo.extra_regions_specified', true),
                ],
              },
            ],
          },
        ],
      };
      expect(f.visible_when).toEqual(want);
      expect(f.required_when).toEqual(want);
      expect(f.storage).toMatchObject({
        filter: { geo_scope_role_id: 2, is_active: 1 },
      });
    });

    it('geo.extra_countries_specified: extra scope 1 and 2', () => {
      const want: Condition = {
        all: [EXTRA_BLOCK, inn('geo.extra_scope', [1, 2])],
      };
      expect(get('geo.extra_countries_specified').visible_when).toEqual(want);
      expect(get('geo.extra_countries_specified').required_when).toEqual(want);
    });

    it('geo.extra_countries: shown for 3/4/5 or Yes on 1/2; required whenever shown (QAC-T-19)', () => {
      const f = get('geo.extra_countries');
      const yes: Condition = {
        all: [
          inn('geo.extra_scope', [1, 2]),
          eq('geo.extra_countries_specified', true),
        ],
      };
      expect(f.visible_when).toEqual({
        all: [EXTRA_BLOCK, { any: [inn('geo.extra_scope', [3, 4, 5]), yes] }],
      });
      expect(f.required_when).toEqual({
        all: [EXTRA_BLOCK, { any: [inn('geo.extra_scope', [3, 4, 5]), yes] }],
      });
      expect(f.required_confirmed).toBe(false);
    });
  });

  it('the extra fields apply only to innovation types', () => {
    for (const f of CATALOG_FIELDS.filter(
      (x) => x.key.startsWith('geo.extra') || x.key === 'geo.has_extra_scope',
    )) {
      expect(f.result_types).toEqual([
        'innovation_development',
        'innovation_use',
      ]);
    }
  });
});

/**
 * QAC-T-23: the four `geo.extra_*` region/country fields carry labels distinct from the main geographic fields (QA feedback:
 * "Select countries" appeared twice). Keys unchanged; label disambiguated for QA (owner 2026-10-08).
 */
describe('QAC-T-23 extra geographic block labels', () => {
  const PAIRS: Array<[string, string]> = [
    ['geo.regions_specified', 'geo.extra_regions_specified'],
    ['geo.regions', 'geo.extra_regions'],
    ['geo.countries_specified', 'geo.extra_countries_specified'],
    ['geo.countries', 'geo.extra_countries'],
  ];
  const QUALIFIER = '(potential impact in other geographic areas)';

  const assertDistinctExtraLabels = (fields: CatalogField[]): void => {
    const find = (k: string) => {
      const f = fields.find((x) => x.key === k);
      if (!f) throw new Error(`catalog has no field ${k}`);
      return f.label;
    };
    for (const [main, extra] of PAIRS) {
      if (find(extra) === find(main)) {
        throw new Error(`${extra} repeats the label of ${main}`);
      }
    }
    const extras = PAIRS.map(([, extra]) => find(extra));
    if (new Set(extras).size !== extras.length) {
      throw new Error(
        'extra geographic labels are not distinct from each other',
      );
    }
  };

  it('passes on the real catalog', () => {
    expect(() => assertDistinctExtraLabels(CATALOG_FIELDS)).not.toThrow();
  });

  it('keeps the form label first and the same qualifier on all four', () => {
    for (const [main, extra] of PAIRS) {
      expect(get(extra).label).toBe(`${get(main).label} ${QUALIFIER}`);
    }
  });

  it('falsifier: throws on a copy where one extra label is reset to the main label', () => {
    const copy = CATALOG_FIELDS.map((f) =>
      f.key === 'geo.extra_countries'
        ? { ...f, label: get('geo.countries').label }
        : f,
    );
    expect(() => assertDistinctExtraLabels(copy)).toThrow(
      /geo\.extra_countries repeats the label of geo\.countries/,
    );
  });
});
