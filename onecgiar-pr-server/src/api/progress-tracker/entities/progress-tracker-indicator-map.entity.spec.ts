// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { getMetadataArgsStorage } from 'typeorm';
import { CreateProgressTrackerIndicatorMap1790010000000 } from '../../../migrations/1790010000000-CreateProgressTrackerIndicatorMap';
import { ProgressTrackerIndicatorMapCenter1791400000000 } from '../../../migrations/1791400000000-ProgressTrackerIndicatorMapCenter';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ProgressTrackerIndicatorMap } from './progress-tracker-indicator-map.entity';

/**
 * `PTM-T-1` / `PTM-TEST-1` — proves the unique-key falsifier from `tasks.md` `PTM-T-1`
 * (`PTM-R-9`, `PTM-R-21`, `PTM-AC-11`).
 *
 * ⚠️ **No live database round trip was performed.** No `DB_HOST`/`.env` is configured in
 * this worktree and the local Docker daemon is not running, so `migration:run` /
 * `migration:revert` could not be exercised against a real MySQL instance. This suite is
 * the structural substitute named in the task's Disqualifier clause: it asserts the
 * *generated DDL* the migration actually emits (via a mocked `QueryRunner`, not a
 * re-declared string), then replays MySQL's own documented `UNIQUE KEY` semantics — a
 * duplicate is any second row whose tuple of key-column values already exists — against
 * fixtures shaped exactly like the falsifier. That second step is **not** an executed
 * assertion against a real engine and does not by itself prove MySQL enforces it; it
 * proves the DDL declares the intended key and that the key's semantics, as documented,
 * match `P-4`'s requirement (`version_id`, never `phase_year`).
 */
