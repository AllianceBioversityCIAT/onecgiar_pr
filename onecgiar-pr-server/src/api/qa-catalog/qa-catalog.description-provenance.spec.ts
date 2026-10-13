// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';

/**
 * QAC-R-11 (last bullet): `description` MUST only come from existing help text in the form. Authored
 * explanations (validation rules, review decisions, source references) belong in code comments, never
 * in the QA-facing response. This guard rejects the markers an authored note leaks.
 */
const AUTHORED_MARKERS: [string, RegExp][] = [
  ['REVIEW reference', /\bREVIEW\b/],
  ['decision id (D1..D99)', /\bD\d{1,2}\b/],
  ['live-function source reference (VIU, V-XX)', /\bVIU\b|\bV-[A-Z]{2,3}\b/],
  ['"live function" wording', /live function/i],
  ['"no live rule" wording', /no live rule/i],
  ['"Group rule" wording', /group rule/i],
  ['"Read-only: synced" wording', /read-only: synced/i],
  ['"Mandatory in the form" wording', /mandatory in the form/i],
];

const collect = (): { path: string; description: string }[] => {
  const out: { path: string; description: string }[] = [];
  CATALOG_SECTIONS.forEach((section) => {
    const description = (section as { description?: string }).description;
    if (description) out.push({ path: `section ${section.key}`, description });
  });
  CATALOG_FIELDS.forEach((field) => {
    if (field.description)
      out.push({ path: field.key, description: field.description });
    (field.subfields ?? []).forEach((sub) => {
      const subDescription = (sub as { description?: string }).description;
      if (subDescription)
        out.push({
          path: `${field.key}>${sub.key}`,
          description: subDescription,
        });
    });
  });
  return out;
};

describe('QAC-R-11 description provenance', () => {
  it('has descriptions to check (guards against a vacuous pass)', () => {
    expect(collect().length).toBeGreaterThan(20);
  });

  it('no description carries an authored note or internal reference', () => {
    const offenders = collect().flatMap(({ path, description }) =>
      AUTHORED_MARKERS.filter(([, pattern]) => pattern.test(description)).map(
        ([name]) => `${path}: ${name}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
