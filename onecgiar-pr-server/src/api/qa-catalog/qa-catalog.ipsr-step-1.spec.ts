// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { validateCatalogShape } from './definitions/shape-validator';
import {
  CatalogField,
  CatalogSubField,
  Condition,
  PathBinding,
} from './definitions/types';

/**
 * QAC-T-28: IPSR step 1 complete. Expected values come from the 2026 IPSR step-1 form (step-n1.component.html, geoscope-management,
 * innovation-use-form with isIpsr) and from the live function validation_ipsr_step_one_P25 (tmp/), not from the catalog under test.
 * `assertIpsrStep1` is the assertion function; the falsifiers run it on a MUTATED copy of the real catalog.
 */
const SCOPE = 'ipsr_step_1.geo_scope';
const WORKSHOP = 'ipsr_step_1.is_expert_workshop_organized';
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

const get = (fields: CatalogField[], key: string): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`missing field ${key}`);
  return f;
};
const sub = (f: CatalogField, key: string): CatalogSubField => {
  const s = f.subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`missing subfield ${f.key}/${key}`);
  return s;
};

interface Expect {
  type: CatalogField['type'];
  required: boolean;
  confirmed: boolean;
  visible?: Condition;
  required_when?: Condition;
  list?: string;
}

// [key, expectation]: form UNION live function (option B); `confirmed` only where VS1 states the rule.
const FIELDS: Array<[string, Expect]> = [
  [
    SCOPE,
    // GM:10 `[required]="true"`; VS1 does not test geography
    {
      type: 'single_select',
      required: true,
      confirmed: false,
      list: 'ipsr_geographic_scopes',
    },
  ],
  [
    'ipsr_step_1.regions',
    {
      type: 'multi_select',
      required: false,
      confirmed: false,
      visible: eq(SCOPE, 2),
      required_when: eq(SCOPE, 2),
    },
  ],
  [
    'ipsr_step_1.countries',
    {
      type: 'list',
      required: false,
      confirmed: false,
      visible: inn(SCOPE, [3, 4, 5]),
      required_when: inn(SCOPE, [3, 4, 5]),
    },
  ],
  [
    // S1E:13 required; VS1:32-41
    'ipsr_step_1.eoi_outcomes',
    { type: 'multi_select', required: true, confirmed: true },
  ],
  [
    // S1I:7 needs >= 1; VS1:211-237 passes with 0 partners
    'ipsr_step_1.scaling_partners',
    { type: 'list', required: true, confirmed: false },
  ],
  [
    'ipsr_step_1.scaling_ambition_blurb',
    { type: 'text', required: false, confirmed: false },
  ],
  [
    // S1:43-50; VS1:119
    WORKSHOP,
    { type: 'boolean', required: true, confirmed: true },
  ],
  [
    'ipsr_step_1.workshop_facilitators',
    {
      type: 'list',
      required: false,
      confirmed: false,
      visible: eq(WORKSHOP, true),
    },
  ],
  [
    'ipsr_step_1.workshop_participants_link',
    {
      type: 'text',
      required: false,
      confirmed: false,
      visible: eq(WORKSHOP, true),
    },
  ],
  [
    'ipsr_step_1.participants_consent',
    {
      type: 'boolean',
      required: false,
      confirmed: false,
      visible: eq(WORKSHOP, true),
    },
  ],
];

const SUBFIELDS: Array<[string, string, Partial<CatalogSubField>]> = [
  ['ipsr_step_1.countries', 'country', { required: true }],
  [
    'ipsr_step_1.countries',
    'subnational',
    {
      visible_when: eq(SCOPE, 5),
      required_when: eq(SCOPE, 5),
      control_list: 'subnational_areas',
    },
  ],
  ['ipsr_step_1.scaling_partners', 'institution', { required: true }],
  ['ipsr_step_1.scaling_partners', 'partner_role', { required: true }],
  ['ipsr_step_1.workshop_facilitators', 'first_name', { required: true }],
  ['ipsr_step_1.workshop_facilitators', 'last_name', { required: true }],
  ['ipsr_step_1.workshop_facilitators', 'workshop_role', { required: true }],
  ['ipsr_step_1.workshop_facilitators', 'email', { required: false }],
  // IUF:100 / VS1:148-153
  ['ipsr_step_1.targeted_use.actors', 'actor_type', { required: true }],
  [
    'ipsr_step_1.targeted_use.actors',
    'other_actor_type',
    {
      required_when: eq('actor_type', 5),
      visible_when: eq('actor_type', 5),
    },
  ],
  ...['women', 'women_youth', 'men', 'men_youth'].map(
    (k): [string, string, Partial<CatalogSubField>] => [
      'ipsr_step_1.targeted_use.actors',
      k,
      {
        required_when: eq('sex_and_age_disaggregation', false),
        visible_when: eq('sex_and_age_disaggregation', false),
      },
    ],
  ),
  [
    'ipsr_step_1.targeted_use.actors',
    'how_many',
    { required_when: eq('sex_and_age_disaggregation', true) },
  ],
  [
    'ipsr_step_1.targeted_use.organizations',
    'institution_type',
    { required: true },
  ],
  [
    'ipsr_step_1.targeted_use.organizations',
    'other_institution',
    {
      required_when: eq('institution_type', 78),
      visible_when: eq('institution_type', 78),
    },
  ],
  ['ipsr_step_1.targeted_use.organizations', 'how_many', { required: true }],
  [
    'ipsr_step_1.targeted_use.organizations',
    'graduate_students',
    { required: false, visible_when: eq('institution_type', 50) },
  ],
  ['ipsr_step_1.targeted_use.measures', 'unit_of_measure', { required: true }],
  ['ipsr_step_1.targeted_use.measures', 'quantity', { required: true }],
];