describe('ProgressTrackerIndicatorMap — unique key (PTM-AC-11)', () => {
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

    const migration = new CreateProgressTrackerIndicatorMap1790010000000();
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

  it('keeps both toc_results_indicator_id and toc_indicator_integration_id (design.md §14 watch item)', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(/`toc_results_indicator_id` text NOT NULL/);
    expect(sql).toMatch(/`toc_indicator_integration_id` bigint NULL/);
  });

  it('adds the version_id foreign key through the guarded, re-runnable helper', async () => {
    const sql = await capturedUpSql();
    expect(sql).toMatch(
      /ADD CONSTRAINT `FK_ptim_version`\s+FOREIGN KEY \(`version_id`\) REFERENCES `version`\(`id`\)/,
    );
  });

  it('declares the unique key on exactly (toc_results_indicator_id(255), version_id) — never phase_year (P-4)', async () => {
    const sql = await capturedUpSql();
    // Exact match on the whole UNIQUE INDEX clause: proves the key covers these two
    // columns and no others (in particular, not `phase_year`, which the design.md `P-4`
    // premise rules out as the scoping column).
    expect(sql).toMatch(
      /UNIQUE INDEX `IDX_ptim_toc_indicator_version` \(`toc_results_indicator_id`\(255\), `version_id`\)/,
    );
    const uniqueIndexLine = sql
      .split('\n')
      .find((line) => line.includes('UNIQUE INDEX'));
    expect(uniqueIndexLine).not.toMatch(/phase_year/);
  });

  /**
   * Replays MySQL's documented UNIQUE KEY semantics (a duplicate is a second row whose
   * tuple of key-column values already exists) against the exact key columns declared by
   * the migration's own DDL — not a re-declared assumption of what the key covers.
   */
  function wouldCollide(
    existing: Record<string, unknown>[],
    candidate: Record<string, unknown>,
    keyColumns: string[],
  ): boolean {
    return existing.some((row) =>
      keyColumns.every((col) => row[col] === candidate[col]),
    );
  }

  it('the declared key rejects same toc_results_indicator_id + same version_id, and accepts same toc_results_indicator_id + a different version_id', async () => {
    const sql = await capturedUpSql();
    const match =
      /UNIQUE INDEX `[^`]+` \(`toc_results_indicator_id`\(255\), `version_id`\)/.exec(
        sql,
      );
    expect(match).not.toBeNull();
    const keyColumns = ['toc_results_indicator_id', 'version_id'];

    const existingRow = {
      toc_results_indicator_id: 'TOC-IND-777',
      version_id: 42,
    };
    const sameIndicatorSameVersion = {
      toc_results_indicator_id: 'TOC-IND-777',
      version_id: 42,
    };
    const sameIndicatorDifferentVersion = {
      toc_results_indicator_id: 'TOC-IND-777',
      version_id: 43,
    };

    // Direction 1: same indicator, same version -> the second insert MUST be rejected.
    expect(
      wouldCollide([existingRow], sameIndicatorSameVersion, keyColumns),
    ).toBe(true);
    // Direction 2: same indicator, different version -> the insert MUST succeed.
    expect(
      wouldCollide([existingRow], sameIndicatorDifferentVersion, keyColumns),
    ).toBe(false);

    // A fixture keyed on phase_year instead of version_id would let both inserts pass —
    // guard against that regression by asserting phase_year is not part of the key.
    expect(keyColumns).not.toContain('phase_year');
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
          /SELECT COUNT\(\*\) AS total FROM `progress_tracker_indicator_map`/.test(
            sql,
          )
        ) {
          return [{ total: 3 }]; // holds rows
        }
        return [];
      }),
    } as any;

    const migration = new CreateProgressTrackerIndicatorMap1790010000000();
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
          /SELECT COUNT\(\*\) AS total FROM `progress_tracker_indicator_map`/.test(
            sql,
          )
        ) {
          return [{ total: 0 }]; // empty
        }
        return [];
      }),
    } as any;

    const migration = new CreateProgressTrackerIndicatorMap1790010000000();
    await migration.down(queryRunner);

    expect(calls.join('\n')).toMatch(
      /DROP TABLE IF EXISTS `progress_tracker_indicator_map`/,
    );
  });
});

describe('ProgressTrackerIndicatorMap entity', () => {
  it('extends BaseEntity (P-12), inheriting the five audit columns rather than redeclaring them', () => {
    expect(ProgressTrackerIndicatorMap.prototype instanceof BaseEntity).toBe(
      true,
    );
  });

  it('is registered as an @Entity on progress_tracker_indicator_map with its own columns', () => {
    const tableMeta = getMetadataArgsStorage().tables.find(
      (t) => t.target === ProgressTrackerIndicatorMap,
    );
    expect(tableMeta?.name).toBe('progress_tracker_indicator_map');

    const ownColumns = getMetadataArgsStorage()
      .columns.filter((c) => c.target === ProgressTrackerIndicatorMap)
      .map((c) => c.options?.name ?? c.propertyName);

    expect(ownColumns).toEqual(
      expect.arrayContaining([
        'id',
        'toc_results_indicator_id',
        'toc_indicator_integration_id',
        'version_id',
        'pt_indicator_id',
        'pt_program_id',
        'match_quality',
        'match_score',
        'resolved_at',
        'center',
        'kpi_type',
        'needs_review',
      ]),
    );
  });

  it('declares center NOT NULL default "", kpi_type nullable and needs_review boolean default false', () => {
    const byName = (name: string) =>
      getMetadataArgsStorage().columns.find(
        (c) =>
          c.target === ProgressTrackerIndicatorMap && c.options?.name === name,
      )?.options;

    expect(byName('center')).toMatchObject({
      type: 'varchar',
      nullable: false,
      default: '',
    });
    expect(byName('kpi_type')).toMatchObject({
      type: 'varchar',
      nullable: true,
    });
    expect(byName('needs_review')).toMatchObject({
      type: 'boolean',
      nullable: false,
      default: false,
    });
  });
});

describe('ProgressTrackerIndicatorMapCenter migration', () => {
  /** Mocked QueryRunner: `existing` lists the columns/indexes information_schema reports. */
  function makeQueryRunner(existing: string[]) {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        calls.push(sql);
        if (/information_schema\.(COLUMNS|STATISTICS)/.test(sql)) {
          return [{ total: existing.includes(String(params?.[1])) ? 1 : 0 }];
        }
        return [];
      }),
    } as any;
    return { queryRunner, calls };
  }

  it('up deletes existing rows first, adds the three columns and swaps the unique key to include center', async () => {
    const { queryRunner, calls } = makeQueryRunner([
      'IDX_ptim_toc_indicator_version',
    ]);

    await new ProgressTrackerIndicatorMapCenter1791400000000().up(queryRunner);

    const writes = calls.filter((sql) => !/information_schema/.test(sql));
    expect(writes[0]).toMatch(/DELETE FROM `progress_tracker_indicator_map`/);

    const sql = writes.join('\n');
    expect(sql).toMatch(/ADD `center` varchar\(64\) NOT NULL DEFAULT ''/);
    expect(sql).toMatch(/ADD `kpi_type` varchar\(255\) NULL/);
    expect(sql).toMatch(/ADD `needs_review` tinyint NOT NULL DEFAULT 0/);
    expect(sql).toMatch(/DROP INDEX `IDX_ptim_toc_indicator_version`/);
    expect(sql).toMatch(
      /ADD UNIQUE INDEX `IDX_ptim_toc_indicator_version_center` \(`toc_results_indicator_id`\(255\), `version_id`, `center`\)/,
    );
  });

  it('up is re-runnable: nothing is added or dropped when the new schema is already in place', async () => {
    const { queryRunner, calls } = makeQueryRunner([
      'center',
      'kpi_type',
      'needs_review',
      'IDX_ptim_toc_indicator_version_center',
    ]);

    await new ProgressTrackerIndicatorMapCenter1791400000000().up(queryRunner);

    expect(calls.join('\n')).not.toMatch(/ALTER TABLE/);
  });

  it('down deletes the center rows, restores the two-column key and drops the three columns', async () => {
    const { queryRunner, calls } = makeQueryRunner([
      'center',
      'kpi_type',
      'needs_review',
      'IDX_ptim_toc_indicator_version_center',
    ]);

    await new ProgressTrackerIndicatorMapCenter1791400000000().down(
      queryRunner,
    );

    const writes = calls.filter((sql) => !/information_schema/.test(sql));
    expect(writes[0]).toMatch(/DELETE FROM `progress_tracker_indicator_map`/);

    const sql = writes.join('\n');
    expect(sql).toMatch(/DROP INDEX `IDX_ptim_toc_indicator_version_center`/);
    expect(sql).toMatch(
      /ADD UNIQUE INDEX `IDX_ptim_toc_indicator_version` \(`toc_results_indicator_id`\(255\), `version_id`\)/,
    );
    expect(sql).toMatch(/DROP COLUMN `center`/);
    expect(sql).toMatch(/DROP COLUMN `kpi_type`/);
    expect(sql).toMatch(/DROP COLUMN `needs_review`/);
  });
});
