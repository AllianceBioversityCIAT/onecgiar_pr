// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { validateCatalogShape } from './definitions/shape-validator';
import { CatalogField, CatalogSubField, Condition } from './definitions/types';

/**
 * QAC-T-19 (QAC-R-5 amended, option B): `required` follows what the 2026 form marks required, together with the rules the live
 * validation functions state (form UNION function). Expected values below were read from the client form and from
 * tmp/validation_*_P25, not from the catalog under test.
 */
type Rule = {
  required?: boolean;
  required_when?: Condition;
  visible_when?: Condition;
  confirmed?: boolean; // top-level fields only
};
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

const NON_KP = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'capacity_sharing',
  'innovation_development',
  'other_output',
  'impact_contribution',
  'innovation_package',
];
const LEVEL_ASKED = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'capacity_sharing',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'innovation_package',
];
const LINK_REQUIRED = [
  'policy_change',
  'other_outcome',
  'capacity_sharing',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'impact_contribution',
];
const sourceUpload = eq('source', 1);
const countriesVisible = (scope: string, spec: string): Condition => ({
  any: [inn(scope, [3, 4, 5]), { all: [inn(scope, [1, 2]), eq(spec, true)] }],
});

/** key, or `key>subfield[>subfield]` -> expected state. */
const EXPECTED: Record<string, Rule> = {
  // general information
  'general.primary_program': { required: true, confirmed: false },
  'general.discontinued_reasons>description': {
    required: false,
    required_when: eq('reason', 6),
  },
  'general.discontinued_reasons>reason': { required: true },
  // capacity sharing display rules (cap-dev-info.component.html:56, :91-101)
  'capacity_sharing.length_of_training>degree': {
    required: false,
    visible_when: inn('capacity_sharing.length_of_training', [1, 2, 4]),
  },
  'capacity_sharing.organizations': {
    required: false,
    confirmed: true,
    visible_when: eq('capacity_sharing.is_attending_for_organization', true),
    required_when: eq('capacity_sharing.is_attending_for_organization', true),
  },
  // contributors and partners
  'contributors.submitter': { required: true, confirmed: false },
  'contributors.lead_center': { required: true, confirmed: false },
  'contributors.centers': { required: true, confirmed: false },
  'linked.has_innovation_link': {
    required: false,
    confirmed: false,
    required_when: inn('$result_type', LINK_REQUIRED),
  },
  'partners.is_lead_by_partner': {
    required: false,
    confirmed: true,
    required_when: {
      any: [
        eq('partners.not_applicable', false),
        eq('$result_type', 'knowledge_product'),
      ],
    },
  },
  'partners.external_partners>partner_role': { required: true },
  'toc.entries>level': {
    required_when: inn('$result_type', LEVEL_ASKED),
  },
  'contributors.science_programs>toc_entries>level': {
    required_when: inn('$result_type', LEVEL_ASKED),
  },
  // geographic location
  'geo.countries': {
    required: false,
    confirmed: false,
    required_when: countriesVisible('geo.scope', 'geo.countries_specified'),
  },
  // evidence
  'evidence.items>source': {
    required: false,
    required_when: inn('$result_type', NON_KP),
  },
  'evidence.items>is_public_file': {
    required: false,
    required_when: sourceUpload,
  },
  'evidence.items>file_name': { required: false, required_when: sourceUpload },
  // innovation use
  'innovation_use.use_level.innovation_use_level': {
    required: true,
    confirmed: false,
  },
  'innovation_use.use_level.readiness_level_explanation': {
    required: false,
    required_when: inn(
      'innovation_use.use_level.innovation_use_level',
      [5, 6, 7, 8, 9],
    ),
  },
};
for (const block of ['current_use', 'projection_2030']) {
  const p = `innovation_use.${block}`;
  EXPECTED[`${p}.yet_to_be_determined`] = { required: true, confirmed: false };
  const noDisagg = eq('sex_and_age_disaggregation', false);
  EXPECTED[`${p}.actors>actor_type`] = { required: true };
  EXPECTED[`${p}.actors>other_actor_type`] = {
    required_when: eq('actor_type', 5),
  };
  for (const k of ['women', 'women_youth', 'men', 'men_youth'])
    EXPECTED[`${p}.actors>${k}`] = { required_when: noDisagg };
  EXPECTED[`${p}.actors>how_many`] = {
    required_when: eq('sex_and_age_disaggregation', true),
  };
  EXPECTED[`${p}.organizations>institution_type`] = { required: true };
  EXPECTED[`${p}.organizations>other_institution`] = {
    required_when: eq('institution_type', 78),
  };
  EXPECTED[`${p}.organizations>how_many`] = { required: true };
  EXPECTED[`${p}.measures>unit_of_measure`] = { required: true };
  EXPECTED[`${p}.measures>quantity`] = { required: true };
}

