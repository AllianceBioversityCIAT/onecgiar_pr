import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3537 §4 — the Current Use Update block: the increment and its narrative.
 *
 * Two columns on `results_innovations_use`:
 *   - `new_users_added` — users added during THIS reporting period, entered by the reporter.
 *   - `use_expansion_narrative` — how the use expanded, capped at 100 words on screen.
 *
 * ## Why columns and not a child table
 *
 * The story requires these "stored per reporting cycle, not overwritten, so that the year-over-year
 * trail can be reconstructed". A child table looks like the literal reading, and it was audited
 * against the code before being discarded. What decides it:
 *
 * 1. **The phase rollover INSERTS a new row, it does not reuse one.**
 *    `ResultsInnovationsUseRepository.createQueries` runs `INSERT ... SELECT` with
 *    `<new_result_id> as results_id`, called from `VersioningService.$_phaseChangeReporting`. The
 *    table carries `UNIQUE (results_id)` since `1668714012457-addTablesSummary`, and no code
 *    re-parents an existing row. So there is exactly one row per result-per-phase and the previous
 *    one survives untouched: two columns here ARE two columns per cycle.
 * 2. **`createQueries` does not copy them**, and that is the feature, not the bug. Its column list
 *    is `male_using, female_using, is_active, created_date, last_updated_date, results_id,
 *    created_by, last_updated_by` — nothing else. A copied increment would show FY2025's figure as
 *    FY2026's, which is exactly the "overwritten" the story forbids.
 * 3. **The identical precedent shipped two migrations ago**: `innov_use_2030_justification`
 *    (P2-3515) — same table, same shape, same per-phase question, a narrative with a 100-word cap.
 * 4. **There is no year-over-year history table anywhere in this repo.** The trail is always
 *    reconstructed through the phase chain, which the `SELECT` of this very endpoint already does
 *    (`previous_v` / `previous_r` joins). A child table keyed by phase would invent a pattern with
 *    zero precedent, competing with the one already in use.
 *
 * 🛑 What was NOT the reason: "it is cheaper". It is not — five files against four. The columns win
 * on semantics (a scalar per cycle, not a collection), not on cost.
 *
 * What a child table would add, and why none of it is asked for: several increments inside one
 * cycle (the story says "*this* reporting period" — a second figure is a correction, not history),
 * per-field audit (which does not exist anywhere in this repo), and independent soft delete.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: two nullable columns nobody reads. Inert.
 *   - Code deployed without applying it: `InnovUseExists` enumerates its columns, so the SELECT
 *     would fail → 500 on the whole Innovation Use section. The Jenkins pipeline applies migrations
 *     before the backend serves traffic (observed on builds #2125 and #2128).
 *   - Applied twice: guarded, both `ADD COLUMN`s check `information_schema` first. MySQL 8 has no
 *     `ADD COLUMN IF NOT EXISTS` and a repeated ADD aborts the deploy.
 *   - Reverted with data inside: `down` refuses to drop once any row carries a value — a reported
 *     increment and its narrative are the reporter's own words, and no `git revert` brings them back.
 *
 * Nullable with NO default on purpose: a `0` in "users added" states that nobody was added, when
 * the truth is that the question was never answered.
 *
 * Additive only: no existing row is updated, deactivated or deleted.
 */
export class AddCurrentUseUpdateToInnovationsUse1788444000000
  implements MigrationInterface
{
  name = 'AddCurrentUseUpdateToInnovationsUse1788444000000';

  private static readonly TABLE = 'results_innovations_use';

  private static readonly COLUMNS: ReadonlyArray<
    readonly [name: string, definition: string]
  > = [
    [
      'new_users_added',
      "int NULL COMMENT 'P2-3537: users added during this reporting period. NULL = not answered, which is not the same as zero.'",
    ],
    [
      'use_expansion_narrative',
      "text NULL COMMENT 'P2-3537: how the use expanded during this reporting period. Capped at 100 words on screen.'",
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [
      column,
      definition,
    ] of AddCurrentUseUpdateToInnovationsUse1788444000000.COLUMNS) {
      if (await this.columnExists(queryRunner, column)) {
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE \`${AddCurrentUseUpdateToInnovationsUse1788444000000.TABLE}\` ADD \`${column}\` ${definition}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [
      column,
    ] of AddCurrentUseUpdateToInnovationsUse1788444000000.COLUMNS) {
      if (!(await this.columnExists(queryRunner, column))) {
        continue;
      }

      const used: { total: number }[] = await queryRunner.query(
        `SELECT COUNT(*) AS total FROM \`${AddCurrentUseUpdateToInnovationsUse1788444000000.TABLE}\` WHERE \`${column}\` IS NOT NULL;`,
      );

      if (Number(used?.[0]?.total ?? 0) > 0) {
        // Somebody already reported a figure or wrote a narrative. Those are the reporter's own
        // words; dropping the column deletes them and no revert brings them back.
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE \`${AddCurrentUseUpdateToInnovationsUse1788444000000.TABLE}\` DROP COLUMN \`${column}\``,
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
      [AddCurrentUseUpdateToInnovationsUse1788444000000.TABLE, column],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
