// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { validateCatalogShape } from './definitions/shape-validator';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { CatalogField, Condition } from './definitions/types';

/**
 * QAC-T-21: Policy change (Results) completed. Expected values come from the 2026 client form (policy-change-info component .html/.ts)
 * and the live function validation_policy_change_P25, not from the catalog under test.
 */
const get = (
  key: string,
  fields: CatalogField[] = CATALOG_FIELDS,
): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`catalog has no field ${key}`);
  return f;
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

const TYPE = 'policy_change.policy_type';
const AMOUNT = 'policy_change.usd_amount';
const STATUS = 'policy_change.amount_status';
const ACTORS = 'policy_change.actors_influenced';
const TABLE = 'results_policy_changes';

describe('QAC-T-21 policy change (Results)', () => {
  it('the catalog is shape-valid', () => {
    expect(
      shapeErrors(CATALOG_FIELDS).map((e) => `${e.rule} ${e.path}`),
    ).toEqual([]);
  });

  it('the section holds the seven form fields in the form order, policy_change only', () => {
    const keys = CATALOG_FIELDS.filter(
      (f) => f.section === 'policy_change_info',
    )
      .sort((a, b) => a.order - b.order)
      .map((f) => f.key);
    expect(keys).toEqual([
      TYPE,
      AMOUNT,
      STATUS,
      'policy_change.related_to',
      ACTORS,
      'policy_change.policy_stage',
      'policy_change.implementing_organizations',
    ]);
    keys.forEach((k) => expect(get(k).result_types).toEqual(['policy_change']));
  });

  describe('USD amount and status', () => {
    it.each([AMOUNT, STATUS])(
      '%s is shown only when the policy type is 1 (PC:22,33)',
      (key) => {
        expect(get(key).visible_when).toEqual(eq(TYPE, 1));
      },
    );

    it('both are optional: UI [required]=false and the live function does not read them', () => {
      [AMOUNT, STATUS].forEach((k) => {
        const f = get(k);
        expect(f.required).toBe(false);
        expect(f.required_confirmed).toBe(false);
        expect(f.required_when).toBeUndefined();
      });
    });

    it('types and bindings match the entity columns', () => {
      expect(get(AMOUNT).type).toBe('number');
      expect(get(AMOUNT).storage).toEqual({
        kind: 'column',
        table: TABLE,
        column: 'amount',
      });
      expect(get(STATUS).type).toBe('single_select');
      expect(get(STATUS).control_list).toBe('policy_amount_statuses');
      expect(get(STATUS).storage).toEqual({
        kind: 'column',
        table: TABLE,
        column: 'status_amount',
      });
    });

    it('the compared id sits on an open CLARISA list (policy_types); the status list is closed to the three form options', () => {
      expect(get(TYPE).control_list).toBe('policy_types');
      expect(CLOSED_CONTROL_LISTS['policy_types']).toBeUndefined();
      expect(CLOSED_CONTROL_LISTS['policy_amount_statuses']).toEqual([1, 2, 3]);
    });
  });

  describe('actors influenced', () => {
    it('is optional, numeric and bound to its column', () => {
      const f = get(ACTORS);
      expect(f.type).toBe('number');
      expect(f.required).toBe(false);
      expect(f.required_confirmed).toBe(false);
      expect(f.storage).toEqual({
        kind: 'column',
        table: TABLE,
        column: 'actors_influenced',
      });
    });

    it('carries NO visible_when: its trigger is an environment-specific question id the vocabulary cannot name (Known gap)', () => {
      expect(get(ACTORS).visible_when).toBeUndefined();
    });
  });

  describe('descriptions are the form help text, verbatim', () => {
    it('policy type: the 2026 guidance box (three entries)', () => {
      const d = get(TYPE).description ?? '';
      expect(
        d.startsWith(
          'Policy type guidance\nPolicy or strategy: Policies are written and formally approved decisions',
        ),
      ).toBe(true);
      expect(d).toContain('\nLegal instrument: Legal instruments include laws');
      expect(d).toContain(
        '\nProgram, budget or investment: These are implementing mechanisms',
      );
      expect(d).toContain(
        'A National Agricultural Investment Plan is an example',
      );
      expect(d).not.toMatch(/<[a-z/]/i);
    });

    it('amount and actors', () => {
      expect(get(AMOUNT).description).toBe('USD amount');
      expect(get(ACTORS).description).toBe(
        'How many key actors were influenced in this policy process. This should match the contribution you report against the TOC indicator target.',
      );
      expect(get(STATUS).description).toBeUndefined();
    });
  });

  it('existing keys are unchanged and the three columns left PENDING_CATALOG', () => {
    expect(get('policy_change.policy_type').required).toBe(true);
    expect(get('policy_change.related_to').required).toBe(true);
    expect(get('policy_change.policy_stage').required).toBe(true);
    expect(get('policy_change.implementing_organizations').required).toBe(true);
    expect(
      PENDING_CATALOG.filter(
        (p) =>
          p.table === TABLE &&
          ['amount', 'status_amount', 'actors_influenced'].includes(p.column),
      ),
    ).toEqual([]);
  });

  describe('falsifier', () => {
    const assertAmountRule = (fields: CatalogField[]) => {
      for (const key of [AMOUNT, STATUS]) {
        expect(get(key, fields).visible_when).toEqual(eq(TYPE, 1));
      }
    };

    it('the rule assertion passes on the real catalog and throws when the display rule is changed or removed', () => {
      expect(() => assertAmountRule(CATALOG_FIELDS)).not.toThrow();
      const removed = CATALOG_FIELDS.map((f) =>
        f.key === AMOUNT ? { ...f, visible_when: undefined } : f,
      );
      expect(() => assertAmountRule(removed)).toThrow();
      const wrongId = CATALOG_FIELDS.map((f) =>
        f.key === STATUS ? { ...f, visible_when: eq(TYPE, 2) } : f,
      );
      expect(() => assertAmountRule(wrongId)).toThrow();
    });

    it('a condition naming a key that does not exist is rejected', () => {
      const fields = CATALOG_FIELDS.map((f) =>
        f.key === AMOUNT
          ? { ...f, visible_when: eq('policy_change.nope', 1) }
          : f,
      );
      expect(shapeErrors(fields).map((e) => e.rule)).toContain(
        'UNKNOWN_CONDITION_KEY',
      );
    });
  });
});
