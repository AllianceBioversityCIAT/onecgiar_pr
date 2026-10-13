// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { validateCatalogShape } from './definitions/shape-validator';
import { CatalogField, CatalogSection, Condition } from './definitions/types';

/**
 * QAC-T-27: the common sections fitted to the IPSR (`innovation_package`) 2026 form. Expected values come from the IPSR client
 * templates (ipsr-detail-top-menu.component.ts:15, ipsr-contributors.component.html/.ts, ipsr-general-information.component.html,
 * ipsr-annual-updating.component.html) and the IPSR validation module service, not from the catalog under test.
 * `assertIpsrFit` is the assertion function; the falsifier runs it on a MUTATED copy of the real catalog.
 */
const IPSR = 'innovation_package';

const get = (fields: CatalogField[], key: string): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`missing field ${key}`);
  return f;
};

const applies = (types: string[]): boolean =>
  types.includes('*') || types.includes(IPSR);

/** Every `$result_type` list a condition names (any depth). */
const typeLists = (c: Condition | undefined): string[][] => {
  if (!c) return [];
  const node = c as any;
  if (node.all) return node.all.flatMap(typeLists);
  if (node.any) return node.any.flatMap(typeLists);
  return node.field === '$result_type' && node.operator === 'in'
    ? [node.value]
    : [];
};

const NOT_ON_IPSR_FORM = [
  'evidence.items',
  'contributors.submitter',
  'general.primary_program',
  'linked.has_innovation_link',
  'linked.results',
  'contributors.centers',
  'contributors.other_centers',
];
const ANNUAL_UPDATING_ON_IPSR = [
  'general.is_replicated',
  'general.is_discontinued',
  'general.discontinued_reasons',
];

function assertIpsrFit(
  fields: CatalogField[],
  sections: CatalogSection[],
): void {
  for (const key of NOT_ON_IPSR_FORM) {
    if (applies(get(fields, key).result_types)) {
      throw new Error(`${key} must not apply to ${IPSR}`);
    }
  }
  for (const key of ANNUAL_UPDATING_ON_IPSR) {
    if (!applies(get(fields, key).result_types)) {
      throw new Error(`${key} must apply to ${IPSR}`);
    }
  }
  // a field that does not apply to IPSR must not name IPSR in its own type conditions
  for (const f of fields) {
    if (applies(f.result_types)) continue;
    for (const list of [
      ...typeLists(f.required_when),
      ...typeLists(f.visible_when),
      ...(f.subfields ?? []).flatMap((s) => [
        ...typeLists(s.required_when),
        ...typeLists(s.visible_when),
      ]),
    ]) {
      if (list.includes(IPSR)) {
        throw new Error(`${f.key} names ${IPSR} in a type condition`);
      }
    }
  }
  // a section applies to a type iff one of its fields does (the evidence section no longer lists the package)
  for (const s of sections) {
    const own = fields.filter((f) => f.section === s.key);
    const any = own.some((f) => applies(f.result_types));
    if (applies(s.result_types) !== any && s.result_types[0] !== '*') {
      throw new Error(`section ${s.key} result_types disagree with its fields`);
    }
    if (s.key === 'evidence' && applies(s.result_types)) {
      throw new Error('evidence section must not apply to the package');
    }
  }
  const ipsrCenters = get(fields, 'contributors.ipsr_centers');
  const binding: any = ipsrCenters.storage;
  if (
    ipsrCenters.result_types.join() !== IPSR ||
    binding.table !== 'results_center' ||
    binding.value_column !== 'center_id' ||
    (binding.filter && 'from_toc' in binding.filter)
  ) {
    throw new Error('contributors.ipsr_centers binding is wrong');
  }
}