type Node = CatalogField | CatalogSubField;
const resolve = (fields: CatalogField[], path: string): Node | undefined => {
  // a top-level key contains dots, never '>'
  const [top, ...rest] = path.split('>');
  let node: Node | undefined = fields.find((f) => f.key === top);
  for (const k of rest) node = node?.subfields?.find((s) => s.key === k);
  return node;
};

/** Every mismatch between `fields` and the expectation table (empty = the catalog follows the form). */
const mismatches = (fields: CatalogField[]): string[] => {
  const out: string[] = [];
  for (const [path, want] of Object.entries(EXPECTED)) {
    const node = resolve(fields, path);
    if (!node) {
      out.push(`${path}: missing`);
      continue;
    }
    if (
      want.required !== undefined &&
      (node.required ?? false) !== want.required
    )
      out.push(`${path}: required`);
    if (
      'required_when' in want &&
      JSON.stringify(node.required_when) !== JSON.stringify(want.required_when)
    )
      out.push(`${path}: required_when`);
    if (
      'visible_when' in want &&
      JSON.stringify(node.visible_when) !== JSON.stringify(want.visible_when)
    )
      out.push(`${path}: visible_when`);
    if (
      want.confirmed !== undefined &&
      (node as CatalogField).required_confirmed !== want.confirmed
    )
      out.push(`${path}: required_confirmed`);
  }
  return out;
};

const without = (
  fields: CatalogField[],
  path: string,
  drop: 'required_when' | 'visible_when' | 'required',
): CatalogField[] => {
  const [top, ...rest] = path.split('>');
  const strip = (n: any, keys: string[]): any => {
    if (keys.length === 0) {
      const copy = { ...n };
      if (drop === 'required') copy.required = !n.required;
      else delete copy[drop];
      return copy;
    }
    return {
      ...n,
      subfields: n.subfields.map((s: any) =>
        s.key === keys[0] ? strip(s, keys.slice(1)) : s,
      ),
    };
  };
  return fields.map((f) => (f.key === top ? strip(f, rest) : f));
};

describe('QAC-T-19 required follows the form (option B)', () => {
  it('every expectation holds on the catalog', () => {
    expect(mismatches(CATALOG_FIELDS)).toEqual([]);
  });

  it('the catalog still passes the shape validator (conditions reference real keys, closed ids exist)', () => {
    expect(
      validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields: CATALOG_FIELDS,
        notForQa: NOT_FOR_QA,
      }),
    ).toEqual([]);
  });

  it('a degree id outside the closed capdev_terms list is rejected', () => {
    const fields = CATALOG_FIELDS.map((f) =>
      f.key === 'capacity_sharing.length_of_training'
        ? {
            ...f,
            subfields: f.subfields?.map((s) =>
              s.key === 'degree'
                ? {
                    ...s,
                    visible_when: inn(
                      'capacity_sharing.length_of_training',
                      [1, 2, 5],
                    ),
                  }
                : s,
            ),
          }
        : f,
    );
    expect(
      validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields,
        notForQa: NOT_FOR_QA,
      }).map((e) => e.rule),
    ).toContain('CONDITION_VALUE_NOT_IN_LIST');
  });

  describe('falsifiers: removing a rule turns the check red', () => {
    const conditional = Object.entries(EXPECTED).filter(
      ([, w]) => w.required_when !== undefined,
    );
    it.each(conditional.map(([path]) => [path]))(
      'dropping required_when of %s is detected',
      (path) => {
        expect(
          mismatches(without(CATALOG_FIELDS, path, 'required_when')),
        ).toContain(`${path}: required_when`);
      },
    );

    it('dropping the capacity-sharing display rules is detected', () => {
      expect(
        mismatches(
          without(
            CATALOG_FIELDS,
            'capacity_sharing.length_of_training>degree',
            'visible_when',
          ),
        ),
      ).toContain('capacity_sharing.length_of_training>degree: visible_when');
      expect(
        mismatches(
          without(
            CATALOG_FIELDS,
            'capacity_sharing.organizations',
            'visible_when',
          ),
        ),
      ).toContain('capacity_sharing.organizations: visible_when');
    });

    it.each(
      Object.entries(EXPECTED)
        .filter(([, w]) => w.required === true)
        .map(([p]) => [p]),
    )('flipping required of %s is detected', (path) => {
      expect(mismatches(without(CATALOG_FIELDS, path, 'required'))).toContain(
        `${path}: required`,
      );
    });
  });
});
