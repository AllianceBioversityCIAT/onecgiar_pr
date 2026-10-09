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
 * QAC-T-17: Evidence (Results) fully parametrized. Expected values come from the client form (rd-evidences /
 * evidence-item) and validation_evidences_P25 plus the owner's 2026-10-07 instruction, not from the catalog under test.
 */
const items = (): CatalogField => {
  const f = CATALOG_FIELDS.find((x) => x.key === 'evidence.items');
  if (!f) throw new Error('catalog has no evidence.items');
  return f;
};
const sub = (key: string): CatalogSubField => {
  const s = items().subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`no subfield ${key} in evidence.items`);
  return s;
};
const eq = (field: string, value: string | number | boolean): Condition => ({
  field,
  operator: 'eq',
  value,
});

const validate = (fields: CatalogField[]) =>
  validateCatalogShape({
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields,
    notForQa: NOT_FOR_QA,
  });
const withSub = (key: string, patch: Partial<CatalogSubField>) =>
  CATALOG_FIELDS.map((f) =>
    f.key === 'evidence.items'
      ? {
          ...f,
          subfields: f.subfields?.map((s) =>
            s.key === key ? { ...s, ...patch } : s,
          ),
        }
      : f,
  );

describe('QAC-T-17 evidence (Results)', () => {
  it('keeps the list and its subfields in form order', () => {
    expect(items().type).toBe('list');
    expect(items().subfields?.map((s) => s.key)).toEqual([
      'source',
      'link',
      'is_public_file',
      'file_name',
      'file_url',
      'gender_related',
      'climate_related',
      'nutrition_related',
      'environment_related',
      'poverty_related',
      'innovation_readiness_related',
      'innovation_use_related',
      'policy_change_related',
      'capacity_sharing_related',
      'knowledge_product_related_flag',
      'other_output_related',
      'other_outcome_related',
      'description',
    ]);
  });

  it('the shape validator accepts the evidence conditions', () => {
    expect(validate(CATALOG_FIELDS)).toEqual([]);
  });

  describe('source', () => {
    it('is a single_select over the closed list evidence_sources (0 Link, 1 Upload file), bound to is_sharepoint, hidden for KP', () => {
      const s = sub('source');
      expect(s.type).toBe('single_select');
      expect(s.control_list).toBe('evidence_sources');
      expect([...CLOSED_CONTROL_LISTS.evidence_sources]).toEqual([0, 1]);
      expect(s.storage).toEqual({
        kind: 'column',
        table: 'evidence',
        column: 'is_sharepoint',
      });
      expect(s.visible_when).toEqual({
        field: '$result_type',
        operator: 'in',
        value: [
          'policy_change',
          'innovation_use',
          'other_outcome',
          'capacity_sharing',
          'innovation_development',
          'other_output',
          'impact_contribution',
        ],
      });
      expect(s.visible_when).not.toEqual(
        expect.objectContaining({
          value: expect.arrayContaining(['knowledge_product']),
        }),
      );
    });

    it('a source condition naming an id outside the closed list is rejected', () => {
      const fields = withSub('link', { visible_when: eq('source', 2) });
      expect(validate(fields).map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });
  });

  describe('link', () => {
    it('is visible and required only when the source is Link, bound to evidence.link', () => {
      const s = sub('link');
      expect(s.visible_when).toEqual(eq('source', 0));
      expect(s.required_when).toEqual(eq('source', 0));
      expect(s.required).toBe(false);
      expect(s.storage).toEqual({
        kind: 'column',
        table: 'evidence',
        column: 'link',
      });
    });
  });

  describe('uploaded file', () => {
    it.each(['is_public_file', 'file_name', 'file_url'])(
      '%s is visible only when the source is Upload file',
      (key) => {
        expect(sub(key).visible_when).toEqual(eq('source', 1));
      },
    );

    it('file_url is the repository link: required for an upload, same column as link', () => {
      const s = sub('file_url');
      expect(s.required_when).toEqual(eq('source', 1));
      expect(s.storage).toEqual(sub('link').storage);
    });

    it('is_public_file and file_name reach evidence_sharepoint through evidence.id -> evidence_id: active rows, newest first (one row per evidence)', () => {
      for (const [key, column] of [
        ['is_public_file', 'is_public_file'],
        ['file_name', 'file_name'],
      ]) {
        const st = sub(key).storage as PathBinding;
        expect(st.kind).toBe('path');
        expect(st.steps).toEqual([
          {
            table: 'evidence_sharepoint',
            join: [{ from: 'id', to: 'evidence_id' }],
            filter: { is_active: 1 },
            // evidences.repository.ts:457-467 keeps the newest active row per evidence (MAX(created_date))
            pick: { order_by: 'created_date', direction: 'desc' },
          },
        ]);
        expect(st.value_column).toBe(column);
      }
      expect(sub('is_public_file').type).toBe('boolean');
      expect(sub('file_name').type).toBe('text');
    });
  });

  describe('description', () => {
    it('is optional, unconditional, bound to evidence.description, labelled with the form text', () => {
      const s = sub('description');
      expect(s.required).toBe(false);
      expect(s.required_when).toBeUndefined();
      expect(s.visible_when).toBeUndefined();
      expect(s.label).toContain(
        'Please provide details of where evidence can be found within the source',
      );
      expect(s.label).toContain(
        '(e.g. page number, slide number, table number)',
      );
      expect(s.storage).toEqual({
        kind: 'column',
        table: 'evidence',
        column: 'description',
      });
    });
  });

  describe('impact-area flags', () => {
    it.each([
      ['gender_related', 'general.gender_tag', 'gender_related'],
      ['climate_related', 'general.climate_tag', 'youth_related'],
      ['nutrition_related', 'general.nutrition_tag', 'nutrition_related'],
      [
        'environment_related',
        'general.environment_tag',
        'environmental_biodiversity_related',
      ],
      ['poverty_related', 'general.poverty_tag', 'poverty_related'],
    ])('%s is visible only when %s is Principal (3)', (key, tag, column) => {
      const s = sub(key);
      expect(s.type).toBe('boolean');
      expect(s.visible_when).toEqual(eq(tag, 3));
      expect(s.storage).toEqual({ kind: 'column', table: 'evidence', column });
      // the tag is a catalog field over the closed list tag_levels, which contains 3
      const tagField = CATALOG_FIELDS.find((f) => f.key === tag);
      expect(tagField?.control_list).toBe('tag_levels');
      expect(CLOSED_CONTROL_LISTS.tag_levels).toContain(3);
    });

    it('a tag condition naming a level outside tag_levels is rejected', () => {
      const fields = withSub('gender_related', {
        visible_when: eq('general.gender_tag', 4),
      });
      expect(validate(fields).map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });
  });

  describe('result-type flags', () => {
    it.each([
      [
        'innovation_readiness_related',
        'innovation_development',
        'innovation_readiness_related',
      ],
      ['innovation_use_related', 'innovation_use', 'innovation_use_related'],
      ['policy_change_related', 'policy_change', 'policy_change_related'],
      [
        'capacity_sharing_related',
        'capacity_sharing',
        'capacity_sharing_related',
      ],
      [
        'knowledge_product_related_flag',
        'knowledge_product',
        'knowledge_product_metadata_related',
      ],
      ['other_output_related', 'other_output', 'other_output_related'],
      ['other_outcome_related', 'other_outcome', 'other_outcome_related'],
    ])('%s is visible only for %s', (key, type, column) => {
      const s = sub(key);
      expect(s.visible_when).toEqual(eq('$result_type', type));
      expect(s.storage).toEqual({ kind: 'column', table: 'evidence', column });
      expect(s.required).toBe(false);
    });

    it('a flag naming a non-existent result type is rejected', () => {
      const fields = withSub('other_output_related', {
        visible_when: eq('$result_type', 'other_outputs'),
      });
      expect(validate(fields).map((e) => e.rule)).toContain(
        'CONDITION_VALUE_NOT_IN_LIST',
      );
    });
  });

  describe('falsifiers', () => {
    // These guard the assertions above: removing a rule must fail the suite.
    it('removing the link visible_when from the real definition is detected', () => {
      // the same check the link test makes, run against a copy with the rule removed: it must disagree
      const linkRule = (fields: CatalogField[]) =>
        fields
          .find((x) => x.key === 'evidence.items')
          ?.subfields?.find((x) => x.key === 'link')?.visible_when;
      expect(linkRule(CATALOG_FIELDS)).toEqual(eq('source', 0));
      expect(
        linkRule(withSub('link', { visible_when: undefined })),
      ).not.toEqual(eq('source', 0));
    });

    it('every impact-area flag carries a tag condition', () => {
      for (const key of [
        'gender_related',
        'climate_related',
        'nutrition_related',
        'environment_related',
        'poverty_related',
      ]) {
        expect(sub(key).visible_when).toBeDefined();
      }
    });
  });

  describe('pending catalog', () => {
    const pending = (table: string, column: string) =>
      PENDING_CATALOG.some((p) => p.table === table && p.column === column);

    it('no longer lists the newly bound evidence columns', () => {
      for (const column of [
        'description',
        'is_sharepoint',
        'innovation_use_related',
        'policy_change_related',
        'capacity_sharing_related',
        'other_output_related',
        'other_outcome_related',
        'knowledge_product_metadata_related',
      ]) {
        expect(pending('evidence', column)).toBe(false);
      }
      for (const column of ['evidence_id', 'file_name', 'is_public_file']) {
        expect(pending('evidence_sharepoint', column)).toBe(false);
      }
    });

    it('keeps the entries that stay undescribed', () => {
      expect(pending('evidence', 'is_supplementary')).toBe(true);
      // IPSR step-3 evidence gap untouched
      expect(
        PENDING_CATALOG.some((p) =>
          p.reason.includes('the step 3 evidence list is deferred'),
        ),
      ).toBe(true);
    });
  });

  describe('SharePoint internals', () => {
    it.each(['document_id', 'folder_path'])(
      'evidence_sharepoint.%s is NOT_FOR_QA (not on the form), not pending',
      (column) => {
        expect(
          NOT_FOR_QA.some(
            (n) => n.table === 'evidence_sharepoint' && n.column === column,
          ),
        ).toBe(true);
        expect(
          PENDING_CATALOG.some(
            (p) => p.table === 'evidence_sharepoint' && p.column === column,
          ),
        ).toBe(false);
      },
    );
  });
});
