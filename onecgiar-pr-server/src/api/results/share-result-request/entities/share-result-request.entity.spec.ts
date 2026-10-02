// @akili-spec notifications/bilateral-primary-sp-request
import { getMetadataArgsStorage } from 'typeorm';
import { AddPrimaryProgramRequest1790400000000 } from '../../../../migrations/1790400000000-AddPrimaryProgramRequest';
import {
  RequestTypeEnum,
  ShareResultRequest,
} from './share-result-request.entity';
import { Notification } from '../../../notification/entities/notification.entity';
import { NotificationType } from '../../../notification/entities/notification_type.entity';

/**
 * Rework attempt 2 (PSR-T-1 FAIL finding) — `down()` referenced table `notification`, but the
 * real table (per `Notification`'s `@Entity(...)`) is `notifications`. These assertions pin
 * every table/column identifier the migration's `down()` touches to the entities' own TypeORM
 * metadata (`getMetadataArgsStorage()`), not to a re-declared string, so a future wrong name
 * fails here in Jest instead of on a real DB `ROLLBACK`.
 */
describe('Migration identifiers are pinned to entity metadata (PSR-T-1 rework)', () => {
  function entityTableName(
    target: new (...args: unknown[]) => unknown,
  ): string {
    const tableMeta = getMetadataArgsStorage().tables.find(
      (t) => t.target === target,
    );
    return tableMeta?.name as string;
  }

  function columnDbName(
    target: new (...args: unknown[]) => unknown,
    propertyName: string,
  ): string {
    const columnMeta = getMetadataArgsStorage().columns.find(
      (c) => c.target === target && c.propertyName === propertyName,
    );
    return (columnMeta?.options?.name as string) ?? propertyName;
  }

  it('Notification entity table name is `notifications`', () => {
    expect(entityTableName(Notification)).toBe('notifications');
  });

  it('Notification.notification_type column db name is `notification_type`', () => {
    expect(columnDbName(Notification, 'notification_type')).toBe(
      'notification_type',
    );
  });

  it('NotificationType entity table name is `notifications_type`', () => {
    expect(entityTableName(NotificationType)).toBe('notifications_type');
  });

  it('NotificationType PK column db name is `notifications_type_id`', () => {
    expect(columnDbName(NotificationType, 'notifications_type_id')).toBe(
      'notifications_type_id',
    );
  });

  it('ShareResultRequest entity table name is `share_result_request`', () => {
    expect(entityTableName(ShareResultRequest)).toBe('share_result_request');
  });

  it('down() queries the `notifications` table (not `notification`) to check FK references', async () => {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        if (/IS_NULLABLE/.test(sql)) {
          return [{ IS_NULLABLE: 'NO' }];
        }
        if (/COLUMN_NAME = \?/.test(sql)) {
          return [{ total: 1 }];
        }
        if (
          /SELECT COUNT\(\*\) AS total\s+FROM `share_result_request`/.test(sql)
        ) {
          return [{ total: 0 }];
        }
        return [];
      }),
    };

    const migration = new AddPrimaryProgramRequest1790400000000();
    await migration.down(queryRunner as any);

    const dropNotificationTypeSql = calls.find((sql) =>
      /DELETE FROM `notifications_type`/.test(sql),
    );
    expect(dropNotificationTypeSql).toBeDefined();
    expect(dropNotificationTypeSql).toMatch(/FROM `notifications` n/);
    expect(dropNotificationTypeSql).not.toMatch(/FROM `notification` n/);
    expect(dropNotificationTypeSql).toMatch(
      /n\.notification_type = `notifications_type`\.notifications_type_id/,
    );
  });
});

