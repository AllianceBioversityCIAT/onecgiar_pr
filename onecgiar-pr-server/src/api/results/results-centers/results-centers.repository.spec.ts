import { DataSource } from 'typeorm';
import { ResultsCenterRepository } from './results-centers.repository';
import {
  insertLists,
  misalignedColumns,
} from '../../../shared/extendsGlobalDTO/replication-insert-lists.spec-helper';

/**
 * P2-3228 — phase replication must carry the lead Centre and provenance flags.
 * `docs/specs/bugfix/p2-3228-lead-center-replication/requirements.md` VER-R-1, scenarios
 * VER-S-1.1 (regression, shape of result 9073) and VER-S-1.2 (non-lead stays non-lead).
 *
 * Until the fix, `is_leading_result`, `from_toc` and `from_cgspace` are absent from both
 * `insertQuery` and `findQuery`: a replicated result's new version carries no lead Centre, and the
 * Results Center grid shows `—` in its Center column (design.md §5, VER-DD-2, VER-DD-4).
 *
 * The alignment check (`misalignedColumns`) is the gate for defect class D2: an INSERT whose
 * column list and SELECT list drift apart still compiles and still runs, it just writes every
 * value into the wrong column. A bare `toContain` on the column name would pass on exactly that
 * bug — the position check is the point.
 */
describe('ResultsCenterRepository — replication carries the lead Centre and provenance flags (P2-3228)', () => {
  const repo = new ResultsCenterRepository(
    {
      createEntityManager: jest.fn(() => ({}) as any),
    } as unknown as DataSource,
    { returnErrorRepository: jest.fn() } as any,
  );
  const config = {
    phase: 5,
    user: { id: 77 } as any,
    old_result_id: 1000,
    new_result_id: 2000,
  } as any;

  it('writes is_leading_result into its own column in insertQuery, verbatim from the source row', () => {
    const { columns, values } = insertLists(
      repo.createQueries(config).insertQuery,
      'results_center',
      'rc',
    );
    const index = columns.indexOf('is_leading_result');

    expect(index).toBeGreaterThan(-1);
    // Bare column reference — no literal, COALESCE or CASE that could promote a non-lead Centre
    // to lead (VER-S-1.2).
    expect(values[index]).toBe('rc.is_leading_result');
  });

  it('writes from_toc and from_cgspace into their own columns in insertQuery, verbatim', () => {
    const { columns, values } = insertLists(
      repo.createQueries(config).insertQuery,
      'results_center',
      'rc',
    );

    for (const column of ['from_toc', 'from_cgspace']) {
      const index = columns.indexOf(column);
      expect(index).toBeGreaterThan(-1);
      expect(values[index]).toBe(`rc.${column}`);
    }
  });

  it('does not change is_primary, is_active or center_id from what they carry today (VER-S-1.1)', () => {
    const { columns, values } = insertLists(
      repo.createQueries(config).insertQuery,
      'results_center',
      'rc',
    );

    for (const column of ['is_primary', 'is_active', 'center_id']) {
      const index = columns.indexOf(column);
      expect(index).toBeGreaterThan(-1);
      expect(values[index]).toBe(`rc.${column}`);
    }
  });

  it('keeps every INSERT column aligned with the value written into it', () => {
    const { columns, values } = insertLists(
      repo.createQueries(config).insertQuery,
      'results_center',
      'rc',
    );

    expect(values).toHaveLength(columns.length);
    expect(misalignedColumns(columns, values, 'rc')).toEqual([]);
  });

  it('carries is_leading_result, from_toc and from_cgspace in findQuery too (DD-2)', () => {
    const { findQuery } = repo.createQueries(config);

    expect(findQuery).toContain('rc.is_leading_result');
    expect(findQuery).toContain('rc.from_toc');
    expect(findQuery).toContain('rc.from_cgspace');
  });
});
