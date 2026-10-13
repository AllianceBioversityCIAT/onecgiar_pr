// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { validateCatalogShape } from './definitions/shape-validator';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { CatalogField, CatalogSubField, Condition } from './definitions/types';

/**
 * QAC-T-20: Innovation use (Results) completed. Expected values come from the 2026 client form (innovation-use-info,
 * innovation-use-form, estimates component) and the live function validation_innovation_use_P25, not from the catalog under test.
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

const shapeErrors = (fields: CatalogField[]) =>
  validateCatalogShape({
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields,
    notForQa: NOT_FOR_QA,
  });

const BLOCKS = ['innovation_use.current_use', 'innovation_use.projection_2030'];
const LINK = 'innovation_use.linked_result.has_innovation_link';

describe('QAC-T-20 innovation use (Results)', () => {
  it('the catalog is shape-valid', () => {
    expect(
      shapeErrors(CATALOG_FIELDS).map((e) => `${e.rule} ${e.path}`),
    ).toEqual([]);
  });

  describe('mirror of the linked-innovation question', () => {
    it('the picker binds the SAME linked_result relation as linked.results; the question binds the use column the page edits', () => {
      expect(get('innovation_use.linked_result.linked_result').storage).toEqual(
        get('linked.results').storage,
      );
      expect(get(LINK).storage).toEqual({
        kind: 'column',
        table: 'results_innovations_use',
        column: 'has_innovation_link',
      });
    });

    it('the question is optional (P2-3424: [required]=false; VIU NULL check commented out); both are innovation_use only', () => {
      const q = get(LINK);
      expect(q.required).toBe(false);
      expect(q.required_when).toBeUndefined();
      expect(q.result_types).toEqual(['innovation_use']);
      expect(
        get('innovation_use.linked_result.linked_result').result_types,
      ).toEqual(['innovation_use']);
    });

    it('the picker is a multi_select like linked.results and is required when the answer is Yes (V-CP:143-162), function-stated', () => {
      const f = get('innovation_use.linked_result.linked_result');
      expect(f.type).toBe(get('linked.results').type);
      expect(f.type).toBe('multi_select');
      expect(f.required).toBe(false);
      expect(f.required_confirmed).toBe(true);
      expect(f.required_when).toEqual(eq(LINK, true));
    });

    it('the picker is shown only when the answer is Yes', () => {
      expect(
        get('innovation_use.linked_result.linked_result').visible_when,
      ).toEqual(eq(LINK, true));
    });

    it('the existing keys are untouched and the mirror column left PENDING_CATALOG', () => {
      expect(get('linked.has_innovation_link').storage).toEqual({
        kind: 'column',
        table: 'result',
        column: 'has_innovation_link',
      });
      expect(
        PENDING_CATALOG.filter(
          (p) =>
            p.table === 'results_innovations_use' &&
            p.column === 'has_innovation_link',
        ),
      ).toEqual([]);
    });
  });

  describe('investment tables', () => {
    const lists: Array<[string, string, string, string]> = [
      [
        'innovation_use.investment.programs',
        'results_by_inititiative',
        'result_initiative_budget',
        'result_initiative_id',
      ],
      [
        'innovation_use.investment.bilateral',
        'results_by_projects',
        'non_pooled_projetct_budget',
        'result_project_id',
      ],
      [
        'innovation_use.investment.partners',
        'results_by_institution',
        'result_institutions_budget',
        'result_institution_id',
      ],
    ];

    it.each(lists)(
      '%s: optional list over the active parent rows, same budget path as innovation development',
      (key, parent, budget) => {
        const f = get(key);
        expect(f.type).toBe('list');
        expect(f.required).toBe(false);
        expect(f.result_types).toEqual(['innovation_use']);
        expect(f.storage).toMatchObject({ kind: 'relation', table: parent });
        const dev = get(
          {
            results_by_inititiative: 'innovation_dev.estimates_pooled',
            results_by_projects: 'innovation_dev.estimates_non_pooled',
            results_by_institution: 'innovation_dev.estimates_partners',
          }[parent],
        );
        expect(f.storage).toEqual(dev.storage);
        expect(sub(f, 'kind_cash').storage).toEqual(
          sub(dev, 'kind_cash').storage,
        );
        expect(JSON.stringify(sub(f, 'kind_cash').storage)).toContain(budget);
      },
    );

    it.each(lists)(
      '%s: kind_cash is required when the row is not "yet to be determined" (VIU:429-481)',
      (key) => {
        const f = get(key);
        expect(sub(f, 'kind_cash').required).toBe(false);
        expect(sub(f, 'kind_cash').required_when).toEqual(
          eq('is_determined', false),
        );
        expect(sub(f, 'is_determined').required_when).toBeUndefined();
      },
    );

    it('partners carry the read-only institution type; the other two lists do not', () => {
      expect(
        sub(get('innovation_use.investment.partners'), 'partner_type').storage,
      ).toMatchObject({ kind: 'lookup', source: 'clarisa.institutions' });
      expect(
        get('innovation_use.investment.programs').subfields?.map((s) => s.key),
      ).toEqual(['program', 'kind_cash', 'is_determined']);
    });

    it('the budget columns are not pending', () => {
      expect(
        PENDING_CATALOG.filter((p) =>
          [
            'result_initiative_budget',
            'non_pooled_projetct_budget',
            'result_institutions_budget',
          ].includes(p.table),
        ),
      ).toEqual([]);
    });
  });

  describe('2026 flags', () => {
    it('the age-fallback flags exist in the current-use actors ONLY (IUF:135-150; the 2030 block has none)', () => {
      const keys = (block: string) =>
        get(`${block}.actors`).subfields?.map((s) => s.key) ?? [];
      expect(keys('innovation_use.projection_2030')).not.toContain(
        'age_disaggregation_not_available',
      );
      expect(keys('innovation_use.projection_2030')).not.toContain(
        'youth_split_applied_by_system',
      );
    });

    it.each(['innovation_use.current_use'])(
      '%s.actors: age_disaggregation_not_available shown while the combined tick is off; youth split flag only with it',
      (block) => {
        const actors = get(`${block}.actors`);
        const age = sub(actors, 'age_disaggregation_not_available');
        expect(age.visible_when).toEqual(
          eq('sex_and_age_disaggregation', false),
        );
        expect(age.required).toBe(false);
        expect(age.required_when).toBeUndefined();
        expect(age.storage).toMatchObject({
          table: 'result_actors',
          column: 'age_disaggregation_not_available',
        });
        const split = sub(actors, 'youth_split_applied_by_system');
        expect(split.visible_when).toEqual(
          eq('age_disaggregation_not_available', true),
        );
        expect(split.required).toBe(false);
        expect(split.label).toBe(
          'Youth and Non-youth were split 50/50 by the system',
        );
        expect(split.storage).toMatchObject({
          table: 'result_actors',
          column: 'youth_split_applied_by_system',
        });
      },
    );

    it.each(BLOCKS)(
      '%s.organizations: graduate_students only for institution type 50 (IUF:321 / :713), optional',
      (block) => {
        const g = sub(get(`${block}.organizations`), 'graduate_students');
        expect(g.visible_when).toEqual(eq('institution_type', 50));
        expect(g.required).toBe(false);
        expect(g.required_when).toBeUndefined();
        expect(g.storage).toMatchObject({
          table: 'results_by_institution_type',
          column: 'graduate_students',
        });
      },
    );

    it('the three columns left PENDING_CATALOG and nothing else of those tables was removed', () => {
      const flags = [
        'age_disaggregation_not_available',
        'youth_split_applied_by_system',
        'graduate_students',
      ];
      expect(
        PENDING_CATALOG.filter(
          (p) =>
            ['result_actors', 'results_by_institution_type'].includes(
              p.table,
            ) && flags.includes(p.column),
        ),
      ).toEqual([]);
      expect(
        PENDING_CATALOG.filter(
          (p) => p.table === 'result_actors' && p.column === 'has_women',
        ),
      ).toHaveLength(1);
    });
  });

  describe('falsifier', () => {
    const assertGraduateStudentsRule = (fields: CatalogField[]) => {
      for (const block of BLOCKS) {
        const f = fields.find((x) => x.key === `${block}.organizations`)!;
        expect(sub(f, 'graduate_students').visible_when).toEqual(
          eq('institution_type', 50),
        );
      }
    };

    it('the rule assertion passes on the real catalog and throws when the display rule is removed', () => {
      expect(() => assertGraduateStudentsRule(CATALOG_FIELDS)).not.toThrow();
      const mutated = CATALOG_FIELDS.map((f) =>
        f.key === 'innovation_use.current_use.organizations'
          ? {
              ...f,
              subfields: f.subfields?.map((s) =>
                s.key === 'graduate_students'
                  ? { ...s, visible_when: undefined }
                  : s,
              ),
            }
          : f,
      );
      expect(() => assertGraduateStudentsRule(mutated)).toThrow();
    });

    it('a condition naming a key that does not exist is rejected', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === 'innovation_use.linked_result.linked_result'
          ? {
              ...f,
              visible_when: eq('innovation_use.linked_result.nope', true),
            }
          : f,
      );
      expect(shapeErrors(fields).map((e) => e.rule)).toContain(
        'UNKNOWN_CONDITION_KEY',
      );
    });
  });
});