// The IPSR render offers neither age-fallback control (showAgeFallback() is false when isIpsr, IUF:178).
const NOT_RENDERED_IN_IPSR = [
  'age_disaggregation_not_available',
  'youth_split_applied_by_system',
];

const pathOf = (f: CatalogField): PathBinding => f.storage as PathBinding;

function assertIpsrStep1(fields: CatalogField[]): void {
  for (const [key, e] of FIELDS) {
    const f = get(fields, key);
    const fail = (what: string) => {
      throw new Error(`${key}: ${what}`);
    };
    if (f.type !== e.type) fail(`type ${f.type} != ${e.type}`);
    if (f.required !== e.required) fail(`required ${f.required}`);
    if (f.required_confirmed !== e.confirmed) fail('required_confirmed');
    if (JSON.stringify(f.visible_when) !== JSON.stringify(e.visible))
      fail('visible_when');
    if (JSON.stringify(f.required_when) !== JSON.stringify(e.required_when))
      fail('required_when');
    if (e.list && f.control_list !== e.list) fail('control_list');
    if (f.result_types.join() !== 'innovation_package') fail('result_types');
  }
  for (const [parent, key, e] of SUBFIELDS) {
    const s = sub(get(fields, parent), key);
    const fail = (what: string) => {
      throw new Error(`${parent}/${key}: ${what}`);
    };
    if ((s.required ?? false) !== (e.required ?? false)) fail('required');
    if (JSON.stringify(s.required_when) !== JSON.stringify(e.required_when))
      fail('required_when');
    if (JSON.stringify(s.visible_when) !== JSON.stringify(e.visible_when))
      fail('visible_when');
    if (e.control_list && s.control_list !== e.control_list)
      fail('control_list');
  }
  const actors = get(fields, 'ipsr_step_1.targeted_use.actors');
  for (const k of NOT_RENDERED_IN_IPSR) {
    if (actors.subfields?.some((s) => s.key === k))
      throw new Error(`${k} is not rendered for isIpsr`);
  }
  // geography storage: no role filter (the IPSR writer leaves geo_scope_role_id NULL); sub-national areas filtered only by is_active
  for (const key of ['ipsr_step_1.regions', 'ipsr_step_1.countries']) {
    const filter = (get(fields, key).storage as any).filter;
    if (JSON.stringify(filter) !== JSON.stringify({ is_active: 1 }))
      throw new Error(`${key}: filter must be only is_active`);
  }
  const subnational = sub(get(fields, 'ipsr_step_1.countries'), 'subnational');
  const sn = subnational.storage as PathBinding;
  if (
    sn.kind !== 'path' ||
    sn.steps.length !== 1 ||
    sn.steps[0].table !== 'result_country_subnational' ||
    JSON.stringify(sn.steps[0].filter) !== JSON.stringify({ is_active: 1 }) ||
    JSON.stringify(sn.steps[0].join) !==
      JSON.stringify([
        { from: 'result_country_id', to: 'result_country_id' },
      ]) ||
    sn.value_column !== 'clarisa_subnational_scope_code'
  )
    throw new Error('subnational binding is wrong');
  // EOI outcomes: result -> core element (role 1) -> result_ip_eoi_outcomes.toc_result_id
  const eoi = pathOf(get(fields, 'ipsr_step_1.eoi_outcomes'));
  if (
    eoi.kind !== 'path' ||
    eoi.steps.length !== 2 ||
    eoi.steps[0].table !== 'result_by_innovation_package' ||
    eoi.steps[0].filter?.ipsr_role_id !== 1 ||
    eoi.steps[1].table !== 'result_ip_eoi_outcomes' ||
    eoi.value_column !== 'toc_result_id'
  )
    throw new Error('eoi_outcomes binding is wrong');
  // scaling partners: role 5 institutions
  const partners = get(fields, 'ipsr_step_1.scaling_partners').storage as any;
  if (
    partners.table !== 'results_by_institution' ||
    partners.filter?.institution_roles_id !== 5 ||
    partners.filter?.is_active !== 1
  )
    throw new Error('scaling_partners binding is wrong');
  // participants link: evidence type 5
  const link = get(fields, 'ipsr_step_1.workshop_participants_link')
    .storage as any;
  if (link.table !== 'evidence' || link.filter?.evidence_type_id !== 5)
    throw new Error('workshop_participants_link binding is wrong');
  // organizations: the writer and the reader use role 5 (VS1 has no role filter but needs it NOT NULL)
  const orgs = get(fields, 'ipsr_step_1.targeted_use.organizations')
    .storage as any;
  if (orgs.filter?.institution_roles_id !== 5)
    throw new Error('organizations role filter');
  // the three targeted-use lists carry the VS1 any-of rule in prose only: optional, confirmed, no gate in IPSR
  for (const k of ['actors', 'organizations', 'measures']) {
    const f = get(fields, `ipsr_step_1.targeted_use.${k}`);
    if (
      f.required ||
      !f.required_confirmed ||
      f.required_when ||
      f.visible_when
    )
      throw new Error(`targeted_use.${k}: list rule`);
  }
}

