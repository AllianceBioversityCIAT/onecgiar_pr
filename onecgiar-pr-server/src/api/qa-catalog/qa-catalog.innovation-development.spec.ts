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
 * QAC-T-18: Innovation development (Results) fully parametrized. Expected values come from the 2026 client form
 * (innovation-dev-info and its stage / IPR / team-diversity / estimates components) and the live function
 * validation_innovation_dev_P25, not from the catalog under test.
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

const shapeErrors = (fields: CatalogField[]) =>
  validateCatalogShape({
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields,
    notForQa: NOT_FOR_QA,
  });

describe('QAC-T-18 innovation development (Results)', () => {
  it('section keys in form order, contiguous order', () => {
    const section = CATALOG_FIELDS.filter(
      (f) => f.section === 'innovation_development',
    ).sort((a, b) => a.order - b.order);
    expect(section.map((f) => f.key)).toEqual([
      'innovation_dev.short_title',
      'innovation_dev.characterization',
      'innovation_dev.nature',
      'innovation_dev.is_new_variety',
      'innovation_dev.number_of_varieties',
      'innovation_dev.gesi_stage',
      'innovation_dev.risk_stage',
      'innovation_dev.ipr_consideration',
      'innovation_dev.developers',
      'innovation_dev.collaborators',
      'innovation_dev.team_diversity',
      'innovation_dev.readiness_level',
      'innovation_dev.readiness_justification',
      'innovation_dev.estimates_pooled',
      'innovation_dev.estimates_non_pooled',
      'innovation_dev.estimates_partners',
    ]);
    expect(section.map((f) => f.order)).toEqual(section.map((_, i) => i + 1));
    for (const f of section)
      expect(f.result_types).toEqual(['innovation_development']);
  });

  it('the catalog is shape-valid and the three budget tables left PENDING_CATALOG', () => {
    expect(
      shapeErrors(CATALOG_FIELDS).map((e) => `${e.rule} ${e.path}`),
    ).toEqual([]);
    const budgetPending = PENDING_CATALOG.filter((p) =>
      [
        'result_initiative_budget',
        'non_pooled_projetct_budget',
        'result_institutions_budget',
      ].includes(p.table),
    );
    expect(budgetPending).toEqual([]);
  });

  describe('closed lists', () => {
    it('team diversity options are 113/114/115 and the actions 116..121 (owner-verified ids)', () => {
      expect(CLOSED_CONTROL_LISTS.question_options_team_diversity).toEqual([
        113, 114, 115,
      ]);
      expect(
        CLOSED_CONTROL_LISTS.question_options_team_diversity_actions,
      ).toEqual([116, 117, 118, 119, 120, 121]);
    });

    it('stage and IPR option lists are NOT closed (ids are AUTO_INCREMENT per environment)', () => {
      for (const list of [
        'question_options_gesi_stage',
        'question_options_risk_stage',
        'question_options_ipr',
      ]) {
        expect(CLOSED_CONTROL_LISTS[list]).toBeUndefined();
      }
    });
  });

  describe('scalar fields', () => {
    it.each([
      ['innovation_dev.short_title'],
      ['innovation_dev.characterization'],
      ['innovation_dev.nature'],
      ['innovation_dev.readiness_level'],
      ['innovation_dev.readiness_justification'],
    ])('%s: always shown, required by the form and the function', (key) => {
      const f = get(key);
      expect(f.required).toBe(true);
      expect(f.required_confirmed).toBe(true);
      expect(f.visible_when).toBeUndefined();
      expect(f.required_when).toBeUndefined();
    });

    it('is_new_variety: only for typology 12 (IDI.html:30), required there', () => {
      const f = get('innovation_dev.is_new_variety');
      expect(f.visible_when).toEqual(eq('innovation_dev.nature', 12));
      expect(f.required_when).toEqual(eq('innovation_dev.nature', 12));
      expect(f.required).toBe(false);
    });

    it('number_of_varieties: shown for typology 12 AND "yes"; required (> 0) when "yes" (function)', () => {
      const f = get('innovation_dev.number_of_varieties');
      expect(f.visible_when).toEqual({
        all: [
          eq('innovation_dev.nature', 12),
          eq('innovation_dev.is_new_variety', true),
        ],
      });
      expect(f.required_when).toEqual(
        eq('innovation_dev.is_new_variety', true),
      );
    });

    it('developers and collaborators are optional free text, no rules', () => {
      for (const key of [
        'innovation_dev.developers',
        'innovation_dev.collaborators',
      ]) {
        const f = get(key);
        expect(f.type).toBe('text');
        expect(f.required).toBe(false);
        expect(f.visible_when).toBeUndefined();
        expect(f.required_when).toBeUndefined();
      }
    });
  });

  describe('question tree', () => {
    it.each([
      ['innovation_dev.gesi_stage', 'question_options_gesi_stage'],
      ['innovation_dev.risk_stage', 'question_options_risk_stage'],
      ['innovation_dev.ipr_consideration', 'question_options_ipr'],
      ['innovation_dev.team_diversity', 'question_options_team_diversity'],
    ])(
      '%s binds through result_answers (active, answered) with list %s',
      (key, list) => {
        const f = get(key);
        expect(f.control_list).toBe(list);
        expect(f.required).toBe(true);
        expect(f.storage).toEqual({
          kind: 'relation',
          table: 'result_answers',
          fk_to_result: 'result_id',
          value_column: 'result_question_id',
          filter: { answer_boolean: 1, is_active: 1 },
        });
      },
    );

    it.each(['innovation_dev.gesi_stage', 'innovation_dev.risk_stage'])(
      '%s: "Why?" is visible and required only when the chosen option is "Not applicable" (by label, ids differ per environment)',
      (key) => {
        const f = get(key);
        const why = sub(f, 'not_applicable_reason');
        const want = eq('option_label', 'Not applicable');
        expect(why.visible_when).toEqual(want);
        expect(why.required_when).toEqual(want);
        expect(why.storage).toEqual({
          kind: 'column',
          table: 'result_answers',
          column: 'answer_text',
        });
        expect(sub(f, 'option_label').storage).toEqual({
          kind: 'lookup',
          source: 'prms.result_questions',
          keys: [{ from: key, to: 'result_question_id' }],
          value_column: 'question_text',
        });
      },
    );

    it('no condition of the stage / IPR fields names an option id', () => {
      for (const key of [
        'innovation_dev.gesi_stage',
        'innovation_dev.risk_stage',
        'innovation_dev.ipr_consideration',
      ]) {
        expect(JSON.stringify(get(key).subfields ?? [])).not.toMatch(
          /"operator":"(eq|in)","value":\[?\d/,
        );
      }
    });

    it('ipr_consideration has no follow-ups in the 2026 form', () => {
      expect(get('innovation_dev.ipr_consideration').subfields).toBeUndefined();
    });

    describe('team diversity', () => {
      const f = () => get('innovation_dev.team_diversity');

      it('actions: shown and required only when option 113 is chosen', () => {
        const a = sub(f(), 'actions');
        expect(a.type).toBe('multi_select');
        expect(a.control_list).toBe('question_options_team_diversity_actions');
        expect(a.visible_when).toEqual(
          eq('innovation_dev.team_diversity', 113),
        );
        expect(a.required_when).toEqual(
          eq('innovation_dev.team_diversity', 113),
        );
        const path = a.storage as PathBinding;
        expect(path.kind).toBe('path');
        expect(path.steps[0].table).toBe('result_answers');
        expect(path.steps[0].filter).toEqual({
          answer_boolean: 1,
          is_active: 1,
        });
        expect(path.value_column).toBe('result_question_id');
      });

      it('other_text: shown and required when action 121 (Other) is ticked; reads the answer_text of row 121', () => {
        const o = sub(f(), 'other_text');
        expect(o.visible_when).toEqual(inn('actions', [121]));
        expect(o.required_when).toEqual(inn('actions', [121]));
        const path = o.storage as PathBinding;
        expect(path.steps[0].filter).toEqual({
          result_question_id: 121,
          answer_boolean: 1,
          is_active: 1,
        });
        expect(path.value_column).toBe('answer_text');
      });
    });
  });

  describe('investment tables', () => {
    const cases: Array<
      [string, string, string, string, string, string, string]
    > = [
      [
        'innovation_dev.estimates_pooled',
        'results_by_inititiative',
        'program',
        'result_initiative_budget',
        'result_initiative_id',
        'inititiative_id',
        'initiatives',
      ],
      [
        'innovation_dev.estimates_non_pooled',
        'results_by_projects',
        'project',
        'non_pooled_projetct_budget',
        'result_project_id',
        'project_id',
        'projects',
      ],
      [
        'innovation_dev.estimates_partners',
        'results_by_institution',
        'institution',
        'result_institutions_budget',
        'result_institution_id',
        'institutions_id',
        'institutions',
      ],
    ];
    it.each(cases)(
      '%s: list of active parent rows with the entity, USD value and "yet to be determined" through the budget row',
      (key, parentTable, entityKey, budgetTable, fk, entityColumn, list) => {
        const f = get(key);
        expect(f.type).toBe('list');
        expect(f.required).toBe(false);
        expect(f.storage).toMatchObject({
          kind: 'relation',
          table: parentTable,
          fk_to_result: 'result_id',
          filter: { is_active: 1 },
        });
        const entity = sub(f, entityKey);
        expect(entity.control_list).toBe(list);
        expect(entity.required).toBe(true);
        expect(entity.storage).toEqual({
          kind: 'column',
          table: parentTable,
          column: entityColumn,
        });
        for (const [subKey, column, type] of [
          ['kind_cash', 'kind_cash', 'number'],
          ['is_determined', 'is_determined', 'boolean'],
        ]) {
          const s = sub(f, subKey);
          expect(s.type).toBe(type);
          expect(s.storage).toEqual({
            kind: 'path',
            steps: [
              {
                table: budgetTable,
                join: [{ from: 'id', to: fk }],
                filter: { is_active: 1 },
              },
            ],
            value_column: column,
          });
        }
      },
    );
  });

  describe('phase-gated 2026 removals stay out', () => {
    it('no field for user-need evidence, anticipated users, megatrends, scaling studies or reference materials', () => {
      const keys = CATALOG_FIELDS.filter(
        (f) => f.section === 'innovation_development',
      ).map((f) => f.key);
      for (const gone of [
        'innovation_dev.anticipated_users',
        'innovation_dev.user_evidence',
        'innovation_dev.megatrends',
        'innovation_dev.has_scaling_studies',
        'innovation_dev.reference_materials',
      ]) {
        expect(keys).not.toContain(gone);
      }
    });
  });

  describe('falsifiers', () => {
    it('a team-diversity option id outside the closed list is rejected (122)', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === 'innovation_dev.team_diversity'
          ? {
              ...f,
              subfields: f.subfields?.map((s) =>
                s.key === 'actions'
                  ? {
                      ...s,
                      visible_when: eq('innovation_dev.team_diversity', 122),
                    }
                  : s,
              ),
            }
          : f,
      );
      expect(shapeErrors(fields).map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });

    it('an "Other" tick on an action outside 116..121 is rejected (122)', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === 'innovation_dev.team_diversity'
          ? {
              ...f,
              subfields: f.subfields?.map((s) =>
                s.key === 'other_text'
                  ? { ...s, visible_when: inn('actions', [122]) }
                  : s,
              ),
            }
          : f,
      );
      expect(shapeErrors(fields).map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });

    it('a condition naming a stage-field key that does not exist is rejected', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === 'innovation_dev.number_of_varieties'
          ? { ...f, visible_when: eq('innovation_dev.nope', true) }
          : f,
      );
      expect(shapeErrors(fields).map((e) => e.rule)).toContain(
        'UNKNOWN_CONDITION_KEY',
      );
    });
  });
});