/**
 * `PSR-T-1` — proves the falsifier from `tasks.md` PSR-T-1: "a row inserted without
 * `request_type` reads back as anything other than `contribution` → FAIL" and "`down` then `up`
 * on a local DB fails → FAIL".
 *
 * ⚠️ **No live database round trip was performed.** No `DB_HOST`/`.env` is configured in this
 * worktree and DB-connected commands (`migration:run`, `migration:revert`, `migration:check`)
 * are handed off to the user per this task's constraints. This suite is the structural
 * substitute: (1) it asserts the entity's own default so an in-process instance — and any
 * TypeORM `Repository.create()` call, which instantiates via the class constructor — carries
 * `request_type = 'contribution'` even when the caller never sets it, backed by (2) assertions
 * against the migration's *actual emitted DDL* (via a mocked `QueryRunner`, not a re-declared
 * string) that the column itself is `NOT NULL DEFAULT 'contribution'` so a raw INSERT that
 * omits the column resolves the same way at the database.
 */
describe('ShareResultRequest entity — request_type default (PSR-T-1)', () => {
  it('a freshly constructed row defaults request_type to contribution when never set', () => {
    const row = new ShareResultRequest();
    expect(row.request_type).toBe(RequestTypeEnum.CONTRIBUTION);
    expect(row.request_type).toBe('contribution');
  });

  it('registers request_type as a NOT NULL enum column defaulting to contribution', () => {
    const columnMeta = getMetadataArgsStorage().columns.find(
      (c) =>
        c.target === ShareResultRequest && c.propertyName === 'request_type',
    );

    expect(columnMeta).toBeDefined();
    expect(columnMeta.options.type).toBe('enum');
    expect(columnMeta.options.nullable).toBe(false);
    expect(columnMeta.options.default).toBe(RequestTypeEnum.CONTRIBUTION);
    expect(Object.values(RequestTypeEnum)).toEqual(['contribution', 'primary']);
  });

  it('registers owner_initiative_id as nullable (PSR-DD-5)', () => {
    const columnMeta = getMetadataArgsStorage().columns.find(
      (c) =>
        c.target === ShareResultRequest &&
        c.propertyName === 'owner_initiative_id',
    );

    expect(columnMeta).toBeDefined();
    expect(columnMeta.options.nullable).toBe(true);
  });
});