describe('QAC-T-27 common sections fitted to the IPSR form', () => {
  it('the real catalog satisfies the IPSR fit', () => {
    expect(() => assertIpsrFit(CATALOG_FIELDS, CATALOG_SECTIONS)).not.toThrow();
  });

  it('keeps the shape valid (keys are never removed: narrowing result_types only)', () => {
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pendingCatalog: PENDING_CATALOG,
    } as any);
    expect(errors).toEqual([]);
    for (const key of NOT_ON_IPSR_FORM) {
      expect(CATALOG_FIELDS.some((f) => f.key === key)).toBe(true);
    }
  });

  it('evidence: no Evidence tab in IPSR 2026, so neither the section nor the items nor the required_when list name the package', () => {
    const items = get(CATALOG_FIELDS, 'evidence.items');
    expect(items.result_types).not.toContain(IPSR);
    expect(items.result_types).not.toContain('*');
    expect(typeLists(items.required_when)[0]).not.toContain(IPSR);
    expect(
      CATALOG_SECTIONS.find((s) => s.key === 'evidence')?.result_types,
    ).not.toContain(IPSR);
  });

  it('submitter, primary program and the link block do not apply to the package; the other types keep them', () => {
    for (const key of [
      'contributors.submitter',
      'general.primary_program',
      'linked.has_innovation_link',
      'linked.results',
    ]) {
      const types = get(CATALOG_FIELDS, key).result_types;
      expect(types).not.toContain(IPSR);
      expect(types).toContain('policy_change');
      expect(types).toContain('knowledge_product');
    }
  });

  describe('centers (owner decision)', () => {
    it('contributors.centers and other_centers do not apply to the package', () => {
      expect(
        get(CATALOG_FIELDS, 'contributors.centers').result_types,
      ).not.toContain(IPSR);
      expect(
        get(CATALOG_FIELDS, 'contributors.other_centers').result_types,
      ).not.toContain(IPSR);
    });

    it('contributors.ipsr_centers: package only, a required list of centers over ALL active results_center rows', () => {
      const f = get(CATALOG_FIELDS, 'contributors.ipsr_centers');
      expect(f.section).toBe('contributors_partners');
      expect(f.result_types).toEqual([IPSR]);
      expect(f.type).toBe('list');
      expect(f.label).toBe('Contributing CGIAR Centers');
      expect(f.description).toBe(
        'CG Center that you collaborated with or are currently collaborating with to generate this result.',
      );
      // form-only: pr-multi-select defaults to required; the V-CP center check is commented out
      expect(f.required).toBe(true);
      expect(f.required_confirmed).toBe(false);
      expect(f.storage).toEqual({
        kind: 'relation',
        table: 'results_center',
        fk_to_result: 'result_id',
        value_column: 'center_id',
        filter: { is_active: 1 }, // no from_toc: IPSR sends the centers without it
      });
      const center = f.subfields?.find((s) => s.key === 'center');
      expect(center?.type).toBe('single_select');
      expect(center?.control_list).toBe('centers');
      expect(center?.required).toBe(true);
    });

    it('the lead center and the other C&P fields still apply to the package', () => {
      for (const key of [
        'contributors.lead_center',
        'toc.planned_result',
        'toc.entries',
        'toc.program_invested_financial_resources',
        'toc.narrative',
        'contributors.science_programs',
        'contributors.bilateral_projects',
        'partners.not_applicable',
        'partners.external_partners',
        'partners.is_lead_by_partner',
        'partners.lead_partner',
      ]) {
        expect(applies(get(CATALOG_FIELDS, key).result_types)).toBe(true);
      }
    });
  });

  describe('partners.is_lead_by_partner (IPSR markup equals W1/W2: one rule for every type)', () => {
    // ipsr-contributors.component.html:288-294 (`[required]="true"`, read-only when not applicable and not a KP, :293) is the W1/W2 control
    // (CP.html:563-570), so the `*` field has the single W1/W2 rule and no branch of its own for the package.
    const W1W2_RULE = {
      any: [
        { field: 'partners.not_applicable', operator: 'eq', value: false },
        { field: '$result_type', operator: 'eq', value: 'knowledge_product' },
      ],
    };
    const assertLeadRule = (fields: CatalogField[]): void => {
      const f = get(fields, 'partners.is_lead_by_partner');
      if (!f.result_types.includes('*'))
        throw new Error('must stay a "*" field');
      if (JSON.stringify(f.required_when) !== JSON.stringify(W1W2_RULE)) {
        throw new Error('required_when must equal the W1/W2 rule');
      }
      if (JSON.stringify(f.required_when).includes(IPSR)) {
        throw new Error('no innovation_package branch');
      }
    };
    it('the real catalog carries the W1/W2 rule and no innovation_package branch', () => {
      expect(() => assertLeadRule(CATALOG_FIELDS)).not.toThrow();
    });
    it('falsifier: a copy that adds the innovation_package branch makes the assertion throw', () => {
      const bad = CATALOG_FIELDS.map((f) =>
        f.key === 'partners.is_lead_by_partner'
          ? {
              ...f,
              required_when: {
                any: [
                  ...(f.required_when as any).any,
                  { field: '$result_type', operator: 'eq', value: IPSR },
                ],
              },
            }
          : f,
      );
      expect(() => assertLeadRule(bad)).toThrow(/W1\/W2|innovation_package/);
    });
  });

  describe('discontinued reasons (IPSR "Other" option and active rows)', () => {
    const reasons = (fields: CatalogField[]) =>
      get(fields, 'general.discontinued_reasons');
    const descVisible = (fields: CatalogField[]): any[] =>
      (
        (reasons(fields).subfields ?? []).find((s) => s.key === 'description')
          ?.visible_when as any
      )?.any ?? [];
    const assertReasons = (fields: CatalogField[]): void => {
      const f = reasons(fields);
      if (JSON.stringify((f.storage as any).filter) !== '{"is_active":1}') {
        throw new Error('binding must filter is_active = 1');
      }
      if (
        !descVisible(fields).some((c) => c.field === 'reason' && c.value === 12)
      ) {
        throw new Error('description must be visible for reason 12');
      }
    };
    it('binds only active rows and shows the description box for reason 12 as well as 6 and requires_description', () => {
      expect(() => assertReasons(CATALOG_FIELDS)).not.toThrow();
      expect(descVisible(CATALOG_FIELDS)).toEqual([
        { field: 'requires_description', operator: 'eq', value: true },
        { field: 'reason', operator: 'eq', value: 6 },
        { field: 'reason', operator: 'eq', value: 12 },
      ]);
      // the IPSR input is [required]="false" (ipsr-annual-updating.component.html:35): the requirement is still reason 6 only
      const desc: any = (reasons(CATALOG_FIELDS).subfields ?? []).find(
        (s) => s.key === 'description',
      );
      expect(desc.required_when).toEqual({
        field: 'reason',
        operator: 'eq',
        value: 6,
      });
    });
    it('falsifier: dropping the filter or the reason 12 branch is detected', () => {
      const noFilter = CATALOG_FIELDS.map((f) =>
        f.key === 'general.discontinued_reasons'
          ? { ...f, storage: { ...(f.storage as any), filter: undefined } }
          : f,
      );
      expect(() => assertReasons(noFilter)).toThrow(/is_active/);
      const no12 = CATALOG_FIELDS.map((f) =>
        f.key === 'general.discontinued_reasons'
          ? {
              ...f,
              subfields: (f.subfields ?? []).map((s) =>
                s.key === 'description'
                  ? {
                      ...s,
                      visible_when: {
                        any: descVisible(CATALOG_FIELDS).slice(0, 2),
                      },
                    }
                  : s,
              ),
            }
          : f,
      );
      expect(() => assertReasons(no12 as CatalogField[])).toThrow(/reason 12/);
    });
  });

  it('contributors.ipsr_centers has the identity subfield only (from_cgspace is KP-only)', () => {
    expect(
      get(CATALOG_FIELDS, 'contributors.ipsr_centers').subfields?.map(
        (s) => s.key,
      ),
    ).toEqual(['center']);
  });

  describe('annual updating', () => {
    it('is_replicated, is_discontinued and discontinued_reasons apply to the package, with the package in their type conditions', () => {
      for (const key of ANNUAL_UPDATING_ON_IPSR) {
        expect(get(CATALOG_FIELDS, key).result_types).toContain(IPSR);
      }
      for (const key of [
        'general.is_discontinued',
        'general.discontinued_reasons',
      ]) {
        const lists = typeLists(get(CATALOG_FIELDS, key).visible_when);
        expect(lists).toHaveLength(1);
        expect(lists[0]).toContain(IPSR);
      }
    });

    it('merge and split targets stay innovation development only (the IPSR block has none)', () => {
      expect(get(CATALOG_FIELDS, 'general.merge_targets').result_types).toEqual(
        ['innovation_development'],
      );
      expect(get(CATALOG_FIELDS, 'general.split_targets').result_types).toEqual(
        ['innovation_development'],
      );
    });

    it('the package rules are form-only: is_discontinued required when replicated, reasons when replicated and discontinued', () => {
      expect(
        get(CATALOG_FIELDS, 'general.is_discontinued').required_when,
      ).toEqual({
        field: 'general.is_replicated',
        operator: 'eq',
        value: true,
      });
      expect(
        get(CATALOG_FIELDS, 'general.discontinued_reasons').required_when,
      ).toEqual({
        all: [
          { field: 'general.is_discontinued', operator: 'eq', value: true },
          { field: 'general.is_replicated', operator: 'eq', value: true },
        ],
      });
    });
  });

  describe('impact-area components (IPSR GI uses the same tag eq 3 rule)', () => {
    it.each(['gender', 'climate', 'nutrition', 'environment', 'poverty'])(
      '%s components are visible and required when the tag is 3 and apply to the package',
      (area) => {
        const f = get(CATALOG_FIELDS, `general.${area}_impact_areas`);
        const cond = { field: `general.${area}_tag`, operator: 'eq', value: 3 };
        expect(applies(f.result_types)).toBe(true);
        expect(f.visible_when).toEqual(cond);
        expect(f.required_when).toEqual(cond);
      },
    );
  });

  describe('falsifiers (assertion function on a mutated copy of the real catalog)', () => {
    const mutate = (
      key: string,
      edit: (f: CatalogField) => Partial<CatalogField>,
    ): CatalogField[] =>
      CATALOG_FIELDS.map((f) => (f.key === key ? { ...f, ...edit(f) } : f));

    it.each(NOT_ON_IPSR_FORM)(
      're-adding the package to %s is detected',
      (key) => {
        const bad = mutate(key, (f) => ({
          result_types: [...f.result_types, IPSR],
        }));
        expect(() => assertIpsrFit(bad, CATALOG_SECTIONS)).toThrow(
          /must not apply/,
        );
      },
    );

    it('putting the package back in the evidence required_when list is detected', () => {
      const bad = mutate('evidence.items', (f) => ({
        required_when: {
          field: '$result_type',
          operator: 'in',
          value: [...(f.required_when as any).value, IPSR],
        },
      }));
      expect(() => assertIpsrFit(bad, CATALOG_SECTIONS)).toThrow(
        /names innovation_package/,
      );
    });

    it('a from_toc filter on contributors.ipsr_centers is detected', () => {
      const bad = mutate('contributors.ipsr_centers', (f) => ({
        storage: {
          ...(f.storage as any),
          filter: { is_active: 1, from_toc: 1 },
        },
      }));
      expect(() => assertIpsrFit(bad, CATALOG_SECTIONS)).toThrow(
        /binding is wrong/,
      );
    });

    it('dropping the package from is_discontinued is detected', () => {
      const bad = mutate('general.is_discontinued', () => {
        return { result_types: ['innovation_development', 'innovation_use'] };
      });
      expect(() => assertIpsrFit(bad, CATALOG_SECTIONS)).toThrow(/must apply/);
    });

    it('the evidence section listing the package again is detected', () => {
      const bad = CATALOG_SECTIONS.map((s) =>
        s.key === 'evidence' ? { ...s, result_types: ['*'] } : s,
      );
      expect(() => assertIpsrFit(CATALOG_FIELDS, bad)).toThrow();
    });
  });
});
