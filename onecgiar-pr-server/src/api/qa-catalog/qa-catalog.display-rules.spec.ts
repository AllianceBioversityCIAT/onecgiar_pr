// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { validateCatalogShape } from './definitions/shape-validator';
import { CatalogField, CatalogSubField, Condition } from './definitions/types';

/**
 * QAC-T-25: display rules (`visible_when`), value shapes and labels read from the 2026 client templates (cited in the definitions).
 * Expected values below come from the templates, not from the catalog under test. `check` is the assertion function; the falsifier
 * tests run it (and the production shape validator) on a MUTATED copy of the real catalog and expect it to fail.
 */
const eq = (field: string, value: string | number | boolean): Condition => ({
  field,
  operator: 'eq',
  value,
});
const inn = (field: string, value: Array<string | number>): Condition => ({
  field,
  operator: 'in',
  value,
});
const INNOVATION = inn('$result_type', [
  'innovation_development',
  'innovation_use',
]);

type Node = CatalogField | CatalogSubField;
/** `key` or `key>subfield[>subfield]`. */
const resolve = (fields: CatalogField[], path: string): Node | undefined => {
  const [top, ...rest] = path.split('>');
  let node: Node | undefined = fields.find((f) => f.key === top);
  for (const k of rest) node = node?.subfields?.find((s) => s.key === k);
  return node;
};

const VISIBLE: Record<string, Condition | undefined> = {
  'general.is_discontinued': {
    all: [eq('general.is_replicated', true), INNOVATION],
  },
  'general.discontinued_reasons': {
    all: [
      eq('general.is_replicated', true),
      INNOVATION,
      eq('general.is_discontinued', true),
    ],
  },
  // QAC-T-26: impact-area pickers show only when the tag is Principal (3) (rd-general-information.component.html:146/195/244/297/346)
  'general.gender_impact_areas': eq('general.gender_tag', 3),
  'general.climate_impact_areas': eq('general.climate_tag', 3),
  'general.nutrition_impact_areas': eq('general.nutrition_tag', 3),
  'general.environment_impact_areas': eq('general.environment_tag', 3),
  'general.poverty_impact_areas': eq('general.poverty_tag', 3),
  // QAC-T-26: needsDescription() = option.requires_description, else legacy id 6 (rd-annual-updating.component.ts:627-633)
  'general.discontinued_reasons>description': {
    any: [eq('requires_description', true), eq('reason', 6)],
  },
  'knowledge_product.melia_previous_submitted': eq(
    'knowledge_product.is_melia',
    true,
  ),
  'knowledge_product.melia_type': {
    all: [
      eq('knowledge_product.is_melia', true),
      eq('knowledge_product.melia_previous_submitted', false),
    ],
  },
  'knowledge_product.toc_melia_study': {
    all: [
      eq('knowledge_product.is_melia', true),
      eq('knowledge_product.melia_previous_submitted', true),
    ],
  },
  'innovation_use.use_level.readiness_level_explanation': inn(
    'innovation_use.use_level.innovation_use_level',
    [5, 6, 7, 8, 9],
  ),
  'capacity_sharing.length_of_training>degree': eq(
    'capacity_sharing.length_of_training',
    4,
  ),
  // always shown: no `visible_when` at all
  'partners.is_lead_by_partner': undefined,
  'innovation_use.current_use.actors>how_many': undefined,
  'innovation_use.projection_2030.actors>how_many': undefined,
  'innovation_use.investment.programs>kind_cash': undefined,
  'innovation_use.investment.bilateral>kind_cash': undefined,
  'innovation_use.investment.partners>kind_cash': undefined,
};
for (const block of ['current_use', 'projection_2030']) {
  const p = `innovation_use.${block}`;
  const gate = eq(`${p}.yet_to_be_determined`, false);
  for (const list of ['actors', 'organizations', 'measures'])
    VISIBLE[`${p}.${list}`] = gate;
  for (const k of ['women', 'women_youth', 'men', 'men_youth'])
    VISIBLE[`${p}.actors>${k}`] = eq('sex_and_age_disaggregation', false);
  VISIBLE[`${p}.actors>other_actor_type`] = eq('actor_type', 5);
  VISIBLE[`${p}.organizations>other_institution`] = eq('institution_type', 78);
}

/** Every mismatch between `fields` and the expectation table (empty = the catalog follows the templates). */
const check = (fields: CatalogField[]): string[] => {
  const out: string[] = [];
  for (const [path, want] of Object.entries(VISIBLE)) {
    const node = resolve(fields, path);
    if (!node) out.push(`${path}: missing`);
    else if (JSON.stringify(node.visible_when) !== JSON.stringify(want))
      out.push(`${path}: visible_when`);
  }
  return out;
};

const shapeRules = (fields: CatalogField[]): string[] =>
  validateCatalogShape({
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields,
    notForQa: NOT_FOR_QA,
  }).map((e) => e.rule);

