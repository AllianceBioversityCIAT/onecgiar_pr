import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3292 Step 2 — the 2026 discontinuation reasons for Innovation Development.
 *
 * `investment_discontinued_option` had exactly one discriminator, `result_type_id`.
 * No version, no phase, no year. That collides head-on with the PO instruction of
 * epic P2-3243: a result of the 2025 phase must render exactly what it renders
 * today. The two obvious migrations both break it —
 *
 *   UPDATE … SET option = '<new text>'  → the 2025 result shows the 2026 wording.
 *   UPDATE … SET is_active = 0          → worse: the front rebuilds the checklist
 *                                         FROM THE ACTIVE CATALOGUE and only ticks
 *                                         the saved ones, so a de-activated row is
 *                                         simply not rendered and a 2025 result
 *                                         LOSES a reason it had already reported.
 *
 * So this migration updates nothing. It adds a generation axis and inserts the
 * 2026 set as new rows:
 *
 * - `phase_year_from` — the phase the row was introduced for. `NULL` on every
 *   existing row, which is the base generation (they predate the axis). The service
 *   serves only ONE generation per request: the newest whose `phase_year_from` is
 *   at or below the result's phase year. That is what keeps a 2025 result on its
 *   six original reasons without a single write to them.
 * - `requires_description` — marks the row whose free-text box has to appear
 *   ("Other"). Today the client hardcodes `investment_discontinued_option_id == 6`,
 *   and the 2026 "Other" row gets whatever id the AUTO_INCREMENT hands it, so
 *   without this flag its text box would never render. The legacy row keeps being
 *   recognised by its id — flagging it would mean an UPDATE, which this migration
 *   deliberately does not do.
 *
 * The four futures (repo rule 25):
 *   - Applied without the new code: ⚠️ the old service filters only on
 *     `result_type_id` + `is_active`, so during the deploy window it would serve
 *     the six legacy rows AND the seven new ones — thirteen reasons in one
 *     checklist. Nothing is written or lost; it lasts as long as the deploy. This
 *     is the known cost of this approach, and the alternative (inserting them
 *     inactive) would need a later UPDATE to switch them on, which is the very
 *     destructive step being avoided.
 *   - Code deployed without applying it: the service reads two columns that do not
 *     exist → the catalogue endpoint fails and the checklist renders empty. The
 *     Jenkins pipeline runs migrations on deploy, so this future does not occur
 *     here; recorded because it is the symptom if it is ever applied by hand.
 *   - Applied twice: guarded. Both `ADD COLUMN`s check `information_schema` first
 *     (MySQL 8 has no `ADD COLUMN IF NOT EXISTS`) and every INSERT is
 *     `WHERE NOT EXISTS` on the text.
 *   - Reverted with data inside: `down` refuses to delete any of the seven rows
 *     once a result has selected it, and drops the columns either way — the
 *     columns hold catalogue metadata, never reported data.
 *
 * Additive only: no existing row is updated, deactivated or deleted.
 *
 * Wording note: reason 3 is "limited W1/W2 resource availability", not the story's
 * original "limited Initiative resource availability" — Ángel Jarrín corrected it
 * on the ticket on 31 Aug 2026, validated with Marc Schut.
 */
export class AddPhaseAxisToDiscontinuedOptions1788442000000
  implements MigrationInterface
{
  name = 'AddPhaseAxisToDiscontinuedOptions1788442000000';

  private static readonly TABLE = 'investment_discontinued_option';

  /** Innovation Development. Innovation Use reuses this catalogue (service maps 2 → 7). */
  private static readonly RESULT_TYPE_ID = 7;

  /** The phase these rows are introduced for. */
  private static readonly PHASE_YEAR_FROM = 2026;

  /** In display order. The last one owns the free-text box. */
  private static readonly OPTIONS_2026: ReadonlyArray<
    readonly [option: string, requiresDescription: boolean]
  > = [
    ['Discontinued: limited design / testing / validation progress', false],
    [
      'Discontinued: innovation lead / team took on new responsibilities',
      false,
    ],
    ['Discontinued: limited W1/W2 resource availability', false],
    ['Discontinued: limited bilateral co-investment', false],
    ['Discontinued: merging with another innovation', false],
    ['Discontinued: splitting into multiple innovations', false],
    ['Other (please specify)', true],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      'phase_year_from',
      'int NULL COMMENT \'Phase year this reason was introduced for. NULL = base generation (pre-2026).\'',
    );
    await this.addColumnIfMissing(
      queryRunner,
      'requires_description',
      'tinyint NULL COMMENT \'1 when the reason needs the free-text box ("Other").\'',
    );

    let order = 1;
    for (const [
      option,
      requiresDescription,
    ] of AddPhaseAxisToDiscontinuedOptions1788442000000.OPTIONS_2026) {
      await queryRunner.query(
        `
          INSERT INTO \`${AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE}\`
            (\`option\`, \`order\`, \`result_type_id\`, \`is_active\`,
             \`phase_year_from\`, \`requires_description\`, \`created_by\`, \`created_date\`)
          SELECT ?, ?, ?, 1, ?, ?, 977, CURRENT_TIMESTAMP
          FROM DUAL
          WHERE NOT EXISTS (
            SELECT 1 FROM \`${AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE}\`
            WHERE \`option\` = ?
              AND \`result_type_id\` = ?
              AND \`phase_year_from\` = ?
          );
        `,
        [
          option,
          order,
          AddPhaseAxisToDiscontinuedOptions1788442000000.RESULT_TYPE_ID,
          AddPhaseAxisToDiscontinuedOptions1788442000000.PHASE_YEAR_FROM,
          requiresDescription ? 1 : 0,
          option,
          AddPhaseAxisToDiscontinuedOptions1788442000000.RESULT_TYPE_ID,
          AddPhaseAxisToDiscontinuedOptions1788442000000.PHASE_YEAR_FROM,
        ],
      );
      order += 1;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the rows nobody has selected. A reported reason is data a `git revert`
    // cannot bring back.
    await queryRunner.query(
      `
        DELETE o FROM \`${AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE}\` o
        WHERE o.\`phase_year_from\` = ?
          AND o.\`result_type_id\` = ?
          AND NOT EXISTS (
            SELECT 1 FROM \`results_investment_discontinued_options\` r
            WHERE r.\`investment_discontinued_option_id\` = o.\`investment_discontinued_option_id\`
          );
      `,
      [
        AddPhaseAxisToDiscontinuedOptions1788442000000.PHASE_YEAR_FROM,
        AddPhaseAxisToDiscontinuedOptions1788442000000.RESULT_TYPE_ID,
      ],
    );

    await this.dropColumnIfPresent(queryRunner, 'requires_description');
    await this.dropColumnIfPresent(queryRunner, 'phase_year_from');
  }

  /** MySQL 8 has no `ADD COLUMN IF NOT EXISTS`, and a repeated ADD aborts the deploy. */
  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    column: string,
    definition: string,
  ): Promise<void> {
    if (await this.columnExists(queryRunner, column)) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`${AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE}\` ADD \`${column}\` ${definition}`,
    );
  }

  private async dropColumnIfPresent(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<void> {
    if (!(await this.columnExists(queryRunner, column))) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`${AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE}\` DROP COLUMN \`${column}\``,
    );
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
      [AddPhaseAxisToDiscontinuedOptions1788442000000.TABLE, column],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