describe('QAC-T-28 IPSR step 1 complete', () => {
  it('the real catalog satisfies the IPSR step-1 rules', () => {
    expect(() => assertIpsrStep1(CATALOG_FIELDS)).not.toThrow();
  });

  it('keeps the shape valid with the new closed list, conditions and path bindings', () => {
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pendingCatalog: PENDING_CATALOG,
    } as any);
    expect(errors).toEqual([]);
  });

  it('ipsr_geographic_scopes is the closed list the IPSR form offers plus the stored country 4 (never 50)', () => {
    expect(CLOSED_CONTROL_LISTS.ipsr_geographic_scopes).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(CLOSED_CONTROL_LISTS.geographic_scopes).toContain(50);
  });

  it('keeps every key frozen in the inventory and adds the planned ones verbatim', () => {
    const keys = CATALOG_FIELDS.map((f) => f.key);
    for (const k of [
      'ipsr_step_1.geo_scope',
      'ipsr_step_1.regions',
      'ipsr_step_1.countries',
      'ipsr_step_1.eoi_outcomes',
      'ipsr_step_1.targeted_use.actors',
      'ipsr_step_1.targeted_use.organizations',
      'ipsr_step_1.targeted_use.measures',
      'ipsr_step_1.scaling_partners',
      'ipsr_step_1.scaling_ambition_blurb',
      WORKSHOP,
      'ipsr_step_1.workshop_facilitators',
      'ipsr_step_1.workshop_participants_link',
      'ipsr_step_1.participants_consent',
    ]) {
      expect(keys).toContain(k);
    }
  });

  it('the inventory sections ipsr_s1_ambition and ipsr_s1_partners exist and follow the form order', () => {
    const order = (k: string) =>
      CATALOG_SECTIONS.find((s) => s.key === k)?.order as number;
    expect(order('ipsr_s1_geoscope')).toBeLessThan(order('ipsr_s1_ambition'));
    expect(order('ipsr_s1_ambition')).toBeLessThan(
      order('ipsr_s1_targeted_use'),
    );
    expect(order('ipsr_s1_targeted_use')).toBeLessThan(
      order('ipsr_s1_partners'),
    );
    expect(order('ipsr_s1_partners')).toBeLessThan(order('ipsr_s1_experts'));
    expect(order('ipsr_s1_experts')).toBeLessThan(order('ipsr_s21_bundle'));
    const orders = CATALOG_SECTIONS.filter((s) =>
      s.key.startsWith('ipsr_'),
    ).map((s) => s.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('the columns now bound left PENDING_CATALOG (only the contributing_toc flag of the step-1 tables stays)', () => {
    const pending = (t: string) =>
      PENDING_CATALOG.filter((e) => e.table === t).map((e) => e.column);
    expect(pending('result_country_subnational')).toEqual([]);
    expect(pending('result_ip_eoi_outcomes')).toEqual(['contributing_toc']);
    expect(pending('result_ip_expert_workshop_organized')).toEqual([]);
    expect(pending('result_innovation_package')).not.toContain(
      'scaling_ambition_blurb',
    );
    expect(pending('result_innovation_package')).not.toContain(
      'participants_consent',
    );
    expect(pending('results_by_institution')).not.toContain('institutions_id');
    expect(pending('evidence')).not.toContain('link');
  });

  it('scaling partners share the external partners subfields (identity, type lookup, role path)', () => {
    const partners = get(CATALOG_FIELDS, 'ipsr_step_1.scaling_partners');
    expect(partners.subfields?.map((s) => s.key)).toEqual([
      'institution',
      'partner_type',
      'partner_role',
    ]);
    const role = sub(partners, 'partner_role').storage as PathBinding;
    expect(role.steps[0].table).toBe(
      'result_by_institutions_by_deliveries_type',
    );
    expect(role.value_column).toBe('partner_delivery_type_id');
  });

  describe('falsifiers (assertion function on a mutated copy of the real catalog)', () => {
    const mutate = (
      key: string,
      edit: (f: CatalogField) => Partial<CatalogField>,
    ): CatalogField[] =>
      CATALOG_FIELDS.map((f) => (f.key === key ? { ...f, ...edit(f) } : f));
    const mutateSub = (
      parent: string,
      subKey: string,
      edit: (s: CatalogSubField) => Partial<CatalogSubField>,
    ): CatalogField[] =>
      mutate(parent, (f) => ({
        subfields: f.subfields?.map((s) =>
          s.key === subKey ? { ...s, ...edit(s) } : s,
        ),
      }));

    it('dropping the scope requirement is detected', () => {
      expect(() =>
        assertIpsrStep1(mutate(SCOPE, () => ({ required: false }))),
      ).toThrow(/required/);
    });

    it('regions visible for the wrong scope is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.regions', () => ({ visible_when: eq(SCOPE, 3) })),
        ),
      ).toThrow(/visible_when/);
    });

    it('countries that forget the stored country 4 are detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.countries', () => ({
            visible_when: inn(SCOPE, [3, 5]),
          })),
        ),
      ).toThrow(/visible_when/);
    });

    it('a geo_scope_role_id filter on the IPSR countries is detected (the writer leaves it NULL)', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.countries', (f) => ({
            storage: {
              ...(f.storage as any),
              filter: { geo_scope_role_id: 1, is_active: 1 },
            },
          })),
        ),
      ).toThrow(/filter must be only is_active/);
    });

    it('sub-national areas not gated by scope 5 are detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutateSub('ipsr_step_1.countries', 'subnational', () => ({
            required_when: eq(SCOPE, 3),
          })),
        ),
      ).toThrow(/required_when/);
    });

    it('an eoi_outcomes that reads the wrong element role is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.eoi_outcomes', (f) => {
            const b = pathOf(f);
            return {
              storage: {
                ...b,
                steps: [
                  { ...b.steps[0], filter: { ipsr_role_id: 2, is_active: 1 } },
                  b.steps[1],
                ],
              },
            };
          }),
        ),
      ).toThrow(/eoi_outcomes binding/);
    });

    it('claiming the partners requirement is confirmed by the function is detected (VS1 passes with 0 partners)', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.scaling_partners', () => ({
            required_confirmed: true,
          })),
        ),
      ).toThrow(/required_confirmed/);
    });

    it('a workshop-gated field that loses its gate is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.workshop_facilitators', () => ({
            visible_when: undefined,
          })),
        ),
      ).toThrow(/visible_when/);
    });

    it('a facilitator row without a required role is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutateSub(
            'ipsr_step_1.workshop_facilitators',
            'workshop_role',
            () => ({
              required: false,
            }),
          ),
        ),
      ).toThrow(/required/);
    });

    it('the age-fallback flags that the IPSR render hides are detected when added', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.targeted_use.actors', (f) => ({
            subfields: [
              ...(f.subfields as CatalogSubField[]),
              {
                key: 'age_disaggregation_not_available',
                label: 'x',
                type: 'boolean',
                storage: {
                  kind: 'column',
                  table: 'result_actors',
                  column: 'age_disaggregation_not_available',
                },
              },
            ],
          })),
        ),
      ).toThrow(/not rendered for isIpsr/);
    });

    it('an actor counter that is no longer gated by the disaggregation tick is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutateSub('ipsr_step_1.targeted_use.actors', 'women', () => ({
            required_when: undefined,
            visible_when: undefined,
          })),
        ),
      ).toThrow(/required_when/);
    });

    it('a role filter dropped from the organizations is detected', () => {
      expect(() =>
        assertIpsrStep1(
          mutate('ipsr_step_1.targeted_use.organizations', (f) => ({
            storage: { ...(f.storage as any), filter: { is_active: 1 } },
          })),
        ),
      ).toThrow(/role filter/);
    });
  });
});
