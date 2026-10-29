// @akili-spec quality-assurance/qa-field-catalog
// QAC-R-7 close-out (T-12): every table left out of scope carries a real reason. The `pending QAC-T-8…11` placeholder
// of the scaffold must be gone once all per-type tasks are done. PENDING_CATALOG (DD-11) is a different list and is
// allowed to be non-empty; it is reported as a count in the contract doc.
import { EXCLUDED_TABLES } from './definitions/excluded-tables';

describe('QAC-R-7 excluded-tables.ts close-out', () => {
  it('has no placeholder `pending` reason left', () => {
    const leftovers = EXCLUDED_TABLES.filter((e) => /pending/i.test(e.reason));
    expect(leftovers.map((e) => e.table)).toEqual([]);
  });

  it('gives every excluded table a non-trivial reason and lists each table once', () => {
    for (const e of EXCLUDED_TABLES) {
      expect(e.reason.trim().length).toBeGreaterThan(15);
    }
    const names = EXCLUDED_TABLES.map((e) => e.table);
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps results_innovations_use_measures out of scope with an inventory-backed reason', () => {
    const entry = EXCLUDED_TABLES.find(
      (e) => e.table === 'results_innovations_use_measures',
    );
    expect(entry?.reason).toMatch(/result_ip_measure/);
  });
});