describe('AddPrimaryProgramRequest1790400000000 migration (PSR-T-1)', () => {
  function makeQueryRunner(responses: Record<string, unknown> = {}): {
    calls: string[];
    queryRunner: any;
  } {
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        for (const [pattern, response] of Object.entries(responses)) {
          if (new RegExp(pattern).test(sql)) {
            return response;
          }
        }
        return [];
      }),
    };
    return { calls, queryRunner };
  }

  it('up() adds request_type as NOT NULL DEFAULT contribution when the column is absent', async () => {
    const { calls, queryRunner } = makeQueryRunner({
      'information_schema\\.COLUMNS[\\s\\S]*COLUMN_NAME': [{ total: 0 }],
    });

    const migration = new AddPrimaryProgramRequest1790400000000();
    await migration.up(queryRunner as any);

    const addColumnSql = calls.find((sql) => /ADD `request_type`/.test(sql));
    expect(addColumnSql).toMatch(
      /ENUM\('contribution', 'primary'\) NOT NULL DEFAULT 'contribution'/,
    );
  });

  it('up() is a no-op for request_type when the column already exists (re-run safe)', async () => {
    const { calls, queryRunner } = makeQueryRunner({
      'COLUMN_NAME.*request_type': [{ total: 1 }],
      'information_schema\\.COLUMNS': [{ total: 1 }],
    });

    const migration = new AddPrimaryProgramRequest1790400000000();
    await migration.up(queryRunner as any);

    expect(calls.join('\n')).not.toMatch(/ADD `request_type`/);
  });

  it('down() deletes pending primary rows with a NULL owner before restoring NOT NULL, then succeeds', async () => {
    let ownerNullableCheck = 0;
    const calls: string[] = [];
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        calls.push(sql);
        if (/IS_NULLABLE/.test(sql)) {
          ownerNullableCheck += 1;
          // Nullable until the MODIFY NOT NULL statement runs.
          return [{ IS_NULLABLE: ownerNullableCheck > 1 ? 'NO' : 'YES' }];
        }
        if (/COLUMN_NAME = \?/.test(sql)) {
          return [{ total: 1 }]; // request_type column exists
        }
        if (/DELETE FROM `share_result_request`/.test(sql)) {
          return [];
        }
        if (
          /SELECT COUNT\(\*\) AS total\s+FROM `share_result_request`/.test(sql)
        ) {
          return [{ total: 0 }]; // no NULL owners remain after the DELETE
        }
        if (/notifications_type/.test(sql)) {
          return [];
        }
        return [];
      }),
    };

    const migration = new AddPrimaryProgramRequest1790400000000();
    await migration.down(queryRunner as any);

    const sql = calls.join('\n---\n');
    expect(sql).toMatch(
      /DELETE FROM `share_result_request`\s+WHERE `request_type` = 'primary'\s+AND `owner_initiative_id` IS NULL/,
    );
    expect(sql).toMatch(/MODIFY `owner_initiative_id` int NOT NULL/);
    expect(sql).toMatch(/DROP COLUMN `request_type`/);
  });

  it('down() refuses to restore NOT NULL when a non-primary row still has a NULL owner', async () => {
    const queryRunner = {
      query: jest.fn(async (sql: string) => {
        if (/IS_NULLABLE/.test(sql)) {
          return [{ IS_NULLABLE: 'YES' }];
        }
        if (/COLUMN_NAME = \?/.test(sql)) {
          return [{ total: 1 }];
        }
        if (
          /SELECT COUNT\(\*\) AS total\s+FROM `share_result_request`/.test(sql)
        ) {
          return [{ total: 2 }]; // still 2 NULL-owner rows after the primary cleanup
        }
        return [];
      }),
    };

    const migration = new AddPrimaryProgramRequest1790400000000();
    await expect(migration.down(queryRunner as any)).rejects.toThrow(
      /still has rows with a NULL owner_initiative_id/,
    );
  });

  it('up() then down() round-trips without leaving request_type behind', async () => {
    // A tiny in-memory model of the one row this migration cares about, driven purely by the
    // SQL + bound params the migration itself issues — not by a re-declared assumption of
    // what state it's in.
    const state: { hasRequestType: boolean; ownerNullable: boolean } = {
      hasRequestType: false,
      ownerNullable: false,
    };
    const queryRunner = {
      query: jest.fn(async (sql: string, params: unknown[] = []) => {
        if (/ADD `request_type`/.test(sql)) {
          state.hasRequestType = true;
          return [];
        }
        if (/DROP COLUMN `request_type`/.test(sql)) {
          state.hasRequestType = false;
          return [];
        }
        if (/MODIFY `owner_initiative_id` int NULL/.test(sql)) {
          state.ownerNullable = true;
          return [];
        }
        if (/MODIFY `owner_initiative_id` int NOT NULL/.test(sql)) {
          state.ownerNullable = false;
          return [];
        }
        if (/IS_NULLABLE/.test(sql)) {
          return [{ IS_NULLABLE: state.ownerNullable ? 'YES' : 'NO' }];
        }
        if (/FROM information_schema\.COLUMNS/.test(sql)) {
          const column = params[1];
          const exists =
            column === 'request_type' ? state.hasRequestType : true;
          return [{ total: exists ? 1 : 0 }];
        }
        if (/DELETE FROM `share_result_request`/.test(sql)) {
          return [];
        }
        if (
          /SELECT COUNT\(\*\) AS total\s+FROM `share_result_request`/.test(sql)
        ) {
          return [{ total: 0 }]; // no NULL-owner rows remain once the primary row is gone
        }
        return [];
      }),
    };

    const migration = new AddPrimaryProgramRequest1790400000000();
    await expect(migration.up(queryRunner as any)).resolves.not.toThrow();
    expect(state.hasRequestType).toBe(true);
    expect(state.ownerNullable).toBe(true);

    await expect(migration.down(queryRunner as any)).resolves.not.toThrow();
    expect(state.hasRequestType).toBe(false);
    expect(state.ownerNullable).toBe(false);
  });
});
