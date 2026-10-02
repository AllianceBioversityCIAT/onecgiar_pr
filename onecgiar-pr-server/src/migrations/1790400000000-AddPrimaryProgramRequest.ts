import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `PSR-T-1` — bilateral-primary-sp-request, design.md §3.1/§3.2/§11.
 *
 * Three additive, independently-guarded changes on `share_result_request`, plus a notification
 * type seed, so a pending "primary Science Program" request can live as a request row instead
 * of an early `results_by_inititiatives` (role 1) write (`PSR-DD-1`):
 *
 *   1. `request_type` ENUM('contribution','primary') NOT NULL DEFAULT 'contribution' — every
 *      existing row backfills as `contribution` (today's kind), so nothing already stored
 *      changes behavior (requirements.md §7 backwards compatibility).
 *   2. `owner_initiative_id` relaxed to NULL — a pending `primary` row has no owner yet
 *      (`PSR-DD-5`); a `contribution` row keeps being written NOT NULL by the application.
 *   3. Three `notifications_type` rows for the Center-facing notices (§6.1), seeded the same
 *      guarded, resolve-by-`type`-string way as `SeedContributionDecisionNotificationTypes`
 *      (1787520000000): the numeric ids are NOT consistent across environments.
 *
 * The four futures (repo rule 25):
 *   - Applied without the new code: an inert column + 3 unread catalog rows.
 *   - Code without it: `PrimaryProgramRequestService` (a later task) would fail to save/read
 *     `request_type` or a null owner — nothing in THIS deploy reads either yet.
 *   - Applied twice: every step is guarded (`information_schema` column/nullability checks,
 *     `NOT EXISTS` on the catalog rows).
 *   - Reverted: `down` reverses all three, in dependency order. The ENUM column doubles as the
 *     only way to tell a pending `primary` row (no owner) apart from a `contribution` draft row
 *     (also no owner, DD-5) — so it deletes primary-with-no-owner rows (the rollback runbook,
 *     design.md §11: "pending → deleted, which leaves those results ownerless") BEFORE
 *     restoring NOT NULL, and only THEN drops the column. If some other row still has a NULL
 *     owner after that (e.g. a `contribution` draft a later task's service already wrote), the
 *     NOT NULL restore is refused with a descriptive error rather than silently corrupting data
 *     or force-deleting someone else's in-progress request.
 */
export class AddPrimaryProgramRequest1790400000000
  implements MigrationInterface
{
  name = 'AddPrimaryProgramRequest1790400000000';

  private static readonly TABLE = 'share_result_request';
  private static readonly TYPE_COLUMN = 'request_type';
  private static readonly OWNER_COLUMN = 'owner_initiative_id';

  private static readonly NOTIFICATION_TYPES = [
    'Primary Program Request Accepted',
    'Primary Program Request Declined',
    'Primary Program Request Moved',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addRequestTypeColumn(queryRunner);
    await this.relaxOwnerToNullable(queryRunner);
    await this.seedNotificationTypes(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropNotificationTypes(queryRunner);
    await this.restoreOwnerNotNull(queryRunner);
    await this.dropRequestTypeColumn(queryRunner);
  }

  // ---- request_type -------------------------------------------------------

  private async addRequestTypeColumn(queryRunner: QueryRunner): Promise<void> {
    if (
      await this.columnExists(
        queryRunner,
        AddPrimaryProgramRequest1790400000000.TYPE_COLUMN,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
      ADD \`${AddPrimaryProgramRequest1790400000000.TYPE_COLUMN}\`
        ENUM('contribution', 'primary') NOT NULL DEFAULT 'contribution';
    `);
  }

  private async dropRequestTypeColumn(
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (
      !(await this.columnExists(
        queryRunner,
        AddPrimaryProgramRequest1790400000000.TYPE_COLUMN,
      ))
    ) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
      DROP COLUMN \`${AddPrimaryProgramRequest1790400000000.TYPE_COLUMN}\`;
    `);
  }

  // ---- owner_initiative_id nullability -------------------------------------

  private async relaxOwnerToNullable(queryRunner: QueryRunner): Promise<void> {
    if (await this.ownerIsNullable(queryRunner)) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
      MODIFY \`${AddPrimaryProgramRequest1790400000000.OWNER_COLUMN}\` int NULL;
    `);
  }

  private async restoreOwnerNotNull(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.ownerIsNullable(queryRunner))) {
      return;
    }

    // Only a `primary` row can legitimately have a NULL owner today (no service in this repo
    // yet writes a NULL-owner `contribution` draft — that lands with a later task). Delete
    // those pending primary requests first (design.md §11 rollback runbook), then refuse to
    // proceed if any NULL owner remains, rather than forcing a lossy MODIFY that MySQL would
    // reject anyway.
    if (
      await this.columnExists(
        queryRunner,
        AddPrimaryProgramRequest1790400000000.TYPE_COLUMN,
      )
    ) {
      await queryRunner.query(`
        DELETE FROM \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
        WHERE \`${AddPrimaryProgramRequest1790400000000.TYPE_COLUMN}\` = 'primary'
          AND \`${AddPrimaryProgramRequest1790400000000.OWNER_COLUMN}\` IS NULL;
      `);
    }

    const remaining: { total: number }[] = await queryRunner.query(`
      SELECT COUNT(*) AS total
      FROM \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
      WHERE \`${AddPrimaryProgramRequest1790400000000.OWNER_COLUMN}\` IS NULL;
    `);

    if (Number(remaining?.[0]?.total ?? 0) > 0) {
      throw new Error(
        `AddPrimaryProgramRequest1790400000000.down: ${AddPrimaryProgramRequest1790400000000.TABLE} still has rows with a NULL ${AddPrimaryProgramRequest1790400000000.OWNER_COLUMN} that are not pending 'primary' requests. Resolve them (list, assign or explicitly remove) before restoring NOT NULL.`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`${AddPrimaryProgramRequest1790400000000.TABLE}\`
      MODIFY \`${AddPrimaryProgramRequest1790400000000.OWNER_COLUMN}\` int NOT NULL;
    `);
  }

  private async ownerIsNullable(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { IS_NULLABLE: string }[] = await queryRunner.query(
      `
        SELECT IS_NULLABLE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?;
      `,
      [
        AddPrimaryProgramRequest1790400000000.TABLE,
        AddPrimaryProgramRequest1790400000000.OWNER_COLUMN,
      ],
    );

    return rows?.[0]?.IS_NULLABLE === 'YES';
  }

  // ---- notification types ---------------------------------------------------

  private async seedNotificationTypes(
    queryRunner: QueryRunner,
  ): Promise<void> {
    for (const type of AddPrimaryProgramRequest1790400000000
      .NOTIFICATION_TYPES) {
      await queryRunner.query(
        `
        INSERT INTO \`notifications_type\` (type)
        SELECT ?
        WHERE NOT EXISTS (
          SELECT 1 FROM \`notifications_type\` WHERE type = ?
        )
      `,
        [type, type],
      );
    }
  }

  private async dropNotificationTypes(
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Same narrow posture as 1787520000000: a type any notification still references is left
    // alone — dropping it would either break the FK or orphan real user-facing rows.
    for (const type of AddPrimaryProgramRequest1790400000000
      .NOTIFICATION_TYPES) {
      await queryRunner.query(
        `
        DELETE FROM \`notifications_type\`
        WHERE type = ?
          AND NOT EXISTS (
            SELECT 1
            FROM \`notifications\` n
            WHERE n.notification_type = \`notifications_type\`.notifications_type_id
          )
      `,
        [type],
      );
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?;
      `,
      [AddPrimaryProgramRequest1790400000000.TABLE, column],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
