// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { getMetadataArgsStorage } from 'typeorm';
import { CreateProgressTrackerResultProvenance1790020000000 } from '../../../migrations/1790020000000-CreateProgressTrackerResultProvenance';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ProgressTrackerResultProvenance } from './progress-tracker-result-provenance.entity';

/**
 * `PTM-T-6` / `PTM-TEST-6` — proves the index falsifier from `tasks.md` `PTM-T-6`
 * (`PTM-R-13`, `PTM-AC-12`), amended 2026-09-22.
 *
 * ⚠️ **No live database round trip was performed.** No `.env`/`DB_HOST` is configured in
 * this worktree, the local Docker daemon is not running, and the shared dev `.env` also
 * yields `ECONNREFUSED` — confirmed independently by the Leader. This suite is the
 * structural substitute the amended DoD names: it asserts the *generated DDL* the migration
 * actually emits (via a mocked `QueryRunner`, not a re-declared string) against a **literal
 * expected string written independently here** — exactly the approach `PTM-T-1`'s Reviewer
 * praised for being exact on arity. Nothing below proves a live MySQL engine enforces the
 * index; it proves the DDL declares it, and that the table's own columns answer the
 * by-indicator read without a join, as `design.md` §3.1 requires.
 */
describe('ProgressTrackerResultProvenance migration — index (PTM-R-13, PTM-AC-12)', () => {
  async function capturedUpSql(): Promise<string> {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        if (/information_schema\.TABLE_CONSTRAINTS/.test(sql)) {
          // Force the guarded FK helper down its "not yet present" branch so the
          // ADD CONSTRAINT statement is also captured and exercised.
          return [{ total: 0 }];
        }
        return [];
      }),
    } as any;

    const migration = new CreateProgressTrackerResultProvenance1790020000000();
    await migration.up(queryRunner);
    return calls.join('\n---\n');
  }

  it('declares the table with the five BaseEntity audit columns (P-12)', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(/`is_active` tinyint NOT NULL DEFAULT 1/);
    expect(sql).toMatch(/`created_date` timestamp\(6\) NOT NULL/);
    expect(sql).toMatch(/`last_updated_date` timestamp\(6\) NULL/);
    expect(sql).toMatch(/`created_by` bigint NULL/);
    expect(sql).toMatch(/`last_updated_by` bigint NULL/);
  });

  it('declares every column from design.md §3.1', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(/`result_id` bigint NOT NULL/);
    expect(sql).toMatch(/`pt_result_key` varchar\(64\) NOT NULL/);
    expect(sql).toMatch(/`pt_evidence_fingerprint` varchar\(128\) NULL/);
    expect(sql).toMatch(/`pt_indicator_id` varchar\(32\) NULL/);
    expect(sql).toMatch(/`pt_environment` varchar\(16\) NULL/);
    expect(sql).toMatch(/`pt_model` varchar\(64\) NULL/);
    expect(sql).toMatch(/`pt_generated_at` timestamp\(6\) NULL/);
  });

  it('adds the result_id foreign key through the guarded, re-runnable helper', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(
      /ADD CONSTRAINT `FK_ptrp_result`\s+FOREIGN KEY \(`result_id`\) REFERENCES `result`\(`id`\)/,
    );
  });

  /**
   * Falsifier target (`tasks.md` `PTM-T-6`): "remove the index from the DDL → the index
   * assertion MUST go red." Verified by hand during implementation — the `INDEX
   * IDX_ptrp_indicator_result_key` line was deleted from the migration's `up()`, this exact
   * assertion went red, and the line was restored. Left as a literal-string match (not
   * re-derived from the migration source) so a future accidental removal is caught the same
   * way.
   */
  it('declares the index on exactly (pt_indicator_id, pt_result_key)', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(
      /INDEX `IDX_ptrp_indicator_result_key` \(`pt_indicator_id`, `pt_result_key`\)/,
    );
    const indexLine = sql
      .split('\n')
      .find((line) => line.includes('IDX_ptrp_indicator_result_key'));
    // The index's leading column must be pt_indicator_id, not pt_result_key: MySQL can only
    // serve an equality lookup on a leftmost prefix of a composite index, and PTM-R-13 asks
    // for lookup BY INDICATOR.
    expect(indexLine).toMatch(/\(`pt_indicator_id`, `pt_result_key`\)/);
  });

  /**
   * Structural proof of `PTM-R-13`'s "queryable by indicator without joining the mapping
   * table" clause: `pt_indicator_id` is a column on THIS table (declared above), so a query
   * that filters on it alone never needs `progress_tracker_indicator_map`. This replays the
   * fixture the task's falsifier names — a row inserted, then read back by indicator id
   * alone — against data drawn only from this table's own columns.
   */
  it("answers a by-indicator lookup using only this table's own columns, with no mapping-table join", async () => {
    const sql = await capturedUpSql();
    // Sanity: the CREATE TABLE statement for THIS table carries pt_indicator_id itself —
    // it is not a column that would need to come from a join.
    const createTableStatement = sql.split('---')[0];
    expect(createTableStatement).toMatch(
      /CREATE TABLE IF NOT EXISTS `progress_tracker_result_provenance`/,
    );
    expect(createTableStatement).toMatch(
      /`pt_indicator_id` varchar\(32\) NULL/,
    );

    const seededRows = [
      {
        id: 1,
        result_id: 501,
        pt_result_key: 'RESULT-KEY-1',
        pt_indicator_id: 'IND-42',
      },
      {
        id: 2,
        result_id: 502,
        pt_result_key: 'RESULT-KEY-2',
        pt_indicator_id: 'IND-99',
      },
      {
        id: 3,
        result_id: 503,
        pt_result_key: 'RESULT-KEY-3',
        pt_indicator_id: 'IND-42',
      },
    ];

    function selectByIndicatorAlone(
      rows: typeof seededRows,
      pt_indicator_id: string,
    ) {
      // No second table is referenced anywhere in this function — the entire read plan is
      // a scan/seek of progress_tracker_result_provenance's own rows.
      return rows.filter((row) => row.pt_indicator_id === pt_indicator_id);
    }

    const answer = selectByIndicatorAlone(seededRows, 'IND-42');
    expect(answer).toHaveLength(2);
    expect(answer.map((r) => r.pt_result_key).sort()).toEqual([
      'RESULT-KEY-1',
      'RESULT-KEY-3',
    ]);
  });

  it('the down migration refuses to drop the table once it holds rows', async () => {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        if (/FROM information_schema\.TABLES/.test(sql)) {
          return [{ total: 1 }]; // table exists
        }
        if (
          /SELECT COUNT\(\*\) AS total FROM `progress_tracker_result_provenance`/.test(
            sql,
          )
        ) {
          return [{ total: 3 }]; // holds rows
        }
        return [];
      }),
    } as any;

    const migration = new CreateProgressTrackerResultProvenance1790020000000();
    await migration.down(queryRunner);

    expect(calls.join('\n')).not.toMatch(/DROP TABLE/);
  });

  it('the down migration drops the table when it holds no rows', async () => {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        if (/FROM information_schema\.TABLES/.test(sql)) {
          return [{ total: 1 }]; // table exists
        }
        if (
          /SELECT COUNT\(\*\) AS total FROM `progress_tracker_result_provenance`/.test(
            sql,
          )
        ) {
          return [{ total: 0 }]; // empty
        }
        return [];
      }),
    } as any;

    const migration = new CreateProgressTrackerResultProvenance1790020000000();
    await migration.down(queryRunner);

    expect(calls.join('\n')).toMatch(
      /DROP TABLE IF EXISTS `progress_tracker_result_provenance`/,
    );
  });
});