/** A copy of the catalog where the node at `path` is replaced by `edit(node)`. */
const mutate = (path: string, edit: (n: any) => any): CatalogField[] => {
  const [top, ...rest] = path.split('>');
  const go = (n: any, keys: string[]): any =>
    keys.length === 0
      ? edit(n)
      : {
          ...n,
          subfields: n.subfields.map((s: any) =>
            s.key === keys[0] ? go(s, keys.slice(1)) : s,
          ),
        };
  return CATALOG_FIELDS.map((f) => (f.key === top ? go(f, rest) : f));
};

describe('QAC-T-25 display rules and value shapes', () => {
  it('the catalog follows every visible_when expectation (and the always-visible ones carry none)', () => {
    expect(check(CATALOG_FIELDS)).toEqual([]);
  });

  it('the catalog passes the production shape validator', () => {
    expect(shapeRules(CATALOG_FIELDS)).toEqual([]);
  });

  describe('falsifiers', () => {
    const gated = Object.entries(VISIBLE).filter(([, w]) => w !== undefined);
    it.each(gated.map(([p]) => [p]))(
      'dropping visible_when of %s is detected',
      (path) => {
        const fields = mutate(path, (n) => {
          const { visible_when, ...rest } = n;
          void visible_when;
          return rest;
        });
        expect(check(fields)).toContain(`${path}: visible_when`);
      },
    );

    it.each(
      Object.entries(VISIBLE)
        .filter(([, w]) => w === undefined)
        .map(([p]) => [p]),
    )('adding a gate to always-visible %s is detected', (path) => {
      const fields = mutate(path, (n) => ({
        ...n,
        visible_when: eq('x', true),
      }));
      expect(check(fields)).toContain(`${path}: visible_when`);
    });
  });

  describe('(a) multi_select with subfields became list with an identity subfield', () => {
    it.each([
      ['contributors.centers', 'center', 'centers'],
      ['contributors.other_centers', 'center', 'centers'],
      ['general.discontinued_reasons', 'reason', 'discontinued_reasons'],
    ])(
      '%s is a list whose first subfield %s is the required identity',
      (key, sub, list) => {
        const f = CATALOG_FIELDS.find((x) => x.key === key);
        expect(f?.type).toBe('list');
        expect(f?.subfields?.[0]).toMatchObject({
          key: sub,
          type: 'single_select',
          control_list: list,
          required: true,
        });
        expect(f?.storage).toMatchObject({ kind: 'relation' });
        const identity = f?.subfields?.[0].storage as any;
        expect((f?.storage as any).value_column).toBe(identity.column);
      },
    );

    it('no multi_select (top level or nested) carries subfields', () => {
      const bad: string[] = [];
      const walk = (n: Node, path: string) => {
        if (n.type === 'multi_select' && n.subfields?.length) bad.push(path);
        n.subfields?.forEach((s) => walk(s, `${path}>${s.key}`));
      };
      CATALOG_FIELDS.forEach((f) => walk(f, f.key));
      expect(bad).toEqual([]);
    });

    it.each([
      ['contributors.centers'],
      ['contributors.other_centers'],
      ['general.discontinued_reasons'],
    ])(
      'falsifier: %s mutated back to multi_select is rejected by the production validator',
      (key) => {
        const fields = CATALOG_FIELDS.map((f) =>
          f.key === key ? { ...f, type: 'multi_select' as const } : f,
        );
        expect(shapeRules(fields)).toContain('MULTI_SELECT_WITH_SUBFIELDS');
      },
    );

    it('a multi_select SUBFIELD carrying subfields is rejected too, and a single_select with subfields is accepted', () => {
      const bad = mutate('capacity_sharing.length_of_training>degree', (n) => ({
        ...n,
        type: 'multi_select',
        subfields: [n],
      }));
      expect(shapeRules(bad)).toContain('MULTI_SELECT_WITH_SUBFIELDS');
      expect(shapeRules(CATALOG_FIELDS)).not.toContain(
        'MULTI_SELECT_WITH_SUBFIELDS',
      );
    });
  });

  describe('(b) capacity sharing lists', () => {
    it('lengths are 3 / 4 and degrees 1 / 2; the old capdev_terms list is gone', () => {
      expect([...CLOSED_CONTROL_LISTS.capdev_training_lengths]).toEqual([3, 4]);
      expect([...CLOSED_CONTROL_LISTS.capdev_degrees]).toEqual([1, 2]);
      expect(CLOSED_CONTROL_LISTS.capdev_terms).toBeUndefined();
    });

    it('length and degree use their own lists over the SAME column; degree is shown for Long-term (4) only', () => {
      const f = CATALOG_FIELDS.find(
        (x) => x.key === 'capacity_sharing.length_of_training',
      ) as CatalogField;
      const degree = f.subfields?.[0] as CatalogSubField;
      expect(f.control_list).toBe('capdev_training_lengths');
      expect(degree.control_list).toBe('capdev_degrees');
      expect(degree.visible_when).toEqual(
        eq('capacity_sharing.length_of_training', 4),
      );
      expect(f.storage).toEqual(degree.storage);
    });

    it('falsifier: a degree gate naming 1 (a degree, not a length) is rejected by the production validator', () => {
      const fields = mutate(
        'capacity_sharing.length_of_training>degree',
        (n) => ({
          ...n,
          visible_when: eq('capacity_sharing.length_of_training', 1),
        }),
      );
      expect(shapeRules(fields)).toContain('CONDITION_VALUE_NOT_IN_LIST');
    });
  });

  describe('(d)-(g) requirement, labels and order', () => {
    it('number_of_varieties: required_when equals visible_when', () => {
      const f = CATALOG_FIELDS.find(
        (x) => x.key === 'innovation_dev.number_of_varieties',
      ) as CatalogField;
      expect(f.required_when).toEqual(f.visible_when);
      expect(f.required_when).toEqual({
        all: [
          eq('innovation_dev.nature', 12),
          eq('innovation_dev.is_new_variety', true),
        ],
      });
    });

    it.each([
      ['knowledge_product.online_date', 'Date online (CGSpace) (year)'],
      ['knowledge_product.issue_date_cg', 'Issue date (CGSpace) (year)'],
      ['knowledge_product.issue_date_wos', 'Issue date (WoS) (year)'],
    ])('%s says it is a year', (key, label) => {
      expect(CATALOG_FIELDS.find((x) => x.key === key)?.label).toBe(label);
    });

    it('general information: is_replicated comes before is_discontinued and its reasons; merge/split after', () => {
      const order = (k: string) =>
        CATALOG_FIELDS.find((x) => x.key === k)?.order as number;
      expect(order('general.is_replicated')).toBeLessThan(
        order('general.is_discontinued'),
      );
      expect(order('general.is_discontinued')).toBeLessThan(
        order('general.discontinued_reasons'),
      );
      expect(order('general.discontinued_reasons')).toBeLessThan(
        order('general.merge_targets'),
      );
      expect(order('general.merge_targets')).toBeLessThan(
        order('general.split_targets'),
      );
    });
  });
});

