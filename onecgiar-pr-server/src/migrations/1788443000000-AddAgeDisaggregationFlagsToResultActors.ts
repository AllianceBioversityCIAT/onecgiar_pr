import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3537 section 7 — the age-only fallback for GESI disaggregation.
 *
 * Today `result_actors` has ONE flag, `sex_and_age_disaggregation`, whose label reads
 * "Sex and age disaggregation does not apply": it switches BOTH off at once. The story
 * asks for something different — an **age-only** option per user category, because a
 * reporter may well know how many women and men there are and not know their ages.
 *
 * When that option is chosen the system applies a 50/50 split between youth and
 * non-youth, and the story is explicit that the split must be recorded as
 * **system-applied**, distinguishable from a figure a person actually reported, by any
 * downstream report or export.
 *
 * Two columns, both nullable:
 *
 * - `age_disaggregation_not_available` — the reporter's answer for this actor row.
 * - `youth_split_applied_by_system` — set when the 50/50 was computed rather than typed.
 *   This is the column that keeps a system estimate from being read as reported data.
 *
 * Why not derive it instead of storing it (rule 25, question 5):
 *   - Comparing `women_youth` against `round(women / 2)` looks free, but it is wrong:
 *     a reporter whose real split happens to be half — a common, round answer — would be
 *     recorded as an estimate. A false positive on exactly the data this flag exists to
 *     protect.
 *   - Reusing `sex_and_age_disaggregation` is worse: it means "neither applies", it is
 *     already answered on stored rows, and overwriting it would destroy that answer.
 *
 * The four futures (rule 25):
 *   - Applied without the new code: nothing reads or writes them. Inert.
 *   - Code deployed without applying it: the entity enumerates its columns in the
 *     `SELECT`, so the Innovation Use read would fail — a 500 on a whole section, not a
 *     missing field. The Jenkins pipeline applies migrations before the backend serves
 *     traffic (observed on build #2125, 3 Sep 2026: no such window materialised), which
 *     is what keeps this future shut. Recorded because it is the symptom if it is ever
 *     applied by hand or out of order.
 *   - Applied twice: guarded. Both `ADD COLUMN`s check `information_schema` first;
 *     MySQL 8 has no `ADD COLUMN IF NOT EXISTS` and a repeated ADD aborts the deploy.
 *   - Reverted with data inside: `down` refuses to drop once any row carries a value.
 *     The numbers would survive a drop, but "this was an estimate, not a report" would
 *     not — and that distinction is the whole point of the story.
 *
 * Nullable with NO default on purpose: `0` would state that the reporter said age data
 * IS available, when the truth is that they never answered.
 *
 * Additive only: no existing row is updated, deactivated or deleted.
 */
export class AddAgeDisaggregationFlagsToResultActors1788443000000
  implements MigrationInterface
{
  name = 'AddAgeDisaggregationFlagsToResultActors1788443000000';

  private static readonly TABLE = 'result_actors';

  private static readonly COLUMNS: ReadonlyArray<
    readonly [name: string, definition: string]
  > = [
    [
      'age_disaggregation_not_available',
      "tinyint NULL COMMENT 'P2-3537: the reporter cannot disaggregate this actor row by age. NULL = not answered.'",
    ],
    [
      'youth_split_applied_by_system',
      "tinyint NULL COMMENT 'P2-3537: the youth/non-youth figures were split 50/50 by the system, not reported. NULL = not answered.'",
    ],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [
      column,
      definition,
    ] of AddAgeDisaggregationFlagsToResultActors1788443000000.COLUMNS) {
      if (await this.columnExists(queryRunner, column)) {
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE \`${AddAgeDisaggregationFlagsToResultActors1788443000000.TABLE}\` ADD \`${column}\` ${definition}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [
      column,
    ] of AddAgeDisaggregationFlagsToResultActors1788443000000.COLUMNS) {
      if (!(await this.columnExists(queryRunner, column))) {
        continue;
      }

      const used: { total: number }[] = await queryRunner.query(
        `SELECT COUNT(*) AS total FROM \`${AddAgeDisaggregationFlagsToResultActors1788443000000.TABLE}\` WHERE \`${column}\` IS NOT NULL;`,
      );

      if (Number(used?.[0]?.total ?? 0) > 0) {
        // Somebody already answered. Dropping the column would not lose the figures, but
        // it would lose "these were estimated by the system", which is the one thing this
        // story asks to be able to tell apart. A `git revert` cannot bring that back.
        continue;
      }

      await queryRunner.query(
        `ALTER TABLE \`${AddAgeDisaggregationFlagsToResultActors1788443000000.TABLE}\` DROP COLUMN \`${column}\``,
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
      [
        AddAgeDisaggregationFlagsToResultActors1788443000000.TABLE,
        column,
      ],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