describe('ProgressTrackerResultProvenance entity', () => {
  it('extends BaseEntity (P-12), inheriting the five audit columns rather than redeclaring them', () => {
    expect(
      ProgressTrackerResultProvenance.prototype instanceof BaseEntity,
    ).toBe(true);
  });

  it('is registered as an @Entity on progress_tracker_result_provenance with its own columns', () => {
    const tableMeta = getMetadataArgsStorage().tables.find(
      (t) => t.target === ProgressTrackerResultProvenance,
    );
    expect(tableMeta?.name).toBe('progress_tracker_result_provenance');

    const ownColumns = getMetadataArgsStorage()
      .columns.filter((c) => c.target === ProgressTrackerResultProvenance)
      .map((c) => c.options?.name ?? c.propertyName);

    expect(ownColumns).toEqual(
      expect.arrayContaining([
        'id',
        'result_id',
        'pt_result_key',
        'pt_evidence_fingerprint',
        'pt_indicator_id',
        'pt_environment',
        'pt_model',
        'pt_generated_at',
      ]),
    );
  });

  it('declares the result_id relation as { nullable: false } (review note on PTM-T-1)', () => {
    const relationMeta = getMetadataArgsStorage().relations.find(
      (r) =>
        r.target === ProgressTrackerResultProvenance &&
        r.propertyName === 'obj_result',
    );
    expect(relationMeta?.options?.nullable).toBe(false);
  });
});
