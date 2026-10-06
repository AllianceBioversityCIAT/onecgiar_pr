// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { CATALOG_VERSIONS } from './definitions/versions';
import { validateCatalogShape } from './definitions/shape-validator';
import { isValidIn } from './definitions/validity';
import {
  CatalogDefinition,
  CatalogField,
  CatalogSection,
} from './definitions/types';

/**
 * QAC-T-1 — shape rules of QAC-R-1 / QAC-R-3 / QAC-R-7.
 * Every fixture is the valid baseline with exactly ONE deliberate violation, and each test
 * asserts the full error list (rule + path), so a fixture that is malformed elsewhere fails.
 */
const section = (over: Partial<CatalogSection> = {}): CatalogSection => ({
  key: 'general',
  label: 'General',
  order: 1,
  result_types: ['*'],
  valid_from: 2026,
  valid_to: null,
  ...over,
});

const field = (over: Partial<CatalogField> = {}): CatalogField => ({
  key: 'general.title',
  label: 'Title',
  type: 'text',
  section: 'general',
  order: 1,
  result_types: ['*'],
  required: true,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
  storage: { kind: 'column', table: 'result', column: 'title' },
  ...over,
});

const catalog = (over: Partial<CatalogDefinition> = {}): CatalogDefinition => ({
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    { key: 'other_output', label: 'Other output', level: 'output' },
  ],
  sections: [section()],
  fields: [field()],
  notForQa: [],
  ...over,
});

const subfield = {
  key: 'name',
  label: 'Name',
  type: 'text' as const,
  storage: { kind: 'column' as const, table: 't', column: 'name' },
};

describe('validateCatalogShape', () => {
  it('accepts the valid baseline fixture (control: no rule fires by accident)', () => {
    expect(validateCatalogShape(catalog())).toEqual([]);
  });

  it('QAC-R-1: rejects a select without control_list and accepts the one that has it', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.with_list',
            type: 'single_select',
            control_list: 'countries',
          }),
          field({ key: 'general.no_list', type: 'single_select', order: 2 }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.no_list',
      }),
    ]);
  });

  it('QAC-R-1: rejects a multi_select field and a select subfield without control_list', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({ key: 'general.multi', type: 'multi_select' }),
          field({
            key: 'general.group',
            type: 'list',
            order: 2,
            subfields: [{ ...subfield, key: 'kind', type: 'single_select' }],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.multi',
      }),
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.group/subfield:kind',
      }),
    ]);
  });

  it.each(['list', 'object'] as const)(
    'QAC-R-1: rejects a %s field without subfields',
    (type) => {
      const errors = validateCatalogShape(
        catalog({ fields: [field({ key: 'general.group', type })] }),
      );
      expect(errors).toEqual([
        expect.objectContaining({
          rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
          path: 'field:general.group',
        }),
      ]);
    },
  );

  it('QAC-R-1: rejects a list field whose subfields array is empty, accepts one with a subfield', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({ key: 'general.ok', type: 'list', subfields: [subfield] }),
          field({
            key: 'general.empty',
            type: 'list',
            order: 2,
            subfields: [],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
        path: 'field:general.empty',
      }),
    ]);
  });

  it('QAC-R-3: rejects a field with valid_from > valid_to', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field({ valid_from: 2026, valid_to: 2025 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'INVALID_VALIDITY_RANGE',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-3: rejects a section with valid_from > valid_to', () => {
    const errors = validateCatalogShape(
      catalog({ sections: [section({ valid_from: 2027, valid_to: 2026 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'INVALID_VALIDITY_RANGE',
        path: 'section:general',
      }),
    ]);
  });

  it('QAC-R-3: accepts valid_from === valid_to and an open-ended valid_to', () => {
    expect(
      validateCatalogShape(
        catalog({
          fields: [
            field({
              key: 'general.one_year',
              valid_from: 2025,
              valid_to: 2025,
            }),
            field({ key: 'general.open', order: 2, valid_to: null }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('QAC-R-1: rejects a duplicate field key', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field(), field({ order: 2 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-1: rejects a duplicate section key and a duplicate result type key', () => {
    const errors = validateCatalogShape(
      catalog({
        sections: [section(), section({ order: 2 })],
        resultTypes: [
          { key: 'policy_change', label: 'A', level: 'outcome' },
          { key: 'policy_change', label: 'B', level: 'outcome' },
        ],
        fields: [field({ result_types: ['policy_change'] })],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'resultType:policy_change',
      }),
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'section:general',
      }),
    ]);
  });

  it('QAC-R-1: rejects a field referencing an unknown section', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field({ section: 'ghost' })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_SECTION',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-1: rejects a field and a section referencing an unknown result type; "*" is accepted', () => {
    const errors = validateCatalogShape(
      catalog({
        sections: [section({ result_types: ['ghost_type'] })],
        fields: [
          field({ result_types: ['policy_change', 'other_ghost'] }),
          field({ key: 'general.all', order: 2, result_types: ['*'] }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_RESULT_TYPE',
        path: 'section:general',
      }),
      expect.objectContaining({
        rule: 'UNKNOWN_RESULT_TYPE',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-7: rejects a NOT_FOR_QA entry with an empty or blank reason, accepts a reasoned one', () => {
    const errors = validateCatalogShape(
      catalog({
        notForQa: [
          {
            table: 'result',
            column: 'created_by',
            reason: 'Audit column, not form data',
          },
          { table: 'result', column: 'updated_by', reason: '' },
          { table: 'result', column: 'last_updated_by', reason: '   ' },
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'EMPTY_NOT_FOR_QA_REASON',
        path: 'notForQa:result.updated_by',
      }),
      expect.objectContaining({
        rule: 'EMPTY_NOT_FOR_QA_REASON',
        path: 'notForQa:result.last_updated_by',
      }),
    ]);
  });
});

describe('isValidIn (QAC-R-3)', () => {
  it.each([
    [{ valid_from: 2025, valid_to: 2025 }, 2024, false],
    [{ valid_from: 2025, valid_to: 2025 }, 2025, true],
    [{ valid_from: 2025, valid_to: 2025 }, 2026, false],
    [{ valid_from: 2026, valid_to: null }, 2025, false],
    [{ valid_from: 2026, valid_to: null }, 2026, true],
    [{ valid_from: 2026, valid_to: null }, 2099, true],
  ])('%j in %d -> %s', (entry, year, expected) => {
    expect(isValidIn(entry, year)).toBe(expected);
  });
});

describe('the real catalog definitions', () => {
  it('validate with zero shape errors', () => {
    expect(
      validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields: CATALOG_FIELDS,
        notForQa: NOT_FOR_QA,
      }),
    ).toEqual([]);
  });

  it('declares the nine result types and the 2026 version', () => {
    expect(CATALOG_RESULT_TYPES.map((t) => t.key).sort()).toEqual([
      'capacity_sharing',
      'impact_contribution',
      'innovation_development',
      'innovation_package',
      'innovation_use',
      'knowledge_product',
      'other_outcome',
      'other_output',
      'policy_change',
    ]);
    expect(CATALOG_VERSIONS[2026]).toEqual({ portfolio: 'P25', revision: 2 });
  });
});