describe('QAC-T-26 impact-area and discontinued-description visibility', () => {
  const IMPACT = [
    ['general.gender_impact_areas', 'general.gender_tag'],
    ['general.climate_impact_areas', 'general.climate_tag'],
    ['general.nutrition_impact_areas', 'general.nutrition_tag'],
    ['general.environment_impact_areas', 'general.environment_tag'],
    ['general.poverty_impact_areas', 'general.poverty_tag'],
  ];

  it.each(IMPACT)(
    '%s is visible exactly when it is required (tag eq 3)',
    (key, tag) => {
      const f = CATALOG_FIELDS.find((x) => x.key === key);
      expect(f?.visible_when).toEqual(eq(tag, 3));
      expect(f?.visible_when).toEqual(f?.required_when);
    },
  );

  it('discontinued description: visible by requires_description or reason 6, required by reason 6 only', () => {
    const d = resolve(
      CATALOG_FIELDS,
      'general.discontinued_reasons>description',
    );
    expect(d?.visible_when).toEqual({
      any: [eq('requires_description', true), eq('reason', 6)],
    });
    expect(d?.required_when).toEqual(eq('reason', 6));
  });

  it('requires_description is a read-only boolean lookup of the options table keyed by the row reason', () => {
    const r = resolve(
      CATALOG_FIELDS,
      'general.discontinued_reasons>requires_description',
    );
    expect(r).toMatchObject({
      type: 'boolean',
      required: false,
      storage: {
        kind: 'lookup',
        source: 'prms.investment_discontinued_option',
        keys: [{ from: 'reason', to: 'investment_discontinued_option_id' }],
        value_column: 'requires_description',
      },
    });
    expect(shapeRules(CATALOG_FIELDS)).toEqual([]);
  });

  it.each(IMPACT.map(([k]) => [k]))(
    'falsifier: dropping visible_when of %s is detected by the real-catalog check',
    (key) => {
      const fields = mutate(key, (n) => {
        const { visible_when, ...rest } = n;
        void visible_when;
        return rest;
      });
      expect(check(fields)).toContain(`${key}: visible_when`);
      expect(check(CATALOG_FIELDS)).toEqual([]);
    },
  );

  it('falsifier: description visible only for reason 6 (flag branch dropped) is detected', () => {
    const path = 'general.discontinued_reasons>description';
    const fields = mutate(path, (n) => ({
      ...n,
      visible_when: eq('reason', 6),
    }));
    expect(check(fields)).toContain(`${path}: visible_when`);
  });
});
