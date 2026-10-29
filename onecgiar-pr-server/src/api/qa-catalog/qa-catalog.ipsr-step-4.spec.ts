// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
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
 * QAC-T-31: IPSR step 4 (anticipated investment tables + reference materials). Expected values come from the 2026 form
 * (step-n4 components), the writer (ipsr-pathway-step-four.service.ts) and the live function validation_ipsr_step_four_P25
 * (VS4, tmp/), not from the catalog under test. `assertIpsrStep4` is the assertion function; the falsifiers run it on a
 * MUTATED copy of the real catalog.
 */
const NOT_DETERMINED: Condition = {
  field: 'is_determined',
  operator: 'eq',
  value: false,
};

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

interface Table {
  key: string;
  parent: string;
  valueColumn: string;
  budget: string;
  parentFk: string;
  identity: string;
  identityList: string;
}
const TABLES: Table[] = [
  {
    key: 'ipsr_step_4.initiative_investment',
    parent: 'results_by_inititiative',
    valueColumn: 'inititiative_id',
    budget: 'result_initiative_budget',
    parentFk: 'result_initiative_id',
    identity: 'program',
    identityList: 'initiatives',
  },
  {
    key: 'ipsr_step_4.bilateral_investment',
    parent: 'results_by_projects',
    valueColumn: 'project_id',
    budget: 'non_pooled_projetct_budget',
    parentFk: 'result_project_id',
    identity: 'project',
    identityList: 'projects',
  },
  {
    key: 'ipsr_step_4.partner_investment',
    parent: 'results_by_institution',
    valueColumn: 'institutions_id',
    budget: 'result_institutions_budget',
    parentFk: 'result_institution_id',
    identity: 'institution',
    identityList: 'institutions',
  },
];

const json = (v: unknown) => JSON.stringify(v);

function assertBudget(f: CatalogField, key: string, column: string, t: Table) {
  const p = sub(f, key).storage as PathBinding;
  if (
    p.kind !== 'path' ||
    p.steps.length !== 1 ||
    p.steps[0].table !== t.budget ||
    json(p.steps[0].join) !== json([{ from: 'id', to: t.parentFk }]) ||
    json(p.steps[0].filter) !== json({ is_active: 1 }) ||
    p.value_column !== column
  )
    throw new Error(`${f.key}/${key}: budget path binding is wrong`);
}

export function assertIpsrStep4(fields: CatalogField[]): void {
  for (const t of TABLES) {
    const f = get(fields, t.key);
    if (f.type !== 'list') throw new Error(`${t.key}: must be a list`);
    if (json(f.result_types) !== json(['innovation_package']))
      throw new Error(`${t.key}: innovation_package only`);
    if (f.section !== 'ipsr_s4_investment')
      throw new Error(`${t.key}: section`);
    if (f.required || !f.required_confirmed)
      throw new Error(
        `${t.key}: rows are system-provided; VS4 states the row rule`,
      );
    if (
      f.storage.kind !== 'relation' ||
      f.storage.table !== t.parent ||
      f.storage.value_column !== t.valueColumn ||
      json(f.storage.filter) !== json({ is_active: 1 })
    )
      throw new Error(`${t.key}: parent-row relation is wrong`);
    const id = sub(f, t.identity);
    if (
      id.control_list !== t.identityList ||
      !id.required ||
      id.storage.kind !== 'column' ||
      id.storage.table !== t.parent
    )
      throw new Error(`${t.key}/${t.identity}: identity subfield is wrong`);
    const kc = sub(f, 'kind_cash');
    if (kc.required || json(kc.required_when) !== json(NOT_DETERMINED))
      throw new Error(
        `${t.key}/kind_cash: required_when is_determined = false (VS4)`,
      );
    if (kc.visible_when)
      throw new Error(
        `${t.key}/kind_cash: the form only disables the input, no visible_when`,
      );
    assertBudget(f, 'kind_cash', 'kind_cash', t);
    const det = sub(f, 'is_determined');
    if (det.required || det.required_when || det.visible_when)
      throw new Error(`${t.key}/is_determined: optional, always shown`);
    assertBudget(f, 'is_determined', 'is_determined', t);
  }
  const pt = sub(get(fields, 'ipsr_step_4.partner_investment'), 'partner_type');
  if (pt.required || pt.storage.kind !== 'lookup')
    throw new Error('partner_type: read-only lookup');

  const m = get(fields, 'ipsr_step_4.reference_materials');
  const link = sub(m, 'link');
  if (!link.required)
    throw new Error('reference_materials/link: required per row (S4R:10)');
  if (m.required || m.required_confirmed)
    throw new Error(
      'reference_materials: list optional, unconfirmed (no live rule)',
    );
}

