// @akili-spec quality-assurance/qa-field-catalog
import { getMetadataArgsStorage } from 'typeorm';
import { QaCatalogResultType } from './qa-catalog-result-type.entity';
import { QaCatalogSection } from './qa-catalog-section.entity';
import { QaCatalogField } from './qa-catalog-field.entity';
import { QaCatalogVersion } from './qa-catalog-version.entity';

/** QAC-T-2 — entity metadata (QAC-R-3, QAC-R-6; design.md §4). */
describe('qa-catalog entities metadata', () => {
  const storage = getMetadataArgsStorage();
  const columnsOf = (target: unknown) =>
    storage.columns
      .filter((c) => c.target === target)
      .map((c) => c.options?.name ?? c.propertyName);

  it.each([
    [QaCatalogResultType, 'qa_catalog_result_type'],
    [QaCatalogSection, 'qa_catalog_section'],
    [QaCatalogField, 'qa_catalog_field'],
    [QaCatalogVersion, 'qa_catalog_version'],
  ])('%p maps to table %s', (target, name) => {
    expect(storage.tables.find((t) => t.target === target)?.name).toBe(name);
  });

  it('qa_catalog_field has a unique index on (key, parent_key)', () => {
    const idx = storage.indices.find(
      (i) => i.target === QaCatalogField && i.unique,
    );
    expect(idx).toBeDefined();
    expect(idx.columns).toEqual(['key', 'parent_key']);
  });

  it('qa_catalog_field parent_key is NOT NULL with default empty string (top-level)', () => {
    const col = storage.columns.find(
      (c) => c.target === QaCatalogField && c.propertyName === 'parent_key',
    );
    expect(col.options.nullable).toBe(false);
    expect(col.options.default).toBe('');
  });

  it('qa_catalog_field carries the design §4 columns incl. JSON ones and valid_to nullable', () => {
    expect(columnsOf(QaCatalogField)).toEqual(
      expect.arrayContaining([
        'id',
        'key',
        'parent_key',
        'label',
        'description',
        'type',
        'control_list',
        'section_key',
        'order',
        'result_types',
        'required',
        'required_confirmed',
        'required_when',
        'valid_from',
        'valid_to',
        'storage',
        'created_at',
        'updated_at',
      ]),
    );
    const validTo = storage.columns.find(
      (c) => c.target === QaCatalogField && c.propertyName === 'valid_to',
    );
    expect(validTo.options.nullable).toBe(true);
  });

  it('section and version carry their design §4 columns', () => {
    expect(columnsOf(QaCatalogSection)).toEqual(
      expect.arrayContaining([
        'key',
        'label',
        'order',
        'result_types',
        'valid_from',
        'valid_to',
      ]),
    );
    expect(columnsOf(QaCatalogVersion)).toEqual(
      expect.arrayContaining([
        'phase_year',
        'portfolio',
        'revision',
        'content_hash',
        'synced_at',
      ]),
    );
    expect(columnsOf(QaCatalogResultType)).toEqual(
      expect.arrayContaining(['key', 'label', 'level']),
    );
  });
});
