// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS } from './definitions/sections';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { CatalogField, CatalogSubField } from './definitions/types';

/**
 * QAC-T-15 (owner field list 2026-10-07): the contributors & partners section is fully parametrized.
 * Expected values come from the owner's list and the client form, not from the catalog under test.
 */
const section = CATALOG_FIELDS.filter(
  (f) => f.section === 'contributors_partners',
).sort((a, b) => a.order - b.order);
const get = (key: string): CatalogField => {
  const f = CATALOG_FIELDS.find((x) => x.key === key);
  if (!f) throw new Error(`catalog has no field ${key}`);
  return f;
};
const sub = (
  list: CatalogSubField[] | undefined,
  key: string,
): CatalogSubField => {
  const s = list?.find((x) => x.key === key);
  if (!s) throw new Error(`no subfield ${key}`);
  return s;
};
const eq = (field: string, value: string | number | boolean) => ({
  field,
  operator: 'eq',
  value,
});
const notNull = (field: string) => ({ field, operator: 'not_null' });

describe('QAC-T-15 contributors & partners: owner field list', () => {
  it('declares the owner keys in form order, orders contiguous 1..n', () => {
    expect(section.map((f) => f.key)).toEqual([
      'contributors.submitter',
      'toc.planned_result',
      'toc.entries',
      'toc.program_invested_financial_resources',
      'toc.narrative',
      'contributors.lead_center',
      'contributors.centers',
      'contributors.other_centers',
      'contributors.science_programs',
      'contributors.bilateral_projects',
      'partners.not_applicable',
      'partners.external_partners',
      'partners.is_lead_by_partner',
      'partners.lead_partner',
      'linked.has_innovation_link',
      'linked.results',
      'partners.kp_additional_partners',
      'partners.kp_author_affiliations',
    ]);
    expect(section.map((f) => f.order)).toEqual(section.map((_, i) => i + 1));
  });

  it('lead center comes BEFORE the contributing centers', () => {
    expect(get('contributors.lead_center').order).toBeLessThan(
      get('contributors.centers').order,
    );
    expect(get('contributors.centers').order).toBeLessThan(
      get('contributors.other_centers').order,
    );
  });

  describe('field level display and required rules', () => {
    const visibleWhen: [string, unknown][] = [
      ['toc.entries', eq('toc.planned_result', true)],
      [
        'toc.program_invested_financial_resources',
        eq('toc.planned_result', false),
      ],
      ['toc.narrative', eq('toc.planned_result', false)],
      ['partners.external_partners', eq('partners.not_applicable', false)],
      ['partners.lead_partner', eq('partners.is_lead_by_partner', true)],
      ['linked.results', eq('linked.has_innovation_link', true)],
      ['partners.kp_additional_partners', eq('partners.not_applicable', false)],
    ];
    it.each(visibleWhen)('%s has the client visible_when', (key, expected) => {
      expect(get(key).visible_when).toEqual(expected);
    });

    it.each([
      'contributors.submitter',
      'toc.planned_result',
      'contributors.lead_center',
      'contributors.centers',
      'contributors.other_centers',
      'contributors.science_programs',
      'contributors.bilateral_projects',
      'partners.not_applicable',
      'partners.is_lead_by_partner',
      'linked.has_innovation_link',
    ])('%s is always shown (no visible_when)', (key) => {
      expect(get(key).visible_when).toBeUndefined();
    });

    const requiredWhen: [string, unknown][] = [
      ['toc.entries', eq('toc.planned_result', true)],
      ['toc.narrative', eq('toc.planned_result', false)],
      ['partners.external_partners', eq('partners.not_applicable', false)],
      // QAC-T-19: KP also requires it (form: read-only only for non-KP when not applicable); the function states the first branch
      [
        'partners.is_lead_by_partner',
        {
          any: [
            eq('partners.not_applicable', false),
            eq('$result_type', 'knowledge_product'),
          ],
        },
      ],
      ['partners.lead_partner', eq('partners.is_lead_by_partner', true)],
      ['linked.results', eq('linked.has_innovation_link', true)],
      ['partners.kp_additional_partners', eq('partners.not_applicable', false)],
    ];
    it.each(requiredWhen)(
      '%s keeps its live required_when',
      (key, expected) => {
        const f = get(key);
        expect(f.required_when).toEqual(expected);
        expect(f.required_confirmed).toBe(true);
      },
    );

    it('client-only rules stay unconfirmed (the live function does not state them)', () => {
      const invested = get('toc.program_invested_financial_resources');
      expect(invested.required_confirmed).toBe(false);
      expect(invested.required_when).toEqual(eq('toc.planned_result', false));
      for (const key of [
        'contributors.lead_center',
        'contributors.centers',
        'contributors.other_centers',
      ]) {
        expect(get(key).required_confirmed).toBe(false);
      }
    });
  });

  describe('centers', () => {
    it('contributing centers are narrowed to from_toc = 1, other(s) to from_toc = 0, same control list', () => {
      const toc = get('contributors.centers');
      const other = get('contributors.other_centers');
      expect(toc.type).toBe('multi_select');
      expect(other.type).toBe('multi_select');
      expect(toc.control_list).toBe('centers');
      expect(other.control_list).toBe('centers');
      expect(toc.storage).toMatchObject({
        kind: 'relation',
        table: 'results_center',
        value_column: 'center_id',
        filter: { is_active: 1, from_toc: 1 },
      });
      expect(other.storage).toMatchObject({
        kind: 'relation',
        table: 'results_center',
        value_column: 'center_id',
        filter: { is_active: 1, from_toc: 0 },
      });
    });
  });

  describe('Multiple WPs (toc.entries)', () => {
    const entries = get('toc.entries');
    it('is a list with one element per ToC mapping and the owner subfields in order', () => {
      expect(entries.type).toBe('list');
      expect(entries.subfields?.map((s) => s.key)).toEqual([
        'level',
        'toc_result',
        'hlo_statement',
        'kpi',
        'indicator_typology',
        'unit_of_measurement',
        'target',
        'contribution_to_target',
      ]);
    });

    it('subfield display rules chain level -> output/outcome -> KPI', () => {
      const s = entries.subfields;
      expect(sub(s, 'level').visible_when).toBeUndefined();
      expect(sub(s, 'toc_result').visible_when).toEqual(notNull('level'));
      expect(sub(s, 'hlo_statement').visible_when).toEqual(
        notNull('toc_result'),
      );
      expect(sub(s, 'kpi').visible_when).toEqual(notNull('toc_result'));
      for (const key of [
        'indicator_typology',
        'unit_of_measurement',
        'target',
        'contribution_to_target',
      ]) {
        expect(sub(s, key).visible_when).toEqual(notNull('kpi'));
      }
    });

    it('required subfields are only the ones the live function states (output/outcome, KPI, contribution); the client-only level is not required', () => {
      const s = entries.subfields;
      expect(sub(s, 'level').required).toBeUndefined();
      for (const key of ['toc_result', 'kpi', 'contribution_to_target']) {
        expect(sub(s, key).required).toBe(true);
      }
      for (const key of [
        'hlo_statement',
        'indicator_typology',
        'unit_of_measurement',
        'target',
      ]) {
        expect(sub(s, key).required).toBeUndefined();
      }
    });

    // P2-2932: `toc_results_indicator_id` holds the node's related_node_id for some rows and its numeric id for others
    it('KPI-derived lookups match the KPI on EITHER key (related_node_id / id), toc-results indicators', () => {
      for (const key of ['indicator_typology', 'unit_of_measurement']) {
        expect(sub(entries.subfields, key).storage).toMatchObject({
          source: 'toc.integration_information.toc_results_indicators',
          keys: [
            { from: 'kpi', to: 'related_node_id' },
            { from: 'kpi', to: 'id' },
          ],
        });
      }
    });

    it('the target lookup matches the KPI on either key AND the reporting year (year part of target_date = phase year, stored as YYYY or YYYY-MM-DD) and picks one row (target_date DESC, first)', () => {
      expect(sub(entries.subfields, 'target').storage).toEqual({
        kind: 'lookup',
        source: 'toc.integration_information.toc_result_indicator_target',
        keys: [
          { from: 'kpi', to: 'toc_result_indicator_id' },
          { from: 'kpi', to: 'id_indicator' },
        ],
        qualifiers: [
          { column: 'target_date', equals: 'phase_year', match: 'year' },
        ],
        pick: { order_by: 'target_date', direction: 'desc' },
        value_column: 'target_value',
      });
    });

    it('bindings: lookups for display data, paths for the KPI and the contribution', () => {
      const s = entries.subfields;
      for (const key of [
        'hlo_statement',
        'indicator_typology',
        'unit_of_measurement',
        'target',
      ]) {
        expect(sub(s, key).storage.kind).toBe('lookup');
      }
      expect(sub(s, 'hlo_statement').storage).toMatchObject({
        keys: [{ from: 'toc_result', to: 'id' }],
        value_column: 'result_description',
      });
      expect(sub(s, 'unit_of_measurement').storage).toMatchObject({
        value_column: 'unit_messurament',
      });
      expect(sub(s, 'kpi').storage).toMatchObject({
        kind: 'path',
        value_column: 'toc_results_indicator_id',
      });
      expect(sub(s, 'contribution_to_target').storage).toMatchObject({
        kind: 'path',
        value_column: 'contributing_indicator',
      });
      expect(
        (
          sub(s, 'contribution_to_target').storage as {
            steps: { table: string }[];
          }
        ).steps.map((st) => st.table),
      ).toEqual(['results_toc_result_indicators', 'result_indicators_targets']);
    });
  });

  describe('Contributing Science Program/Accelerator (depth 2)', () => {
    const sp = get('contributors.science_programs');
    it('is a list of role-2 contributors with program, from_toc, planned answer and its own ToC mappings', () => {
      expect(sp.type).toBe('list');
      expect(sp.storage).toMatchObject({
        kind: 'relation',
        table: 'results_by_inititiative',
        filter: { initiative_role_id: 2, is_active: 1 },
      });
      expect(sp.subfields?.map((s) => s.key)).toEqual([
        'program',
        'from_toc',
        'planned_result',
        'toc_entries',
      ]);
      expect(sub(sp.subfields, 'program').control_list).toBe('initiatives');
      expect(sub(sp.subfields, 'from_toc').storage).toMatchObject({
        kind: 'column',
        table: 'results_by_inititiative',
        column: 'from_toc',
      });
    });

    it('its mappings are shown only when the program answered Yes, and carry the same subfields as Multiple WPs at depth 2', () => {
      const mappings = sub(sp.subfields, 'toc_entries');
      expect(mappings.type).toBe('list');
      expect(mappings.visible_when).toEqual(eq('planned_result', true));
      expect(mappings.subfields?.map((s) => s.key)).toEqual(
        get('toc.entries').subfields?.map((s) => s.key),
      );
      expect(mappings.subfields).toEqual(get('toc.entries').subfields);
      expect(sub(mappings.subfields, 'toc_result').visible_when).toEqual(
        notNull('level'),
      );
      expect(
        sub(mappings.subfields, 'contribution_to_target').visible_when,
      ).toEqual(notNull('kpi'));
    });

    it('the program ToC rows join the program row on BOTH result and initiative (not initiative alone)', () => {
      for (const key of ['planned_result', 'toc_entries']) {
        const binding = sub(sp.subfields, key).storage as {
          kind: string;
          steps: { table: string; join: unknown[]; filter?: unknown }[];
        };
        expect(binding.kind).toBe('path');
        expect(binding.steps).toHaveLength(1);
        expect(binding.steps[0].table).toBe('results_toc_result');
        expect(binding.steps[0].join).toEqual([
          { from: 'result_id', to: 'results_id' },
          { from: 'inititiative_id', to: 'initiative_id' },
        ]);
      }
    });
  });

  it.each(['contributors.submitter', 'general.primary_program'])(
    '%s reads the active submitter row only (initiative_role_id 1, is_active 1), like the toc.* scope',
    (key) => {
      expect(get(key).storage).toMatchObject({
        kind: 'relation',
        table: 'results_by_inititiative',
        filter: { initiative_role_id: 1, is_active: 1 },
      });
    },
  );

  describe('the submitter ToC answer is scoped to the submitter initiative (no contributors rows)', () => {
    const submitterStep = {
      table: 'results_by_inititiative',
      join: [{ from: 'id', to: 'result_id' }],
      filter: { initiative_role_id: 1, is_active: 1 },
    };
    const tocStep = {
      table: 'results_toc_result',
      join: [
        { from: 'result_id', to: 'results_id' },
        { from: 'inititiative_id', to: 'initiative_id' },
      ],
      filter: { is_active: 1 },
    };
    it.each([
      ['toc.entries', 'result_toc_result_id'],
      ['toc.planned_result', 'planned_result'],
      ['toc.narrative', 'toc_progressive_narrative'],
      [
        'toc.program_invested_financial_resources',
        'program_invested_financial_resources',
      ],
    ])(
      '%s reads the submitter row, then its ToC rows on result AND initiative',
      (key, value) => {
        expect(get(key).storage).toEqual({
          kind: 'path',
          steps: [submitterStep, tocStep],
          value_column: value,
        });
      },
    );

    it('toc.entries and the science program entries are disjoint by initiative role (role 1 vs role 2)', () => {
      const own = (
        get('toc.entries').storage as {
          steps: { filter?: Record<string, unknown> }[];
        }
      ).steps[0].filter;
      const contributors = get('contributors.science_programs').storage as {
        filter: Record<string, unknown>;
      };
      expect(own?.initiative_role_id).toBe(1);
      expect(contributors.filter.initiative_role_id).toBe(2);
    });
  });

  describe('partners', () => {
    const partners = get('partners.external_partners');
    it('external partners are a list of partner / type / role (pre-release change from multi_select)', () => {
      expect(partners.type).toBe('list');
      expect(partners.subfields?.map((s) => s.key)).toEqual([
        'institution',
        'partner_type',
        'partner_role',
      ]);
      expect(sub(partners.subfields, 'partner_type').storage).toMatchObject({
        kind: 'lookup',
        keys: [{ from: 'institution', to: 'id' }],
      });
      expect(sub(partners.subfields, 'partner_role').storage).toMatchObject({
        kind: 'path',
        value_column: 'partner_delivery_type_id',
      });
      // QAC-T-19: the function's delivery check is commented out, but the form's multi-select is required (option B)
      expect(sub(partners.subfields, 'partner_role').required).toBe(true);
    });
  });

  it('the columns now bound are no longer pending', () => {
    const pending = new Set(
      PENDING_CATALOG.map((p) => `${p.table}.${p.column}`),
    );
    for (const id of [
      'results_toc_result_indicators.toc_results_indicator_id',
      'results_toc_result_indicators.results_toc_results_id',
      'result_indicators_targets.contributing_indicator',
      'result_indicators_targets.result_toc_result_indicator_id',
      'results_center.from_toc',
      'results_by_inititiative.from_toc',
      'results_by_inititiative.inititiative_id',
      'result_by_institutions_by_deliveries_type.partner_delivery_type_id',
      'result_by_institutions_by_deliveries_type.result_by_institution_id',
    ]) {
      expect(pending.has(id)).toBe(false);
    }
  });
});