describe('QAC-T-31 IPSR step 4', () => {
  it('the real catalog satisfies the IPSR step-4 rules', () => {
    expect(() => assertIpsrStep4(CATALOG_FIELDS)).not.toThrow();
  });

  it('keeps the shape valid', () => {
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pendingCatalog: PENDING_CATALOG,
    } as any);
    expect(errors).toEqual([]);
  });

  it('uses the planned keys verbatim (inventory 2026-B 3.8) and the investment section precedes the materials', () => {
    const keys = CATALOG_FIELDS.map((f) => f.key);
    for (const k of [
      'ipsr_step_4.initiative_investment',
      'ipsr_step_4.bilateral_investment',
      'ipsr_step_4.partner_investment',
      'ipsr_step_4.reference_materials',
    ])
      expect(keys).toContain(k);
    const order = (k: string) =>
      CATALOG_SECTIONS.find((s) => s.key === k)?.order as number;
    expect(order('ipsr_s4_investment')).toBeLessThan(
      order('ipsr_s4_materials'),
    );
  });

  it('the retired scaling studies stay out of the catalog (REVIEW D20) and legacy for an older load', () => {
    const bound = JSON.stringify(CATALOG_FIELDS);
    expect(bound).not.toContain('has_scaling_studies');
    expect(bound).not.toContain('result_scaling_study_urls');
    expect(
      PENDING_CATALOG.some(
        (e) =>
          e.table === 'result_innovation_package' &&
          e.column === 'has_scaling_studies',
      ),
    ).toBe(true);
  });

  it('the IPSR keys do not leak onto the innovation development / use result types', () => {
    for (const f of CATALOG_FIELDS.filter((x) =>
      x.key.startsWith('ipsr_step_4.'),
    ))
      expect(f.result_types).toEqual(['innovation_package']);
    expect(
      get(CATALOG_FIELDS, 'innovation_use.investment.programs').result_types,
    ).toEqual(['innovation_use']);
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

    it.each(TABLES.map((t) => t.key))(
      'dropping the VS4 row rule of %s (kind_cash no longer required when TBD is not marked) is detected',
      (key) => {
        expect(() =>
          assertIpsrStep4(
            mutateSub(key, 'kind_cash', () => ({ required_when: undefined })),
          ),
        ).toThrow(/required_when/);
      },
    );

    it('reading the TBD flag as true instead of not-marked is detected', () => {
      expect(() =>
        assertIpsrStep4(
          mutateSub('ipsr_step_4.partner_investment', 'kind_cash', () => ({
            required_when: {
              field: 'is_determined',
              operator: 'eq',
              value: true,
            },
          })),
        ),
      ).toThrow(/required_when/);
    });

    it('hiding the disabled amount input (visible_when) is detected', () => {
      expect(() =>
        assertIpsrStep4(
          mutateSub('ipsr_step_4.bilateral_investment', 'kind_cash', () => ({
            visible_when: NOT_DETERMINED,
          })),
        ),
      ).toThrow(/visible_when/);
    });

    it('binding the budget through the wrong parent fk is detected', () => {
      expect(() =>
        assertIpsrStep4(
          mutateSub(
            'ipsr_step_4.initiative_investment',
            'is_determined',
            (s) => ({
              storage: {
                ...(s.storage as PathBinding),
                steps: [
                  {
                    ...(s.storage as PathBinding).steps[0],
                    join: [{ from: 'id', to: 'result_project_id' }],
                  },
                ],
              },
            }),
          ),
        ),
      ).toThrow(/budget path binding/);
    });

    it('leaving the reference link optional is detected', () => {
      expect(() =>
        assertIpsrStep4(
          mutateSub('ipsr_step_4.reference_materials', 'link', () => ({
            required: false,
          })),
        ),
      ).toThrow(/link/);
    });

    it('a missing investment list is detected', () => {
      expect(() =>
        assertIpsrStep4(
          CATALOG_FIELDS.filter(
            (f) => f.key !== 'ipsr_step_4.partner_investment',
          ),
        ),
      ).toThrow(/missing field/);
    });
  });
});
